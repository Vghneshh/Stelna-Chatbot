import { useState, useRef, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";
// ...existing code...

function App() {
  // Generate or retrieve session ID
  const getSessionId = () => {
    let sessionId = localStorage.getItem("sessionId");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem("sessionId", sessionId);
    }
    return sessionId;
  };

  const [sessionId] = useState(getSessionId());
  const [message, setMessage] = useState("");
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [modeSelected, setModeSelected] = useState(false);
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [typingText, setTypingText] = useState("");
  const [typingDone, setTypingDone] = useState(false);
  const [assessmentStarted, setAssessmentStarted] = useState(false);
  const bottomRef = useRef(null);
  const modalTimeoutRef = useRef(null);
  const iframeRef = useRef(null);
  const typingRef = useRef(null);

  // Send PRC data to iframe via postMessage
  const fillPrcLive = (data) => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage({
      type: "prc_fill",
      knowledgeReadiness: data.knowledgeReadiness || [],
      functionalRequirements: data.functionalRequirements || [],
      nonFunctionalRequirements: data.nonFunctionalRequirements || [],
      manufacturingReadiness: data.manufacturingReadiness || []
    }, window.location.origin);
  };

  // Show completion modal once - guards against duplicate triggers
  const showCompletionModal = (data) => {
    if (showModal) return; // already showing
    if (modalTimeoutRef.current) clearTimeout(modalTimeoutRef.current);
    fillPrcLive(data);
    setChatOpen(false);
    setShowModal(true);
    modalTimeoutRef.current = setTimeout(() => {
      setShowModal(false);
      modalTimeoutRef.current = null;
    }, 3000);
  };

  const addBotMessage = (text, options = null) => {
    setChat(prev => [...prev, {
      type: "bot",
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      menuOptions: options
    }]);
  };

  const handleMenuOption = async (option) => {
    if (loading) return;
    // Hide quick action buttons after first click
    setShowQuickActions(false);

    // Enable input when assessment starts
    if (option === "Check Product Readiness") {
      setAssessmentStarted(true);
    }

    // Add user selection as message
    setChat(prev => [...prev, {
      type: "user",
      text: option,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);

    setLoading(true);

    // Handle "Save for later" option
    if (option === "Save for later") {
      addBotMessage("No problem! Your progress has been saved.\n\nYou can continue anytime by typing 'hi' or 'menu'.");
      setLoading(false);
      return;
    }

    // For all other options, send to backend
    try {
      const res = await axios.post("https://stelnaassist.onrender.com/chat", {
        message: option,
        sessionId: sessionId
      });

      if (res.data.type === "menu") {
        addBotMessage(res.data.message, res.data.options);
      }
      else if (res.data.type === "prc_start" || res.data.type === "prc_question") {
        addBotMessage(res.data.message, res.data.options);
        fillPrcLive(res.data);
      }
      else if (res.data.type === "prc_complete") {
        addBotMessage(res.data.message, res.data.options);
      }
      else if (res.data.type === "prc_redirect" || (res.data.reply === "__PRC_REDIRECT__" && res.data.prcUrl)) {
        showCompletionModal(res.data);
      }
      else {
        addBotMessage(res.data.reply || res.data.message);
      }
    } catch (error) {
      addBotMessage("Sorry, something went wrong. Please try again.");
    }

    setLoading(false);
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    if (loading) return;

    const userMessage = message;

    // Add user message
    setChat(prev => [...prev, {
      type: "user",
      text: userMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);

    setMessage("");
    setLoading(true);

    try {
      const res = await axios.post("https://stelnaassist.onrender.com/chat", {
        message: userMessage,
        sessionId: sessionId
      });

      if (res.data.type === "menu") {
        addBotMessage(res.data.message, res.data.options);
      }
      else if (res.data.type === "prc_start" || res.data.type === "prc_question") {
        addBotMessage(res.data.message, res.data.options);
        fillPrcLive(res.data);
      }
      else if (res.data.type === "prc_complete") {
        addBotMessage(res.data.message, res.data.options);
      }
      else if (res.data.type === "prc_redirect" || (res.data.reply === "__PRC_REDIRECT__" && res.data.prcUrl)) {
        showCompletionModal(res.data);
      }
      else {
        addBotMessage(res.data.reply || res.data.message);
      }

    } catch (error) {
      addBotMessage("Sorry, something went wrong. Please try again.");
    }

    setLoading(false);
  };

  // ...existing code...

  const getGreetingFirstLine = () => {
    const name = username || localStorage.getItem("username") || "";
    return name
      ? `Hi, ${name}`
      : `Hi`;
  };

  const greetingSubtitle = "Welcome to Stelna Bot.\nI'll help you evaluate your product readiness step by step.\n\nReady to get started?";

  const getGreeting = () => {
    return getGreetingFirstLine() + "\n\n" + greetingSubtitle;
  };

  const startTyping = (firstLine) => {
    setTypingText("");
    setTypingDone(false);
    let i = 0;
    if (typingRef.current) clearInterval(typingRef.current);
    typingRef.current = setInterval(() => {
      i++;
      setTypingText(firstLine.slice(0, i));
      if (i >= firstLine.length) {
        clearInterval(typingRef.current);
        typingRef.current = null;
        setTimeout(() => setTypingDone(true), 500);
      }
    }, 55);
  };

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading, typingText]);

  // Start typing when welcome message is added
  useEffect(() => {
    if (chat.length === 1 && chat[0].text === "__typing__" && !typingRef.current) {
      startTyping(getGreetingFirstLine());
    }
  }, [chat]);

  // Listen for messages from iframe (mode selection, open chatbot)
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === "open_chatbot") {
        setModeSelected(true);
        setChatOpen(true);
        // Start typing animation for welcome message
        setChat(prev => {
          if (prev.length === 0) {
            return [{
              type: "bot",
              text: "__typing__",
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              showButtons: true
            }];
          }
          return prev;
        });
      }
      if (event.data && event.data.type === "mode_selected") {
        setModeSelected(true);
      }
      if (event.data && event.data.type === "username_set") {
        setUsername(event.data.username);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // ...existing code...

  return (
    <div className="app-wrapper">
      {/* PRC page fills the entire background */}
      <iframe
        ref={iframeRef}
        src="/prc.html"
        title="Product Readiness Checklist"
        className="prc-iframe"
      />

      {/* Chat icon - only show when chat is closed and mode is selected */}
      {modeSelected && !chatOpen && (
        <button className="chat-icon" onClick={() => setChatOpen(true)}>
          💬
        </button>
      )}

      {/* Floating chatbot panel */}
      {chatOpen && (
        <div className="chat-panel">
          <div className="chat-header">
            <div className="header-left">
              <span className="title"><span className="title-brand">Stelna Bot</span></span>
            </div>
            <button className="chat-close-btn" onClick={() => setChatOpen(false)}>✕</button>
          </div>

          <div className="chat-body">
            {(() => {
              const lastBotIdx = chat.reduce((last, m, idx) => m.type === "bot" ? idx : last, -1);
              return chat.map((c, i) => (
              <div key={i} className={`msg ${c.type}${c.text === "__typing__" ? " welcome-msg" : ""}`}>
                {/* Welcome message with typing animation */}
                {c.text === "__typing__" ? (
                  <div className="welcome-greeting">
                    <h1 className="greeting-gradient">{typingText}</h1>
                    {!typingDone && <span className="typing-cursor">|</span>}
                    {typingDone && (
                      <div className="greeting-reveal">
                        <p className="greeting-subtitle">{greetingSubtitle}</p>
                      </div>
                    )}
                    {c.showButtons && showQuickActions && typingDone && (
                      <div className="buttons-reveal">
                        <div className="menu-options welcome-options">
                          <button className="menu-btn" onClick={() => handleMenuOption("Check Product Readiness")}>
                            Start Assessment
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {c.text}
                  </ReactMarkdown>
                )}
                <div className="time">{c.time}</div>

                {/* Render dynamic menu options only on the latest bot message */}
                {c.menuOptions && i === lastBotIdx && (
                  <div className="menu-options">
                    {c.menuOptions.map((opt, idx) => (
                      <button
                        key={idx}
                        className="menu-btn"
                        onClick={() => handleMenuOption(opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ));
            })()}

            {loading && (
              <div className="msg bot typing">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            )}

            <div ref={bottomRef}></div>
          </div>

          <div className="chat-input">
            <input
              value={message}
              placeholder={assessmentStarted ? "Describe your product..." : "Click 'Start Assessment' to begin"}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && assessmentStarted && sendMessage()}
              disabled={!assessmentStarted}
            />
            <button onClick={sendMessage} disabled={!assessmentStarted}>Send</button>
          </div>
        </div>
      )}

      {/* Completion modal popup */}
      {showModal && (
        <div className="completion-overlay">
          <div className="completion-modal">
            <h2>Assessment Complete</h2>
            <p>Let me take you to your Product Readiness Checklist.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
