// Token color belongs to the Position, assigned in order from a 10-hue palette
// and cycling. The hues are defined as --token-0 … --token-9 in styles.css.
const PALETTE_SIZE = 10;

export function positionColor(position: number): string {
  return `var(--token-${position % PALETTE_SIZE})`;
}
