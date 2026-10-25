import { useEffect, useRef } from 'react';
import { TranscriptEntry } from '../types/index';


interface TranscriptPanelProps {
  entries: TranscriptEntry[];
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function TranscriptPanel({ entries }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="transcript-panel transcript-panel--empty">
        <div className="transcript-empty">
          <span className="transcript-empty-icon">💬</span>
          <p>Conversation transcript will appear here once the call starts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="transcript-panel">
      <div className="transcript-header">
        <span className="transcript-title">Live Transcript</span>
        <span className="transcript-count">{entries.length} messages</span>
      </div>
      <div className="transcript-list">
        {entries.map((entry) => (
          <div key={entry.id} className={`transcript-entry transcript-entry--${entry.role}`}>
            <div className="transcript-meta">
              <span className="transcript-role">
                {entry.role === 'customer' ? '👤 You' : '🤖 Aria'}
              </span>
              <span className="transcript-time">{formatTime(entry.timestamp)}</span>
            </div>
            <div className="transcript-bubble">
              <p>{entry.text}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
