# Record shop prototype: local review

This feature is implemented in the Electron app in `flutter/`, on `codex/record-shop-v1`. The web application remains separate. Do not merge this branch or run the original release workflow to obtain a preview.

## Implemented

- Visit the off-screen employee from the stereo; return without replacing the existing playback controls.
- Separate local listener profiles, with no owner biography or tastes seeded by default.
- A readable conversation through the main-process OpenAI Responses API (`store: false`, configurable `OPENAI_MODEL`, default `gpt-5-mini`). Requests have a 60-second deadline, output and input limits, structured-response validation, cancellation and manual retry. Repeated requests are blocked while a reply is pending.
- Inspectable taste facts with scope, relationship and the listener's evidence. AI facts remain proposals until confirmed. Edit and deletion history tells the next conversation about corrections. Artist love, album love, familiarity, listening, passes, later reconsideration, parents, independent discovery, nostalgia and musical characteristics are distinct.
- Up to three distinct artists and three starter songs per artist, chosen from the existing 37-album catalog. Known, loved and passed artists/albums and previously loved or passed songs are excluded from new counter records. Reconsideration can restore eligibility. Unsupported songs and listener evidence are rejected.
- Named local samplers, song feedback and conversation survive restart. Unrated songs remain listening-unknown. A failed request retains its message and creates no sampler; retry uses that same message.
- Native dialog keyboard containment, explicit labels, visible focus, live status/error text, readable contrast, and reduced-motion styling.

Shop data is saved atomically in `record-shop.json`. Source development uses a separate preview data directory under this chat's `work/` folder rather than the installed app's existing stereo save. Storage errors are surfaced; malformed saves are preserved instead of overwritten.

## Credentials

Reuse the already-confirmed private env file outside this repository. Do not copy it into the checkout, GitHub secrets, build assets, or an Actions artifact. The renderer receives only configuration availability, never a credential. API requests run in the Electron main process. The development launcher reads only an explicitly chosen external env file and forwards the key through the launched process's environment.

From `flutter/`, with Node 24:

```sh
npm ci
npm test
npm run build:local
npm run dev -- --env "/absolute/path/to/the/existing/private/.env.local"
```

`build:local` checks the JavaScript source and packaging allowlist; Electron's source preview needs no transpilation. To build an app directory without opening it or publishing anything:

```sh
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --mac --arm64 --dir --publish never -c.mac.identity=null -c.mac.notarize=false -c.extraMetadata.wfPreview=true
```

## Actions test artifact

The separate **Record shop preview** workflow runs only on `codex/record-shop-v1`. It tests and builds an arm64 Mac ZIP, uploads a seven-day Actions artifact, and has read-only repository permissions. It never creates a release or an updater feed. Test builds have `wfPreview: true`, which disables automatic update checks, downloads and installation. Existing Apple signing/notarization secrets are used if fully configured; otherwise the artifact is unsigned.

After reviewing changes, commit and push only this feature branch. Download `record-shop-mac-preview-<run number>` from its Actions run, extract the ZIP, and keep this prototype separate from the installed production app. For this Mac, launch the executable with the source development launcher so the existing external credential and separate preview data directory are used:

```sh
npm run dev -- --env "/absolute/path/to/the/existing/private/.env.local" --app "/absolute/path/to/Wow and Flutter.app/Contents/MacOS/Wow and Flutter"
```

The launcher reports a crash as failure, rather than a successful preview. Do not double-click a build repeatedly if macOS reports that it crashes or is blocked. An unsigned artifact may need proper Apple signing/notarization before normal Mac use; do not disable macOS protections.

## Spotify limits

The existing Mac Spotify playback bridge is preserved. A saved sampler is independent of Spotify playlist export. Every starter song currently has **unresolved Spotify availability** and an explicitly labeled Spotify search link. No Spotify identifier, playable-track resolution, private playlist or successful export is fabricated. Search for a song in Spotify, choose the matching recording there, and use the existing stereo controls to listen.

Automated exact catalog lookup and playlist export still require a Spotify developer app/client ID, authorized Spotify Web API access and tester access. The existing web OAuth code is not automatically available to Electron. Premium and an OpenAI key do not supply that configuration.

## Verification

Twelve tests pass, including DOM renderer/service integration for the complete sampler loop, focus restoration after feedback, and cancellation/retry. Native dialog focus containment and visual layout still need Mac review. Focused tests cover response bounds and catalog identity, evidence validation, corrections, recommendation exclusions, listener separation, sampler persistence, explicit song feedback, failure/retry/cancel behavior, interrupted-request recovery and disk failure rollback. The live main-process service was tested using the existing key with a separate synthetic test profile: a real follow-up and a catalog recommendation both completed.

Local Electron launch attempts aborted during macOS application registration before the source application opened. They were stopped after Hugh reported crash popups. Consequently native Mac UI and Spotify playback remain unverified in this environment. The arm64 Mac app directory was built locally with publishing, signing and notarization disabled, without launching Electron. Source tests and a successful package build do not count as a native playback smoke test. Review the Actions artifact on Hugh's Mac before approving any release.
