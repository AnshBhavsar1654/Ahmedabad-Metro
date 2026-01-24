import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaPaperPlane, FaRobot, FaTimes, FaSync } from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_BASE_URL || "https://ahmedabad-metro-backend.onrender.com";

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [avatarOk, setAvatarOk] = useState(true);
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
      // Let the panel render first then scroll.
      setTimeout(scrollToBottom, 0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    // Add user message immediately
    const userMsg = { role: 'user', text, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    try {
      setIsLoading(true);
      
      // Build conversation history (last 10 messages for context)
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
            "mb-4 w-[calc(100vw-2rem)] max-w-[420px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(2,6,23,0.25)] " +
            "max-h-[calc(100vh-7.5rem)] flex flex-col"
          }
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-5 py-4 text-white shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-white/20">
                  {avatarOk ? (
                    <img
                      src="/bot_avatar.png"
                      alt="Bot"
                      className="h-12 w-12 object-cover"
                      onError={() => setAvatarOk(false)}
                    />
                  ) : (
                    <FaRobot className="text-xl text-white" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-base font-bold leading-tight truncate">Ahmedabad Metro Chatbot</div>
                  <div className="mt-1 text-xs text-white/90 leading-snug line-clamp-2">
                    Ask me about Ahmedabad Metro routes, timings, fares, nearby stations...
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={clearChat}
                  className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center"
                  aria-label="Clear chat"
                  title="Clear chat"
                >
                  <FaSync className="text-sm" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center"
                  aria-label="Close chat"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={containerRef}
            className="flex-1 min-h-0 overflow-y-auto bg-gradient-to-b from-slate-50 via-white to-slate-50 px-4 py-5 space-y-4"
          >
            {messages.map((m, idx) => (
              <div key={m.ts} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'bot' && (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center flex-shrink-0 ring-2 ring-brand-200">
                    {avatarOk ? (
                      <img
                        src="/bot_avatar.png"
                        alt="Bot"
                        className="h-8 w-8 object-cover rounded-full"
                        onError={() => {}}
                      />
                    ) : (
                      <FaRobot className="text-xs text-white" />
                    )}
                  </div>
                )}
                <div
                  className={
                    `max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md transition-all ` +
                    (m.role === 'user'
                      ? 'bg-gradient-to-br from-brand-600 to-brand-800 text-white rounded-tr-sm hover:shadow-lg'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm hover:shadow-lg')
                  }
                >
                  <div className="whitespace-pre-wrap break-words">{m.text}</div>
                </div>
                {m.role === 'user' && (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center flex-shrink-0 ring-2 ring-slate-200">
                    <span className="text-xs font-semibold text-white">U</span>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center flex-shrink-0 ring-2 ring-brand-200">
                  {avatarOk ? (
                    <img
                      src="/bot_avatar.png"
                      alt="Bot"
                      className="h-8 w-8 object-cover rounded-full"
                      onError={() => {}}
                    />
                  ) : (
                    <FaRobot className="text-xs text-white" />
                  )}
                </div>
                <div className="max-w-[78%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm bg-white text-slate-600 border border-slate-200 shadow-md">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="h-2 w-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="h-2 w-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span className="text-xs text-slate-500">Typing...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <form onSubmit={onSubmit} className="border-t border-slate-200 bg-white px-4 py-4 shadow-lg">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask your queries..."
                disabled={isLoading}
                className="flex-1 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-500 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className={
                  `h-12 w-12 rounded-2xl text-white flex items-center justify-center shadow-lg transition-all ` +
                  (isLoading || !input.trim()
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-br from-brand-900 to-brand-700 hover:-translate-y-0.5 hover:shadow-xl active:scale-95')
                }
                aria-label="Send message"
              >
                {isLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/50 border-t-white" />
                ) : (
                  <FaPaperPlane />
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
        className="h-16 w-16 rounded-full bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 shadow-[0_8px_24px_rgba(30,64,175,0.4)] border-2 border-white/30 flex items-center justify-center hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(30,64,175,0.5)] transition-all overflow-hidden active:scale-95"
        aria-label="Open chat"
      >
        {avatarOk ? (
          <img
            src="/bot_avatar.png"
            alt="Chat"
            className="h-16 w-16 object-cover"
            onError={() => setAvatarOk(false)}
          />
        ) : (
          <div className="h-12 w-12 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/20">
            <FaRobot className="text-2xl text-white" />
          </div>
        )}
        {!isOpen && messages.length > 1 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
            {messages.filter(m => m.role === 'bot').length}
          </span>
        )}
      </button>
      </div>
    </>
  );
}

export default ChatWidget;

