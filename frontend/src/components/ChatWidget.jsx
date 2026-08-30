import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Send, TrainFront, X, RefreshCw, User } from 'lucide-react';

const API_URL = (process.env.REACT_APP_API_BASE_URL || "https://ahmedabad-metro-backend.onrender.com").replace(/\/+$/, "");

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(() => [
    {
      role: 'bot',
      text: 'Hi! Ask me about Ahmedabad Metro routes, timings, fares, stations, and facilities.',
      ts: Date.now()
    }
  ]);

  const containerRef = useRef(null);

  const endpoint = useMemo(() => {
    return `${API_URL}/api/chat`;
  }, []);

  const scrollToBottom = () => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg = { role: 'user', text, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    try {
      setIsLoading(true);
      
      const history = messages
        .slice(-10)
        .map((m) => ({ role: m.role, text: m.text }));

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text,
          history: history
        })
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: `Server error: ${resp.status} ${resp.statusText}` };
        }
        throw new Error(errorData.error || errorData.details || `Chat request failed (${resp.status})`);
      }

      const data = await resp.json();

      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: data.response || 'Sorry, I could not respond.', ts: Date.now() }
      ]);
    } catch (e) {
      console.error('Chat error:', e);
      const errorMessage = e.message || 'Sorry, the chatbot is unavailable right now.';
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: errorMessage, ts: Date.now() }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'bot',
        text: 'Hi! Ask me about Ahmedabad Metro routes, timings, fares, stations, and facilities.',
        ts: Date.now()
      }
    ]);
    setInput('');
  };

  const onSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Backdrop (mobile friendly) */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close chat overlay"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-[59] bg-black/25 backdrop-blur-[2px] md:hidden"
        />
      )}

      <div className="fixed right-[calc(1rem+env(safe-area-inset-right))] bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[60]">
      {/* Panel */}
      {isOpen && (
        <div
          className={
            "fixed right-[calc(1rem+env(safe-area-inset-right))] top-[calc(5rem+env(safe-area-inset-top))] bottom-[calc(5.75rem+env(safe-area-inset-bottom))] " +
            "w-[calc(100vw-2rem)] max-w-[420px] overflow-hidden rounded-xl border border-line-200 bg-surface-1 shadow-lg flex flex-col min-h-0"
          }
        >
          {/* Header */}
          <div className="bg-navy-900 px-5 py-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-10 w-10 rounded-md bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/20">
                  <TrainFront strokeWidth={1.75} size={20} className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold leading-tight font-sans truncate">Metro Assistant</div>
                  <div className="mt-1 text-xs text-white/70 leading-snug line-clamp-2">
                    Routes, timings, fares, & stations
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={clearChat}
                  className="h-9 w-9 rounded-md bg-white/10 hover:bg-white/20 transition flex items-center justify-center"
                  aria-label="Clear chat"
                  title="Clear chat"
                >
                  <RefreshCw strokeWidth={1.75} size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="h-9 w-9 rounded-md bg-white/10 hover:bg-white/20 transition flex items-center justify-center"
                  aria-label="Close chat"
                >
                  <X strokeWidth={1.75} size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={containerRef}
            className="flex-1 min-h-0 overflow-y-auto bg-surface-0 px-4 py-5 space-y-4"
          >
            {messages.map((m, idx) => (
              <div key={m.ts} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'bot' && (
                  <div className="h-8 w-8 rounded-full bg-navy-100 flex items-center justify-center flex-shrink-0 border border-line-200">
                    <TrainFront strokeWidth={1.75} size={16} className="text-navy-900" />
                  </div>
                )}
                <div
                  className={
                    `max-w-[78%] rounded-lg px-4 py-3 text-sm leading-relaxed transition-all ` +
                    (m.role === 'user'
                      ? 'bg-navy-900 text-white'
                      : 'bg-surface-1 text-ink-900 border border-line-200')
                  }
                >
                  <div className="whitespace-pre-wrap break-words">{m.text}</div>
                </div>
                {m.role === 'user' && (
                  <div className="h-8 w-8 rounded-full bg-navy-100 flex items-center justify-center flex-shrink-0 border border-line-200">
                     <User strokeWidth={1.75} size={16} className="text-navy-900" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start gap-3">
                <div className="h-8 w-8 rounded-full bg-navy-100 flex items-center justify-center flex-shrink-0 border border-line-200">
                  <TrainFront strokeWidth={1.75} size={16} className="text-navy-900" />
                </div>
                <div className="max-w-[78%] rounded-lg px-4 py-3 text-sm bg-surface-1 text-ink-600 border border-line-200">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-navy-900 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="h-2 w-2 rounded-full bg-navy-900 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="h-2 w-2 rounded-full bg-navy-900 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <form onSubmit={onSubmit} className="border-t border-line-200 bg-surface-1 px-4 py-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask a question..."
                disabled={isLoading}
                className="flex-1 rounded-md border border-line-200 bg-surface-0 px-4 py-3 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-navy-700 focus:border-navy-900 disabled:bg-line-100 disabled:cursor-not-allowed transition-all"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className={
                  `h-11 w-11 rounded-md text-white flex items-center justify-center transition-all ` +
                  (isLoading || !input.trim()
                    ? 'bg-ink-300 cursor-not-allowed'
                    : 'bg-navy-900 hover:bg-navy-700 active:scale-95')
                }
                aria-label="Send message"
              >
                {isLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/50 border-t-white" />
                ) : (
                  <Send strokeWidth={1.75} size={18} />
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="h-14 w-14 rounded-full bg-navy-900 shadow-lg flex items-center justify-center hover:-translate-y-0.5 hover:bg-navy-700 transition-all active:scale-95"
        aria-label="Open chat"
      >
        <TrainFront strokeWidth={1.75} size={28} className="text-white" />
        
        {!isOpen && messages.length > 1 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-alert-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
            {messages.filter(m => m.role === 'bot').length}
          </span>
        )}
      </button>
      </div>
    </>
  );
}

export default ChatWidget;

