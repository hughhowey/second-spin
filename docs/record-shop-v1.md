# Record shop: first complete discovery loop

Status: implementation brief. The first discovery loop is approved for development. This document adds no application behavior. Do not publish a release, deploy, merge, or distribute a build without Hugh's explicit approval.

## Purpose

Wow and Flutter (repository: second-spin) is a personal music discovery and listening app for Hugh, his wife, and friends. It is not a commercial venture. The goal is the pleasure of finding music, remembering a formative album, and taking something promising home to hear.

Deliver one complete loop:

Home stereo → record-shop conversation → a small sampler → home listening → feedback remembered on the next visit.

## Starting point and scope

- Begin with the existing Electron desktop application in `flutter/`. Despite its directory name, it is not a Dart/Flutter application.
- The reviewed desktop baseline is commit `71e9899bf55c6166a78c62b078c47da0ecf0c7c9` on `claude/sweet-bohr-4lcu5b`.
- The repository root also contains the original web application and recommendation/profile code. It is separate from the desktop app; inspect it for reusable logic rather than assuming it is already connected.
- Preserve the stereo and current Spotify controls. Add a clear way to visit the shop and return home.
- Work on this feature branch or a new feature branch. Check for newer work before editing and preserve unrelated changes.
- The current release workflow publishes from `main` and the Claude branch. Do not push implementation changes to either of those branches to obtain a preview.
- The rear rack, movable cables, new equipment, gear earning changes, voice conversation, avatars, multiplayer, and a visual redesign are outside this first increment.

## Shop experience

Use a view across the counter with an off-screen employee. No face or animated character is required. A mug, open record sleeve, and handwritten staff-pick card can suggest somebody working there. Reuse the app's existing visual language; an occasional hand or sleeve is optional future polish.

Conversation must be easy to read and operate by keyboard. Keep normal dialogue in a stable text area; use handwritten styling for short labels and recommendation notes. Album movement should be modest and respect reduced-motion preferences.

The employee is curious, knowledgeable, warm, and unpretentious. Ask one useful question at a time. Follow a specific answer before suggesting records. Keep replies short enough that conversation feels natural; do not turn every turn into a list or insist on completing an intake form.

When enough is known, place up to three artists' records on the counter with up to three starting songs each. Explain the personal connection for each choice. Fewer well-supported suggestions are better than filling a quota. Allow the listener to say they already know something, love it, want a different direction, or want to save it for later.

Let the user name a sampler, take it home, and give lightweight feedback. On returning to the shop, remember what was suggested and what the user actually said about it. Do not infer enjoyment solely from a play count or imply that the user listened when that is unknown.

## Taste and memory

Keep identity, conversation, library, and feedback distinct. Support separate local listener profiles so the first tester does not inherit the owner's tastes.

Represent these differences explicitly:

- loving an artist versus loving one album;
- knowing a name versus having listened;
- a favorite, an untried recommendation, a pass, and a later reconsideration;
- music heard through parents versus music discovered independently;
- nostalgia for a life event versus a musical characteristic.

Persist concise, inspectable, correctable taste facts with the listener's own evidence. Do not rely only on a trailing chat window. Save recommendations, sampler contents, and feedback. Support recovery after closing the app. Avoid inventing biography or silently upgrading an uncertain inference into a fact.

Do not hard-code the owner's history as the default for every listener. Any demo or owner seed must be an explicit choice and kept separate from other profiles.

## AI and credentials

A dedicated OpenAI API key has already been created and saved privately on Hugh's Mac, outside the repository. Its exact path is in the local setup conversation. Reuse that credential for this approved work; do not create another key.

The environment file's existence does not mean the desktop app automatically loads it. Establish explicit development-time loading from the confirmed external file or process environment. Do not print the value, copy it into this repository, expose it through renderer IPC, package it into an Electron build, or upload it to GitHub.

Keep API access in the Electron main process or another trusted service boundary. Validate renderer requests, bound request size/history, validate structured responses, and allow cancellation. Handle unavailable configuration, billing/quota failures, network errors, and malformed replies without losing the conversation or showing false success.

An owner-funded key must not be distributed with friends' copies of the app. This increment is a local development prototype; a shared deployment's authentication and billing arrangement is a separate review decision.

Use current official OpenAI documentation for the actual integration. Apply a suitable configurable model, sensible output limits, and explicit handling of retries. Avoid duplicate billable requests from repeated clicks or automatic loops.

## Catalog and Spotify

The LLM supplies conversational judgment and proposed recommendations. Actual album/track identities and playback links need verification from a trusted catalog. Never present an invented Spotify identifier as verified.

Inspect the existing desktop Spotify bridge and the web Spotify code before choosing a route. Desktop playback uses the installed Spotify app through macOS automation; the original web export uses separate OAuth setup. Having Spotify Premium or an OpenAI key alone does not configure Spotify Web API access.

Use the existing curated catalog as a bounded starting point where useful. If verified Spotify lookup or private playlist creation needs additional configuration, implement the rest of the flow concretely, state the precise remaining requirement, and guide Hugh through only that missing step. Do not silently substitute arbitrary tracks or claim a playlist was created.

A sampler can be persisted inside the app independently of playlist export. Clearly distinguish a saved local sampler, a Spotify search link, a resolved playable track, and a successfully exported Spotify playlist. Preserve confirmed tracks when another track cannot be resolved.

## Acceptance criteria

1. From the existing stereo, a listener can enter the shop and return home without breaking current playback controls.
2. The off-screen employee holds a real, concise conversation using the configured API.
3. The listener can correct a taste fact or explain that a proposed artist is already familiar, and later suggestions honor that correction.
4. The shop proposes at most three artists and up to nine songs, with reasons grounded in the listener's statements.
5. Song identity and Spotify availability are represented honestly; unknown or unresolved tracks remain visibly unresolved.
6. A named sampler survives restart, can be accessed from home, and supports feedback.
7. A return visit recalls prior suggestions and explicit feedback without treating unplayed or unrated tracks as liked.
8. Two listener profiles keep conversations and preferences separate.
9. A failed AI request preserves the user's message and provides a clear retry path without duplicate messages or samplers.
10. Keyboard use, readable contrast, focus handling, and reduced motion are covered in the new shop UI.
11. The API key is absent from tracked files, renderer messages, logs, packaged assets, and the build brief.
12. Hugh can review the local prototype before any release or deployment.

## Verification and handoff

Use focused tests for memory updates, response validation, recommendation exclusions, profile separation, and failure/retry behavior. Perform a local Mac smoke test of the real conversation and existing Spotify controls. Report which checks actually ran and any configuration still missing; mocked calls do not count as live verification.

Before major implementation, give Hugh a concise account of the files and behavior to change. The discovery loop is already approved, so do not restart broad product brainstorming or repeat key creation. Ask only for genuinely missing setup, a materially different scope, or release approval.

Summarize completed work, meaningful verification, remaining limitations, and how to launch the local prototype. Leave publishing, merging, automatic updates, and distribution for Hugh's explicit approval.
