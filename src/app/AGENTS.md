# App Composition Guidelines

The `src/app/` directory (including its `components/` subfolder) exists for application wiring:

- Compose providers, layouts, and page-level shells here.
- Keep routing glue, context bridges, and feature orchestration at this level.
- Do **not** place reusable, presentation-only widgets in this tree—move them to `src/components/` instead.

## Component Placement Checklist

Use this quick guide when creating a component:

- **It wires providers, fetches data, or controls page-level layout?** Keep it in `src/app/`.
- **It is a reusable widget driven by props and free of app-specific state?** Build it in `src/components/`.
- **It started as wiring but no longer owns app state?** Refactor it into `src/components/`.

When in doubt, default to `src/components/` and promote it into `src/app/` only if it needs to orchestrate app state.
