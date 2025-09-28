import type { FC } from 'react';

export type EncounterBrandProps = {
  readonly encounterName: string;
  readonly versionLabel: string | null;
  readonly arenaLabel: string | null;
};

export const EncounterBrand: FC<EncounterBrandProps> = ({
  encounterName,
  versionLabel,
  arenaLabel,
}) => (
  <div className="hud-brand" aria-live="polite">
    <h1 className="hud-brand__title">Hollow Knight Damage Tracker</h1>
    <div className="hud-brand__context">
      <span className="hud-brand__divider" aria-hidden="true">
        ◆
      </span>
      <span className="hud-brand__encounter">
        {encounterName}
        {versionLabel ? (
          <span className="hud-brand__version">({versionLabel})</span>
        ) : null}
      </span>
      {arenaLabel ? (
        <>
          <span className="hud-brand__divider" aria-hidden="true">
            ◆
          </span>
          <span className="hud-brand__arena">{arenaLabel}</span>
        </>
      ) : null}
    </div>
  </div>
);
