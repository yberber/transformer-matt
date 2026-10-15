<script lang="ts">
  import { t } from "../i18n/i18n";
  import { currentTheme, onSystemThemeChange, setTheme } from "./theme";

  let dark = $state(currentTheme() === "dark");
  $effect(() => onSystemThemeChange(() => (dark = currentTheme() === "dark")));

  function toggle() {
    dark = !dark;
    setTheme(dark ? "dark" : "light");
  }
</script>

<button type="button" class="control" aria-pressed={dark} onclick={toggle}>
  <span aria-hidden="true">{dark ? "☾" : "☀"}</span>
  {t("theme.dark")}
</button>
