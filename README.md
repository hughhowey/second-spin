# Second Spin

A personal listening room for remembering the albums that made you and meeting the artists you missed. Built for enjoyment, friends, and three good songs before committing to an album.

## In this first version

- An equipment-inspired stereo interface with memory and discovery mixtapes.
- A 37-album starter catalog, real cover artwork where sourced, and three entry songs per album.
- Separate listener profiles, memories, album reactions and saved tapes in a server database.
- Year range and discovery-distance controls. Discovery excludes artists already loved or explicitly named as favorites.
- Individual Spotify search links and downloadable track lists work immediately.
- Private Spotify playlist export through Authorization Code with PKCE, once a developer app is configured.
- Optional record-store conversation through the OpenAI Responses API. Clearly disabled until configured.
- Feature-detected WebMCP access to read the active collection. No external writes through that tool.

## Run and deploy

Node 22.13+ and pnpm are required. Install with `pnpm install`, then `pnpm dev`. The app uses the supplied Vinext/Cloudflare Sites runtime, a D1 binding named `DB`, and platform-provided Sign in with ChatGPT identity. Plain unauthenticated local requests cannot access saved collections. Production is deployed privately through Sites; `.openai/hosting.json` is the deployment association, not a credential.

Generate schema changes with `pnpm db:generate`. Check TypeScript with `pnpm exec tsc --noEmit`; run focused discovery and matching tests with `node --experimental-strip-types --test tests/music.test.mjs`. Use the Sites build/deploy workflow for Cloudflare-compatible output.

## Connect Spotify

1. Create a Spotify developer app. Its owner needs Premium under the current development-mode rules.
2. Add the exact HTTPS callback displayed in Second Spin’s Connections dialog to the app’s redirect URLs.
3. Add each tester under Users and Access (currently a maximum of five development-mode users).
4. Enter the public Client ID in Second Spin and authorize Spotify. No client secret is needed.

The server needs a secret `SPOTIFY_TOKEN_KEY`: 32 cryptographically random bytes encoded as base64url. Keep it stable; rotating it requires reconnection. Optional `SPOTIFY_CLIENT_ID` lets the owner configure one shared developer app. Otherwise each signed-in account can enter a Client ID. OAuth and refresh tokens are encrypted, owner-bound, server-only, and deleted from this app when disconnected. Spotify permissions are limited to creating/modifying private playlists. Disconnecting does not delete playlists; revoke app access in Spotify if desired.

Export resolves exact track and artist names, preferring the requested album, and reports unmatched songs. Existing export IDs return the same playlist to avoid duplicates. If Spotify creates a playlist but fails while adding songs, the interface reports that partial result instead of claiming success. For changes to an already exported mix, make a new tape.

## Connect the conversation

Set the secret `OPENAI_API_KEY` in the Site’s server environment through approved OpenAI Developers setup. Optional `OPENAI_MODEL` defaults to `gpt-5-mini`. Never put a key in client code or this repository. A ChatGPT subscription does not itself configure this API connection.

The app sends the listener’s saved memories, chosen album reactions, and recent conversation to OpenAI, with response storage disabled. It sends no Spotify account data, listening history, access tokens, search results, or fetched Spotify metadata to the model. Suggestions are guesses and can be corrected. Conversation is capped at 60 requests per signed-in account per UTC day.

## Data and scope

Collections are isolated by authenticated account; multiple listeners within the same account are intended for use together. Publishing privately does not grant access to friends. Site sharing must be configured separately when ready. The GitHub repository contains source and the explicitly supplied starter music story, not saved profiles, API credentials or Spotify tokens.

This is a bounded starter catalog, not an exhaustive music database. Until the AI connection is configured, a fresh listener works by rating those records and entering memories. Album art remains copyright of its respective owners; sources are recorded in `public/art/sources.json`. Textual sleeves indicate albums without sourced artwork.

## Verification and remaining setup

TypeScript compilation, production build, and focused discovery/matching tests are the available automated checks. Browser preview and live WebMCP validation were unavailable in this build environment. Live OpenAI conversation and Spotify OAuth/export still need account configuration and an end-to-end test. Do not treat those integrations as verified solely because the build passes.
