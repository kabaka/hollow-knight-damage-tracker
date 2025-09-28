# Repository Guidelines

## General Expectations

- Prefer TypeScript over JavaScript for all application code and configuration whenever possible.
- Use React with functional components and hooks for UI implementation.
- Follow accessibility best practices (semantic HTML, ARIA when necessary, keyboard support).
- Maintain responsive layouts using CSS variables and utility classes rather than hard-coded pixel values.
- Keep dependencies minimal; justify any new dependency additions in the PR description.

## Tooling & Commands

- Package manager: **pnpm**. Include lockfiles in commits and never mix package managers.
- Linting: configure ESLint with TypeScript and React plugins; enforce formatting with Prettier (using `pnpm lint` / `pnpm format`).
- Testing: use Vitest (unit) and Playwright (end-to-end). Provide scripts `pnpm test` and `pnpm test:e2e`.
- Before submitting changes, run all relevant scripts locally and ensure GitHub Actions workflows pass.

## Documentation & Communication

- Update the README and other documentation whenever new features or configuration steps are introduced.
- Write TODO comments sparingly; prefer capturing follow-up work in `TODO.md` or GitHub issues.
- Describe user-facing changes clearly in PR summaries.
- Capture UI screenshots with Playwright when needed for PR summaries:
  - Launch the app (e.g., with `pnpm dev --host 0.0.0.0 --port <port>`), then use the `browser_container.run_playwright_script` tool.
  - Within the Playwright script, connect to the forwarded port, navigate to the relevant route, and use locators plus interaction helpers (`fill`, `click`, etc.) to reach the desired state.
  - Use `locator.screenshot()` or `page.screenshot()` to capture specific components or full pages after simulating the required inputs/state changes. Save artifacts under a relative path so they can be attached in the final response.
  - Reference the generated artifact in the final message using Markdown image syntax, as required by the system instructions.

## File & Directory Structure

- Place source code under `src/` with feature-based subdirectories.
- Store reusable UI elements in `src/components/` and domain logic in `src/features/`.
- Keep integration/end-to-end tests inside `tests/` at the project root.
- Configuration files belong in the repository root (e.g., `vite.config.ts`, `.eslintrc.cjs`).

## Quality Gates

- Enable pre-commit hooks to run linting, formatting, and relevant tests on staged files.
- CI must block merges on lint/test failures; new checks should be added alongside new tooling.
- Always provide automated test coverage for bug fixes and new features unless impractical (call out exceptions explicitly).
