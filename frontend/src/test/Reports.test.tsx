import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportsPage } from '../pages/ReportsPage';
import { familyService } from '../services/familyService';
import { vaccinationService } from '../services/vaccinationService';
import { scheduleService } from '../services/scheduleService';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../services/familyService', () => ({
  familyService: {
    getFamilies: vi.fn(),
    getFamily: vi.fn(),
    getMember: vi.fn(),
  },
}));

vi.mock('../services/vaccinationService', () => ({
  vaccinationService: {
    getVaccinations: vi.fn(),
  },
}));

vi.mock('../services/scheduleService', () => ({
  scheduleService: {
    getMemberSchedule: vi.fn(),
  },
}));

describe('VaxAssist Phase 7 Official Reports & Certificate', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (familyService.getFamilies as any).mockResolvedValue([
      { id: 'fam-1', name: 'Sharma Family' },
    ]);
    (familyService.getFamily as any).mockResolvedValue({
      id: 'fam-1',
      name: 'Sharma Family',
      members: [
        { id: 'mem-1', name: 'Maya Sharma', relationship: 'Child' },
      ],
    });
    (familyService.getMember as any).mockResolvedValue({
      id: 'mem-1',
      family_id: 'fam-1',
      name: 'Maya Sharma',
      date_of_birth: '2023-01-10',
      relationship: 'Child',
      gender: 'Female',
      blood_group: 'O+',
    });
    (vaccinationService.getVaccinations as any).mockResolvedValue([
      {
        id: 'vax-1',
        member_id: 'mem-1',
        vaccine_name: 'BCG',
        dose: '0.1 ml',
        administration_date: '2023-01-10',
        provider: 'Dr. Test Pediatrician',
        clinic: 'Apollo City Center',
        batch_lot_number: 'LOT-BCG-9988',
        verification_status: 'verified',
      },
    ]);
    (scheduleService.getMemberSchedule as any).mockResolvedValue({
      member_id: 'mem-1',
      member_name: 'Maya Sharma',
      schedule_version: 'v1.0.0-demo-2026',
      summary: {
        total_rules: 14,
        completed_count: 1,
        upcoming_count: 10,
        overdue_count: 3,
        unverified_count: 0,
      },
      completed: [
        {
          rule_id: 'rule-bcg-0',
          vaccine_name: 'BCG',
          dose: '0.1 ml',
          status: 'completed',
        },
      ],
      upcoming: [
        {
          rule_id: 'rule-mmr-1',
          vaccine_name: 'MMR',
          dose: '0.5 ml',
          status: 'upcoming',
          due_date: '2026-10-01',
        },
      ],
      overdue: [],
      unknown_unverified: [],
    });
  });

  it('renders official immunization certificate with patient info, vaccination ledger, and schedule summary', async () => {
    render(
      <BrowserRouter>
        <ReportsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Official Immunization Report Generator/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Maya Sharma/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/LOT-BCG-9988/i)).toBeInTheDocument();
      expect(screen.getByText(/Apollo City Center/i)).toBeInTheDocument();
      expect(screen.getByText(/Print Official Certificate/i)).toBeInTheDocument();
    });
  });
});
