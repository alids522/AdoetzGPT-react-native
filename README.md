# AdoetzGPT — React Native (port)

Pixel-faithful React Native port of the Flutter app "AdoetzGPT".
Expo SDK 56 (RN 0.85), TypeScript, Zustand, React Navigation. **iOS + Android only.**

The original, untouched Flutter source lives in `../original/` (a reference copy).
Everything in this directory is the conversion; the Flutter project is never edited.

## Run

```bash
# 1. JS deps (already installed)
npm install

# 2. Generate native projects (needed before first device build; re-run after
#    adding native modules / config plugins)
npx expo prebuild

# 3. Run on Android (device/emulator). iOS requires macOS + Xcode.
npx expo run:android
# or start the bundler only:
npx expo start
```

## Backend (unchanged, copied from the Flutter project)

The Express + Postgres + JWT backend in `server/` is used as-is. Run it separately
when you need auth/sync (Phase 4+):

```bash
cd server
npm install
DATABASE_URL=postgres://user:pass@host:5432/db npm run dev
```

## Status (phased build, see `../../.claude/plans/iridescent-dazzling-fiddle.md`)

All 8 phases structurally complete. Verify: `npx tsc --noEmit` (clean), `npx vitest run` (34 passing), `npx expo config` (valid).

- [x] **Phase 0** — Scaffold, assets/server, theme skeleton
- [x] **Phase 1** — Data models + utils (port of `lib/models.dart`)
- [x] **Phase 2** — Theme system (exact palettes, GlassPanel, ThemedBackdrop, …)
- [x] **Phase 3** — Zustand store + persistence + sync merge (port of `lib/state/app_state.dart`)
- [x] **Phase 4** — Navigation (Drawer), AuthScreen, sync (Supabase + Express)
- [x] **Phase 5** — AI text chat (SSE streaming, Gemini+OpenAI, tools, search, titles, markdown)
- [x] **Phase 6** — Settings (7 sections) + Token Usage charts
- [x] **Phase 7** — Live Voice (native PCM module + Gemini Live WS + camera + foreground service)
- [x] **Phase 8** — Polish (i18n, artifact parser, image attachments)

**Needs on-device validation:** `expo prebuild` first build, GlassPanel blur tuning, SSE per-provider,
Live mic capture (recorder stub needs `react-native-live-audio-stream`), Notifee FG service type.

## Layout (`src/` mirrors the Flutter `lib/` tree)

```
src/
  models/   state/   services/   screens/   widgets/   ui/   utils/   i18n/
modules/    # custom Expo native modules (Phase 7: live-audio-player)
server/     # unchanged Express backend
```
