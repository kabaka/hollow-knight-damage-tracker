import type { FC, PropsWithChildren } from 'react';
import { createContext, useContext, useMemo } from 'react';

import { AppButton } from '../../components/AppButton';
import {
  useCombatLogController,
  type CombatLogControllerValue,
} from './useCombatLogController';

const CombatLogContext = createContext<CombatLogControllerValue | null>(null);

const useCombatLogContext = () => {
  const context = useContext(CombatLogContext);
  if (!context) {
    throw new Error('useCombatLogContext must be used within a CombatLogProvider');
  }
  return context;
};

export const CombatLogProvider: FC<PropsWithChildren> = ({ children }) => {
  const { entries, logViewportRef, handleResetLog } = useCombatLogController();
  const contextValue = useMemo(
    () => ({ entries, logViewportRef, handleResetLog }),
    [entries, handleResetLog, logViewportRef],
  );

  return (
    <CombatLogContext.Provider value={contextValue}>{children}</CombatLogContext.Provider>
  );
};

export const CombatLogPanel: FC = () => {
  const { entries, logViewportRef } = useCombatLogContext();

  return (
    <div className="combat-log__wrapper">
      <div
        ref={logViewportRef}
        className="combat-log"
        role="log"
        aria-live="polite"
        aria-label="Combat history"
      >
        {entries.length === 0 ? (
          <div className="combat-log__placeholder">Combat log will appear here.</div>
        ) : (
          <ol className="combat-log__entries">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="combat-log__entry"
                data-entry-type={entry.type}
              >
                {entry.type === 'event' ? (
                  <>
                    <span className="combat-log__timestamp">{entry.timestamp}</span>
                    <div className="combat-log__content">
                      <span className="combat-log__message">{entry.message}</span>
                      {entry.detail ? (
                        <span className="combat-log__detail">{entry.detail}</span>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="combat-log__banner">
                    <span className="combat-log__message">{entry.message}</span>
                    {entry.context ? (
                      <span className="combat-log__context">{entry.context}</span>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};

export const CombatLogClearButton: FC = () => {
  const { handleResetLog } = useCombatLogContext();

  return (
    <AppButton type="button" onClick={handleResetLog} aria-label="Clear combat log">
      Clear
    </AppButton>
  );
};
