import type { ChangeEvent, FC } from 'react';
import { useMemo } from 'react';

import {
  CUSTOM_BOSS_ID,
  useFightState,
  type SpellLevel,
} from '../fight-state/FightStateContext';
import type { Charm } from '../../data';
import {
  bossMap,
  bosses,
  charmMap,
  supportedCharmIds,
  nailUpgrades,
  spells,
} from '../../data';

type SupportedCharmId = (typeof supportedCharmIds)[number];

const orderCharmIds = (selected: string[]) => {
  const ordered = supportedCharmIds.filter((charmId) => selected.includes(charmId));
  const extras = selected.filter((id) => !ordered.includes(id as SupportedCharmId));
  return [...ordered, ...extras];
};

const CHARM_GROUPS = [
  {
    id: 'damage-boosts',
    label: 'Damage Modifiers',
    description:
      'Boost core attacks, alter casting efficiency, or unlock nail-based projectiles.',
    charmIds: [
      'fragile-strength',
      'unbreakable-strength',
      'fury-of-the-fallen',
      'shaman-stone',
      'spell-twister',
      'quick-slash',
      'grubberflys-elegy',
      'flukenest',
    ],
  },
  {
    id: 'area-control',
    label: 'Area & Retaliation Damage',
    description:
      'Automated bursts, auras, and counterattacks that keep pressure on nearby foes.',
    charmIds: [
      'thorns-of-agony',
      'sharp-shadow',
      'dreamshield',
      'defenders-crest',
      'spore-shroom',
    ],
  },
  {
    id: 'summons',
    label: 'Summoned Allies',
    description:
      'Call in hatchlings or weavers to chip away at health bars while you focus on mechanics.',
    charmIds: ['glowing-womb', 'weaversong', 'grimmchild'],
  },
] satisfies Array<{
  id: string;
  label: string;
  description: string;
  charmIds: SupportedCharmId[];
}>;

const CHARM_PRESETS = [
  {
    id: 'spellcaster',
    label: 'Spellcaster (Shaman + Twister)',
    charmIds: ['shaman-stone', 'spell-twister'],
  },
  {
    id: 'strength-speed',
    label: 'Strength & Quick Slash',
    charmIds: ['unbreakable-strength', 'quick-slash'],
  },
  {
    id: 'glass-cannon',
    label: 'Glass Cannon (Fragile Strength + Shaman Stone)',
    charmIds: ['fragile-strength', 'shaman-stone'],
  },
] as const;

export const BuildConfigPanel: FC = () => {
  const {
    state: { selectedBossId, customTargetHp, build },
    actions,
  } = useFightState();

  const charmGroups = useMemo(
    () =>
      CHARM_GROUPS.map((group) => ({
        ...group,
        charms: group.charmIds
          .map((id) => charmMap.get(id))
          .filter((charm): charm is Charm => Boolean(charm)),
      })).filter((group) => group.charms.length > 0),
    [],
  );

  const selectedTarget = useMemo(() => bossMap.get(selectedBossId), [selectedBossId]);

  const selectedBoss = useMemo(
    () =>
      selectedTarget
        ? bosses.find((boss) => boss.id === selectedTarget.bossId)
        : undefined,
    [selectedTarget],
  );

  const bossSelectValue =
    selectedBossId === CUSTOM_BOSS_ID
      ? CUSTOM_BOSS_ID
      : (selectedTarget?.bossId ?? CUSTOM_BOSS_ID);

  const selectedVersion = selectedTarget?.version;

  const handleBossChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextBossId = event.target.value;
    if (nextBossId === CUSTOM_BOSS_ID) {
      actions.selectBoss(CUSTOM_BOSS_ID);
      return;
    }

    const nextBoss = bosses.find((boss) => boss.id === nextBossId);
    const nextTargetId = nextBoss?.versions[0]?.targetId;
    if (nextTargetId) {
      actions.selectBoss(nextTargetId);
    }
  };

  const handleBossVersionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    actions.selectBoss(event.target.value);
  };

  const handleCustomHpChange = (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = Number.parseInt(event.target.value, 10);
    if (Number.isNaN(parsed)) {
      return;
    }
    actions.setCustomTargetHp(parsed);
  };

  const handleNailChange = (event: ChangeEvent<HTMLSelectElement>) => {
    actions.setNailUpgrade(event.target.value);
  };

  const toggleCharm = (charmId: string) => {
    const isActive = build.activeCharmIds.includes(charmId);
    const nextIds = isActive
      ? build.activeCharmIds.filter((id) => id !== charmId)
      : [...build.activeCharmIds, charmId];
    actions.setActiveCharms(orderCharmIds(nextIds));
  };

  const applyCharmPreset = (charmIds: string[]) => {
    actions.setActiveCharms(orderCharmIds(charmIds));
  };

  const handleSpellLevelChange = (spellId: string, level: SpellLevel) => {
    actions.setSpellLevel(spellId, level);
  };

  return (
    <form className="form-grid" aria-describedby="build-config-description">
      <p id="build-config-description" className="section__description">
        Configure your encounter target and upgrades so the tracker can calculate damage
        values that match your build.
      </p>

      <div className="form-field">
        <label htmlFor="boss-target">Boss Target</label>
        <select id="boss-target" value={bossSelectValue} onChange={handleBossChange}>
          {bosses.map((boss) => (
            <option key={boss.id} value={boss.id}>
              {boss.name}
            </option>
          ))}
          <option value={CUSTOM_BOSS_ID}>Custom target</option>
        </select>
        <small>
          {selectedBossId === CUSTOM_BOSS_ID
            ? 'Set an exact HP amount for practice or race scenarios.'
            : `${selectedBoss?.location ?? 'Unknown arena'} • ${
                selectedVersion?.title ?? 'Standard'
              } • ${selectedTarget?.hp.toLocaleString() ?? '?'} HP`}
        </small>
      </div>

      {selectedBossId !== CUSTOM_BOSS_ID && selectedBoss ? (
        <div className="form-field">
          <label htmlFor="boss-version">Boss Version</label>
          <select
            id="boss-version"
            value={selectedBossId}
            onChange={handleBossVersionChange}
          >
            {selectedBoss.versions.map((version) => (
              <option key={version.targetId} value={version.targetId}>
                {version.title} • {version.hp.toLocaleString()} HP
              </option>
            ))}
          </select>
          <small>Toggle between Hallownest encounters and Godhome trials.</small>
        </div>
      ) : null}

      {selectedBossId === CUSTOM_BOSS_ID ? (
        <div className="form-field">
          <label htmlFor="custom-target-hp">Custom Target HP</label>
          <input
            id="custom-target-hp"
            type="number"
            min={1}
            step={10}
            value={customTargetHp}
            onChange={handleCustomHpChange}
          />
          <small>Adjust this value to match boss variants or modded fights.</small>
        </div>
      ) : null}

      <div className="form-field">
        <label htmlFor="nail-level">Nail Upgrade</label>
        <select id="nail-level" value={build.nailUpgradeId} onChange={handleNailChange}>
          {nailUpgrades.map((upgrade) => (
            <option key={upgrade.id} value={upgrade.id}>
              {upgrade.name}
            </option>
          ))}
        </select>
        <small>Damage values adjust to the selected nail tier.</small>
      </div>

      <div className="form-field">
        <span className="form-field__label">Charm Presets</span>
        <div className="quick-actions" role="group" aria-label="Charm presets">
          {CHARM_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="quick-actions__button"
              onClick={() => applyCharmPreset(preset.charmIds)}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            className="quick-actions__button"
            onClick={() => actions.setActiveCharms([])}
          >
            Clear charms
          </button>
        </div>
        <small>Apply popular loadouts instantly; you can fine-tune charms below.</small>
      </div>

      <div className="form-field">
        <span className="form-field__label">Damage Charms</span>
        <div className="choice-groups">
          {charmGroups.map((group) => {
            const descriptionId = `${group.id}-description`;
            return (
              <fieldset
                key={group.id}
                className="choice-section"
                aria-describedby={descriptionId}
              >
                <legend className="choice-section__legend">{group.label}</legend>
                <p id={descriptionId} className="choice-section__description">
                  {group.description}
                </p>
                <div className="choice-list choice-list--columns">
                  {group.charms.map((charm) => {
                    const summary = charm.effects
                      .map((effect) => effect.effect)
                      .join(' ');
                    const checkboxId = `charm-${charm.id}`;
                    return (
                      <div key={charm.id} className="choice-list__option">
                        <input
                          id={checkboxId}
                          type="checkbox"
                          checked={build.activeCharmIds.includes(charm.id)}
                          onChange={() => toggleCharm(charm.id)}
                        />
                        <label htmlFor={checkboxId} className="choice-list__option-label">
                          <span className="choice-list__label">{charm.name}</span>
                          <span className="choice-list__description">{summary}</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>
        <small>
          Toggle any charms that influence damage output or create new attacks.
        </small>
      </div>

      <div className="form-field">
        <span className="form-field__label">Spell Focus</span>
        <div className="choice-list" role="group" aria-label="Select spell upgrades">
          {spells.map((spell) => (
            <fieldset key={spell.id} className="choice-list__fieldset">
              <legend>{spell.name}</legend>
              <div className="choice-list__option">
                <input
                  id={`spell-${spell.id}-base`}
                  type="radio"
                  name={`spell-${spell.id}`}
                  value="base"
                  checked={build.spellLevels[spell.id] === 'base'}
                  onChange={() => handleSpellLevelChange(spell.id, 'base')}
                />
                <label
                  htmlFor={`spell-${spell.id}-base`}
                  className="choice-list__option-label"
                >
                  <span className="choice-list__label">{spell.base.name}</span>
                </label>
              </div>
              {spell.upgrade ? (
                <div className="choice-list__option">
                  <input
                    id={`spell-${spell.id}-upgrade`}
                    type="radio"
                    name={`spell-${spell.id}`}
                    value="upgrade"
                    checked={build.spellLevels[spell.id] === 'upgrade'}
                    onChange={() => handleSpellLevelChange(spell.id, 'upgrade')}
                  />
                  <label
                    htmlFor={`spell-${spell.id}-upgrade`}
                    className="choice-list__option-label"
                  >
                    <span className="choice-list__label">{spell.upgrade.name}</span>
                  </label>
                </div>
              ) : null}
            </fieldset>
          ))}
        </div>
        <small>Choose the spell variants available in your current run.</small>
      </div>
    </form>
  );
};
