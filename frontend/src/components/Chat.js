import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPaperPlane, FaRobot, FaUser, FaSync, FaGlobe} from 'react-icons/fa';
const API_URL = process.env.REACT_APP_API_BASE_URL || "https://ahmedabad-metro-backend.onrender.com";

const Chat = () => {
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  const [messages, setMessages] = useState([
    {
      text: "Hello! I'm your Ahmedabad Metro Assistant. How can I help you today?", 
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  
  
  // Language-specific content
  const languageContent = {
    english: {
      welcomeMessage: "Hello! I'm your Ahmedabad Metro Assistant. How can I help you today?",
      chatUnavailable: "Sorry, the chatbot is currently unavailable. Please try again later.",
      placeholder: "Ask about Ahmedabad Metro...",
      quickSuggestions: "Quick suggestions:",
      suggestions: {
        timing: "What's the first metro timing?",
        nearest: "Nearest station",
        route: "Route and Fare",
        map: "Metro map"
      },
      status: {
        online: "Online",
        typing: "Typing..."
      },
      tooltips: {
        clear: "Clear chat",
        scroll: "Scroll to bottom",
        language: "Select Language"
      }
    },
    gujarati: {
      welcomeMessage: "નમસ્તે! હું તમારો અમદાવાદ મેટ્રો સહાયક છું. આજે હું તમને કેવી રીતે મદદ કરી શકું?",
      chatUnavailable: "માફ કરશો, ચેટબોટ હાલમાં ઉપલબ્ધ નથી. કૃપા કરીને પછીથી પ્રયાસ કરો.",
      placeholder: "અમદાવાદ મેટ્રો વિશે પૂછો...",
      quickSuggestions: "ઝડપી સૂચનો:",
      suggestions: {
        timing: "પહેલી મેટ્રોનો સમય શું છે?",
        nearest: "નજીકનું સ્ટેશન",
        route: "માર્ગ અને ભાડું",
        map: "મેટ્રો નકશો"
      },
      status: {
        online: "ઓનલાઇન",
        typing: "ટાઇપ કરી રહ્યું છે..."
      },
      tooltips: {
        clear: "ચેટ સાફ કરો",
        scroll: "નીચે સ્ક્રોલ કરો",
        language: "ભાષા પસંદ કરો"
      }
    }
  };

  const currentContent = languageContent[selectedLanguage];
  
const scrollToBottom = () => {
  if (messagesContainerRef.current) {
    messagesContainerRef.current.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }
};
useEffect(() => {
  scrollToBottom();
}, [messages]);

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    setMessages([
      {
        text: languageContent[language].welcomeMessage,
        isBot: true,
        timestamp: new Date()
      }
    ]);
  };

  // Fixed handleSubmit function with correct endpoint logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    try {
      setIsLoading(true);
      const userMessage = inputMessage;
      setMessages(prev => [...prev, { text: userMessage, isBot: false, timestamp: new Date() }]);
      setInputMessage('');
    
      // Fixed endpoint selection - English should use different endpoint than Gujarati
      const endpoint = selectedLanguage === 'gujarati'
        ? `${API_URL}/chat_guj`      // Gujarati endpoint
        : `${API_URL}/api/chat`;     // English endpoint

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          language: selectedLanguage 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.response || 'Server error');
      }
    
      const data = await response.json();
    
      // Add bot response
      setMessages(prev => [...prev, { 
        text: data.response, 
        isBot: true,
        timestamp: new Date(),
        translationUsed: data.translation_used || false,
        confidence: data.confidence || 0
      }]);
    
      // Log debug info in development
      if (data.debug_info && process.env.NODE_ENV === 'development') {
        console.log('Translation Debug Info:', data.debug_info);
      }
    
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        text: error.message || currentContent.chatUnavailable,
        isBot: true,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  
  const checkGujaratiStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/gujarati/status`);
      const data = await response.json();
      return data.available;
    } catch (error) {
      return false;
    }
  };

  useEffect(() => {
    if (selectedLanguage === 'gujarati') {
      checkGujaratiStatus().then(isReady => {
        if (!isReady) {
          console.warn('Gujarati translation may not be available');
        }
      });
    }
  }, [selectedLanguage]);

  const clearChat = () => {
    setMessages([
      { 
        text: currentContent.welcomeMessage, 
        isBot: true,
        timestamp: new Date()
      }
    ]);
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = 0;
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSuggestionClick = (suggestionKey) => {
    const suggestionText = currentContent.suggestions[suggestionKey];
    if (suggestionKey === 'timing') {
      setInputMessage(suggestionText);
    } else {
      // Navigate to other pages for other suggestions
      switch(suggestionKey) {
        case 'nearest':
          navigate('/nearest-stations');
          break;
        case 'route':
          navigate('/routes');
          break;
        case 'map':
          navigate('/stations');
          break;
        default:
          setInputMessage(suggestionText);
      }
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 pb-10">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-br from-brand-900 to-brand-700 text-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-white/10 flex items-center justify-center">
              <FaRobot className="text-2xl text-emerald-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Ahmedabad Metro Assistant</h3>
              <div className="mt-0.5 text-xs text-white/90 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${isLoading ? 'bg-amber-400' : 'bg-emerald-300'}`} />
                {isLoading ? currentContent.status.typing : currentContent.status.online}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-2">
              <FaGlobe className="text-sm" />
              <select
                value={selectedLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-transparent text-white text-sm font-semibold outline-none"
                aria-label={currentContent.tooltips.language}
              >
                <option value="english" className="text-slate-900">English</option>
                <option value="gujarati" className="text-slate-900">ગુજરાતી</option>
              </select>
            </div>

            <button
              type="button"
              onClick={clearChat}
              title={currentContent.tooltips.clear}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center"
            >
              <FaSync />
            </button>
            <button
              type="button"
              onClick={scrollToBottom}
              title={currentContent.tooltips.scroll}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center"
            >
              ↓
            </button>
          </div>
        </div>

        <div ref={messagesContainerRef} className="h-[60vh] overflow-y-auto bg-slate-50/70 p-4 sm:p-6 space-y-4">
          <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50 px-4 py-3 text-sm text-brand-900 text-center">
            {selectedLanguage === 'english'
              ? "Ask me about routes, fares, stations, schedules, or anything related to Ahmedabad Metro!"
              : "માર્ગો, ભાડાં, સ્ટેશનો, સમયપત્રક અથવા અમદાવાદ મેટ્રો સંબંધિત કંઈપણ વિશે મને પૂછો!"}
          </div>

          {messages.map((msg, index) => (
            <div key={index} className={`flex gap-3 ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
              {msg.isBot && (
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-900 to-brand-700 text-white flex items-center justify-center flex-shrink-0">
                  <FaRobot className="text-sm" />
                </div>
              )}

              <div className={
                `max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ` +
                (msg.isBot
                  ? 'bg-white text-slate-800 rounded-tl-md'
                  : 'bg-gradient-to-br from-brand-600 to-brand-800 text-white rounded-tr-md')
              }>
                <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.text}</div>
                <div className="mt-2 text-[10px] opacity-80 text-right">{formatTime(msg.timestamp)}</div>
              </div>

              {!msg.isBot && (
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center flex-shrink-0">
                  <FaUser className="text-sm" />
                </div>
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-3 border-t border-slate-200 bg-white px-4 py-4">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={currentContent.placeholder}
            disabled={isLoading}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-4 focus:ring-brand-200 focus:border-brand-400 disabled:bg-slate-50"
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className={
              `h-12 w-12 rounded-2xl text-white flex items-center justify-center shadow transition ` +
              (isLoading || !inputMessage.trim()
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-br from-brand-900 to-brand-700 hover:-translate-y-0.5')
            }
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/50 border-t-white" />
            ) : (
              <FaPaperPlane />
            )}
          </button>
        </form>

        <div className="border-t border-slate-200 bg-white px-4 py-4">
          <p className="text-center text-sm text-slate-500">{currentContent.quickSuggestions}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button type="button" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition" onClick={() => handleSuggestionClick('timing')}>
              {currentContent.suggestions.timing}
            </button>
            <button type="button" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition" onClick={() => handleSuggestionClick('nearest')}>
              {currentContent.suggestions.nearest}
            </button>
            <button type="button" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition" onClick={() => handleSuggestionClick('route')}>
              {currentContent.suggestions.route}
            </button>
            <button type="button" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition" onClick={() => handleSuggestionClick('map')}>
              {currentContent.suggestions.map}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
