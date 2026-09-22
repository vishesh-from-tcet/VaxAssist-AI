import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';

describe('VaxAssist Phase 2 Frontend Authentication', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, 'Test page', '/');
  });

  it('renders login form with email and password inputs', async () => {
    window.history.pushState({}, 'Login page', '/login');
    render(<App />);

    expect(screen.getByText(/Sign In to VaxAssist/i)).toBeDefined();
    expect(screen.getByLabelText(/Email Address/i)).toBeDefined();
    expect(screen.getByLabelText(/Password/i)).toBeDefined();
  });

  it('renders registration form with required inputs', async () => {
    window.history.pushState({}, 'Register page', '/register');
    render(<App />);

    expect(screen.getByText(/Create Your Account/i)).toBeDefined();
    expect(screen.getByLabelText(/Full Name/i)).toBeDefined();
    expect(screen.getByLabelText(/Email Address/i)).toBeDefined();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeDefined();
  });

  it('redirects to login when accessing protected route without auth token', async () => {
    window.history.pushState({}, 'Dashboard page', '/dashboard');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Sign In to VaxAssist/i)).toBeDefined();
    });
  });
});
