import { useState, useRef, useEffect } from 'react';
import type { QueryExecResult } from 'sql.js';
import FileUpload from '../components/FileUpload';
import SettingsModal from '../components/SettingsModal';
import SchemaExplorer from '../components/SchemaExplorer';
import VegaChart from '../components/VegaChart';
import { useDatabase } from '../contexts/DatabaseContext';
import { streamLLMResponse, type ConversationMessage } from '../lib/llmService';
import { generateChartSpec } from '../lib/chartService';

interface AuditEntry {
  timestamp: string;
  userId: string;
  prompt: string;
  sql: string;
}

export type MessageRole = 'user' | 'assistant';

export interface AssistantContent {
  planText: string;
  sqlText: string;
  raw: string;
  queryResult?: QueryExecResult[] | null;
  queryError?: string | null;
  chartSpec?: object | null;
  chartError?: string | null;
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

function QueryResultTable({ result }: { result: QueryExecResult[] }) {
  if (result.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-sm text-gray-400 italic">
        Query executed successfully — no rows returned.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {result.map((res, i) => (
        <div key={i} className="bg-gray-800 border border-gray-600 rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-gray-750 border-b border-gray-600 flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Results</span>
            <span className="text-xs text-gray-400">{res.values.length} row{res.values.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-700">
                  {res.columns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-2 text-left text-xs font-semibold text-gray-300 uppercase tracking-wide whitespace-nowrap border-b border-gray-600"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {res.values.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="px-4 py-2 text-gray-200 whitespace-nowrap border-b border-gray-700 text-xs"
                      >
                        {cell === null ? <span className="text-gray-500 italic">NULL</span> : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function AssistantMessage({
  msg,
  onGenerateChart,
  isGeneratingChart,
}: {
  msg: ChatMessage;
  onGenerateChart?: (msgId: string) => void;
  isGeneratingChart?: boolean;
}) {
  const content = msg.structured ?? parseStreamedContent(msg.content);
  const hasStructure = content.planText || content.sqlText;

  const hasChartableData =
    content.queryResult &&
    !content.queryError &&
    content.queryResult.length > 0 &&
    content.queryResult[0].values.length > 0;

  if (!hasStructure) {
    // Still accumulating before first tag, or plain text error
    return (
      <div className="bg-gray-700 text-gray-100 max-w-2xl rounded-lg px-4 py-3 text-sm whitespace-pre-wrap">
        {msg.content || <span className="text-gray-400 animate-pulse">Thinking...</span>}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-3">
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
      {content.queryError && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-sm">
          <p className="text-xs font-semibold text-red-400 mb-1 uppercase tracking-wide">Execution Error</p>
          <p className="text-red-300 font-mono text-xs">{content.queryError}</p>
        </div>
      )}
      {content.queryResult && !content.queryError && (
        <QueryResultTable result={content.queryResult} />
      )}
      {hasChartableData && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onGenerateChart?.(msg.id)}
              disabled={isGeneratingChart}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-violet-700 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors flex items-center gap-1.5"
            >
              {isGeneratingChart ? (
                <>
                  <span className="animate-spin inline-block w-3 h-3 border border-white border-t-transparent rounded-full" />
                  Generating chart…
                </>
              ) : content.chartSpec ? (
                '↺ Regenerate Chart'
              ) : (
                '📊 Generate Chart'
              )}
            </button>
          </div>
          {content.chartError && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-sm">
              <p className="text-xs font-semibold text-red-400 mb-1 uppercase tracking-wide">Chart Error</p>
              <p className="text-red-300 font-mono text-xs">{content.chartError}</p>
            </div>
          )}
          {content.chartSpec && !content.chartError && (
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
              <VegaChart spec={content.chartSpec} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function exportAuditLogCSV(auditLog: AuditEntry[]) {
  const header = ['Timestamp', 'User ID', 'Prompt', 'SQL'];
  const rows = auditLog.map((e) => [
    e.timestamp,
    e.userId,
    e.prompt,
    e.sql,
  ].map((v) => `"${v.replace(/"/g, '""')}"`));
  const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function buildConversationHistory(messages: ChatMessage[]): ConversationMessage[] {
  const history: ConversationMessage[] = [];
  for (const msg of messages) {
    if (msg.role === 'user') {
      history.push({ role: 'user', content: `<Question> ${msg.content} </Question>` });
    } else if (msg.role === 'assistant' && msg.structured) {
      let content = '';
      if (msg.structured.planText) {
        content += `<analytical_plan>\n${msg.structured.planText}\n</analytical_plan>\n`;
      }
      if (msg.structured.sqlText) {
        content += `<sql_query>\n${msg.structured.sqlText}\n</sql_query>\n`;
      }
      if (msg.structured.queryError) {
        content += `Query execution error: ${msg.structured.queryError}`;
      } else if (msg.structured.queryResult && msg.structured.queryResult.length > 0) {
        const res = msg.structured.queryResult[0];
        content += `Query returned ${res.values.length} row(s).\nColumns: ${res.columns.join(', ')}\n`;
        res.values.slice(0, 5).forEach((row, i) => {
          const cells = res.columns.map((col, ci) => `${col}: ${row[ci] === null ? 'NULL' : row[ci]}`);
          content += `Row ${i + 1}: ${cells.join(', ')}\n`;
        });
        if (res.values.length > 5) {
          content += `...and ${res.values.length - 5} more rows.`;
        }
      }
      if (content) {
        history.push({ role: 'assistant', content: content.trim() });
      }
    }
  }
  return history;
}

export default function ChatPage() {
  const { isLoading, error, schema, db } = useDatabase();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [generatingChartFor, setGeneratingChartFor] = useState<Set<string>>(new Set());
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

    const history = buildConversationHistory(messages);
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput('');
    setIsStreaming(true);

    let accumulated = '';

    await streamLLMResponse(trimmed, schema, history, {
      onChunk: (chunk) => {
        accumulated += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: accumulated } : m
          )
        );
      },
      onDone: async () => {
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

        if (parsed.sqlText && !queryError) {
          setAuditLog((prev) => [
            ...prev,
            {
              timestamp: new Date().toISOString(),
              userId: 'local-user',
              prompt: trimmed,
              sql: parsed.sqlText,
            },
          ]);
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

  const handleGenerateChart = async (msgId: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg?.structured?.queryResult?.length) return;

    const result = msg.structured.queryResult[0];
    const question = (() => {
      const idx = messages.findIndex((m) => m.id === msgId);
      for (let i = idx - 1; i >= 0; i--) {
        if (messages[i].role === 'user') return messages[i].content;
      }
      return '';
    })();

    setGeneratingChartFor((prev) => new Set(prev).add(msgId));

    try {
      const chartSpec = await generateChartSpec(question, result);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, structured: { ...m.structured!, chartSpec, chartError: null } }
            : m
        )
      );
    } catch (err) {
      const chartError = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, structured: { ...m.structured!, chartSpec: null, chartError } }
            : m
        )
      );
    } finally {
      setGeneratingChartFor((prev) => {
        const next = new Set(prev);
        next.delete(msgId);
        return next;
      });
    }
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex overflow-hidden">
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 flex flex-col border-r border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-7 h-7 flex-shrink-0" aria-hidden="true">
              <rect width="32" height="32" rx="6" fill="#1e1b4b"/>
              <ellipse cx="14" cy="10" rx="8" ry="3" fill="#6366f1"/>
              <rect x="6" y="10" width="16" height="10" fill="#4f46e5"/>
              <ellipse cx="14" cy="20" rx="8" ry="3" fill="#4338ca"/>
              <ellipse cx="14" cy="15" rx="8" ry="3" fill="none" stroke="#a5b4fc" strokeWidth="0.7" opacity="0.5"/>
              <rect x="20" y="2" width="11" height="8" rx="2" fill="#10b981"/>
              <polygon points="22,10 20,13 25,10" fill="#10b981"/>
              <text x="25.5" y="8.5" textAnchor="middle" fill="white" fontSize="4.5" fontFamily="monospace" fontWeight="bold">SQL</text>
            </svg>
            <h1 className="text-lg font-bold text-indigo-400">ChatSQL</h1>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            title="Settings"
            className="text-gray-400 hover:text-white transition-colors"
          >
            ⚙
          </button>
        </div>

        <div className="px-4 py-2 border-b border-gray-700">
          <button
            onClick={() => setMessages([])}
            disabled={isStreaming || messages.length === 0}
            className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors text-left flex items-center gap-2"
          >
            <span>+</span> New Chat
          </button>
        </div>

        {isLoading && <p className="px-4 py-2 text-sm text-gray-400">Loading database...</p>}
        {error && <p className="px-4 py-2 text-sm text-red-400">{error}</p>}

        <div className="flex-1 overflow-y-auto">
          <SchemaExplorer />
        </div>

        <div className="p-3 space-y-2 border-t border-gray-700">
          <p className="text-xs text-gray-500">{auditLog.length} audit entr{auditLog.length === 1 ? 'y' : 'ies'}</p>
          <button
            onClick={() => exportAuditLogCSV(auditLog)}
            disabled={auditLog.length === 0}
            className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
          >
            Export Audit Log CSV
          </button>
        </div>

        <FileUpload />
      </aside>

      {/* Main chat area */}
      <main className="flex-1 flex flex-col">
        {/* Warning banner */}
        <div className="bg-amber-900/60 border-b border-amber-700 px-4 py-2 text-amber-300 text-xs text-center flex-shrink-0">
          This application is for demonstration purposes only. Do not enter personal, sensitive, or official information.
        </div>
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
                  <AssistantMessage
                    msg={msg}
                    onGenerateChart={handleGenerateChart}
                    isGeneratingChart={generatingChartFor.has(msg.id)}
                  />
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
