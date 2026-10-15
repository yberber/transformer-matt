// The current view state, kept in sync with the URL. Moving to another view or
// Example adds a history entry; changing the Step, layer, head, language or Live
// Prompt replaces the current one, so scrubbing through Steps or heads, or typing,
// does not flood the history.
import { readViewState, viewStateFragment, viewStateQuery, type ViewState } from "./viewState";

function fromLocation(): ViewState {
  return readViewState(location.search, location.hash, navigator.languages);
}

export function routeUrl(state: ViewState): string {
  const url = new URL(location.href);
  url.search = viewStateQuery(state);
  url.hash = viewStateFragment(state);
  return url.href;
}

export const route: ViewState = $state(fromLocation());

history.replaceState(history.state, "", routeUrl(route));

const historyListeners = new Set<() => void>();

/**
 * Calls `listener` each time Back, Forward or a link that changes only the fragment moves
 * the route, as soon as the route has followed the URL. Returns a function that stops it.
 */
export function onHistoryMove(listener: () => void): () => void {
  historyListeners.add(listener);
  return () => historyListeners.delete(listener);
}

addEventListener("popstate", () => {
  Object.assign(route, fromLocation());
  // In the same task, before any effect can write its own state back to the URL.
  for (const listener of historyListeners) listener();
});

export function navigate(patch: Partial<ViewState>, { replace = false } = {}): void {
  Object.assign(route, patch);
  if (replace) history.replaceState(history.state, "", routeUrl(route));
  else history.pushState(null, "", routeUrl(route));
}
