import { useState, useRef, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";
import logo from "./assets/logo.png";

function App() {
  // If opened directly (not inside prc.html iframe), redirect to the PRC page
  if (window.self === window.top) {
    window.location.replace("/prc.html");
    return null;
  }

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
  const [chat, setChat] = useState([
    {
      type: "bot",
      text: `Hi 👋 Welcome to Stelna Designs.

I'm here to assist you in planning your product manufacturing.

How can I help you today?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      showButtons: true
    }
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

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

    // For all options, send to backend
    try {
      const res = await axios.post("http://localhost:5000/chat", {
        message: option,
        sessionId: sessionId
      });

      // Handle different response types (same as sendMessage)
      if (res.data.type === "menu") {
        addBotMessage(res.data.message, res.data.options);
      }
      else if (res.data.type === "prc_start" || res.data.type === "prc_question") {
        addBotMessage(res.data.message, res.data.options);
      }
      else if (res.data.type === "prc_complete") {
        addBotMessage(res.data.message, res.data.options);
      }
      else if (res.data.type === "prc_redirect" || (res.data.reply === "__PRC_REDIRECT__" && res.data.prcUrl)) {
        addBotMessage(res.data.message || "Great! Let me take you to the Product Readiness Checklist...");
        
        console.log("💾 Saving PRC data:", {
          knowledgeReadiness: res.data.knowledgeReadiness?.length || 0,
          functionalRequirements: res.data.functionalRequirements?.length || 0,
          nonFunctionalRequirements: res.data.nonFunctionalRequirements?.length || 0,
          manufacturingReadiness: res.data.manufacturingReadiness?.length || 0
        });
        
        // Save complete PRC data as single object
        localStorage.setItem("prcData", JSON.stringify({
          prcAnswers: res.data.prcAnswers,
          knowledgeReadiness: res.data.knowledgeReadiness || [],
          functionalRequirements: res.data.functionalRequirements || [],
          nonFunctionalRequirements: res.data.nonFunctionalRequirements || [],
          manufacturingReadiness: res.data.manufacturingReadiness || []
        }));
        
        setTimeout(() => {
          window.location.href = res.data.prcUrl;
        }, 1000);
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

      // Handle different response types
      if (res.data.type === "menu") {
        addBotMessage(res.data.message, res.data.options);
      }
      else if (res.data.type === "prc_start" || res.data.type === "prc_question") {
        // PRC conversation flow
        addBotMessage(res.data.message, res.data.options);
      }
      else if (res.data.type === "prc_complete") {
        // PRC completed - ask if user wants to review
        addBotMessage(res.data.message, res.data.options);
      }
      else if (res.data.type === "prc_redirect" || (res.data.reply === "__PRC_REDIRECT__" && res.data.prcUrl)) {
        // Redirect to PRC with collected answers
        addBotMessage(res.data.message || "Great! Let me take you to the Product Readiness Checklist...");
        
        console.log("💾 Saving PRC data:", {
          knowledgeReadiness: res.data.knowledgeReadiness?.length || 0,
          functionalRequirements: res.data.functionalRequirements?.length || 0,
          nonFunctionalRequirements: res.data.nonFunctionalRequirements?.length || 0,
          manufacturingReadiness: res.data.manufacturingReadiness?.length || 0
        });
        
        // Save complete PRC data as single object
        localStorage.setItem("prcData", JSON.stringify({
          prcAnswers: res.data.prcAnswers,
          knowledgeReadiness: res.data.knowledgeReadiness || [],
          functionalRequirements: res.data.functionalRequirements || [],
          nonFunctionalRequirements: res.data.nonFunctionalRequirements || [],
          manufacturingReadiness: res.data.manufacturingReadiness || []
        }));
        
        setTimeout(() => {
          window.location.href = res.data.prcUrl;
        }, 1000);
      }
      else {
        addBotMessage(res.data.reply || res.data.message);
      }

    } catch (error) {
      addBotMessage("Sorry, something went wrong. Please try again.");
    }

    setLoading(false);
  };

  // auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  return (
    <div className="app">
      <div className="chat-container">

        <div className="chat-header">
          <div className="header-left">
            <img src={logo} alt="logo" className="logo" />
            <span className="title">Stelna Manufacturing Advisor</span>
          </div>
        </div>

        <div className="chat-body">
          {chat.map((c, i) => (
            <div key={i} className={`msg ${c.type}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {c.text}
              </ReactMarkdown>
              <div className="time">{c.time}</div>
              
              {/* Show quick action buttons only on first message and if not clicked yet */}
              {c.showButtons && showQuickActions && (
                <div className="menu-options">
                  <button className="menu-btn" onClick={() => handleMenuOption("Manufacturing Advice")}>
                    Manufacturing Advice
                  </button>
                  <button className="menu-btn" onClick={() => handleMenuOption("Design Support")}>
                    Design Support
                  </button>
                  <button className="menu-btn" onClick={() => handleMenuOption("Check Product Readiness")}>
                    Check Product Readiness
                  </button>
                  <button className="menu-btn" onClick={() => handleMenuOption("Material Selection")}>
                    Material Selection
                  </button>
                  <button className="menu-btn" onClick={() => handleMenuOption("Process Selection")}>
                    Process Selection
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
    </div>
  );
}

export default App;