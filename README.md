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
- **Built-in guidance:** Open the header Help modal for a walkthrough of encounter setup, logging controls, shortcuts, and persistence tips.

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

## 🎨 Design Philosophy

The tracker’s interface now mirrors the relics, reliquaries, and parchment that define Hallownest’s menus. Rather than glass panels, every surface feels etched from ancient stone or hammered metal, with soft enamel highlights that echo the Hunter’s Journal and the nailmaster tablets.

### Materiality & Texture

- **Stone-dark foundations:** `--color-bg`, `--color-bg-deep`, and `--color-surface` establish the cavernous midnight blues seen throughout Godhome. Layer radial gradients with `var(--texture-vein)` and `var(--texture-noise)` to keep new panels mottled and weathered instead of flat.
- **Carved silhouettes:** `--shape-tablet` and etched shadow tokens (`--frame-outline`, `--frame-etch`, `--frame-highlight`) deliver sharp, chamfered edges reminiscent of charm plaques and Royal Waterways signage.

### Ornate framing & reusable pieces

- `.app-navbar`, `.app-panel`, `.summary-chip`, and `.modal__content` all clip to `var(--shape-tablet)` and apply the shared etching stack so new layouts inherit the same chiseled border treatment.
- `.summary-chip--toolbar`, `.hud-actions__button`, and the segmented controls trade pill buttons for faceted lozenges that glow with SOUL-blue light on hover.
- The player loadout now features a **charm notch bracelet**: `.notch-panel__bracelet` draws the metal strap and `.notch-dot` renders the circular sockets, filling with pale soullight when equipped and pulsing magenta when overcharmed.

### Typographic voice

- Headings, HUD badges, and ceremonial labels use [Cinzel](https://fonts.google.com/specimen/Cinzel) (`var(--font-display)`) for a carved, gothic cadence similar to the game’s official UI.
- Body copy, tooltips, and stat labels rely on [Source Sans 3](https://fonts.google.com/specimen/Source+Sans+3) for clarity during frantic fights.
- The existing type scale variables (`--font-size-display` through `--font-size-caption`) still govern hierarchy; prefer sentence case microcopy to match the in-game Hunter’s Journal tone.

### Hallownest palette

- `--color-bg` `#04060d` – cavern walls and Godhome’s night sky.
- `--color-surface` / `--color-surface-raised` – oxidized steel tablets for primary panels and chips.
- `--color-border` / `--color-border-soft` – bone-white engraving highlights that define carved edges.
- `--color-accent` – the pale cyan soul glimmer used for hover glows, progress meters, and timeline glyphs.
- `--color-accent-ember` – a warm ember reserved for lore callouts or warning states alongside the long-lived overcharm pink.

When extending the UI, lean on these tokens before introducing bespoke colors so every addition stays anchored to Hallownest’s palette.

### Interactive highlights

- Hover states replace modern drop shadows with rune-like glows (`rgb(215 245 255 / 35%)`) that mirror the SOUL meter charge.
- Buttons and toggles use polygonal `clip-path` treatments to emulate charm slots and tablet corners instead of rounded pills.
- Modals and panels layer subtle noise above the gradients, preventing modern flatness while keeping readability high.

### Atmosphere & Interactivity

- **Dimmed cavern glow:** The global background now layers deep blue-grey gradients, a gentle vignette, and a faint hex lattice so the interface feels like a relic lit within a Godhome chamber.
- **Tactile controls:** Buttons and selects compress with a brief soul-white flash so every click still feels like a strike.
- **State-aware cues:** Combat panels pulse when a fight begins or ends, and the Remaining HP readout glows softly under 25% to telegraph danger and victory without stealing focus.

Contributors can inspect the implementations inside `src/styles/global.css`—mirroring these primitives will keep future components steeped in the same ancient elegance.

### Tactile, Performant Feedback

- **Soul Ripple activations:** Interactive buttons shrink via `transform: scale(0.98)` and emit a pale outline drawn with their `::after` pseudo-element. The ripple races outward (`ripple-out`) and fades within 300 ms so inputs feel immediate rather than floaty.
- **Keyboard and pointer parity:** The same classes fire from pointer presses, key presses, and global shortcuts, guaranteeing identical feedback for mouse and keyboard hunters.
- **GPU-friendly motion:** All animations stick to `transform` and `opacity`, avoiding layout-bound properties. The effect renders entirely in CSS, keeping the interface pinned at 60 FPS even during frantic combat logging.

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
