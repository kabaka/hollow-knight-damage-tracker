import { render, screen } from '@testing-library/react';

import { App } from './App';

describe('App', () => {
  it('renders the tracker sections', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: /configure your build/i, level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /log attacks/i, level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /combat overview/i, level: 2 }),
    ).toBeInTheDocument();
  });

  it('introduces the tracker in the header', () => {
    render(<App />);

    expect(
      screen.getByText(/hollow knight damage tracker/i, { selector: 'p' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/plan your build/i)).toBeVisible();
  });
});
