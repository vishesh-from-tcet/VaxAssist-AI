import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { VaccinationModal } from '../components/VaccinationModal';
import { VaccinationDetailModal } from '../components/VaccinationDetailModal';
import { Member } from '../services/familyService';
import { VaccinationRecord } from '../services/vaccinationService';

describe('VaxAssist Phase 3 UI & Modals', () => {
  const mockMembers: Member[] = [
    {
      id: 'mem-1',
      family_id: 'fam-1',
      user_id: 'user-1',
      name: 'Sarah Henderson',
      date_of_birth: '1990-05-15',
      relationship: 'Self',
      blood_group: 'O+',
      vaccination_count: 2,
    },
    {
      id: 'mem-2',
      family_id: 'fam-1',
      user_id: 'user-1',
      name: 'Leo Henderson',
      date_of_birth: '2023-01-10',
      relationship: 'Child',
      blood_group: 'A+',
      vaccination_count: 1,
    },
  ];

  const mockRecord: VaccinationRecord = {
    id: 'vax-1',
    user_id: 'user-1',
    family_id: 'fam-1',
    member_id: 'mem-1',
    member_name: 'Sarah Henderson',
    vaccine_name: 'COVID-19 (Covishield)',
    dose: 'Dose 1',
    administration_date: '2024-01-15',
    clinic: 'Metro Health Hospital',
    provider: 'Dr. Sarah Lee',
    batch_number: 'LOT-9988',
    notes: 'No side effects',
    verification_status: 'verified',
  };

  it('renders VaccinationModal in log mode with member selection', () => {
    render(
      <VaccinationModal
        isOpen={true}
        onClose={() => {}}
        onSave={async () => {}}
        members={mockMembers}
      />
    );

    expect(screen.getByText(/Log New Immunization/i)).toBeDefined();
    expect(screen.getByText(/Sarah Henderson \(Self\)/i)).toBeDefined();
    expect(screen.getByText(/Leo Henderson \(Child\)/i)).toBeDefined();
  });

  it('renders VaccinationModal in edit mode pre-filled with record data', () => {
    render(
      <VaccinationModal
        isOpen={true}
        onClose={() => {}}
        onSave={async () => {}}
        members={mockMembers}
        initialRecord={mockRecord}
      />
    );

    expect(screen.getByText(/Edit Immunization Record/i)).toBeDefined();
    const input = screen.getByDisplayValue('COVID-19 (Covishield)');
    expect(input).toBeDefined();
    const batchInput = screen.getByDisplayValue('LOT-9988');
    expect(batchInput).toBeDefined();
  });

  it('renders VaccinationDetailModal with record metadata and actions', () => {
    const onEditMock = vi.fn();
    const onDeleteMock = vi.fn();

    render(
      <VaccinationDetailModal
        isOpen={true}
        onClose={() => {}}
        record={mockRecord}
        onEdit={onEditMock}
        onDelete={onDeleteMock}
      />
    );

    expect(screen.getByText('COVID-19 (Covishield)')).toBeDefined();
    expect(screen.getByText(/Metro Health Hospital/i)).toBeDefined();
    expect(screen.getByText('LOT-9988')).toBeDefined();
    expect(screen.getByText('Verified Record')).toBeDefined();

    const editBtn = screen.getByRole('button', { name: /Edit/i });
    fireEvent.click(editBtn);
    expect(onEditMock).toHaveBeenCalledWith(mockRecord);
  });
});
