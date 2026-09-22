import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('VaxAssist AI Frontend Foundation Shell', () => {
  it('renders application shell header cleanly', () => {
    render(<App />);
    const brandElements = screen.getAllByText(/VaxAssist/i);
    expect(brandElements.length).toBeGreaterThan(0);
  });

  const routes = [
    { path: '/', expectedText: /VaxAssist/i },
    { path: '/login', expectedText: /Sign In|Login/i },
    { path: '/register', expectedText: /Register|Sign Up/i },
    { path: '/dashboard', expectedText: /Dashboard/i },
    { path: '/family', expectedText: /Family|Members/i },
    { path: '/vaccinations', expectedText: /Vaccination/i },
    { path: '/schedule', expectedText: /Schedule/i },
    { path: '/reminders', expectedText: /Reminders/i },
    { path: '/ai', expectedText: /AI|Assistant/i },
    { path: '/reports', expectedText: /Reports/i },
    { path: '/profile', expectedText: /Profile/i },
    { path: '/settings', expectedText: /Settings/i },
  ];

  routes.forEach(({ path, expectedText }) => {
    it(`renders route ${path} without crashing`, () => {
      window.history.pushState({}, 'Test page', path);
      render(<App />);
      expect(screen.getAllByText(expectedText).length).toBeGreaterThan(0);
    });
  });
});

