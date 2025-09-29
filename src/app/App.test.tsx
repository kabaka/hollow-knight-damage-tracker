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

  it('renders the HUD banner and panels', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: /hollow knight damage tracker/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /attack log/i, level: 2 })).toBeVisible();
    expect(screen.getByRole('heading', { name: /combat log/i, level: 2 })).toBeVisible();
    expect(screen.getByRole('button', { name: /player loadout/i })).toBeVisible();
    const changeEncounter = screen.getByRole('button', { name: /change encounter/i });
    expect(changeEncounter).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(screen.getByRole('banner')).getByRole('progressbar', { name: /boss hp/i }),
    ).toBeInTheDocument();
  });

  it('allows selecting a custom boss target and updating HP from the HUD', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /change encounter/i }));
    const optionsToggle = screen.getByRole('button', {
      name: /toggle advanced target options/i,
    });
    await user.click(optionsToggle);
    await user.click(screen.getByRole('radio', { name: /custom/i }));
    const hpInput = await screen.findByLabelText(/custom target hp/i);
    await user.click(hpInput);
    await user.keyboard('{Control>}a{/Control}');
    await user.keyboard('{Backspace}');
    await user.type(hpInput, '500');

    expect(
      within(screen.getByRole('banner')).getByText(/500\s*\/\s*500/),
    ).toBeInTheDocument();
  });

  it('filters the boss list with fuzzy search', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /change encounter/i }));
    const search = await screen.findByLabelText(/search bosses/i);

    await user.type(search, 'rdnc');

    expect(
      await screen.findByRole('radio', { name: /the radiance/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /gruz mother/i })).not.toBeInTheDocument();

    await user.clear(search);
    expect(screen.getByRole('radio', { name: /gruz mother/i })).toBeInTheDocument();
  });

  it('switches boss versions to reflect Godhome health pools', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /change encounter/i }));
    await user.click(screen.getByRole('radio', { name: /gruz mother/i }));
    const optionsToggle = screen.getByRole('button', {
      name: /toggle advanced target options/i,
    });
    await user.click(optionsToggle);
    const versionSelect = await screen.findByLabelText(/boss version/i);
    await user.selectOptions(versionSelect, 'gruz-mother__ascended');

    expect(
      within(screen.getByRole('banner')).getByText(/945\s*\/\s*945/),
    ).toBeInTheDocument();
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

  it('preserves the loadout modal scroll position while editing settings', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /player loadout/i }));
    const modal = await screen.findByRole('dialog', { name: /player loadout/i });
    const modalBody = modal.querySelector('.modal__body') as HTMLElement | null;
    if (!modalBody) {
      throw new Error('Expected the modal body to be present');
    }

    modalBody.scrollTop = 200;

    await user.selectOptions(
      within(modal).getByLabelText(/nail upgrade/i),
      'channelled-nail',
    );

    expect(modalBody.scrollTop).toBe(200);
  });

  it('surfaces sequence conditions in the setup tray when selecting a pantheon', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /change encounter/i }));
    await user.selectOptions(screen.getByLabelText(/mode/i), 'pantheon-of-the-sage');

    const conditionsGroup = await screen.findByRole('group', {
      name: /sequence conditions/i,
    });
    const checkbox = within(conditionsGroup).getByLabelText(/include grey prince zote/i);
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });
});
