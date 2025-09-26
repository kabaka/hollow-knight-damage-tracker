import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from './App';

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('renders the modern header and panels', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: /hollow knight damage tracker/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /attack log/i, level: 2 })).toBeVisible();
    expect(
      screen.getByRole('heading', { name: /combat overview/i, level: 2 }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: /player loadout/i })).toBeVisible();
  });

  it('allows selecting a custom boss target and updating HP from the header', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText(/boss target/i), 'custom');
    const hpInput = screen.getByLabelText(/custom target hp/i);
    await user.clear(hpInput);
    await user.type(hpInput, '500');

    const targetTile = screen
      .getByText(/target hp/i, { selector: '.summary-chip__label' })
      .closest('.summary-chip');
    expect(targetTile).toHaveTextContent('500');
  });

  it('switches boss versions to reflect Godhome health pools', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText(/boss target/i), 'gruz-mother');
    const versionSelect = await screen.findByLabelText(/boss version/i);
    await user.selectOptions(versionSelect, 'gruz-mother__ascended');

    const targetTile = screen
      .getByText(/target hp/i, { selector: '.summary-chip__label' })
      .closest('.summary-chip');
    expect(targetTile).toHaveTextContent('945');
  });

  it('applies charm presets and enforces overcharm limits', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /player loadout/i }));

    const modal = await screen.findByRole('dialog', { name: /player loadout/i });

    await user.click(
      within(modal).getByRole('button', {
        name: /spellcaster \(shaman \+ twister\)/i,
      }),
    );

    const getCharmButton = (pattern: RegExp) =>
      within(modal)
        .getAllByRole('button', { name: pattern })
        .find(
          (button) => button.getAttribute('aria-pressed') !== null,
        ) as HTMLButtonElement;

    expect(getCharmButton(/shaman stone/i)).toHaveAttribute('aria-pressed', 'true');
    expect(getCharmButton(/spell twister/i)).toHaveAttribute('aria-pressed', 'true');

    const notchSlider = within(modal).getByRole('slider', { name: /notch limit/i });
    fireEvent.change(notchSlider, { target: { value: '5' } });

    const longnailButton = getCharmButton(/longnail/i);
    expect(longnailButton).not.toBeDisabled();
    await user.click(longnailButton);
    await within(modal).findByRole('button', { name: /longnail/i, pressed: true });
    expect(within(modal).getByRole('status')).toHaveTextContent(/overcharmed/i);

    const fragileStrengthButton = getCharmButton(/fragile strength/i);
    expect(fragileStrengthButton).toBeDisabled();
  });

  it('surfaces sequence conditions in the header when selecting a pantheon', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(
      screen.getByLabelText(/boss sequence/i),
      'pantheon-of-the-sage',
    );

    const conditionsGroup = await screen.findByRole('group', {
      name: /sequence conditions/i,
    });
    const checkbox = within(conditionsGroup).getByLabelText(/include grey prince zote/i);
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });
});
