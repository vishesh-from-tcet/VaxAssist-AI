import React from 'react';
import { Bot, Cpu, Send, ShieldAlert } from 'lucide-react';

export const AiPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Health Assistant</h1>
          <p className="text-xs text-slate-500">RAG-enabled healthcare information query interface</p>
        </div>
        <span className="px-3 py-1 bg-purple-100 text-purple-800 border border-purple-200 text-xs font-semibold rounded-full flex items-center">
          <Cpu className="w-3.5 h-3.5 mr-1" /> Gemini LLM + ChromaDB RAG
        </span>
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-950">RAG Boundary Enforcement</p>
          <p className="mt-0.5 text-amber-800">
            ChromaDB contains vector embeddings of medical guidelines and FAQs only. Patient health records are strictly kept in MongoDB and never sent to ChromaDB or external LLM providers without authorization.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[400px]">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center space-x-3">
          <div className="p-2 bg-purple-600 text-white rounded-lg">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">VaxAssist RAG Knowledge Assistant</h3>
            <p className="text-xs text-slate-500">Abstraction shell initialized</p>
          </div>
        </div>

        {/* Chat Window Body */}
        <div className="flex-1 p-6 flex items-center justify-center text-center">
          <div>
            <Bot className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">RAG Assistant Interface Shell</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Interactive RAG chat will connect to FastAPI <code className="bg-slate-100 px-1 py-0.5 rounded">GeminiLLMProvider</code> and ChromaDB vector store in future phase.
            </p>
          </div>
        </div>

        {/* Input Bar Shell */}
        <div className="p-3 border-t border-slate-200 bg-white flex items-center space-x-2">
          <input
            type="text"
            placeholder="Ask a question about vaccine guidelines..."
            disabled
            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm cursor-not-allowed"
          />
          <button
            disabled
            className="p-2.5 bg-purple-600 text-white rounded-lg opacity-50 cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
