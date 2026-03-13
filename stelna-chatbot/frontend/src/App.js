import { useState, useRef, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";
import logo from "./assets/logo.png";
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
  // ...existing code...
  const bottomRef = useRef(null);
  const iframeRef = useRef(null);

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

  const addBotMessage = (text, options = null) => {
    setChat(prev => [...prev, {
      type: "bot",
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      menuOptions: options
    }]);
  };

  const handleMenuOption = async (option) => {
    // Hide quick action buttons after first click
    setShowQuickActions(false);

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
      const res = await axios.post("http://localhost:5000/chat", {
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
        fillPrcLive(res.data);
        setChatOpen(false);
        setShowModal(true);
        setTimeout(() => setShowModal(false), 3000);
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
      const res = await axios.post("http://localhost:5000/chat", {
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
        fillPrcLive(res.data);
        setChatOpen(false);
        setShowModal(true);
        setTimeout(() => setShowModal(false), 3000);
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

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  // Listen for messages from iframe (mode selection, open chatbot)
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === "open_chatbot") {
        setModeSelected(true);
        setChatOpen(true);
        // Add welcome message with buttons when chat opens
        setChat(prev => {
          if (prev.length === 0) {
            return [{
              type: "bot",
              text: "Hi 👋 Welcome to BuildWise.AI\n\nI'm here to assist you in planning your product manufacturing.\n\nHow can I help you today?",
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

      {/* ...existing code... */}

      {/* Floating chatbot panel */}
      {chatOpen && (
        <div className="chat-panel">
          <div className="chat-header">
            <div className="header-left">
              <img src={logo} alt="logo" className="logo" />
              <span className="title">BuildWise.AI</span>
            </div>
            <button className="chat-close-btn" onClick={() => setChatOpen(false)}>✕</button>
          </div>

          <div className="chat-body">
            {chat.map((c, i) => (
              <div key={i} className={`msg ${c.type}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {c.text}
                </ReactMarkdown>
                <div className="time">{c.time}</div>

                {/* Show quick action buttons on welcome message */}
                {c.showButtons && showQuickActions && (
                  <div className="menu-options welcome-options">
                    <button className="menu-btn" onClick={() => handleMenuOption("Check Product Readiness")}>
                      Check Product Readiness
                    </button>
                    <button className="menu-btn" onClick={() => handleMenuOption("Get Manufacturing Guidance")}>
                      Get Manufacturing Guidance
                    </button>
                  </div>
                )}

                {/* Render dynamic menu options from backend responses */}
                {c.menuOptions && (
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
            ))}

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
              placeholder="Describe your product..."
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage}>Send</button>
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
