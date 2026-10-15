# Live-mode Prompt text travels in the URL fragment, never the query string

Shareable URLs carry view state (example, view, layer, head, step, lang) in the query string, but a Live-mode Prompt goes in the fragment (`#…`), which browsers never send to the server. Putting it in the query string would land user text in reverse-proxy access logs, breaking the rule that user input is never stored or logged. Opening a shared Live link re-sends the text to the API in a POST body; neither the API nor Caddy logs request bodies, and Caddy access logs omit query strings.
