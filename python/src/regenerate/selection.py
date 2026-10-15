"""Selects the six Examples from drafted candidate Prompts by the spec's rules.

Run with `uv run select-examples`. It prints every candidate's checks and the
six it selects; `EXAMPLES` in `regenerate` lists those six. Whether a
Continuation is offensive cannot be checked here: read the printed
Continuations before committing a new selection.
"""

import re
from dataclasses import dataclass

from inside_transformer import build_trace
from regenerate import STEPS

BANDS = {"short": (8, 12), "medium": (22, 28), "long": (44, 48)}
PER_BAND = 2
MIN_MARGIN = 1e-3

# Natural prose only: short stories and everyday facts. Memorized boilerplate
# (licences, legal texts) and counting or list sequences pass the rules easily
# but make poor Examples, so none are drafted.
CANDIDATES = [
    # short
    "Once upon a time, in a small village by the sea",
    "The baker woke up early every morning to",
    "Honey never spoils because it contains very little",
    "The cat sat by the window and watched the",
    "Bananas are botanically berries, while strawberries are",
    "The little robot rolled across the garden, looking for",
    "A giraffe's tongue is so long that it can",
    "The fisherman pulled up his net and found a",
    "Photosynthesis is the process by which green plants",
    "The Eiffel Tower is located in the city of",
    # medium
    "My grandmother kept a jar of buttons on the kitchen shelf, and every Sunday she would let me "
    "pour them out onto the table and",
    "The human heart beats about 100,000 times a day, pumping blood through a network of vessels "
    "that, laid end to end, would",
    "Albert Einstein was a German-born theoretical physicist who developed the theory of "
    "relativity, one of the two pillars of modern",
    "The train was already twenty minutes late when Anna finally reached the platform, her "
    "suitcase bumping behind her on the",
    "Octopuses have three hearts and blue blood. Two of the hearts pump blood to the gills, while "
    "the third",
    "Penguins cannot fly, but they are excellent swimmers. Their wings have evolved into flippers "
    "that help them",
    "The Great Wall of China is one of the most famous landmarks in the world. It was built over "
    "many centuries to protect the Chinese states from",
    # long
    "It had been raining for three days when the stray dog first appeared at our door. My little "
    "brother wanted to keep him, but my mother said we could not afford another mouth to feed. "
    "That night, I crept downstairs and",
    "The Moon is slowly drifting away from the Earth, by about 3.8 centimetres every year. "
    "Scientists measure this distance by bouncing laser beams off mirrors that astronauts left on "
    "the Moon. Over billions of years, this drift will",
    "The old clockmaker opened his shop every morning at seven. He swept the floor, wound the "
    "grandfather clocks along the back wall, and set a pot of coffee on the small stove. Then he "
    "sat down at his workbench and picked up the",
    "Water boils at 100 degrees Celsius at sea level, but on top of a high mountain it boils at a "
    "lower temperature. This is because the air pressure is lower at high altitude, so the water "
    "molecules need less energy to",
    "Coffee was first discovered in Ethiopia, according to a popular legend about a goat herder "
    "named Kaldi. He noticed that his goats became unusually energetic after eating the red "
    "berries of a certain shrub, so he",
    "When Maya opened the old wooden box in her grandfather's attic, she found a stack of letters "
    "tied with a faded blue ribbon. The first letter was dated June 1944, and it began with the "
    "words",
    "Every summer, the Arctic tern flies from the Arctic to the Antarctic and back again, a round "
    "trip of more than 70,000 kilometres. Over its lifetime of about thirty years, a single tern "
    "can travel a distance equal to going to the Moon and",
]


@dataclass(frozen=True)
class Report:
    prompt: str
    prompt_length: int
    band: str | None
    continuation: str
    min_margin: float
    repeated_trigram: bool
    newline_only_token: bool
    question: bool
    split_word: str | None

    @property
    def problems(self) -> list[str]:
        """The rules this candidate breaks; offensiveness is judged by reading, not here."""
        checks = [
            ("length", self.band is None),
            ("repeated 3-gram", self.repeated_trigram),
            ("margin", self.min_margin < MIN_MARGIN),
            ("newline-only token", self.newline_only_token),
            ("question", self.question),
        ]
        return [name for name, failed in checks if failed]

    @property
    def qualifies(self) -> bool:
        return not self.problems


def _band(prompt_length: int) -> str | None:
    return next((band for band, (lo, hi) in BANDS.items() if lo <= prompt_length <= hi), None)


def _split_word(token_texts: list[str]) -> str | None:
    """The first word of letters that spans more than one token, if any."""
    text = "".join(token_texts)
    ends = set()
    end = 0
    for token in token_texts:
        end += len(token)
        ends.add(end)
    for match in re.finditer(r"[A-Za-z]+", text):
        if any(match.start() < e < match.end() for e in ends):
            return match.group()
    return None


def evaluate(prompt: str) -> Report:
    trace = build_trace(prompt, STEPS)
    p = trace.prompt_length
    continuation = trace.positions[p:]
    ids = [position.token_id for position in continuation]
    trigrams = [tuple(ids[i : i + 3]) for i in range(len(ids) - 2)]
    # The prediction at Position p - 1 chose the first Continuation token, and so on.
    choosing = trace.positions[p - 1 : p - 1 + STEPS]
    margins = [pos.predictions.probabilities[0] - pos.predictions.probabilities[1] for pos in choosing]
    return Report(
        prompt=prompt,
        prompt_length=p,
        band=_band(p),
        continuation="".join(position.token_text for position in continuation),
        min_margin=min(margins),
        repeated_trigram=len(set(trigrams)) < len(trigrams),
        newline_only_token=any(set(pos.token_text) == {"\n"} for pos in continuation),
        question=prompt.rstrip().endswith("?"),
        split_word=_split_word([position.token_text for position in trace.positions[:p]]),
    )


def select(reports: list[Report]) -> list[Report]:
    """Per band, the qualifying candidates with the largest minimum margin. If none of
    the picks has a word split into several tokens, the weakest pick in some band gives
    way to that band's best qualifying candidate that has one."""
    ranked = {
        band: sorted(
            (r for r in reports if r.qualifies and r.band == band),
            key=lambda r: r.min_margin,
            reverse=True,
        )
        for band in BANDS
    }
    picks = {band: candidates[:PER_BAND] for band, candidates in ranked.items()}
    for band, candidates in picks.items():
        if len(candidates) < PER_BAND:
            raise SystemExit(f"Only {len(candidates)} qualifying {band} candidate(s); draft more.")
    if not any(r.split_word for band_picks in picks.values() for r in band_picks):
        swaps = [
            (band, replacement)
            for band in BANDS
            for replacement in ranked[band][PER_BAND:]
            if replacement.split_word
        ]
        if not swaps:
            raise SystemExit("No qualifying candidate has a word split into several tokens; draft more.")
        band, replacement = max(swaps, key=lambda swap: swap[1].min_margin)
        picks[band] = [picks[band][0], replacement]
    return [r for band in BANDS for r in picks[band]]


def main() -> None:
    reports = [evaluate(prompt) for prompt in CANDIDATES]
    for r in reports:
        verdict = "qualifies" if r.qualifies else "rejected "
        print(
            f"{verdict} {r.prompt_length:2d} tokens  min margin {r.min_margin:.4f}  "
            f"split word {r.split_word or '-':<14} {', '.join(r.problems)}"
        )
        print(f"    {r.prompt[:72]!r}…")
        print(f"    → {r.continuation!r}")
    print("\nSelected:")
    for r in select(reports):
        print(f"  {r.band:<6} {r.min_margin:.4f}  {r.prompt!r}")
