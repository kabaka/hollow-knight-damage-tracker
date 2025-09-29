import { useMemo } from 'react';

import type { FightState } from '../fight-state/FightStateContext';
import { buildAttackGroups, buildAttackMetadata } from './attackDefinitionBuilders';

export {
  FURY_MULTIPLIER,
  KEY_SEQUENCE,
  RESET_SHORTCUT_KEY,
  buildAttackGroups,
  buildAttackMetadata,
} from './attackDefinitionBuilders';
export type {
  AttackDefinition,
  AttackGroup,
  AttackGroupWithMetadata,
  AttackWithMetadata,
} from './attackDefinitionBuilders';

export const useAttackDefinitions = ({ build }: FightState, remainingHp: number) => {
  const baseGroups = useMemo(() => buildAttackGroups(build), [build]);

  return useMemo(
    () => buildAttackMetadata(baseGroups, remainingHp),
    [baseGroups, remainingHp],
  );
};
