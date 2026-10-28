import { useCallback, useRef, useState } from 'react';
import { AgentState } from '../types';

interface UseSpeechRecognitionProps {
  onTranscript: (text: string) => void;
  /** Called when recognition ends without capturing any speech (e.g. silence timeout) */
  onIdleEnd?: () => void;
  agentState: AgentState;
}

// How long the customer must stay silent before their utterance is sent
const END_OF_SPEECH_MS = 1500;
// Hard ceiling: send at most this long after the customer starts speaking,
// even if background noise keeps the recognizer busy
const MAX_UTTERANCE_MS = 5000;

export function useSpeechRecognition({ onTranscript, onIdleEnd }: UseSpeechRecognitionProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(() => 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  // Single source of truth: at most one recognizer exists at a time
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const start = useCallback(() => {
    if (!isSupported || recognitionRef.current) return;

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const recognition: SpeechRecognition = new SpeechRecognitionAPI();
    recognition.lang = 'en-IN';
    // Keep listening through short pauses; we decide when the utterance is complete
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalText = '';
    let interimText = '';
    let sent = false;
    let restartable = true;
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    let maxTimer: ReturnType<typeof setTimeout> | null = null;
    let lastHeard = '';

    const flush = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      if (maxTimer) clearTimeout(maxTimer);
      if (sent) return;
      const text = (finalText + ' ' + interimText).trim();
      if (!text) return;
      sent = true;
      restartable = false;
      // Release the mic before handing off, so the agent's voice isn't captured
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      recognition.stop();
      setIsListening(false);
      onTranscript(text);
    };

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (sent) return;
      finalText = '';
      interimText = '';
      for (let i = 0; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += chunk;
        else interimText += chunk;
      }
      const heard = (finalText + ' ' + interimText).trim();
      if (!heard) return;
      if (!maxTimer) maxTimer = setTimeout(flush, MAX_UTTERANCE_MS);
      // Only new words count as "still talking" — repeated results from noise don't
      if (heard === lastHeard) return;
      lastHeard = heard;
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(flush, END_OF_SPEECH_MS);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('Speech recognition error:', event.error);
      }
      // Mic permission denied / unavailable — restarting would just loop
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'audio-capture') {
        restartable = false;
      }
    };

    recognition.onend = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      if (maxTimer) clearTimeout(maxTimer);
      setIsListening(false);
      // stop() and flush() clear recognitionRef first, so only a browser-initiated end lands here
      if (recognitionRef.current !== recognition) return;
      // Ended mid-utterance (browser timeout) — send what we have
      flush();
      recognitionRef.current = null;
      if (restartable) onIdleEnd?.();
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      recognitionRef.current = null;
      console.error('Failed to start recognition:', e);
    }
  }, [isSupported, onTranscript, onIdleEnd]);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognitionRef.current = null;
      recognition.abort();
    }
    setIsListening(false);
  }, []);

  return { isListening, isSupported, start, stop };
}
