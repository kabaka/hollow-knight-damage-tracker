# Hollow Knight Damage Tracker

Hollow Knight Damage Tracker is a responsive web application designed to help players measure and analyze the damage they deal during boss fights. Users will be able to configure their build, pick a fight or specify a damage target, and log every hit in real time to monitor their progress toward victory.

## Getting Started

The project is built with [Vite](https://vitejs.dev/) and [React](https://react.dev/) using TypeScript. Development tooling is orchestrated with `pnpm`.

### Prerequisites

- Node.js 18.18 or later
- pnpm 9 or later

### Install dependencies

```bash
pnpm install
```

### Available scripts

- `pnpm dev` – start the development server with hot reloading.
- `pnpm build` – type-check the project and generate a production build.
- `pnpm preview` – preview the production build locally.
- `pnpm lint` – run ESLint and Stylelint.
- `pnpm format` / `pnpm format:check` – apply or verify Prettier formatting.
- `pnpm test` – execute Vitest in CI mode with coverage reporting.
- `pnpm test:watch` – run unit tests in watch mode.
- `pnpm test:e2e` – execute Playwright end-to-end tests.

A `pre-commit` hook ensures formatting, linting, and unit tests run before each commit. The hook is configured through [`simple-git-hooks`](https://github.com/toplenboren/simple-git-hooks) and installs automatically when dependencies are installed.

## Project Goals

- Support desktop and mobile layouts for quick access during gameplay.
- Allow users to configure their active charms, nail upgrades, spell upgrades, and other modifiers that influence damage values.
- Provide quick buttons for every relevant attack type (nail swings, abilities, spells, and charm interactions) so damage can be recorded with a single tap.
- Offer boss presets or custom targets where each logged hit reduces the remaining health until it reaches zero.
- Display live combat statistics such as DPS, average damage per action, and actions per second.
- Automate deployment to GitHub Pages via GitHub Actions.
- Enforce high code quality with linting, unit tests, integration tests, and pre-commit checks.

## Current Architecture

The UI now wires together real-time combat calculations driven by typed data models:

- `src/data/` stores structured JSON for charms, nail upgrades, spells, and boss health pools, along with helpers that expose typed lookups.
- `FightStateProvider` (under `src/features/fight-state/`) centralizes build configuration, attack logs, and derived combat statistics that power the UI.
- `BuildConfigPanel`, `AttackLogPanel`, and `CombatStatsPanel` consume the shared state to surface boss presets, configurable damage presets, and running metrics.
- Shared layout primitives live in `src/components/` and global theming resides in `src/styles/`.

Vitest (unit tests) and Playwright (e2e tests) validate that core sections render correctly and that critical interactions—such as selecting bosses or logging attacks—update derived statistics as expected.

### Feature Highlights

- **Boss presets, Godhome variants, and custom targets:** Quickly switch between Hallownest encounters, Godhome trials (Attuned, Ascended, Radiant), or specify any target for practice sessions.
- **Data-driven build controls with charm presets:** Choose nail upgrades, toggle influential charms, apply popular charm loadouts with one click, and declare which spell upgrades are available to tune damage presets.
- **Categorized attack logging with undo/redo:** Nail strikes, spell casts, and advanced techniques each expose context-aware damage values that respect build modifiers like Unbreakable Strength or Shaman Stone, while new undo/redo controls make correcting mistakes effortless.
- **Live combat analytics:** Remaining HP, DPS, average damage, and actions per minute update instantly as attacks are logged, giving immediate feedback on fight pacing.

Automated workflows in `.github/workflows/` run linting, unit tests, end-to-end tests, and GitHub Pages deployments on every push.

## Project Roadmap

1. **Scaffolding:** Initialize the frontend project, configure TypeScript, linting, formatting, and unit test tooling.
2. **Design system:** Establish global styles, responsive layout patterns, and reusable UI components.
3. **Core tracking features:** Implement build configuration inputs, attack logging buttons, and damage calculations.
4. **Boss presets and customization:** Add data for major bosses and allow user-defined targets.
5. **Analytics:** Compute DPS, actions per second, streak tracking, and exportable session summaries.
6. **Persistence and sharing:** Store configurations locally and explore shareable fight links.
7. **Polish:** Accessibility review, localization support, performance tuning, and cross-browser testing.

## Contributing

Project structure and contribution guidelines will be documented once the application scaffolding is in place. Until then, see `AGENTS.md` for repository-specific instructions.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
