import { useState, useRef, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";
import logo from "./assets/logo.png";

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
  const [chat, setChat] = useState([
    {
      type: "bot",
      text: `Hi 👋 Welcome to Stelna Designs.

I'm here to assist you in planning your product manufacturing.

Share a brief description of your product along with quantity,
and I'll suggest the suitable production approach.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const addBotMessage = (text) => {
    setChat(prev => [...prev, {
      type: "bot",
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
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

      addBotMessage(res.data.reply);

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