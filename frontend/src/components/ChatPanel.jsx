/**
 * ChatPanel — RAG-grounded chat with server-persisted history (MongoDB).
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, MessageSquare } from 'lucide-react';
import { getChatHistory, listChatThreads, sendChatMessage } from '../services/api.js';

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <AvatarIcon isUser={isUser} />
      <div
        className={`
        max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed
        ${isUser
          ? 'bg-brand text-white rounded-tr-sm'
          : 'bg-surface-2 text-gray-200 rounded-tl-sm border border-surface-3'
        }
      `}
      >
        {isUser ? (
          <p>{msg.content}</p>
        ) : (
          <FormattedReply content={msg.content} />
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

function AvatarIcon({ isUser }) {
  return (
    <div
      className={`
        shrink-0 w-8 h-8 rounded-full flex items-center justify-center
        ${isUser ? 'bg-brand/20 text-brand' : 'bg-surface-2 text-gray-400'}
      `}
    >
      {isUser ? <User size={15} /> : <Bot size={15} />}
    </div>
  );
}

function FormattedReply({ content }) {
  const html = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^• (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]+?<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/^(.+)$/, '<p>$1</p>');
  return <div className="prose-chat" dangerouslySetInnerHTML={{ __html: html }} />;
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
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const refreshSidebar = useCallback(async () => {
    try {
      const threads = await listChatThreads();
      setSidebarThreads(threads);
    } catch {
      setSidebarThreads([]);
    }
  }, []);

  const loadHistory = useCallback(
    async (docId) => {
      if (!docId) {
        setMessages([]);
        return;
      }
      setHistoryLoading(true);
      try {
        const data = await getChatHistory(docId);
        setMessages(data.messages ?? []);
      } catch {
        setMessages([]);
      } finally {
        setHistoryLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    setSelectedDocId(documentId);
  }, [documentId]);

  useEffect(() => {
    loadHistory(selectedDocId);
    refreshSidebar();
  }, [selectedDocId, loadHistory, refreshSidebar]);

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
    setLoading(true);

    try {
      const historyPayload = messages.map(({ role, content }) => ({ role, content }));
      const { response, sources_used } = await sendChatMessage(
        documentId,
        message,
        historyPayload
      );
      const next = [...updatedHistory, { role: 'assistant', content: response, sources_used }];
      setMessages(next);
      await refreshSidebar();
    } catch (err) {
      setError(err.message);
      setMessages(messages);
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] h-[680px] card overflow-hidden">
      <aside className="flex flex-col border-b md:border-b-0 md:border-r border-surface-3 bg-surface-1/50 min-h-[140px] md:min-h-0 max-h-[200px] md:max-h-none">
        <div className="px-3 py-2.5 border-b border-surface-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Chat history</p>
        </div>
        <ChatSidebar
          threads={sidebarThreads}
          selectedDocId={selectedDocId}
          documentId={documentId}
          onSelect={setSelectedDocId}
        />
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
        </div>

        {!canSend && (
          <div className="mx-4 mt-3 rounded-lg border border-risk-medium/40 bg-risk-medium/10 px-3 py-2 text-xs text-risk-medium">
            Viewing history for another document. Open it from your document list to chat there.
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 min-h-0">
          {historyLoading ? (
            <p className="text-sm text-gray-500 text-center">Loading chat history…</p>
          ) : messages.length === 0 ? (
            <EmptyChat canSend={canSend} onSuggestion={send} />
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
              className="flex-1 resize-none bg-surface-2 border border-surface-3 focus:border-brand/50 focus:ring-1 focus:ring-brand/30 text-sm text-gray-100 placeholder-gray-600 rounded-xl px-4 py-2.5 outline-none transition-all duration-150 max-h-32 min-h-[40px] disabled:opacity-50"
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
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatSidebar({ threads, selectedDocId, documentId, onSelect }) {
  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
      {threads.length === 0 ? (
        <p className="text-xs text-gray-500 px-2 py-1">No saved chats yet.</p>
      ) : (
        threads.map((t) => (
          <button
            key={t.document_id}
            type="button"
            onClick={() => onSelect(t.document_id)}
            className={`w-full text-left rounded-lg border px-2.5 py-2 text-xs transition-colors ${
              t.document_id === selectedDocId
                ? 'border-brand/40 bg-brand/10 text-gray-200'
                : 'border-surface-3 bg-surface-2 text-gray-400 hover:border-brand/30'
            }`}
          >
            <p className="truncate font-medium">
              {t.document_id === documentId ? 'Current document' : `Doc ${String(t.document_id).slice(0, 8)}…`}
            </p>
            <p className="truncate mt-0.5 opacity-90">{t.preview || '(empty)'}</p>
          </button>
        ))
      )}
    </div>
  );
}

function EmptyChat({ canSend, onSuggestion }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
      <div>
        <Bot size={36} className="text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm font-medium">Ask anything about the document</p>
        <p className="text-gray-600 text-xs mt-1">Responses are grounded in the uploaded text.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSuggestion(s)}
            disabled={!canSend}
            className="text-left text-xs text-gray-400 bg-surface-2 hover:bg-surface-3 border border-surface-3 hover:border-brand/40 hover:text-gray-200 px-3 py-2.5 rounded-lg transition-all duration-150 disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
