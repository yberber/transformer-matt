// A rough check for text that is not English, for the gentle warning that GPT-2 was
// trained mostly on English. There is no language detector in the browser, so it uses
// two signs: English prose is full of short function words ("the", "of", "and"), and
// is written in the English alphabet. A name or two words alone are never flagged.

// Common English function words; in English prose roughly every third word is one.
const FUNCTION_WORDS = new Set(
  (
    "a an the and or but if so as of to in on at by for with from into upon up out about " +
    "is are was were be been am has have had do does did will would can could not no " +
    "i you he she it we they me him her us them my your his its our their this that these those " +
    "there here which who what when where how all one"
  ).split(" "),
);
/** With at least this many words, too few function words means not English. */
const MIN_WORDS = 5;
const MIN_FUNCTION_WORD_SHARE = 0.15;
/** More letters than this share outside A–Z (accents, other scripts) means not English. */
const MAX_OTHER_LETTER_SHARE = 0.2;

export function looksNonEnglish(text: string): boolean {
  const letters = text.match(/\p{L}/gu) ?? [];
  const otherLetters = letters.filter((letter) => !/[A-Za-z]/.test(letter)).length;
  if (otherLetters > 0 && otherLetters / letters.length > MAX_OTHER_LETTER_SHARE) return true;
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  if (words.length < MIN_WORDS) return false;
  const functionWords = words.filter((word) => FUNCTION_WORDS.has(word)).length;
  return functionWords / words.length < MIN_FUNCTION_WORD_SHARE;
}
