import { useState, useEffect, useRef } from 'react';
import { Message } from '../types';
import { MessageBubble } from './MessageBubble';

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isGenerating: boolean;
  disabled: boolean;
}

export function ChatPanel({ messages, onSendMessage, isGenerating, disabled }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled && !isGenerating) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="chat-panel">
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <h3>Welcome to Codex Wrapper</h3>
            <p>Select a folder and start chatting with Codex</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="composer">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? 'Select a folder to start chatting...'
              : 'Type your message... (Enter to send, Shift+Enter for new line)'
          }
          disabled={disabled || isGenerating}
          className="composer-input"
          rows={3}
        />
        <button
          type="submit"
          disabled={disabled || isGenerating || !input.trim()}
          className="btn-send"
        >
          Send
        </button>
      </form>
    </div>
  );
}
