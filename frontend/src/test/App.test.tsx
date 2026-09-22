import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('VaxAssist AI Frontend Foundation Shell', () => {
  it('renders application shell header cleanly', () => {
    render(<App />);
    const brandElements = screen.getAllByText(/VaxAssist/i);
    expect(brandElements.length).toBeGreaterThan(0);
  });
});
