import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPaperPlane, FaRobot, FaUser, FaSync, FaGlobe} from 'react-icons/fa';
import '../styles/Chat.css';
const API_URL = process.env.REACT_APP_API_BASE_URL;

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
        ? '${API_URL}/chat_guj'      // Gujarati endpoint
        : '${API_URL}/api/chat';     // English endpoint (fixed)

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
      const response = await fetch('${API_URL}/api/gujarati/status');
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
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-content">
          <FaRobot className="bot-icon" />
          <div>
            <h3>Ahmedabad Metro Assistant</h3>
            <div className={`status ${isLoading ? 'loading' : ''}`}>
              {isLoading ? (
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ) : currentContent.status.online}
            </div>
          </div>
        </div>
        <div className="header-actions">
          <div className="language-selector" title={currentContent.tooltips.language}>
            <FaGlobe className="language-icon" />
            <select 
              value={selectedLanguage} 
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="language-dropdown"
            >
              <option value="english">English</option>
              <option value="gujarati">ગુજરાતી</option>
            </select>
          </div>
          <button className="action-btn" onClick={clearChat} title={currentContent.tooltips.clear}>
            <FaSync />
          </button>
          <button className="action-btn" onClick={scrollToBottom} title={currentContent.tooltips.scroll}>
            ↓
          </button>
        </div>
      </div>
      
      <div ref={messagesContainerRef} className="chat-messages">
        <div className="welcome-message">
          <p>
            {selectedLanguage === 'english' 
              ? "Ask me about routes, fares, stations, schedules, or anything related to Ahmedabad Metro!"
              : "માર્ગો, ભાડાં, સ્ટેશનો, સમયપત્રક અથવા અમદાવાદ મેટ્રો સંબંધિત કંઈપણ વિશે મને પૂછો!"
            }
          </p>
        </div>
        
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.isBot ? 'bot' : 'user'}`}>
            <div className="message-avatar">
              {msg.isBot ? <FaRobot /> : <FaUser />}
            </div>
            <div className="message-content">
              <div className="message-text">
                {msg.text}
              </div>
              <div className="message-time">
                {formatTime(msg.timestamp)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="chat-input">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={currentContent.placeholder}
          disabled={isLoading}
        />
        <button 
          type="submit" 
          disabled={isLoading || !inputMessage.trim()}
          className="send-button"
        >
          {isLoading ? (
            <div className="loading-dots">
              <div></div>
              <div></div>
              <div></div>
            </div>
          ) : (
            <FaPaperPlane />
          )}
        </button>
      </form>
      
      <div className="chat-suggestions">
        <p>{currentContent.quickSuggestions}</p>
        <div className="suggestion-buttons">
          <button onClick={() => handleSuggestionClick('timing')}>
            {currentContent.suggestions.timing}
          </button>
          <button onClick={() => handleSuggestionClick('nearest')}>
            {currentContent.suggestions.nearest}
          </button>
          <button onClick={() => handleSuggestionClick('route')}>
            {currentContent.suggestions.route}
          </button>
          <button onClick={() => handleSuggestionClick('map')}>
            {currentContent.suggestions.map}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
