<script lang="ts" module>
  /** From this size on, a value's cell is fully colored. One scale for every strip, so strips compare at a glance. */
  export const SATURATION = 0.3;
</script>

<script lang="ts">
  // One embedding vector as a strip, one cell per dimension, left to right: positive
  // values in the Position's color, negative ones in gray, more opaque the further
  // they are from 0. Canvas, because a long Example draws close to 200 strips.
  import { onThemeChange } from "../shell/theme";
  import { positionColor } from "../tokens/color";

  let { values, position, label }: { values: Float32Array; position: number; label: string } = $props();

  let canvas: HTMLCanvasElement;
  let themeChanges = $state(0);
  $effect(() => onThemeChange(() => themeChanges++));

  // Colors come from CSS, so redraw when the theme or the Position (its color) changes too.
  $effect(() => {
    void themeChanges;
    void position;
    draw(values);
  });

  function draw(values: Float32Array) {
    const context = canvas.getContext("2d");
    if (!context) return;
    // The canvas resolves any CSS color to #rrggbb.
    const rgb = (property: string) => {
      context.fillStyle = getComputedStyle(canvas).getPropertyValue(property).trim();
      const hex = String(context.fillStyle);
      return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    };
    const positive = rgb("--token-color");
    const negative = rgb("--ink-secondary");
    const image = context.createImageData(values.length, 1);
    values.forEach((value, i) => {
      const alpha = Math.round(Math.min(1, Math.abs(value) / SATURATION) * 255);
      image.data.set([...(value < 0 ? negative : positive), alpha], i * 4);
    });
    context.putImageData(image, 0, 0);
  }
</script>

<span class="strip" role="img" aria-label={label} style:--token-color={positionColor(position)}>
  <canvas bind:this={canvas} width={values.length} height="1" aria-hidden="true"></canvas>
</span>

<style>
  .strip {
    display: block;
  }
  canvas {
    display: block;
    width: 100%;
    height: 0.9rem;
    outline: 1px solid var(--rule);
    background: var(--paper);
  }
</style>
