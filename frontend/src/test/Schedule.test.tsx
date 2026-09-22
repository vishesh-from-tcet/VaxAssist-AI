import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SchedulePage } from '../pages/SchedulePage';
import { BrowserRouter } from 'react-router-dom';
import { familyService } from '../services/familyService';
import { scheduleService } from '../services/scheduleService';

vi.mock('../services/familyService', () => ({
  familyService: {
    getFamilies: vi.fn(),
    getFamily: vi.fn(),
  },
}));

vi.mock('../services/scheduleService', () => ({
  scheduleService: {
    getMemberSchedule: vi.fn(),
    getFamilySchedule: vi.fn(),
  },
}));

describe('VaxAssist Phase 4 Schedule Timeline UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders deterministic schedule timeline and milestone indicators', async () => {
    (familyService.getFamilies as any).mockResolvedValue([
      { id: 'fam-1', name: 'The Sharma Family', user_id: 'u-1' },
    ]);

    (familyService.getFamily as any).mockResolvedValue({
      id: 'fam-1',
      name: 'The Sharma Family',
      user_id: 'u-1',
      members: [
        {
          id: 'mem-1',
          name: 'Leo Sharma',
          date_of_birth: '2023-01-10',
          relationship: 'Child',
          family_id: 'fam-1',
          user_id: 'u-1',
        },
      ],
    });

    (scheduleService.getMemberSchedule as any).mockResolvedValue({
      member_id: 'mem-1',
      member_name: 'Leo Sharma',
      date_of_birth: '2023-01-10',
      calculated_age_days: 1100,
      calculated_age_label: '3.0 years old',
      country: 'IN',
      region: 'National',
      schedule_version: 'v1.0.0-demo-2026',
      effective_date: '2024-01-01',
      source: 'DEMO - Universal Immunization Program (UIP) & WHO Essential Guidelines',
      summary: {
        total_rules: 15,
        completed_count: 1,
        upcoming_count: 2,
        overdue_count: 3,
        unverified_count: 0,
      },
      completed: [
        {
          rule_id: 'UIP-BCG-0',
          vaccine_name: 'BCG (Tuberculosis)',
          dose: 'Birth Dose',
          recommended_age: 'At Birth',
          administered_date: '2023-01-11',
          status: 'completed',
          source: 'DEMO - UIP Guidelines',
          schedule_version: 'v1.0.0-demo-2026',
          effective_date: '2024-01-01',
          explanation: 'Administered on 2023-01-11. Verified against deterministic rule UIP-BCG-0.',
        },
      ],
      upcoming: [
        {
          rule_id: 'UIP-DTP-B2',
          vaccine_name: 'DTP Booster 2',
          dose: 'Booster 2',
          recommended_age: '5-6 Years',
          due_date: '2028-01-10',
          status: 'upcoming',
          source: 'DEMO - UIP Guidelines',
          schedule_version: 'v1.0.0-demo-2026',
          effective_date: '2024-01-01',
          explanation: 'Upcoming milestone.',
        },
      ],
      overdue: [
        {
          rule_id: 'UIP-DTP-1',
          vaccine_name: 'Pentavalent / DTP (Dose 1)',
          dose: 'Dose 1',
          recommended_age: '6 Weeks',
          due_date: '2023-02-21',
          overdue_days: 900,
          status: 'overdue',
          source: 'DEMO - UIP Guidelines',
          schedule_version: 'v1.0.0-demo-2026',
          effective_date: '2024-01-01',
          explanation: 'Overdue by 900 days.',
        },
      ],
      unknown_unverified: [],
    });

    render(
      <BrowserRouter>
        <SchedulePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Immunization Schedule Engine/i)).toBeDefined();
      expect(screen.getByText(/100% Deterministic Rule Engine/i)).toBeDefined();
      expect(screen.getByText(/BCG \(Tuberculosis\)/i)).toBeDefined();
      expect(screen.getByText(/DTP Booster 2/i)).toBeDefined();
      expect(screen.getByText(/Pentavalent \/ DTP \(Dose 1\)/i)).toBeDefined();
      expect(screen.getByText('Completed Doses')).toBeDefined();
      expect(screen.getByText('Overdue Doses')).toBeDefined();
    });
  });
});
