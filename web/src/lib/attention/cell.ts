// A cell of the attention heatmap: the Position looking back (query) and the Position
// it looks at (key). Attention is causal, so only cells with key ≤ query exist.
export interface Cell {
  query: number;
  key: number;
}

/** The cell within the first `n` Positions that is nearest to `cell`. */
export function clampCell({ query, key }: Cell, n: number): Cell {
  const q = Math.max(0, Math.min(n - 1, query));
  return { query: q, key: Math.max(0, Math.min(q, key)) };
}

/** The cell a navigation key moves to, staying within the first `n` Positions, or undefined for other keys. */
export function moveCell({ query, key }: Cell, keyName: string, n: number): Cell | undefined {
  const moves: Record<string, Cell> = {
    ArrowLeft: { query, key: key - 1 },
    ArrowRight: { query, key: key + 1 },
    ArrowUp: { query: query - 1, key },
    ArrowDown: { query: query + 1, key },
    Home: { query, key: 0 },
    End: { query, key: query },
  };
  const target = moves[keyName];
  return target && clampCell(target, n);
}
