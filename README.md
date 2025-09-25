# Hollow Knight Damage Tracker

Hollow Knight Damage Tracker is a responsive web application designed to help players measure and analyze the damage they deal during boss fights. Users will be able to configure their build, pick a fight or specify a damage target, and log every hit in real time to monitor their progress toward victory.

## Project Goals
- Support desktop and mobile layouts for quick access during gameplay.
- Allow users to configure their active charms, nail upgrades, spell upgrades, and other modifiers that influence damage values.
- Provide quick buttons for every relevant attack type (nail swings, abilities, spells, and charm interactions) so damage can be recorded with a single tap.
- Offer boss presets or custom targets where each logged hit reduces the remaining health until it reaches zero.
- Display live combat statistics such as DPS, average damage per action, and actions per second.
- Automate deployment to GitHub Pages via GitHub Actions.
- Enforce high code quality with linting, unit tests, integration tests, and pre-commit checks.

## Planned Technology Stack
- **Frontend:** Modern web framework (React with TypeScript) and component library suitable for both desktop and mobile layouts.
- **State management:** Lightweight global state solution for logging hits and calculating statistics.
- **Tooling:** ESLint, Prettier, Vitest/React Testing Library (or similar) for tests, Playwright/Cypress for integration coverage.
- **CI/CD:** GitHub Actions workflows for linting, testing, and deployment to GitHub Pages.

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
