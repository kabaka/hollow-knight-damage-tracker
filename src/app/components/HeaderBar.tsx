import type { FC } from 'react';

import { AppButton, EncounterBrand, SurfaceSection } from '../../components';
import type { useFightDerivedStats } from '../../features/fight-state/FightStateContext';
import { TargetScoreboard } from './TargetScoreboard';

export type HeaderBarProps = {
  readonly derived: ReturnType<typeof useFightDerivedStats>;
  readonly encounterName: string;
  readonly versionLabel: string | null;
  readonly arenaLabel: string | null;
  readonly onOpenLoadout: () => void;
  readonly onOpenHelp: () => void;
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
  onOpenLoadout,
  onOpenHelp,
  stageLabel,
  stageProgress,
  onAdvanceStage,
  onRewindStage,
  hasNextStage,
  hasPreviousStage,
}) => (
  <SurfaceSection
    as="header"
    role="banner"
    className="encounter-hud app-navbar"
    variant="navbar"
    titleId="app-header-title"
    titleAs="div"
    title={
      <div className="hud-branding">
        <EncounterBrand
          encounterName={encounterName}
          versionLabel={versionLabel}
          arenaLabel={arenaLabel}
        />
      </div>
    }
    actions={
      <div className="hud-actions">
        <AppButton
          type="button"
          onClick={onOpenLoadout}
          aria-label="Open loadout configuration"
        >
          Loadout
        </AppButton>
        <AppButton type="button" onClick={onOpenHelp}>
          Help
        </AppButton>
      </div>
    }
    bodyClassName="encounter-hud__body"
  >
    <TargetScoreboard
      derived={derived}
      stageLabel={stageLabel}
      stageProgress={stageProgress}
      onAdvanceStage={onAdvanceStage}
      onRewindStage={onRewindStage}
      hasNextStage={hasNextStage}
      hasPreviousStage={hasPreviousStage}
    />
  </SurfaceSection>
);
