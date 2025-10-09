import { type FC } from 'react';

import { AttackButtonGrid } from './components/AttackButtonGrid';
import { useAttackLogContext } from './AttackLogContext';

export const AttackLogPanel: FC = () => {
  const { groupsWithMetadata, logAttack, panelRef, triggerActiveEffect } =
    useAttackLogContext();

  return (
    <div ref={panelRef} className="attack-log">
      <div className="attack-groups">
        {groupsWithMetadata.map((group) => (
          <AttackButtonGrid
            key={group.id}
            group={group}
            onLogAttack={logAttack}
            onTriggerActiveEffect={triggerActiveEffect}
          />
        ))}
      </div>
    </div>
  );
};
