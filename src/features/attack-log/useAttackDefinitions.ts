import { useMemo } from 'react';

import type { FightState } from '../fight-state/FightStateContext';
import {
  buildAttackGroups,
  buildAttackMetadata,
  type AttackGroupOptions,
} from './attackDefinitionBuilders';

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

export const useAttackDefinitions = (
  { build }: FightState,
  remainingHp: number,
  bindings?: AttackGroupOptions['bindings'],
) => {
  const baseGroups = useMemo(
    () => buildAttackGroups(build, { bindings }),
    [build, bindings],
  );

  return useMemo(
    () => buildAttackMetadata(baseGroups, remainingHp),
    [baseGroups, remainingHp],
  );
};
