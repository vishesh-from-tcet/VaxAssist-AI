import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiPage } from '../pages/AiPage';
import { BrowserRouter } from 'react-router-dom';
import { aiService } from '../services/aiService';
import { familyService } from '../services/familyService';
import { AuthProvider } from '../context/AuthContext';
import { authService } from '../services/authService';

vi.mock('../services/aiService', () => ({
  aiService: {
    sendMessage: vi.fn(),
    getSuggestedQuestions: vi.fn(),
  },
}));

vi.mock('../services/familyService', () => ({
  familyService: {
    getFamilies: vi.fn(),
    getFamily: vi.fn(),
  },
}));

vi.mock('../services/authService', () => ({
  authService: {
    getMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

describe('VaxAssist Phase 6 AI Care Coordinator UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('vaxassist_token', 'test-token');

    (authService.getMe as any).mockResolvedValue({
      id: 'u-1',
      email: 'test@example.com',
      full_name: 'Dr. Test User',
      role: 'user',
      is_active: true,
    });

    (familyService.getFamilies as any).mockResolvedValue([
      { id: 'fam-1', name: 'The Sharma Family', user_id: 'u-1' },
    ]);
    (familyService.getFamily as any).mockResolvedValue({
      id: 'fam-1',
      name: 'The Sharma Family',
      user_id: 'u-1',
      members: [
        { id: 'mem-1', name: 'Maya Sharma', date_of_birth: '2023-01-10', relationship: 'Child' },
      ],
    });
    (aiService.getSuggestedQuestions as any).mockResolvedValue({
      general: ['What does the MMR vaccine protect against?'],
      member_specific: ['What vaccinations has Maya received?'],
    });
  });

  it('renders AI Care Coordinator header, input bar, and suggested questions', async () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <AiPage />
        </BrowserRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/VaxAssist AI Care Coordinator/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/RAG Grounded/i)).toBeInTheDocument();
    expect(screen.getByText(/What does the MMR vaccine protect against/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask a question about immunization schedules/i)).toBeInTheDocument();
  });

  it('sends message and displays AI response with verified sources', async () => {
    (aiService.sendMessage as any).mockResolvedValue({
      response: 'The MMR vaccine protects against Measles, Mumps, and Rubella.',
      sources: [
        {
          title: 'MMR Vaccine Guide (DEMO)',
          organization: 'WHO Advisory (DEMO)',
          source: 'WHO Position Paper',
          publication_date: '2024-01-20',
          page_section: 'Clinical Indication',
          country_region: 'GLOBAL',
          vaccine_topic: 'MMR',
          document_version: 'v1.0.0-demo',
          similarity_score: 0.85,
        },
      ],
      member_context_used: null,
      disclaimer: 'Always consult a doctor.',
    });

    render(
      <AuthProvider>
        <BrowserRouter>
          <AiPage />
        </BrowserRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ask a question about immunization schedules/i)).toBeDefined();
    });

    const input = screen.getByPlaceholderText(/Ask a question about immunization schedules/i);
    fireEvent.change(input, { target: { value: 'Tell me about MMR' } });

    const sendBtn = screen.getByRole('button', { name: /Send/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText(/The MMR vaccine protects against Measles, Mumps, and Rubella./i)).toBeDefined();
      expect(screen.getByText(/1 Verified Sources Cited/i)).toBeDefined();
    });
  });
});
