import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from '../App';

describe('VaxAssist AI Frontend Foundation Shell', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders application shell header cleanly', () => {
    render(<App />);
    const brandElements = screen.getAllByText(/VaxAssist/i);
    expect(brandElements.length).toBeGreaterThan(0);
  });

  const publicRoutes = [
    { path: '/', expectedText: /VaxAssist/i },
    { path: '/login', expectedText: /Sign In/i },
    { path: '/register', expectedText: /Create Your Account/i },
  ];

  publicRoutes.forEach(({ path, expectedText }) => {
    it(`renders public route ${path} cleanly`, async () => {
      window.history.pushState({}, 'Test page', path);
      render(<App />);
      expect(screen.getAllByText(expectedText).length).toBeGreaterThan(0);
    });
  });

  const protectedRoutes = [
    '/dashboard',
    '/family',
    '/vaccinations',
    '/schedule',
    '/reminders',
    '/ai',
    '/reports',
    '/profile',
    '/settings',
  ];

  protectedRoutes.forEach((path) => {
    it(`protects route ${path} and redirects unauthenticated user to login`, async () => {
      window.history.pushState({}, 'Test page', path);
      render(<App />);
      await waitFor(() => {
        expect(screen.getByText(/Sign In to VaxAssist/i)).toBeDefined();
      });
    });
  });
});
