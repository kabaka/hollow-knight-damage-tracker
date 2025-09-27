# Hollow Knight Damage Tracker

[![CI](https://github.com/kabaka/hollow-knight-damage-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/kabaka/hollow-knight-damage-tracker/actions/workflows/ci.yml)
[![Dependabot Updates](https://github.com/kabaka/hollow-knight-damage-tracker/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/kabaka/hollow-knight-damage-tracker/actions/workflows/dependabot/dependabot-updates)
[![CodeQL](https://github.com/kabaka/hollow-knight-damage-tracker/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/kabaka/hollow-knight-damage-tracker/actions/workflows/github-code-scanning/codeql)
[![Deploy](https://github.com/kabaka/hollow-knight-damage-tracker/actions/workflows/deploy.yml/badge.svg)](https://github.com/kabaka/hollow-knight-damage-tracker/actions/workflows/deploy.yml)

> **Never lose track of a nail strike again—log every blow from the Crossroads to the Radiance.**

Hollow Knight Damage Tracker is a responsive companion app that captures your Knight's build, every swing, spell, and summon, and translates them into real-time boss progress. Whether you're practicing Godhome pantheons, routing a speedrun, or finally toppling the Pure Vessel, the tracker keeps you focused on the fight.

> ✨ Designed for co-pilots, commentators, and VOD reviewers—let a trusted spectator log hits live or replay the action later while you stay locked in on the battle.

[![Demo of Hollow Knight Damage Tracker in action](https://placehold.co/1200x675/0b0b16/ffffff.png?text=Demo+GIF+Coming+Soon)](#)

**Live Demo:** [kabaka.github.io/hollow-knight-damage-tracker](https://kabaka.github.io/hollow-knight-damage-tracker/)

## Features

### For the Hardcore Player 🛡️

- **Pantheon pacing:** Queue Godhome pantheons or the Black Egg Temple rush and the tracker will advance to the next foe as soon as their mask counter hits zero.
- **Conditional encounters:** Toggle optional bosses like Grey Prince Zote, Sisters of Battle, or The Radiance so every sequence mirrors your save file.
- **Keyboard-first logging:** Memorize the number-row + QWERTY shortcuts (or tap <kbd>Esc</kbd> / <kbd>Shift</kbd>+<kbd>Esc</kbd>) and keep your fingers free for your controller.

### For the Strategist 🧠

- **Your Knight's build:** Combine nail upgrades, spell levels, and charms—including retaliatory vines, minions, and spell conversions—to instantly see tuned damage presets.
- **Boss presets & custom targets:** Swap between Hallownest's fiercest foes, Godhome variants (Attuned, Ascended, Radiant), or set a custom HP pool for practice sessions.
- **Attack grid mastery:** Log nail strikes, spells, and charm effects with undo/redo support. Each button shows how many more hits of that move would finish the fight.

### For the Analyst 📊

- **Live combat analytics:** Track remaining HP, DPS, average damage, and actions per minute with silky 60 FPS updates and sparkline charts.
- **Session persistence:** Your build choices, attack history, and pantheon progress survive browser refreshes and accidental restarts.
- **CI-backed reliability:** Automated linting, unit tests, e2e tests, and deployments run on every push so the tracker is always ready for battle.

## Project Goals

- Support desktop and mobile layouts for quick access during gameplay.
- Allow users to configure their active charms, nail upgrades, spell upgrades, and other modifiers that influence damage values.
- Provide quick buttons for every relevant attack type (nail swings, abilities, spells, and charm interactions) so damage can be recorded with a single tap.
- Offer boss presets or custom targets where each logged hit reduces the remaining health until it reaches zero.
- Display live combat statistics such as DPS, average damage per action, and actions per second.
- Automate deployment to GitHub Pages via GitHub Actions.
- Enforce high code quality with linting, unit tests, integration tests, and pre-commit checks.

## How It Works

The UI now wires together real-time combat calculations driven by typed data models:

- `src/data/` stores structured JSON for charms, nail upgrades, spells, and boss health pools, along with helpers that expose typed lookups.
- `FightStateProvider` (under `src/features/fight-state/`) centralizes build configuration, attack logs, and derived combat statistics that power the UI.
- `BuildConfigPanel`, `AttackLogPanel`, and `CombatStatsPanel` consume the shared state to surface boss presets, configurable damage presets, and running metrics.
- Shared layout primitives live in `src/components/` and global theming resides in `src/styles/`.

Vitest (unit tests) and Playwright (e2e tests) validate that core sections render correctly and that critical interactions—such as selecting bosses or logging attacks—update derived statistics as expected.

Automated workflows in `.github/workflows/` run linting, unit tests, end-to-end tests, and GitHub Pages deployments on every push.

## Visual Language System

The global stylesheet (`src/styles/global.css`) now provides a reusable visual language for depth, translucency, and typography across the tracker.

### Layered depth tokens

- **Translucent panels:** `--surface-glass-low`, `--surface-glass-mid`, `--surface-glass-strong`, and `--surface-panel-muted` mix subtle gradients for layered glass panels.
- **Elevation shadows:** `--elevation-layer-1`, `--elevation-layer-2`, `--elevation-layer-3`, and `--elevation-inner-soft` combine drop shadows with soft inset rims to suggest stacked HUD layers.
- **Accent glows:** `--glow-accent-soft`, `--glow-accent-strong`, and the existing overcharm glow tokens keep interactive elements illuminated without hard borders.

Use these variables instead of hard-coded borders when styling new controls so components inherit the shared depth cues.

### Typography scale

- `--font-size-display`
- `--font-size-headline`
- `--font-size-title`
- `--font-size-subhead`
- `--font-size-body`
- `--font-size-caption`

Apply the scale to headings, buttons, and helper text to keep casing and rhythm consistent. Microcopy that previously relied on `text-transform: uppercase` has been converted to sentence case, so string literals should also use sentence case moving forward.

### Reusable components

- `.app-navbar` wraps sticky headers such as the encounter HUD with layered gradients and accent glow shadows.
- `.app-panel` standardizes raised content blocks used by the attack log and combat stats.
- `.summary-chip` (with modifiers like `--toolbar` and `--accent`) replaces outlined pills for timeline indicators, HP badges, and selection summaries.

When introducing new UI, prefer these primitives before adding bespoke gradients or borders.

## Tech Stack

- [Vite](https://vitejs.dev/) for lightning-fast builds and previews.
- [React](https://react.dev/) with TypeScript for a robust, type-safe UI.
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

A `pre-commit` hook powered by [`simple-git-hooks`](https://github.com/toplenboren/simple-git-hooks) automatically runs formatting, linting, and unit tests before every commit.

## Project Roadmap

- ✅ **Scaffolding:** Initialize the frontend project, configure TypeScript, linting, formatting, and unit test tooling.
- ✅ **Design system:** Establish global styles, responsive layout patterns, and reusable UI components.
- ✅ **Core tracking features:** Implement build configuration inputs, attack logging buttons, and damage calculations.
- ✅ **Boss presets and customization:** Add data for major bosses and allow user-defined targets.
- 🛠️ **Analytics:** Compute DPS, actions per second, streak tracking, and exportable session summaries.
- 🛠️ **Persistence and sharing:** Store configurations locally and explore shareable fight links.
- 🌙 **Polish:** Accessibility review, localization support, performance tuning, and cross-browser testing.

## Contributing

We welcome fellow Knights, lore-keepers, and UI artisans! Feel free to [open an issue](https://github.com/kabaka/hollow-knight-damage-tracker/issues) to discuss new features, tricky bugs, or UX polish.

1. Fork the repository and create a feature branch.
2. Run `pnpm install` to pull dependencies and auto-install the pre-commit hook.
3. Make your changes, keeping tests, linting, and accessibility in mind.
4. Run the relevant scripts (lint, tests, e2e if applicable) before opening a pull request.
5. Submit a PR with context, screenshots or clips if the UI changed, and reference any related issues.

For repository-specific expectations, consult [`AGENTS.md`](AGENTS.md).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
