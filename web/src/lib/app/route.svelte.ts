// The current view state, kept in sync with the URL. Moving to another view or
// Example adds a history entry; changing the Step, layer, head or language
// replaces the current one, so scrubbing through Steps or heads does not flood
// the history.
import { readViewState, viewStateQuery, type ViewState } from "./viewState";

function fromLocation(): ViewState {
  return readViewState(location.search, navigator.languages);
}

export function routeUrl(state: ViewState): string {
  const url = new URL(location.href);
  url.search = viewStateQuery(state);
  return url.href;
}

export const route: ViewState = $state(fromLocation());

history.replaceState(history.state, "", routeUrl(route));
addEventListener("popstate", () => Object.assign(route, fromLocation()));

export function navigate(patch: Partial<ViewState>, { replace = false } = {}): void {
  Object.assign(route, patch);
  if (replace) history.replaceState(history.state, "", routeUrl(route));
  else history.pushState(null, "", routeUrl(route));
}
