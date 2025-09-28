import type { FC } from 'react';

export type StageTimelineProps = {
  readonly stageLabel: string | null;
  readonly stageProgress: { current: number; total: number } | null;
  readonly onAdvance: () => void;
  readonly onRewind: () => void;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
};

export const StageTimeline: FC<StageTimelineProps> = ({
  stageLabel,
  stageProgress,
  onAdvance,
  onRewind,
  hasNext,
  hasPrevious,
}) => {
  if (!stageProgress) {
    return null;
  }

  const stageTitle = stageLabel ?? 'Current stage';
  const stagePosition = `${stageProgress.current}/${stageProgress.total}`;

  return (
    <div
      className="hud-timeline summary-chip summary-chip--toolbar"
      role="group"
      aria-label="Stage navigation"
    >
      <button
        type="button"
        className="hud-timeline__control"
        onClick={onRewind}
        disabled={!hasPrevious}
      >
        <span aria-hidden="true">‹</span>
        <span className="sr-only">Previous stage</span>
      </button>
      <span className="hud-timeline__label" aria-live="polite">
        <span className="hud-timeline__title">{stageTitle}</span>
        <span className="hud-timeline__progress">{stagePosition}</span>
      </span>
      <button
        type="button"
        className="hud-timeline__control"
        onClick={onAdvance}
        disabled={!hasNext}
      >
        <span aria-hidden="true">›</span>
        <span className="sr-only">Next stage</span>
      </button>
    </div>
  );
};
