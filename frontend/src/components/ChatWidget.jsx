import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, TrainFront, X, RefreshCw, User } from 'lucide-react';
import { API_URL } from '../lib/api';

const ENDPOINT = `${API_URL}/api/chat`;
const REQUEST_TIMEOUT_MS = 60000; // free hosting can take ~50s to wake up
const MAX_LENGTH = 1000;
const HISTORY_TURNS = 8;

const GREETING = 'Hi! Ask me about Ahmedabad Metro routes, fares, stations, facilities and tickets.';
const SUGGESTIONS = ['Fare from Paldi to Thaltej', 'How do I get an NCMC card?', 'Which station is nearest to me?'];

const PAGE_LABELS = {
  '/nearest-stations': 'Nearest Stations',
  '/routes': 'Plan Journey',
  '/stations': 'Metro Map',
  '/stations-info': 'Stations Info',
  '/schedule': 'Schedule',
  '/facilities': 'Facilities',
  '/contact': 'Contact',
};

// Turns site paths, URLs and **bold** in a bot reply into real links; everything else stays plain text.
const TOKEN = /(\/(?:nearest-stations|stations-info|stations|routes|schedule|facilities|contact)(?![\w-])|https?:\/\/[^\s)]+|\*\*[^*]+\*\*)/g;

const renderMessage = (text) =>
  text.split(TOKEN).map((part, i) => {
    if (Object.prototype.hasOwnProperty.call(PAGE_LABELS, part)) {
      return (
        <Link key={i} to={part} className="font-semibold text-accent underline underline-offset-2">
          {PAGE_LABELS[part]}
        </Link>
      );
    }
    if (/^https?:\/\//.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline underline-offset-2">
          {part}
        </a>
      );
    }
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
    return part;
  });

let nextId = 0;
const makeMessage = (role, text, extra = {}) => ({ id: ++nextId, role, text, ...extra });

const Avatar = ({ icon: Icon }) => (
  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line-200 bg-navy-100">
    <Icon strokeWidth={1.75} size={16} className="text-accent" />
  </div>
);

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState(0);
  const [messages, setMessages] = useState(() => [makeMessage('bot', GREETING, { greeting: true })]);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const isOpenRef = useRef(false);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      setUnread(0);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setIsOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(
    async (rawText) => {
      const text = rawText.trim();
      if (!text || isLoading) return;

      const history = messages
        .filter((m) => !m.greeting && !m.error)
        .slice(-HISTORY_TURNS)
        .map((m) => ({ role: m.role, text: m.text }));

      setMessages((prev) => [...prev, makeMessage('user', text)]);
      setInput('');
      setIsLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      let reply;
      try {
        const resp = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history }),
          signal: controller.signal,
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          reply = makeMessage('bot', data.error || 'The assistant ran into a problem. Please try again.', { error: true });
        } else {
          reply = makeMessage('bot', data.response || 'I could not come up with an answer. Try rephrasing your question.');
        }
      } catch (err) {
        if (controller.signal.aborted && abortRef.current !== controller) return; // chat was cleared
        reply = makeMessage(
          'bot',
          controller.signal.aborted
            ? 'The assistant took too long to respond. Please try again.'
            : 'Could not reach the assistant. Check your connection and try again.',
          { error: true }
        );
      } finally {
        clearTimeout(timeout);
      }

      if (abortRef.current !== controller) return;
      setMessages((prev) => [...prev, reply]);
      setIsLoading(false);
      if (!isOpenRef.current) setUnread((n) => n + 1);
      inputRef.current?.focus();
    },
    [messages, isLoading]
  );

  const clearChat = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([makeMessage('bot', GREETING, { greeting: true })]);
    setInput('');
    setIsLoading(false);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  const showSuggestions = messages.length === 1 && !isLoading;

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close chat"
          tabIndex={-1}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-[59] bg-black/25 md:hidden"
        />
      )}

      <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] z-[60]">
        {isOpen && (
          <div
            role="dialog"
            aria-label="Metro Assistant"
            className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] top-[calc(5rem+env(safe-area-inset-top))] flex min-h-0 w-[calc(100vw-2rem)] max-w-[420px] flex-col overflow-hidden rounded-xl border border-line-200 bg-surface-1 shadow-lg"
          >
            <div className="flex items-center justify-between gap-3 bg-navy-900 px-5 py-4 text-white">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/20 bg-white/10">
                  <TrainFront strokeWidth={1.75} size={20} />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-sans text-base font-semibold leading-tight">Metro Assistant</div>
                  <div className="mt-0.5 text-xs text-white/70">Routes, fares, stations and tickets</div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={clearChat}
                  className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Start a new chat"
                  title="Start a new chat"
                >
                  <RefreshCw strokeWidth={1.75} size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Close chat"
                >
                  <X strokeWidth={1.75} size={20} />
                </button>
              </div>
            </div>

            <div ref={listRef} role="log" aria-live="polite" className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-surface-0 px-4 py-5">
              {messages.map((m) => (
                <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'bot' && <Avatar icon={TrainFront} />}
                  <div
                    className={
                      'max-w-[78%] whitespace-pre-wrap break-words rounded-lg px-4 py-3 text-sm leading-relaxed ' +
                      (m.role === 'user'
                        ? 'bg-navy-900 text-white'
                        : m.error
                          ? 'border border-alert-600/40 bg-surface-1 text-ink-900'
                          : 'border border-line-200 bg-surface-1 text-ink-900')
                    }
                  >
                    {m.role === 'bot' ? renderMessage(m.text) : m.text}
                  </div>
                  {m.role === 'user' && <Avatar icon={User} />}
                </div>
              ))}

              {showSuggestions && (
                <div className="flex flex-wrap gap-2 pl-11">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-full border border-line-200 bg-surface-1 px-3 py-1.5 text-xs font-medium text-ink-900 transition hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {isLoading && (
                <div className="flex justify-start gap-3" role="status" aria-label="Assistant is typing">
                  <Avatar icon={TrainFront} />
                  <div className="flex items-center gap-1 rounded-lg border border-line-200 bg-surface-1 px-4 py-4">
                    {[0, 150, 300].map((delay) => (
                      <span key={delay} className="h-2 w-2 animate-bounce rounded-full bg-navy-900" style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={onSubmit} className="border-t border-line-200 bg-surface-1 px-4 py-4">
              <div className="flex items-center gap-3">
                <label htmlFor="chat-input" className="sr-only">Ask a question</label>
                <input
                  id="chat-input"
                  ref={inputRef}
                  type="text"
                  value={input}
                  maxLength={MAX_LENGTH}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question"
                  autoComplete="off"
                  className="flex-1 rounded-md border border-line-200 bg-surface-0 px-4 py-3 text-sm text-ink-900 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-navy-900 text-white transition hover:bg-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-ink-300"
                  aria-label="Send message"
                >
                  <Send strokeWidth={1.75} size={18} />
                </button>
              </div>
            </form>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-navy-900 shadow-lg transition hover:bg-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          aria-label={isOpen ? 'Close chat' : unread ? `Open chat, ${unread} new message${unread > 1 ? 's' : ''}` : 'Open chat'}
          aria-expanded={isOpen}
        >
          {isOpen ? <X strokeWidth={1.75} size={26} className="text-white" /> : <TrainFront strokeWidth={1.75} size={28} className="text-white" />}
          {!isOpen && unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-alert-600 font-mono text-[10px] font-semibold text-white">
              {unread}
            </span>
          )}
        </button>
      </div>
    </>
  );
}

export default ChatWidget;
