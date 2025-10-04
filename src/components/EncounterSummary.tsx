import type { FC } from 'react';

export type EncounterSummaryProps = {
  readonly mode: 'single-target' | 'sequence';
  readonly target: {
    readonly name: string;
    readonly detail?: string | null;
    readonly location?: string | null;
  };
  readonly sequence?: {
    readonly name: string | null;
    readonly stageLabel?: string | null;
    readonly progress?: { current: number; total: number } | null;
  } | null;
};

const buildTargetMeta = (
  detail?: string | null,
  location?: string | null,
): string | null => {
  const parts = [detail, location].filter((value): value is string => Boolean(value));
  return parts.length > 0 ? parts.join(' • ') : null;
};

const buildSequenceMeta = (
  stageLabel?: string | null,
  progress?: { current: number; total: number } | null,
): string | null => {
  if (!stageLabel && !progress) {
    return null;
  }

  const parts: string[] = [];
  if (stageLabel) {
    parts.push(stageLabel);
  }

  if (progress) {
    parts.push(`Stage ${progress.current} of ${progress.total}`);
  }

  return parts.join(' • ');
};

export const EncounterSummary: FC<EncounterSummaryProps> = ({
  mode,
  target,
  sequence,
}) => {
  const targetMeta = buildTargetMeta(target.detail, target.location);
  const sequenceName = sequence?.name ?? null;
  const sequenceMeta = buildSequenceMeta(sequence?.stageLabel, sequence?.progress);
  const shouldShowSequence = mode === 'sequence';

  return (
    <div className="encounter-summary" aria-live="polite">
      <div className="encounter-summary__chip summary-chip summary-chip--toolbar">
        <span className="encounter-summary__title">Target</span>
        <span className="encounter-summary__value">{target.name}</span>
        {targetMeta ? (
          <span className="encounter-summary__meta">{targetMeta}</span>
        ) : null}
      </div>
      {shouldShowSequence ? (
        <div className="encounter-summary__chip summary-chip summary-chip--toolbar">
          <span className="encounter-summary__title">Sequence</span>
          <span className="encounter-summary__value">
            {sequenceName ?? 'Select a sequence'}
          </span>
          {sequenceMeta ? (
            <span className="encounter-summary__meta">{sequenceMeta}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
