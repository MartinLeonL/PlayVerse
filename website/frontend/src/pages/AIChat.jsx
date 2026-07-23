import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Send,
  Star,
  Film,
  Tv,
  Music2,
  Gamepad2,
} from "lucide-react";

import Navbar from "../components/Navbar.jsx";
import { formatScore } from "../utils/format.js";
import "./AIChat.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const promptSuggestions = [
  "Something like a cozy fantasy show",
  "Upbeat music for a workout",
  "A short, relaxing puzzle game",
  "A mind-bending sci-fi movie",
];

const typeMeta = {
  movie: { label: "Movie", icon: Film },
  show: { label: "Show", icon: Tv },
  music: { label: "Music", icon: Music2 },
  game: { label: "Game", icon: Gamepad2 },
};

function RecommendationCard({ item, onOpen }) {
  const meta = typeMeta[item.type] || { label: item.type, icon: Sparkles };
  const Icon = meta.icon;
  const isClickable = Boolean(item.id);

  return (
    <div
      className="ai-rec-card"
      onClick={() => onOpen(item)}
      role="button"
      tabIndex={0}
      aria-disabled={!isClickable}
      title={isClickable ? `Open ${item.title}` : undefined}
      onKeyDown={(e) => e.key === "Enter" && onOpen(item)}
      style={{ cursor: isClickable ? "pointer" : "default" }}
    >
      <div className="ai-rec-poster">
        {item.poster ? (
          <img src={item.poster} alt={`${item.title} poster`} />
        ) : (
          <Icon size={32} />
        )}
      </div>

      <div className="ai-rec-body">
        <span className="ai-rec-tag">{meta.label}</span>
        <p className="ai-rec-title">{item.title}</p>
        {item.year && <span className="ai-rec-year">{item.year}</span>}
        {item.score != null && (
          <span className="ai-rec-rating ai-rec-rating-external">
            <Star size={12} fill="currentColor" />
            {formatScore(item.score)}/10
          </span>
        )}
        {item.userScore != null && (
          <span className="ai-rec-rating ai-rec-rating-user">
            <Star size={12} fill="currentColor" />
            {formatScore(item.userScore)}/10
          </span>
        )}
        {item.reason && <p className="ai-rec-reason">{item.reason}</p>}
      </div>
    </div>
  );
}

function AIChat() {
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const threadRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        setHistoryLoading(true);

        const response = await fetch(`${API_URL}/api/recommendations/chat`, {
          method: "GET",
          credentials: "include",
        });

        if (response.status === 401) {
          navigate("/login", { replace: true });
          return;
        }

        const data = await response.json();

        if (response.ok) {
          setMessages(data.messages || []);
        }
      } catch {
        // If history can't load, just start fresh — not fatal.
      } finally {
        setHistoryLoading(false);
      }
    }

    loadHistory();
  }, [navigate]);

  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  function openItem(item) {
    if (item.id) {
      navigate(`/media/${encodeURIComponent(item.id)}`);
    }
  }

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setError("");
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setSending(true);

    try {
      const response = await fetch(`${API_URL}/api/recommendations/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await response.json();

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to get a response.");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.message,
          recommendations: data.recommendations || [],
        },
      ]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  }

  async function handleNewChat() {
    try {
      await fetch(`${API_URL}/api/recommendations/chat`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch {
      // Ignore — worst case the old thread just stays visible.
    } finally {
      setMessages([]);
      setError("");
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input);
    }
  }

  const hasConversation = messages.length > 0;

  if (historyLoading) {
    return (
      <div className="home-page ai-page">
        <Navbar activeNav="ai" />
        <main className="ai-main">
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="home-page ai-page">
      <Navbar activeNav="ai" />

      <main className="ai-main">
        {!hasConversation ? (
          <div className="ai-empty">
            <h1 className="ai-empty-heading">
              <Sparkles size={28} />
              Ask AI
            </h1>
            <p className="ai-empty-sub">
              Tell me what you&apos;re in the mood for and I&apos;ll suggest
              something to watch, listen to, or play.
            </p>

            <div className="ai-prompt-chips">
              {promptSuggestions.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="ai-prompt-chip"
                  onClick={() => sendMessage(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>

            {error && <p className="ai-error">{error}</p>}

            <form className="ai-input-bar" onSubmit={handleSubmit}>
              <textarea
                ref={textareaRef}
                rows={2}
                placeholder='e.g. "something like a cozy fantasy show"'
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                type="submit"
                className="ai-send-btn"
                disabled={!input.trim() || sending}
                aria-label="Send"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        ) : (
          <div className="ai-panel">
            <div className="ai-panel-header">
              <span className="ai-thread-title">
                <Sparkles size={18} />
                Ask AI
              </span>
              <button
                type="button"
                className="ai-new-chat"
                onClick={handleNewChat}
              >
                New chat
              </button>
            </div>

            <div className="ai-thread" ref={threadRef}>
              {messages.map((msg, index) => (
                <div
                  className={`ai-message ${msg.role}`}
                  key={`${msg.role}-${index}`}
                >
                  <div className="ai-avatar">
                    {msg.role === "assistant" ? (
                      <Sparkles size={16} />
                    ) : (
                      "You"
                    )}
                  </div>

                  {msg.role === "user" ? (
                    <div className="ai-bubble">{msg.text}</div>
                  ) : (
                    <div className="ai-bubble-wrap">
                      {msg.text && <div className="ai-bubble">{msg.text}</div>}

                      {msg.recommendations && msg.recommendations.length > 0 && (
                        <div className="ai-rec-grid">
                          {msg.recommendations.map((item, itemIndex) => (
                            <RecommendationCard
                              key={`${item.title}-${itemIndex}`}
                              item={item}
                              onOpen={openItem}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {sending && (
                <div className="ai-message assistant">
                  <div className="ai-avatar">
                    <Sparkles size={16} />
                  </div>
                  <div className="ai-bubble">
                    <div className="ai-typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="ai-panel-footer">
              {error && <p className="ai-error">{error}</p>}

              <form className="ai-input-bar" onSubmit={handleSubmit}>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  placeholder="Ask for something to watch, hear, or play..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  type="submit"
                  className="ai-send-btn"
                  disabled={!input.trim() || sending}
                  aria-label="Send"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AIChat;