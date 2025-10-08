import type { AttackEvent, DamageLogAggregates } from './types';

export const createEmptyAggregates = (): DamageLogAggregates => ({
  totalDamage: 0,
  attacksLogged: 0,
  firstAttackTimestamp: null,
  lastAttackTimestamp: null,
});

export const cloneAggregates = (
  aggregates: DamageLogAggregates,
): DamageLogAggregates => ({
  totalDamage: aggregates.totalDamage,
  attacksLogged: aggregates.attacksLogged,
  firstAttackTimestamp: aggregates.firstAttackTimestamp,
  lastAttackTimestamp: aggregates.lastAttackTimestamp,
});

export const deriveDamageLogAggregates = (
  damageLog: AttackEvent[],
): DamageLogAggregates => {
  if (damageLog.length === 0) {
    return createEmptyAggregates();
  }

  let totalDamage = 0;
  let firstAttackTimestamp: number | null = null;
  let lastAttackTimestamp: number | null = null;

  for (const event of damageLog) {
    totalDamage += event.damage;

    if (firstAttackTimestamp === null || event.timestamp < firstAttackTimestamp) {
      firstAttackTimestamp = event.timestamp;
    }

    if (lastAttackTimestamp === null || event.timestamp > lastAttackTimestamp) {
      lastAttackTimestamp = event.timestamp;
    }
  }

  return {
    totalDamage,
    attacksLogged: damageLog.length,
    firstAttackTimestamp,
    lastAttackTimestamp,
  };
};

export const appendEventAggregates = (
  aggregates: DamageLogAggregates,
  event: AttackEvent,
): DamageLogAggregates => {
  const isFirstEvent = aggregates.attacksLogged === 0;
  const firstAttackTimestamp = isFirstEvent
    ? event.timestamp
    : Math.min(aggregates.firstAttackTimestamp ?? event.timestamp, event.timestamp);
  const lastAttackTimestamp = isFirstEvent
    ? event.timestamp
    : Math.max(aggregates.lastAttackTimestamp ?? event.timestamp, event.timestamp);

  return {
    totalDamage: aggregates.totalDamage + event.damage,
    attacksLogged: aggregates.attacksLogged + 1,
    firstAttackTimestamp,
    lastAttackTimestamp,
  };
};

export const removeLastEventAggregates = (
  nextDamageLog: AttackEvent[],
  removedEvent: AttackEvent,
  aggregates: DamageLogAggregates,
): DamageLogAggregates => {
  const nextAttacksLogged = Math.max(0, aggregates.attacksLogged - 1);
  if (nextAttacksLogged === 0) {
    return createEmptyAggregates();
  }

  const firstAttackTimestamp = nextDamageLog[0]?.timestamp ?? null;
  const lastAttackTimestamp = nextDamageLog[nextDamageLog.length - 1]?.timestamp ?? null;

  return {
    totalDamage: aggregates.totalDamage - removedEvent.damage,
    attacksLogged: nextAttacksLogged,
    firstAttackTimestamp,
    lastAttackTimestamp,
  };
};
