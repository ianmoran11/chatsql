import { useState, useRef, useEffect } from 'react';
import type { QueryExecResult } from 'sql.js';
import FileUpload from '../components/FileUpload';
import SettingsModal from '../components/SettingsModal';
import { useDatabase } from '../contexts/DatabaseContext';
import { streamLLMResponse } from '../lib/llmService';

export type MessageRole = 'user' | 'assistant';

export interface AssistantContent {
  planText: string;
  sqlText: string;
  raw: string;
  queryResult?: QueryExecResult[] | null;
  queryError?: string | null;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string; // user messages
  structured?: AssistantContent; // assistant messages
  timestamp: Date;
}

function parseStreamedContent(raw: string): AssistantContent {
  const planMatch = raw.match(/<analytical_plan>([\s\S]*?)(?:<\/analytical_plan>|$)/);
  const sqlMatch = raw.match(/<sql_query>([\s\S]*?)(?:<\/sql_query>|$)/);

  // If we've passed the opening tag, capture everything after it
  let planText = '';
  let sqlText = '';

  if (planMatch) {
    planText = planMatch[1];
  } else if (raw.includes('<analytical_plan>')) {
    planText = raw.slice(raw.indexOf('<analytical_plan>') + '<analytical_plan>'.length);
  }

  if (sqlMatch) {
    sqlText = sqlMatch[1];
  } else if (raw.includes('<sql_query>')) {
    sqlText = raw.slice(raw.indexOf('<sql_query>') + '<sql_query>'.length);
  }

  return { planText: planText.trim(), sqlText: sqlText.trim(), raw };
}

function AssistantMessage({ msg }: { msg: ChatMessage }) {
  const content = msg.structured ?? parseStreamedContent(msg.content);
  const hasStructure = content.planText || content.sqlText;

  if (!hasStructure) {
    // Still accumulating before first tag, or plain text error
    return (
      <div className="bg-gray-700 text-gray-100 max-w-2xl rounded-lg px-4 py-3 text-sm whitespace-pre-wrap">
        {msg.content || <span className="text-gray-400 animate-pulse">Thinking...</span>}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-3">
      {content.planText && (
        <div className="bg-gray-700 rounded-lg px-4 py-3 text-sm">
          <p className="text-xs font-semibold text-indigo-400 mb-2 uppercase tracking-wide">Analytical Plan</p>
          <p className="text-gray-100 whitespace-pre-wrap leading-relaxed">{content.planText}</p>
        </div>
      )}
      {content.sqlText && (
        <div className="bg-gray-900 border border-gray-600 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-600">
            <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">SQL Query</span>
          </div>
          <pre className="px-4 py-3 text-sm text-green-300 font-mono overflow-x-auto whitespace-pre-wrap break-all">
            {content.sqlText}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const { isLoading, error, schema, db } = useDatabase();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    const assistantId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput('');
    setIsStreaming(true);

    let accumulated = '';

    await streamLLMResponse(trimmed, schema, {
      onChunk: (chunk) => {
        accumulated += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: accumulated } : m
          )
        );
      },
      onDone: () => {
        const parsed = parseStreamedContent(accumulated);
        let queryResult: QueryExecResult[] | null = null;
        let queryError: string | null = null;

        if (parsed.sqlText && db) {
          try {
            queryResult = db.exec(parsed.sqlText);
          } catch (err) {
            queryError = err instanceof Error ? err.message : String(err);
          }
        } else if (parsed.sqlText && !db) {
          queryError = 'No database loaded.';
        }

        const structured: AssistantContent = { ...parsed, queryResult, queryError };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, structured } : m
          )
        );
        setIsStreaming(false);
      },
      onError: (errMsg) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${errMsg}` }
              : m
          )
        );
        setIsStreaming(false);
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 flex flex-col border-r border-gray-700">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h1 className="text-lg font-bold text-indigo-400">ChatSQL</h1>
          <button
            onClick={() => setShowSettings(true)}
            title="Settings"
            className="text-gray-400 hover:text-white transition-colors"
          >
            ⚙
          </button>
        </div>

        <div className="flex-1 p-4">
          {isLoading && <p className="text-sm text-gray-400">Loading database...</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {!isLoading && !error && (
            <p className="text-sm text-green-400">Database ready</p>
          )}
        </div>

        <FileUpload />
      </aside>

      {/* Main chat area */}
      <main className="flex-1 flex flex-col">
        {/* Message history */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 text-sm">Ask a question about your database...</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'user' ? (
                  <div className="max-w-2xl rounded-lg px-4 py-3 text-sm whitespace-pre-wrap bg-indigo-600 text-white">
                    {msg.content}
                  </div>
                ) : (
                  <AssistantMessage msg={msg} />
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-gray-700 p-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your data..."
              disabled={isStreaming}
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {isStreaming ? 'Streaming...' : 'Send'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
