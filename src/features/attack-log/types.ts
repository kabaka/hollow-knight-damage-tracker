import type { RefObject } from 'react';

import type {
  AttackDefinition,
  AttackGroupWithMetadata,
} from './attackDefinitionBuilders';

export type AttackLogActionPayload = {
  id: string;
  label: string;
  damage: number;
  category: string;
  soulCost: number | null;
};

export type AttackLogContextValue = {
  readonly panelRef: RefObject<HTMLDivElement | null>;
  readonly groupsWithMetadata: AttackGroupWithMetadata[];
  readonly logAttack: (attack: AttackLogActionPayload) => void;
  readonly undoLastAttack: () => void;
  readonly redoLastAttack: () => void;
  readonly resetLog: () => void;
  readonly resetSequence: () => void;
  readonly toggleFight: () => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly canResetLog: boolean;
  readonly canResetSequence: boolean;
  readonly showResetSequence: boolean;
  readonly fightButtonLabel: string;
  readonly fightButtonAriaLabel: string;
  readonly fightButtonShortcut: string;
  readonly fightButtonDisabled: boolean;
  readonly triggerActiveEffect: (element: HTMLElement | null) => void;
  readonly registerActionButton: (id: string, element: HTMLButtonElement | null) => void;
};

export type AttackShortcutMap = Map<string, AttackDefinition>;
