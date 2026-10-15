<script lang="ts">
  import { t } from "../i18n/i18n";
  import CopyLink from "./CopyLink.svelte";
  import LanguageSelect from "./LanguageSelect.svelte";
  import ThemeToggle from "./ThemeToggle.svelte";
</script>

<header class="masthead">
  <div class="title">
    <p class="kicker">{t("site.kicker")}</p>
    <h1 lang="en">{t("site.title")}</h1>
  </div>
  <div class="controls">
    <LanguageSelect />
    <ThemeToggle />
    <CopyLink />
  </div>
  <p class="tagline">{t("site.tagline")}</p>
  <ul class="notes">
    <li>{t("note.completion")}</li>
    <li>{t("note.english")}</li>
  </ul>
</header>

<style>
  .masthead {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.5rem 1.5rem;
    align-items: end;
    padding-top: 1.5rem;
  }
  .kicker {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-secondary);
  }
  h1 {
    margin: 0;
    font-weight: 400;
    font-size: clamp(1.6rem, 4vw, 2.3rem);
    letter-spacing: -0.01em;
  }
  .controls {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: center;
    gap: 0.5rem;
    max-width: 28rem;
  }
  .tagline,
  .notes {
    grid-column: 1 / -1;
    max-width: 44rem;
    margin: 0;
  }
  .tagline {
    font-size: 1.1rem;
  }
  .notes {
    display: grid;
    gap: 0.25rem;
    padding: 0 0 0 0.9rem;
    border-left: 2px solid var(--line-soft);
    list-style: none;
    font-size: 0.9rem;
    font-style: italic;
    color: var(--ink-secondary);
  }

  @media (max-width: 640px) {
    .masthead {
      grid-template-columns: 1fr;
    }
    .controls {
      justify-content: flex-start;
      max-width: none;
    }
  }
</style>
