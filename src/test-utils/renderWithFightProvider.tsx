import type { ReactElement } from 'react';
import { render } from '@testing-library/react';

import { FightStateProvider } from '../features/fight-state/FightStateContext';

export const renderWithFightProvider = (ui: ReactElement) =>
  render(<FightStateProvider>{ui}</FightStateProvider>);
