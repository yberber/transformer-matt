# Caddy with the static build in /srv. compose.yaml mounts deploy/Caddyfile.

# The build is the same on any platform, so it runs natively even when cross-building.
# Keep the Node version in step with .nvmrc.
FROM --platform=$BUILDPLATFORM node:26.8.1-alpine AS build
WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm run precompress

FROM caddy:2.11.7-alpine
COPY --from=build /web/dist /srv
