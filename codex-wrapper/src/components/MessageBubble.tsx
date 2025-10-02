import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`message-bubble ${message.role}`}>
      <div className="message-header">
        <span className="message-role">
          {message.role === 'user' ? 'You' : 'Codex'}
        </span>
        <span className="message-time">{formatTime(message.timestamp)}</span>
      </div>
      <div className="message-content">
        {message.content}
      </div>
    </div>
  );
}
