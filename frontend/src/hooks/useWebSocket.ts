import { useCallback, useEffect, useRef, useState } from 'react';
import { AgentState, CallSummary, TranscriptEntry, WsMessage } from '../types/index';


interface UseWebSocketProps {
  url: string;
  onAgentResponse: (text: string) => void;
  onStateChange: (state: AgentState) => void;
  onTranscript: (entry: TranscriptEntry) => void;
  onSummary: (summary: CallSummary) => void;
}

export function useWebSocket({
  url,
  onAgentResponse,
  onStateChange,
  onTranscript,
  onSummary,
}: UseWebSocketProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        console.log('WebSocket connected');
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
      };

      ws.onerror = () => {
        setConnectionError('Cannot connect to backend. Make sure the server is running.');
        setIsConnected(false);
      };

      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);

          switch (msg.type) {
            case 'state_change':
              if (msg.state) onStateChange(msg.state);
              break;

            case 'transcript':
              if (msg.role && msg.text) {
                onTranscript({
                  id: crypto.randomUUID(),
                  role: msg.role,
                  text: msg.text,
                  timestamp: new Date(),
                });
              }
              break;

            case 'agent_response':
              if (msg.text) onAgentResponse(msg.text);
              break;

            case 'summary':
              if (msg.data) onSummary(msg.data as CallSummary);
              break;

            case 'error':
              console.error('Server error:', msg.message);
              onStateChange('LISTENING');
              break;

            case 'connected':
            case 'pong':
              break;

            default:
              console.warn('Unknown message type:', msg.type);
          }
        } catch (e) {
          console.error('Failed to parse WS message:', e);
        }
      };
    } catch (e) {
      setConnectionError('WebSocket connection failed.');
    }
  }, [url, onAgentResponse, onStateChange, onTranscript, onSummary]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', text }));
    }
  }, []);

  const sendEndCall = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_call' }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { isConnected, connectionError, connect, disconnect, sendMessage, sendEndCall };
}
