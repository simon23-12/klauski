'use client';

import { useState, useRef, useEffect } from 'react';
import Markdown from 'markdown-to-jsx';

const GREETING = {
  role: 'assistant',
  content:
    'Hallo Klaus, ich bin eine auf wirtschaftliche Theorien (endliches vs. unendliches Wachstum, Degrowth und post-Kapitalismus Utopien) spezialisierte KI. Wie kann ich dir helfen?',
};

export default function ChatPage() {
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const adjustHeight = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Build conversation history for the API, excluding the UI greeting
    const history = messages
      .slice(1)
      .filter((m) => m.content)
      .map((m) => ({ role: m.role, content: m.content }));

    const apiMessages = [...history, { role: 'user', content: text }];

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text },
      { role: 'assistant', content: '', streaming: true },
    ]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) throw new Error('Request failed');

      const { content } = await response.json();
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content,
          streaming: false,
        };
        return updated;
      });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content:
            'Es tut mir leid, Klaus — ein Fehler ist aufgetreten. Bitte versuche es erneut.',
          streaming: false,
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <h1 className="app-title">
            Klaus <span className="title-accent">KI</span>
          </h1>
          <p className="app-subtitle">Wirtschaftswachstum: endlich oder unendlich?</p>
          <div className="divider" />
        </div>
      </header>

      <div className="chat-wrapper">
        <div className="messages-area">
          {messages.map((msg, i) => (
            <div key={i} className={`message message--${msg.role}`}>
              {msg.role === 'assistant' ? (
                <div className="ai-message">
                  <span className="ai-label">Klaus KI</span>
                  <div className="ai-content">
                    {msg.streaming && msg.content === '' ? (
                      <div className="typing">
                        <span />
                        <span />
                        <span />
                      </div>
                    ) : (
                      <Markdown>{msg.content}</Markdown>
                    )}
                  </div>
                </div>
              ) : (
                <div className="user-message">
                  <p>{msg.content}</p>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form className="input-area" onSubmit={handleSubmit}>
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustHeight();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Stellen Sie Klaus KI eine Frage …"
              disabled={isLoading}
              rows={1}
            />
            <button type="submit" disabled={isLoading || !input.trim()} aria-label="Senden">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 10h14M10 3l7 7-7 7" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
