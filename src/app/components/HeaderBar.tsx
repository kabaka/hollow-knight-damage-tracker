import type { FC } from 'react';

import type { useFightDerivedStats } from '../../features/fight-state/FightStateContext';
import { EncounterBrand } from './EncounterBrand';
import { TargetScoreboard } from './TargetScoreboard';

export type HeaderBarProps = {
  readonly derived: ReturnType<typeof useFightDerivedStats>;
  readonly encounterName: string;
  readonly versionLabel: string | null;
  readonly arenaLabel: string | null;
  readonly onToggleSetup: () => void;
  readonly onOpenLoadout: () => void;
  readonly onOpenHelp: () => void;
  readonly isSetupOpen: boolean;
  readonly stageLabel: string | null;
  readonly stageProgress: { current: number; total: number } | null;
  readonly onAdvanceStage: () => void;
  readonly onRewindStage: () => void;
  readonly hasNextStage: boolean;
  readonly hasPreviousStage: boolean;
};

export const HeaderBar: FC<HeaderBarProps> = ({
  derived,
  encounterName,
  versionLabel,
  arenaLabel,
  onToggleSetup,
  onOpenLoadout,
  onOpenHelp,
  isSetupOpen,
  stageLabel,
  stageProgress,
  onAdvanceStage,
  onRewindStage,
  hasNextStage,
  hasPreviousStage,
}) => (
  <header className="encounter-hud app-navbar" role="banner">
    <div className="encounter-hud__primary">
      <EncounterBrand
        encounterName={encounterName}
        versionLabel={versionLabel}
        arenaLabel={arenaLabel}
      />
      <div className="hud-actions">
        <button
          type="button"
          className="hud-actions__button"
          onClick={onToggleSetup}
          aria-expanded={isSetupOpen}
          aria-controls="encounter-setup"
        >
          <span aria-hidden="true">⚙️</span>
          <span className="hud-actions__label">Change encounter</span>
        </button>
        <button type="button" className="hud-actions__button" onClick={onOpenLoadout}>
          <span aria-hidden="true">👤</span>
          <span className="hud-actions__label">Player loadout</span>
        </button>
        <button type="button" className="hud-actions__button" onClick={onOpenHelp}>
          <span aria-hidden="true">❓</span>
          <span className="hud-actions__label">Help</span>
        </button>
      </div>
    </div>
    <TargetScoreboard
      derived={derived}
      stageLabel={stageLabel}
      stageProgress={stageProgress}
      onAdvanceStage={onAdvanceStage}
      onRewindStage={onRewindStage}
      hasNextStage={hasNextStage}
      hasPreviousStage={hasPreviousStage}
    />
  </header>
);
