import { api } from './api';

export interface SourceCitation {
  title: string;
  organization: string;
  source: string;
  publication_date: string;
  page_section: string;
  country_region: string;
  vaccine_topic: string;
  document_version: string;
  similarity_score?: number;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  sources?: SourceCitation[];
  member_context_used?: string | null;
  disclaimer?: string;
}

export interface ChatRequestPayload {
  message: string;
  member_id?: string;
  conversation_history?: { role: string; content: string }[];
}

export interface ChatResponsePayload {
  response: string;
  sources: SourceCitation[];
  member_context_used?: string | null;
  disclaimer: string;
}

export interface SuggestedQuestionsResponse {
  general: string[];
  member_specific: string[];
}

export const aiService = {
  sendMessage: async (payload: ChatRequestPayload): Promise<ChatResponsePayload> => {
    return await api.post<ChatResponsePayload>('/api/v1/ai/chat', payload);
  },

  getSuggestedQuestions: async (): Promise<SuggestedQuestionsResponse> => {
    try {
      return await api.get<SuggestedQuestionsResponse>('/api/v1/ai/suggested-questions');
    } catch {
      return {
        general: [
          'What does the MMR vaccine protect against?',
          'What is the recommended timing for the BCG birth dose?',
          'Can multiple vaccines be given at the same visit?',
          'How should low-grade fever after vaccination be managed?',
        ],
        member_specific: [
          'What vaccinations has this family member received?',
          'Which vaccinations are coming up next for this member?',
          'Are there any overdue vaccination doses for this profile?',
        ],
      };
    }
  },
};
