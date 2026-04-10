/**
 * ChatPanel — RAG-grounded conversational interface.
 *
 * Message history is persisted in localStorage (single-user, this browser).
 * The history array is sent to /api/chat so the model has turn-level context.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, MessageSquare, Trash2 } from 'lucide-react';
import { sendChatMessage } from '../services/api.js';

const CHAT_STORAGE_KEY = 'clauseguard-chat-v1';

function readChatStore() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return { byDoc: {} };
    const parsed = JSON.parse(raw);
    return parsed?.byDoc ? parsed : { byDoc: {} };
  } catch {
    return { byDoc: {} };
  }
}

function writeChatStore(store) {
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(store));
}

function threadsFromStore(store) {
  return Object.entries(store.byDoc)
    .map(([docId, data]) => {
      const msgs = data.messages ?? [];
      const lastUser = [...msgs].reverse().find((m) => m.role === 'user');
      return {
        docId,
        preview: lastUser?.content?.slice(0, 72) ?? '(empty)',
        updatedAt: data.updatedAt ?? 0,
      };
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

// ── Message bubble ─────────────────────────────────────────────────────────

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`
        shrink-0 w-8 h-8 rounded-full flex items-center justify-center
        ${isUser ? 'bg-brand/20 text-brand' : 'bg-surface-2 text-gray-400'}
      `}>
        {isUser
          ? <User size={15} />
          : <Bot size={15} />
        }
      </div>

      <div className={`
        max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed
        ${isUser
          ? 'bg-brand text-white rounded-tr-sm'
          : 'bg-surface-2 text-gray-200 rounded-tl-sm border border-surface-3'
        }
      `}>
        {isUser ? (
          <p>{msg.content}</p>
        ) : (
          <div className="prose-chat" dangerouslySetInnerHTML={{ __html: formatResponse(msg.content) }} />
        )}
        {msg.sources_used > 0 && (
          <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-brand inline-block" />
            Grounded in {msg.sources_used} document excerpt{msg.sources_used !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}

function formatResponse(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^• (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]+?<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/^(.+)$/, '<p>$1</p>');
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
        <Bot size={15} className="text-gray-400" />
      </div>
      <div className="bg-surface-2 border border-surface-3 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
          />
        ))}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  'What are the main obligations of each party?',
  'Are there any unusually one-sided clauses?',
  'What happens if either party breaches the agreement?',
  'Summarise the termination conditions.',
];

export default function ChatPanel({ documentId, documentType }) {
  const [messages, setMessages] = useState([]);
  const [sidebarThreads, setSidebarThreads] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(documentId);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const refreshSidebar = useCallback(() => {
    const store = readChatStore();
    setSidebarThreads(threadsFromStore(store));
  }, []);

  const persistDocMessages = useCallback((docId, msgs) => {
    const store = readChatStore();
    store.byDoc[docId] = {
      messages: msgs.map(({ role, content, sources_used }) => ({
        role,
        content,
        ...(sources_used != null ? { sources_used } : {}),
      })),
      updatedAt: Date.now(),
    };
    writeChatStore(store);
    refreshSidebar();
  }, [refreshSidebar]);

  useEffect(() => {
    setSelectedDocId(documentId);
  }, [documentId]);

  useEffect(() => {
    if (!selectedDocId) {
      setMessages([]);
      return;
    }
    const store = readChatStore();
    const row = store.byDoc[selectedDocId];
    setMessages(row?.messages?.map((m) => ({ ...m })) ?? []);
    refreshSidebar();
  }, [selectedDocId, refreshSidebar]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const canSend = selectedDocId === documentId;

  const send = async (text) => {
    const message = text.trim();
    if (!message || loading || !documentId || !canSend) return;

    setInput('');
    setError(null);

    const userMsg = { role: 'user', content: message };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    persistDocMessages(documentId, updatedHistory);
    setLoading(true);

    try {
      const historyPayload = messages.map(({ role, content }) => ({ role, content }));

      const { response, sources_used } = await sendChatMessage(documentId, message, historyPayload);
      const next = [...updatedHistory, { role: 'assistant', content: response, sources_used }];
      setMessages(next);
      persistDocMessages(documentId, next);
    } catch (err) {
      setError(err.message);
      setMessages(messages);
      persistDocMessages(documentId, messages);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const clearCurrentThread = () => {
    if (!documentId) return;
    setMessages([]);
    persistDocMessages(documentId, []);
    setError(null);
  };

  const clearAllChats = () => {
    if (!window.confirm('Clear all saved chat history on this device?')) return;
    localStorage.removeItem(CHAT_STORAGE_KEY);
    setMessages([]);
    setSidebarThreads([]);
    refreshSidebar();
    setError(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] h-[680px] card overflow-hidden">

      <aside className="flex flex-col border-b md:border-b-0 md:border-r border-surface-3 bg-surface-1/50 min-h-[140px] md:min-h-0 max-h-[200px] md:max-h-none">
        <div className="px-3 py-2.5 border-b border-surface-3 flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Chat history</p>
          <button
            type="button"
            onClick={clearAllChats}
            className="btn-ghost p-1.5 rounded-lg text-gray-500 hover:text-risk-critical"
            title="Clear all chats"
          >
            <Trash2 size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
          {sidebarThreads.length === 0 ? (
            <p className="text-xs text-gray-500 px-2 py-1">No saved chats yet.</p>
          ) : (
            sidebarThreads.map((t) => (
              <button
                key={t.docId}
                type="button"
                onClick={() => setSelectedDocId(t.docId)}
                className={`w-full text-left rounded-lg border px-2.5 py-2 text-xs transition-colors ${
                  t.docId === selectedDocId
                    ? 'border-brand/40 bg-brand/10 text-gray-200'
                    : 'border-surface-3 bg-surface-2 text-gray-400 hover:border-brand/30'
                }`}
              >
                <p className="truncate font-medium">
                  {t.docId === documentId ? 'Current document' : `Doc ${String(t.docId).slice(0, 8)}…`}
                </p>
                <p className="truncate mt-0.5 opacity-90">{t.preview}</p>
              </button>
            ))
          )}
        </div>
      </aside>

      <div className="flex flex-col min-w-0 min-h-0">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand/15 flex items-center justify-center">
            <MessageSquare size={16} className="text-brand" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-100">Document Chat</p>
            <p className="text-xs text-gray-500 truncate">
              Answers grounded in your {documentType ?? 'document'}
            </p>
          </div>
          {messages.length > 0 && canSend && (
            <button
              type="button"
              onClick={clearCurrentThread}
              className="ml-auto btn-ghost text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {!canSend && (
          <div className="mx-4 mt-3 rounded-lg border border-risk-medium/40 bg-risk-medium/10 px-3 py-2 text-xs text-risk-medium">
            Viewing history for another document. Open that document (upload again) to send messages there, or select the current document in the list when available.
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 min-h-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
              <div>
                <Bot size={36} className="text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm font-medium">
                  Ask anything about the document
                </p>
                <p className="text-gray-600 text-xs mt-1">
                  Responses are grounded in the uploaded text.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    disabled={!canSend}
                    className="text-left text-xs text-gray-400 bg-surface-2 hover:bg-surface-3 border border-surface-3 hover:border-brand/40 hover:text-gray-200 px-3 py-2.5 rounded-lg transition-all duration-150 disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
              {loading && <TypingIndicator />}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="mx-5 mb-2 text-xs text-risk-high bg-risk-high/10 border border-risk-high/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="px-4 py-3 border-t border-surface-3 shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={canSend ? 'Ask about this document…' : 'Select current document to chat…'}
              disabled={loading || !canSend}
              className="
                flex-1 resize-none bg-surface-2 border border-surface-3
                focus:border-brand/50 focus:ring-1 focus:ring-brand/30
                text-sm text-gray-100 placeholder-gray-600
                rounded-xl px-4 py-2.5 outline-none
                transition-all duration-150
                max-h-32 min-h-[40px]
                disabled:opacity-50
              "
              style={{ height: 'auto' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
            />
            <button
              type="button"
              onClick={() => send(input)}
              disabled={!input.trim() || loading || !canSend}
              className="btn-primary p-2.5 rounded-xl shrink-0"
              aria-label="Send message"
            >
              {loading
                ? <Loader2 size={18} className="animate-spin" />
                : <Send size={18} />
              }
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-1.5 ml-1">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
