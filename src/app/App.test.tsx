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

  it('allows selecting a custom boss target and updating HP from the modal', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText(/boss target/i), 'custom');
    await user.click(screen.getByRole('button', { name: /player loadout/i }));

    const modal = await screen.findByRole('dialog', { name: /player loadout/i });
    const hpInput = within(modal).getByLabelText(/custom target hp/i);
    await user.clear(hpInput);
    await user.type(hpInput, '500');

    const targetTile = screen
      .getByText(/target hp/i, { selector: '.summary-tile__label' })
      .closest('.summary-tile');
    expect(targetTile).toHaveTextContent('500');
  });

  it('switches boss versions to reflect Godhome health pools', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText(/boss target/i), 'gruz-mother');
    await user.click(screen.getByRole('button', { name: /player loadout/i }));

    const modal = await screen.findByRole('dialog', { name: /player loadout/i });
    const versionSelect = within(modal).getByLabelText(/boss version/i);
    await user.selectOptions(versionSelect, 'gruz-mother__ascended');

    const targetTile = screen
      .getByText(/target hp/i, { selector: '.summary-tile__label' })
      .closest('.summary-tile');
    expect(targetTile).toHaveTextContent('945');
  });

  it('applies charm presets and enforces notch limits', async () => {
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

    const shamanStoneButton = getCharmButton(/shaman stone/i);
    const spellTwisterButton = getCharmButton(/spell twister/i);

    expect(shamanStoneButton).toHaveAttribute('aria-pressed', 'true');
    expect(spellTwisterButton).toHaveAttribute('aria-pressed', 'true');

    const notchSlider = within(modal).getByRole('slider', { name: /notch limit/i });
    fireEvent.change(notchSlider, { target: { value: '3' } });

    const quickSlashButton = getCharmButton(/quick slash/i);
    await user.click(quickSlashButton);

    const fragileStrengthButton = getCharmButton(/fragile strength/i);
    expect(fragileStrengthButton).toBeDisabled();
  });
});
