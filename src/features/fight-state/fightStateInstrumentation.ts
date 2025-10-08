let aggregateComputationCount = 0;
let aggregateMismatchCount = 0;

export const incrementAggregateComputationCount = () => {
  aggregateComputationCount += 1;
};

export const incrementAggregateMismatchCount = () => {
  aggregateMismatchCount += 1;
};

export const resetAggregateComputationCount = () => {
  aggregateComputationCount = 0;
  aggregateMismatchCount = 0;
};

export const getAggregateComputationCount = () => aggregateComputationCount;

export const getAggregateMismatchCount = () => aggregateMismatchCount;

export const __TESTING__ = {
  getAggregateComputationCount,
  getAggregateMismatchCount,
  resetAggregateComputationCount,
};
