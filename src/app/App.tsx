import { useCallback, useEffect, useRef, useState, type FC } from 'react';

import {
  AttackLogActions,
  AttackLogPanel,
  AttackLogProvider,
} from '../features/attack-log/AttackLogPanel';
import { PlayerConfigModal } from '../features/build-config/PlayerConfigModal';
import { useBuildConfiguration } from '../features/build-config/useBuildConfiguration';
import {
  CombatLogClearButton,
  CombatLogPanel,
  CombatLogProvider,
} from '../features/combat-log/CombatLogPanel';
import {
  FightStateProvider,
  useFightDerivedStats,
} from '../features/fight-state/FightStateContext';
import { HelpModal } from '../features/help/HelpModal';
import { useVisualViewportCssVars } from './useVisualViewportCssVars';
import { SurfaceSection } from '../components/SurfaceSection';
import { EncounterSetupPanel } from '../features/encounter-setup';
import { HeaderBar } from './components/HeaderBar';
import { MobilePinnedHud } from './components/MobilePinnedHud';

const AppContent: FC = () => {
  useVisualViewportCssVars();

  const [isModalOpen, setModalOpen] = useState(false);
  const [isSetupOpen, setSetupOpen] = useState(false);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const handleCloseLoadout = useCallback(() => setModalOpen(false), [setModalOpen]);
  const handleCloseHelp = useCallback(() => setHelpOpen(false), [setHelpOpen]);

  const {
    bosses,
    bossSelectValue,
    handleBossChange,
    selectedBoss,
    selectedBossId,
    handleBossVersionChange,
    selectedTarget,
    selectedVersion,
    customTargetHp,
    handleCustomHpChange,
    bossSequences,
    sequenceSelectValue,
    handleSequenceChange,
    sequenceEntries,
    cappedSequenceIndex,
    handleSequenceStageChange,
    handleAdvanceSequence,
    handleRewindSequence,
    hasNextSequenceStage,
    hasPreviousSequenceStage,
    activeSequence,
    sequenceConditionValues,
    handleSequenceConditionToggle,
    currentSequenceEntry,
  } = useBuildConfiguration();

  const derived = useFightDerivedStats();
  const [panelGlow, setPanelGlow] = useState<'idle' | 'victory'>('idle');
  const glowTimeoutRef = useRef<number | null>(null);
  const previousRemainingRef = useRef<number>(derived.remainingHp);

  useEffect(() => {
    if (
      derived.targetHp > 0 &&
      derived.remainingHp === 0 &&
      previousRemainingRef.current > 0
    ) {
      setPanelGlow('victory');
    }
    previousRemainingRef.current = derived.remainingHp;
  }, [derived.remainingHp, derived.targetHp]);

  useEffect(() => {
    if (panelGlow === 'idle') {
      return;
    }
    if (glowTimeoutRef.current) {
      window.clearTimeout(glowTimeoutRef.current);
    }
    const duration = 820;
    const timeoutId = window.setTimeout(() => {
      setPanelGlow('idle');
      glowTimeoutRef.current = null;
    }, duration);
    glowTimeoutRef.current = timeoutId;
    return () => window.clearTimeout(timeoutId);
  }, [panelGlow]);

  useEffect(
    () => () => {
      if (glowTimeoutRef.current) {
        window.clearTimeout(glowTimeoutRef.current);
      }
    },
    [],
  );

  const panelGlowClass = panelGlow === 'victory' ? 'app-panel--glow-victory' : '';

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, select, textarea, [contenteditable="true"]')) {
        return;
      }

      if (event.key === '[') {
        if (hasPreviousSequenceStage) {
          event.preventDefault();
          handleRewindSequence();
        }
      } else if (event.key === ']') {
        if (hasNextSequenceStage) {
          event.preventDefault();
          handleAdvanceSequence();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleAdvanceSequence,
    handleRewindSequence,
    hasNextSequenceStage,
    hasPreviousSequenceStage,
  ]);

  const encounterName = selectedTarget?.bossName ?? 'Custom target';
  const versionLabel = selectedVersion?.title ?? null;
  const arenaLabel = selectedTarget?.location ?? null;
  const stageProgress = activeSequence
    ? {
        current: cappedSequenceIndex + 1,
        total: sequenceEntries.length,
      }
    : null;
  const stageLabel = currentSequenceEntry ? currentSequenceEntry.target.bossName : null;
  return (
    <div className="app-shell">
      <HeaderBar
        derived={derived}
        encounterName={encounterName}
        versionLabel={versionLabel}
        arenaLabel={arenaLabel}
        onToggleSetup={() => setSetupOpen((open) => !open)}
        onOpenLoadout={() => setModalOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        isSetupOpen={isSetupOpen}
        stageLabel={stageLabel}
        stageProgress={stageProgress}
        onAdvanceStage={handleAdvanceSequence}
        onRewindStage={handleRewindSequence}
        hasNextStage={hasNextSequenceStage}
        hasPreviousStage={hasPreviousSequenceStage}
      />
      <MobilePinnedHud derived={derived} encounterName={encounterName} />

      <EncounterSetupPanel
        isOpen={isSetupOpen}
        bosses={bosses}
        bossSelectValue={bossSelectValue}
        onBossChange={handleBossChange}
        selectedBoss={selectedBoss}
        selectedBossId={selectedBossId}
        onBossVersionChange={handleBossVersionChange}
        selectedTarget={selectedTarget}
        selectedVersion={selectedVersion}
        customTargetHp={customTargetHp}
        onCustomHpChange={handleCustomHpChange}
        bossSequences={bossSequences}
        sequenceSelectValue={sequenceSelectValue}
        onSequenceChange={handleSequenceChange}
        sequenceEntries={sequenceEntries}
        cappedSequenceIndex={cappedSequenceIndex}
        onStageSelect={handleSequenceStageChange}
        activeSequence={activeSequence}
        sequenceConditionValues={sequenceConditionValues}
        onConditionToggle={handleSequenceConditionToggle}
      />

      <main className="app-main">
        <AttackLogProvider>
          <SurfaceSection
            title="Attack"
            titleId="attack-log-heading"
            className={panelGlowClass ? `app-panel ${panelGlowClass}` : 'app-panel'}
            actions={<AttackLogActions />}
          >
            <AttackLogPanel />
          </SurfaceSection>
        </AttackLogProvider>
        <CombatLogProvider>
          <SurfaceSection
            title="Combat Log"
            titleId="combat-log-heading"
            className={
              panelGlowClass
                ? `app-panel app-panel--log ${panelGlowClass}`
                : 'app-panel app-panel--log'
            }
            actions={<CombatLogClearButton />}
          >
            <CombatLogPanel />
          </SurfaceSection>
        </CombatLogProvider>
      </main>

      <PlayerConfigModal isOpen={isModalOpen} onClose={handleCloseLoadout} />
      <HelpModal isOpen={isHelpOpen} onClose={handleCloseHelp} />
    </div>
  );
};

export const App: FC = () => (
  <FightStateProvider>
    <AppContent />
  </FightStateProvider>
);
