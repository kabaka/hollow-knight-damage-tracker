import { type FC } from 'react';

import type { AttackGroupWithMetadata } from '../attackDefinitionBuilders';
import type { AttackLogActionPayload } from '../types';
import { isActivationKey } from './isActivationKey';

type AttackButtonGridProps = {
  readonly group: AttackGroupWithMetadata;
  readonly onLogAttack: (attack: AttackLogActionPayload) => void;
  readonly onTriggerActiveEffect: (element: HTMLElement | null) => void;
};

export const AttackButtonGrid: FC<AttackButtonGridProps> = ({
  group,
  onLogAttack,
  onTriggerActiveEffect,
}) => (
  <section className="attack-group">
    <h3 className="attack-group__title">{group.label}</h3>
    <div className="button-grid" role="group" aria-label={group.label}>
      {group.attacks.map((attack) => (
        <button
          key={attack.id}
          type="button"
          className="button-grid__button"
          aria-keyshortcuts={attack.hotkey?.toUpperCase()}
          data-attack-category={attack.category}
          data-attack-id={attack.id}
          onPointerDown={(event) => {
            onTriggerActiveEffect(event.currentTarget);
          }}
          onKeyDown={(event) => {
            if (isActivationKey(event.key)) {
              onTriggerActiveEffect(event.currentTarget);
            }
          }}
          onClick={() => {
            onLogAttack({
              id: attack.id,
              label: attack.label,
              damage: attack.damage,
              category: attack.category,
              soulCost: attack.soulCost ?? null,
            });
          }}
        >
          <div className="button-grid__header">
            <span className="button-grid__label">{attack.label}</span>
            {attack.hotkey ? (
              <span className="button-grid__hotkey" aria-hidden="true">
                {attack.hotkey.toUpperCase()}
              </span>
            ) : null}
          </div>
          {attack.hotkey ? (
            <span className="visually-hidden">
              Shortcut key {attack.hotkey.toUpperCase()}.
            </span>
          ) : null}
          <span className="button-grid__meta">
            <span className="button-grid__damage" aria-label="Damage per hit">
              {attack.damage}
            </span>
            {typeof attack.soulCost === 'number' && attack.category !== 'spell' ? (
              <span className="button-grid__soul" aria-label="Soul cost">
                {attack.soulCost} SOUL
              </span>
            ) : null}
            {typeof attack.hitsRemaining === 'number' ? (
              <span
                className="button-grid__hits"
                aria-label={`To end: ${attack.hitsRemaining}`}
              >
                To end: {attack.hitsRemaining}
              </span>
            ) : null}
          </span>
          {attack.description ? (
            <span className="button-grid__description">{attack.description}</span>
          ) : null}
        </button>
      ))}
    </div>
  </section>
);
