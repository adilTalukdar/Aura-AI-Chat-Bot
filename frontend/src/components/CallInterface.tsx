import { useCallback, useRef, useState } from 'react';
import { AgentState, CallSummary, TranscriptEntry } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { StateIndicator } from './StateIndicator';
import { VoiceWaveform } from './VoiceWaveform';
import { TranscriptPanel } from './TranscriptPanel';
import { SummaryCard } from './SummaryCard';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws/voice';

interface CallInterfaceProps {
  onSummaryReceived?: (summary: CallSummary) => void;
}

export function CallInterface({ onSummaryReceived }: CallInterfaceProps) {
  const [callActive, setCallActive] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>('IDLE');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [summary, setSummary] = useState<CallSummary | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const callStartRef = useRef(0);
  // Refs so callbacks captured by the WebSocket/TTS handlers see current values
  const callActiveRef = useRef(false);
  const agentStateRef = useRef<AgentState>('IDLE');
  agentStateRef.current = agentState;

  // ── TTS ──────────────────────────────────────────────────────────────────
  const tts = useSpeechSynthesis({
    onStart: () => setAgentState('SPEAKING'),
    onEnd:   () => {
      setAgentState('LISTENING');
      // Re-arm speech recognition after agent finishes speaking
      if (callActiveRef.current) stt.start();
    },
  });

  // ── STT ──────────────────────────────────────────────────────────────────
  const handleCustomerTranscript = useCallback((text: string) => {
    if (!text.trim()) return;
    setAgentState('THINKING');
    ws.sendMessage(text);
  }, []);

  // Chrome stops recognition after a few seconds of silence — keep listening
  const handleRecognitionIdle = useCallback(() => {
    if (callActiveRef.current && agentStateRef.current === 'LISTENING') {
      stt.start();
    }
  }, []);

  const stt = useSpeechRecognition({
    onTranscript: handleCustomerTranscript,
    onIdleEnd: handleRecognitionIdle,
    agentState,
  });

  // ── WebSocket ─────────────────────────────────────────────────────────────
  const handleAgentResponse = useCallback((text: string) => {
    if (!callActiveRef.current) return;
    // Make sure the mic is off while Aria talks so she doesn't hear herself
    stt.stop();
    tts.speak(text);
  }, [tts, stt]);

  const handleStateChange = useCallback((state: AgentState) => {
    // SPEAKING is driven by actual TTS playback (tts.onStart), not the server
    if (state === 'SPEAKING') return;
    setAgentState(state);
  }, []);

  const handleTranscript = useCallback((entry: TranscriptEntry) => {
    setTranscript(prev => [...prev, entry]);
  }, []);

  const handleSummary = useCallback((s: CallSummary) => {
    setSummary(s);
    setShowSummary(true);
    onSummaryReceived?.(s);
  }, [onSummaryReceived]);

  const ws = useWebSocket({
    url: WS_URL,
    onAgentResponse: handleAgentResponse,
    onStateChange: handleStateChange,
    onTranscript: handleTranscript,
    onSummary: handleSummary,
  });

  // ── Call controls ─────────────────────────────────────────────────────────
  const startCall = useCallback(async () => {
    if (!stt.isSupported) return;
    callStartRef.current = Date.now();
    setTranscript([]);
    setSummary(null);
    setShowSummary(false);
    setCallActive(true);
    callActiveRef.current = true;

    ws.connect();
    // Small delay to let WebSocket connect before starting recognition
    await new Promise(r => setTimeout(r, 600));
    setAgentState('LISTENING');
    stt.start();
  }, [stt, ws]);

  const endCall = useCallback(() => {
    callActiveRef.current = false;
    stt.stop();
    tts.stop();
    setCallDuration(Math.floor((Date.now() - callStartRef.current) / 1000));
    ws.sendEndCall();
    setCallActive(false);
    setAgentState('IDLE');
  }, [stt, tts, ws]);

  const handleCloseSummary = useCallback(() => {
    setShowSummary(false);
    setSummary(null);
    setTranscript([]);
    setAgentState('IDLE');
    ws.disconnect();
  }, [ws]);

  // ── Browser support warning ───────────────────────────────────────────────
  if (!stt.isSupported) {
    return (
      <div className="browser-warning">
        <div className="browser-warning-card">
          <span className="warning-icon">⚠️</span>
          <h2>Browser Not Supported</h2>
          <p>
            This app uses the Web Speech API for voice recognition, which requires
            <strong> Google Chrome</strong> or <strong>Microsoft Edge</strong>.
          </p>
          <p>Please open this page in Chrome or Edge to use the voice agent.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Summary overlay */}
      {showSummary && summary && (
        <SummaryCard summary={summary} onClose={handleCloseSummary} />
      )}

      <div className="call-interface">
        {/* ── Agent Avatar + Waveform ─────────────────────────────── */}
        <div className="agent-section">
          <div className={`agent-avatar ${agentState !== 'IDLE' ? 'agent-avatar--active' : ''}`}>
            <div className="agent-avatar-inner">
              <span className="agent-avatar-letter">A</span>
            </div>
            {agentState === 'SPEAKING' && <div className="avatar-ring avatar-ring--1" />}
            {agentState === 'SPEAKING' && <div className="avatar-ring avatar-ring--2" />}
            {agentState === 'LISTENING' && <div className="avatar-ring avatar-ring--pulse" />}
          </div>

          <div className="agent-info">
            <h2 className="agent-name">Aria</h2>
            <p className="agent-desc">Aura Skincare Support Agent</p>
          </div>

          <StateIndicator state={agentState} />
        </div>

        {/* ── Waveform ────────────────────────────────────────────── */}
        <div className="waveform-section">
          <VoiceWaveform state={agentState} />
        </div>

        {/* ── Call status message ──────────────────────────────────── */}
        <div className="call-status-message">
          {!callActive && agentState === 'IDLE' && (
            <p>Click <strong>Start Call</strong> to begin speaking with Aria</p>
          )}
          {callActive && agentState === 'LISTENING' && (
            <p>🎤 Listening… speak now</p>
          )}
          {callActive && agentState === 'THINKING' && (
            <p>⏳ Aria is thinking…</p>
          )}
          {callActive && agentState === 'SPEAKING' && (
            <p>🔊 Aria is speaking…</p>
          )}
        </div>

        {/* ── Connection error ─────────────────────────────────────── */}
        {ws.connectionError && (
          <div className="connection-error">
            <span>⚠️</span>
            <span>{ws.connectionError}</span>
          </div>
        )}

        {/* ── Call buttons ─────────────────────────────────────────── */}
        <div className="call-controls">
          {!callActive ? (
            <button
              id="start-call-btn"
              className="btn btn--start"
              onClick={startCall}
            >
              <span className="btn-icon">📞</span>
              Start Call
            </button>
          ) : (
            <button
              id="end-call-btn"
              className="btn btn--end"
              onClick={endCall}
            >
              <span className="btn-icon">📵</span>
              End Call
            </button>
          )}
        </div>

        {/* ── Live Transcript ──────────────────────────────────────── */}
        <div className="transcript-section">
          <TranscriptPanel entries={transcript} />
        </div>
      </div>
    </>
  );
}
