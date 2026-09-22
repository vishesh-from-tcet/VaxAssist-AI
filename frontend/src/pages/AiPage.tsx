import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  User,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  BookOpen,
  Trash2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Users,
  RefreshCw,
} from 'lucide-react';
import { aiService, ChatMessage, SourceCitation, SuggestedQuestionsResponse } from '../services/aiService';
import { familyService, Family, Member } from '../services/familyService';
import { useAuth } from '../context/AuthContext';

export const AiPage: React.FC = () => {
  const { user } = useAuth();

  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestionsResponse | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<number, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load family members & suggested questions on mount
  useEffect(() => {
    const initData = async () => {
      try {
        const [famList, qData] = await Promise.all([
          familyService.getFamilies(),
          aiService.getSuggestedQuestions(),
        ]);
        setSuggestedQuestions(qData);

        let allMembers: Member[] = [];
        for (const f of famList) {
          const fullFam = await familyService.getFamily(f.id);
          if (fullFam.members) {
            allMembers = [...allMembers, ...fullFam.members];
          }
        }
        setMembers(allMembers);

        // Initial welcome message
        setMessages([
          {
            id: 'welcome-1',
            role: 'assistant',
            content: `Hello ${user?.full_name || ''}! I am your **VaxAssist AI Care Coordinator**.\n\nI can answer questions regarding official immunization guidelines, vaccine safety, schedule intervals, or summarize the authorized vaccination records of your family members.\n\nHow can I support your family's health today?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sources: [],
          },
        ]);
      } catch (err: any) {
        console.error('Failed to initialize AI Care Coordinator:', err);
      }
    };

    initData();
  }, [user]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage.trim();
    if (!textToSend || isLoading) return;

    setError(null);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Append user message immediately
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build conversation history for context (last 6 messages)
      const historyPayload = updatedMessages
        .filter((m) => m.id !== 'welcome-1')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await aiService.sendMessage({
        message: textToSend,
        member_id: selectedMemberId || undefined,
        conversation_history: historyPayload,
      });

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: res.sources,
        member_context_used: res.member_context_used,
        disclaimer: res.disclaimer,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to AI Care Coordinator');
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleClearConversation = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: 'Conversation history cleared. How else can I assist you with immunization schedules or clinical guidelines?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: [],
      },
    ]);
    setError(null);
  };

  const toggleSourceExpand = (index: number) => {
    setExpandedSources((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const currentMember = members.find((m) => m.id === selectedMemberId);

  return (
    <div className="space-y-4 max-w-5xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20 flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-900">VaxAssist AI Care Coordinator</h1>
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-full border border-purple-200">
                RAG Grounded
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Evidence-based clinical guidelines & authorized personal record assistant
            </p>
          </div>
        </div>

        {/* Member Context Selector & Clear Button */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
            <Users className="w-3.5 h-3.5 text-purple-600" />
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="">General Knowledge (No Patient Context)</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  Patient: {m.name} ({m.relationship})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleClearConversation}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Chat Box Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden">
        {/* Messages Feed */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Active Context Notification */}
          {currentMember && (
            <div className="p-3 bg-purple-50/80 border border-purple-200/80 rounded-xl text-xs text-purple-900 flex items-center justify-between animate-in fade-in">
              <span className="flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1.5 text-purple-600" />
                <span>
                  Context Active: Inquiring with authorized records for <strong>{currentMember.name}</strong> ({currentMember.relationship}, Born {currentMember.date_of_birth}).
                </span>
              </span>
              <button
                onClick={() => setSelectedMemberId('')}
                className="text-[11px] font-semibold text-purple-700 hover:underline ml-2"
              >
                Clear Context
              </button>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={msg.id || index}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`flex items-start space-x-2.5 max-w-[88%] sm:max-w-[80%] ${
                  msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-tr from-teal-600 to-emerald-600 text-white'
                      : 'bg-purple-600 text-white'
                  }`}
                >
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div>
                  <div
                    className={`p-4 rounded-2xl text-xs leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-tr-none'
                        : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none'
                    }`}
                  >
                    {/* Role Header in AI message */}
                    {msg.role === 'assistant' && (
                      <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-slate-200/60 text-[10px] text-slate-500 font-semibold">
                        <span className="text-purple-700 flex items-center">
                          <Sparkles className="w-3 h-3 mr-1" /> Care Coordinator
                        </span>
                        {msg.member_context_used && (
                          <span className="bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-mono">
                            Patient: {msg.member_context_used}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    <div
                      className={`text-[10px] mt-2 text-right ${
                        msg.role === 'user' ? 'text-teal-100' : 'text-slate-400'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {/* Sources Accordion */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 text-xs">
                      <button
                        onClick={() => toggleSourceExpand(index)}
                        className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 flex items-center space-x-1 py-1 px-2.5 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{msg.sources.length} Verified Sources Cited</span>
                        {expandedSources[index] ? (
                          <ChevronUp className="w-3 h-3 ml-1" />
                        ) : (
                          <ChevronDown className="w-3 h-3 ml-1" />
                        )}
                      </button>

                      {expandedSources[index] && (
                        <div className="mt-2 space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in">
                          {msg.sources.map((src, sIdx) => (
                            <div key={sIdx} className="p-2 bg-white rounded-lg border border-slate-200 text-[11px]">
                              <div className="flex items-center justify-between font-semibold text-slate-900">
                                <span>{src.title}</span>
                                <span className="text-[10px] text-purple-700 font-mono">
                                  {src.document_version}
                                </span>
                              </div>
                              <div className="text-slate-500 text-[10px] mt-0.5">
                                {src.organization} • {src.page_section}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Thinking / Loading Animation */}
          {isLoading && (
            <div className="flex items-start space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-none shadow-sm text-xs text-slate-600 flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                <span className="text-xs text-purple-800 font-medium ml-1">
                  Synthesizing verified medical guidance...
                </span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions Bar */}
        {suggestedQuestions && (
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center space-x-2 overflow-x-auto">
            <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap flex items-center">
              <HelpCircle className="w-3 h-3 mr-1" /> Suggested:
            </span>
            {(selectedMemberId ? suggestedQuestions.member_specific : suggestedQuestions.general)
              .slice(0, 4)
              .map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  disabled={isLoading}
                  className="px-3 py-1 bg-white hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 border border-slate-200 rounded-full text-[11px] font-medium text-slate-600 whitespace-nowrap transition-colors shadow-2xs disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
          </div>
        )}

        {/* Message Input Bar */}
        <div className="p-3.5 bg-white border-t border-slate-200 flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              selectedMemberId
                ? `Ask about ${currentMember?.name || 'this member'}'s vaccines, upcoming doses, or safety...`
                : 'Ask a question about immunization schedules, contraindications, vaccines...'
            }
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-purple-600/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>

      {/* Medical Safety Disclaimer Banner */}
      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 flex items-center justify-between flex-shrink-0">
        <span className="flex items-center">
          <ShieldAlert className="w-3.5 h-3.5 mr-1.5 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Clinical Safety Notice:</strong> AI responses are derived from verified guidelines for educational reference. Never disregard professional pediatric or medical advice.
          </span>
        </span>
        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">VaxAssist RAG v1.0</span>
      </div>
    </div>
  );
};
