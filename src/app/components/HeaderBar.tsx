import type { FC } from 'react';

import { AppButton } from '../../components/AppButton';
import { SurfaceSection } from '../../components/SurfaceSection';
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
  <SurfaceSection
    as="header"
    role="banner"
    className="encounter-hud app-navbar"
    variant="navbar"
    titleId="app-header-title"
    titleAs="div"
    title={
      <EncounterBrand
        encounterName={encounterName}
        versionLabel={versionLabel}
        arenaLabel={arenaLabel}
      />
    }
    actions={
      <div className="hud-actions">
        <AppButton
          type="button"
          onClick={onToggleSetup}
          aria-expanded={isSetupOpen}
          aria-controls="encounter-setup"
          icon="⚙️"
        >
          Change encounter
        </AppButton>
        <AppButton type="button" onClick={onOpenLoadout} icon="👤">
          Player loadout
        </AppButton>
        <AppButton type="button" onClick={onOpenHelp} icon="❓">
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
