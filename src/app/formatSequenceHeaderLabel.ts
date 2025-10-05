export type SequenceProgress = { current: number; total: number };

export const formatSequenceHeaderLabel = (
  sequenceName: string,
  progress: SequenceProgress,
) => {
  const total = Math.max(progress.total, 1);
  const current = Math.min(Math.max(progress.current, 1), total);
  return `${sequenceName} (${current}/${total})`;
};
