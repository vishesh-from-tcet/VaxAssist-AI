import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RemindersPage } from '../pages/RemindersPage';
import { reminderService } from '../services/reminderService';
import { familyService } from '../services/familyService';
import { BrowserRouter } from 'react-router-dom';
import { localDb } from '../db';

vi.mock('../services/familyService', () => ({
  familyService: {
    getFamilies: vi.fn(),
    getFamily: vi.fn(),
  },
}));

describe('VaxAssist Phase 7 Reminders System', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await localDb.reminders.clear();
    await localDb.preferences.clear();

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
  });

  it('generates reminders from deterministic schedule evaluation', () => {
    const mockEvaluation: any = {
      member_id: 'mem-1',
      member_name: 'Maya Sharma',
      overdue: [
        {
          rule_id: 'rule-opv-0',
          vaccine_name: 'OPV Birth Dose',
          dose: '2 drops',
          due_date: '2026-01-15',
          overdue_days: 45,
        },
      ],
      upcoming: [
        {
          rule_id: 'rule-mmr-1',
          vaccine_name: 'MMR Dose 1',
          dose: '0.5 ml',
          due_date: '2026-10-01',
          days_until_due: 10,
        },
      ],
    };

    const reminders = reminderService.generateFromSchedule(mockEvaluation, {
      days_in_advance: 30,
      show_upcoming: true,
      show_overdue: true,
      sound_enabled: true,
    });

    expect(reminders.length).toBe(2);
    expect(reminders.find((r) => r.status === 'overdue')?.vaccine_name).toBe('OPV Birth Dose');
    expect(reminders.find((r) => r.status === 'upcoming')?.vaccine_name).toBe('MMR Dose 1');
  });

  it('renders reminders page with overdue & upcoming alerts', async () => {
    await localDb.reminders.put({
      id: 'rem-test-1',
      member_id: 'mem-1',
      member_name: 'Maya Sharma',
      vaccine_name: 'Hepatitis B Birth',
      dose: '0.5 ml',
      due_date: '2026-02-01',
      status: 'overdue',
      urgency: 'high',
      message: 'Hepatitis B Birth is overdue for Maya Sharma.',
      is_read: false,
      created_at: new Date().toISOString(),
    });

    render(
      <BrowserRouter>
        <RemindersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Deterministic Reminders & Alerts/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Hepatitis B Birth/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Maya Sharma/i).length).toBeGreaterThan(0);
    });
  });
});
