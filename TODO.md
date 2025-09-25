# Project TODO

## High Priority
- [ ] Scaffold a React + TypeScript project with Vite and configure pnpm workspace settings.
- [ ] Set up ESLint, Prettier, and Stylelint (for future CSS modules) with a shared configuration.
- [ ] Configure Vitest with React Testing Library and establish coverage thresholds.
- [ ] Add Playwright end-to-end test harness with GitHub Actions integration.
- [ ] Implement Git hooks via Husky or simple `pnpm` scripts to enforce lint/test on commit.
- [ ] Create GitHub Actions workflows for linting, unit tests, e2e tests, and deployment to GitHub Pages.

## Feature Development
- [ ] Define data models for charms, nail upgrades, and other modifiers.
- [ ] Build UI for selecting a boss fight or custom target HP.
- [ ] Implement attack logging buttons grouped by nail attacks, spells, and advanced techniques (e.g., Nail Arts, Shade Soul, Abyss Shriek).
- [ ] Calculate remaining boss HP, DPS, and action-per-second stats in real time.
- [ ] Provide undo/redo controls and quick reset functionality.
- [ ] Offer preset builds for popular charm combinations to speed up configuration.

## Enhancements & Stretch Goals
- [ ] Add support for tracking damage mitigation (e.g., shell, lifeblood, or hitless attempts).
- [ ] Visualize timelines of hits and damage bursts with charts.
- [ ] Enable importing/exporting loadouts and fight logs (JSON or shareable link).
- [ ] Integrate audio/visual cues for thresholds (e.g., boss at 25% HP).
- [ ] Support cooperative race mode where multiple players' logs sync in real time.
- [ ] Research localization needs and plan translation workflow.
- [ ] Add accessibility audit with tooling like axe-core and document results.

## Documentation & Community
- [ ] Draft CONTRIBUTING.md and CODE_OF_CONDUCT.md once project structure stabilizes.
- [ ] Document deployment steps and environment variables (if any) in README.
- [ ] Create UX mockups and gather feedback from Hollow Knight community members.
