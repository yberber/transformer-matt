<script lang="ts">
  // One head's attention as an n × n canvas, one pixel per cell, stretched to its CSS
  // size without smoothing: row i is Position i looking back, column j the Position it
  // looks at. A cell's color runs from the paper (no attention) to the line color (all
  // of it), linear in the weight. Cells above the diagonal stay transparent, so the
  // masked future shows the background instead of reading as zero attention.
  import { cssRgb, onThemeChange } from "../shell/theme";

  let { rows }: { rows: Float32Array[] } = $props();

  let canvas: HTMLCanvasElement;
  let themeChanges = $state(0);
  $effect(() => onThemeChange(() => themeChanges++));

  // Colors come from CSS, so redraw when the theme changes too.
  $effect(() => {
    void themeChanges;
    draw(rows);
  });

  function draw(rows: Float32Array[]) {
    const context = canvas.getContext("2d");
    if (!context || rows.length === 0) return;
    const none = cssRgb(context, canvas, "--paper-raised");
    const all = cssRgb(context, canvas, "--line");
    const n = rows.length;
    const image = context.createImageData(n, n);
    rows.forEach((row, i) =>
      row.forEach((weight, j) => {
        const color = none.map((channel, c) => Math.round(channel + (all[c]! - channel) * weight));
        image.data.set([...color, 255], (i * n + j) * 4);
      }),
    );
    context.putImageData(image, 0, 0);
  }
</script>

<canvas bind:this={canvas} width={rows.length} height={rows.length} aria-hidden="true"></canvas>

<style>
  canvas {
    display: block;
    /* Square, from the canvas's own n × n size. */
    width: 100%;
    height: auto;
    image-rendering: pixelated;
    /* The masked future, above the diagonal. */
    background: repeating-linear-gradient(-45deg, var(--rule) 0 1px, transparent 1px 6px), var(--paper);
  }
</style>
