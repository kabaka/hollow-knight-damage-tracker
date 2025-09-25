import type { FC } from 'react';

const charmOptions = [
  'Unbreakable Strength',
  'Quick Slash',
  'Shaman Stone',
  'Spell Twister',
];

const nailLevels = [
  'Base Nail',
  'Sharpened Nail',
  'Channeled Nail',
  'Coiled Nail',
  'Pure Nail',
];

export const BuildConfigPanel: FC = () => {
  return (
    <form className="form-grid" aria-describedby="build-config-description">
      <p id="build-config-description" className="section__description">
        Configure a quick approximation of your build so damage buttons can reflect your
        modifiers. Detailed configuration will arrive in later milestones.
      </p>
      <div className="form-field">
        <label htmlFor="nail-level">Nail Upgrade</label>
        <select id="nail-level" defaultValue={nailLevels[0]}>
          {nailLevels.map((level) => (
            <option key={level}>{level}</option>
          ))}
        </select>
        <small>Damage values adjust to the selected nail tier.</small>
      </div>
      <div className="form-field">
        <label htmlFor="spell-upgrade">Spell Upgrade</label>
        <select id="spell-upgrade" defaultValue="None">
          <option>None</option>
          <option>Vengeful Spirit</option>
          <option>Shade Soul</option>
          <option>Howling Wraiths</option>
          <option>Abyss Shriek</option>
        </select>
        <small>Higher tiers increase spell damage presets.</small>
      </div>
      <div className="form-field">
        <label htmlFor="active-charms">Key Charms</label>
        <select id="active-charms" multiple size={Math.min(charmOptions.length, 5)}>
          {charmOptions.map((charm) => (
            <option key={charm}>{charm}</option>
          ))}
        </select>
        <small>Select the charms influencing your combat style.</small>
      </div>
    </form>
  );
};
