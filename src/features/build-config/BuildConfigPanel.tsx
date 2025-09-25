import type { ChangeEvent, FC } from 'react';
import { useMemo } from 'react';

import {
  CUSTOM_BOSS_ID,
  useFightState,
  type SpellLevel,
} from '../fight-state/FightStateContext';
import { bosses, charms, keyCharmIds, nailUpgrades, spells } from '../../data';

const orderCharmIds = (selected: string[]) =>
  keyCharmIds.filter((charmId) => selected.includes(charmId));

export const BuildConfigPanel: FC = () => {
  const {
    state: { selectedBossId, customTargetHp, build },
    actions,
  } = useFightState();

  const charmOptions = useMemo(
    () =>
      keyCharmIds
        .map((id) => charms.find((charm) => charm.id === id))
        .filter((charm): charm is NonNullable<typeof charm> => Boolean(charm)),
    [],
  );

  const selectedBoss = useMemo(
    () => bosses.find((boss) => boss.id === selectedBossId),
    [selectedBossId],
  );

  const handleBossChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextBoss = event.target.value;
    actions.selectBoss(nextBoss);
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
        <select id="boss-target" value={selectedBossId} onChange={handleBossChange}>
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
            : `${selectedBoss?.location ?? 'Unknown arena'} • ${selectedBoss?.hp ?? '?'} HP`}
        </small>
      </div>

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
        <span className="form-field__label">Key Charms</span>
        <div className="choice-list" role="group" aria-label="Select key charms">
          {charmOptions.map((charm) => {
            const summary = charm.effects.map((effect) => effect.effect).join(' ');
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
        <small>Select the charms influencing your combat style.</small>
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
