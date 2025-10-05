# Hollow Knight Damage Tracker

[![CI](https://github.com/kabaka/hollow-knight-damage-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/kabaka/hollow-knight-damage-tracker/actions/workflows/ci.yml)
[![Dependabot Updates](https://github.com/kabaka/hollow-knight-damage-tracker/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/kabaka/hollow-knight-damage-tracker/actions/workflows/dependabot/dependabot-updates)
[![CodeQL](https://github.com/kabaka/hollow-knight-damage-tracker/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/kabaka/hollow-knight-damage-tracker/actions/workflows/github-code-scanning/codeql)
[![Deploy](https://github.com/kabaka/hollow-knight-damage-tracker/actions/workflows/deploy.yml/badge.svg)](https://github.com/kabaka/hollow-knight-damage-tracker/actions/workflows/deploy.yml)

> **Never miss a mask break—log every strike from the Forgotten Crossroads to Godhome.**

Hollow Knight Damage Tracker is a responsive companion app for players, co-commentators, and VOD sleuths who want clear combat notes without pausing the action. Track the build, log the hits, and keep the stream chat hyped while the Knight keeps swinging.

<div align="center">
  <img
    src="https://kabaka.github.io/hollow-knight-damage-tracker/docs/app.png"
    alt="Desktop screenshot of the Hollow Knight Damage Tracker interface showing combat controls and analytics."
    style="max-width: 960px; width: 100%; height: auto;"
  />
</div>

<div align="center" style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
  <img
    src="https://kabaka.github.io/hollow-knight-damage-tracker/docs/mobile-app-overview.png"
    alt="Mobile screenshot of the Hollow Knight Damage Tracker showing the encounter scoreboard, combat metrics, and attack controls."
    width="360"
    style="max-width: 100%; height: auto;"
  />
  <img
    src="https://kabaka.github.io/hollow-knight-damage-tracker/docs/mobile-app-log.png"
    alt="Mobile screenshot of the Hollow Knight Damage Tracker scrolled down to reveal the attack buttons and combat history log."
    width="360"
    style="max-width: 100%; height: auto;"
  />
</div>

**Live Demo:** [kabaka.github.io/hollow-knight-damage-tracker](https://kabaka.github.io/hollow-knight-damage-tracker/)

## Highlights

### Track every encounter

- **Sequence flow:** Queue Godhome pantheons, the Black Egg Temple rush, and other multi-boss runs while the tracker advances the moment a boss hits zero masks.
- **Boss presets & custom pools:** Jump between Attuned, Ascended, and Radiant variants—or punch in a custom HP target for drills.
- **Keyboard-first logging:** Number-row + QWERTY shortcuts (plus <kbd>Esc</kbd> / <kbd>Shift</kbd>+<kbd>Esc</kbd>) keep spectators and co-op partners quick on the draw.

### Stay tactical mid-fight

- **Build-aware damage:** Charms, nail upgrades, and spell levels combine automatically so every button shows the exact hit value left.
- **Live analytics:** Remaining HP, DPS, average damage, and actions per minute update in real time with undo/redo support.
- **Mobile haptics:** Distinct vibration cues for attacks, fight completions, sequence milestones, and overcharm warnings keep mobile logging effortless.
- **Session persistence:** Loadouts and fight logs survive refreshes, rage quits, and accidental tab closes.

### Built for streams & VOD dives

- **Responsive layout:** Works on dual-monitor setups, tablets, and phones without juggling windows.
- **Commentator-friendly:** Help modal covers setup, shortcuts, and logging tips—perfect for tournament co-pilots.
- **Battle-tested CI:** Linting, unit tests, e2e runs, and deployments ship with every push so the tracker stays reliable.
- **Installable PWA:** Auto-updating service worker and manifest keep the tracker available offline on GitHub Pages, waiting for fights to finish before refreshing with new assets.

## Project Snapshot

- Responsive UI tuned for Hollow Knight’s aesthetic and readability during frantic fights.
- Modular data models in `src/data/` feed typed combat calculations via `FightStateProvider`.
- Core panels (`BuildConfigPanel`, `AttackLogPanel`, `CombatLogPanel`) share that state to surface presets, controls, and stats.
- App composition (providers, layouts, and feature glue) lives in `src/app/`, while reusable widgets belong in `src/components/`.
- Automated GitHub Actions pipelines handle linting, testing, and GitHub Pages deploys.

## Tech Stack

- [Vite](https://vitejs.dev/) for fast builds and previews.
- [React](https://react.dev/) with TypeScript for a type-safe UI.
- [Vitest](https://vitest.dev/) and [Playwright](https://playwright.dev/) for unit and end-to-end coverage.
- [pnpm](https://pnpm.io/) to manage dependencies, scripts, and pre-commit hooks.

## Getting Started

The project is built with Vite + React + TypeScript and uses `pnpm` for every workflow.

### Prerequisites

- Node.js 18.18 or later
- pnpm 9 or later

### Install dependencies

```bash
pnpm install
```

### Essential scripts

| Command                             | Purpose                                                            |
| ----------------------------------- | ------------------------------------------------------------------ |
| `pnpm dev`                          | Launch the Vite dev server with hot module reloading.              |
| `pnpm build`                        | Type-check the project and produce an optimized production bundle. |
| `pnpm preview`                      | Serve the built app locally for final checks before deployment.    |
| `pnpm lint`                         | Run ESLint and Stylelint to enforce code style and best practices. |
| `pnpm format` / `pnpm format:check` | Apply or verify Prettier formatting across the repo.               |
| `pnpm test`                         | Execute Vitest in CI mode with coverage reporting.                 |
| `pnpm test:watch`                   | Watch unit tests while iterating on features.                      |
| `pnpm test:e2e`                     | Run Playwright end-to-end tests.                                   |

### Testing conventions

- Co-locate unit test files (`*.test.ts[x]`) next to the modules they cover. This keeps helpers like `src/utils/format.ts` and
  `src/utils/format.test.ts` together, while Playwright suites remain under `tests/`.

### Progressive Web App

- **Install on desktop or mobile:** Open the deployed site in a Chromium-based browser (desktop) or Safari/Chrome (mobile) and use the native “Install”/“Add to Home Screen” prompt. The app advertises its manifest via `<link rel="manifest" href="./manifest.webmanifest">`, so compatible browsers surface the install action automatically.
- **Offline-first caching:** A Workbox-powered service worker precaches the critical shell and fonts. After the first visit completes, the tracker continues to load without a network connection—ideal for venues with unreliable Wi-Fi.
- **Seamless updates:** The service worker uses the `autoUpdate` strategy from `vite-plugin-pwa`. When a new deployment ships, the helper in `src/sw-registration.ts` waits for the current fight to finish before calling `registration.update()` and reloading the page, ensuring commentators never lose their place mid-encounter.
- **Local testing parity:** `pnpm dev` enables the same service worker configuration as production, so you can verify installation prompts, offline behaviour, and update flows locally without a custom build step.

A `pre-commit` hook powered by [`simple-git-hooks`](https://github.com/toplenboren/simple-git-hooks) automatically runs formatting, linting, and unit tests before every commit.

## Roadmap

- ✅ **Scaffolding:** TypeScript, linting, tests, and deployment all wired up.
- ✅ **Core tracking:** Build configuration, attack logging, boss presets, and custom HP pools.
- ✅ **Design system:** Responsive layouts, reusable components, and the Hallownest-inspired theme.
- 🛠️ **Deeper analytics:** DPS breakdowns, streak tracking, and shareable summaries.
- 🌙 **Polish & reach:** Accessibility review, localization, and broader browser support.

## Contributing

We welcome fellow Knights, lore-keepers, and UI artisans! Feel free to [open an issue](https://github.com/kabaka/hollow-knight-damage-tracker/issues) to discuss new features, tricky bugs, or UX polish.

1. Fork the repository and create a feature branch.
2. Run `pnpm install` to pull dependencies and auto-install the pre-commit hook.
3. Make your changes, keeping tests, linting, and accessibility in mind.
4. Run the relevant scripts (lint, tests, e2e if applicable) before opening a pull request.
5. Submit a PR with context, screenshots or clips if the UI changed, and reference any related issues.

For repository-specific expectations, consult [`AGENTS.md`](AGENTS.md).

> ℹ️ **PWA assets:** Icons live under `public/icons/` and the manifest/service worker are generated automatically by `vite-plugin-pwa`. Running `pnpm build` or `pnpm preview` will regenerate the precache manifest—no manual cache busting required after updating assets.

## Disclaimer

This is an unofficial fan project. All Hollow Knight assets are © Team Cherry and used under fair use for commentary and education.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
