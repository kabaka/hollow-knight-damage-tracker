import { createContext, useContext } from 'react';

import type { AttackLogContextValue } from './types';

export const AttackLogContext = createContext<AttackLogContextValue | null>(null);

export const useAttackLogContext = () => {
  const context = useContext(AttackLogContext);
  if (!context) {
    throw new Error('AttackLog components must be rendered within an AttackLogProvider');
  }
  return context;
};
