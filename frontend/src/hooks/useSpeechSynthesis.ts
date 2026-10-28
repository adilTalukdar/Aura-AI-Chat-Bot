import { useCallback, useRef } from 'react';

interface UseSpeechSynthesisProps {
  onStart?: () => void;
  onEnd?: () => void;
}

export function useSpeechSynthesis({ onStart, onEnd }: UseSpeechSynthesisProps = {}) {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const getIndianVoice = (): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    // Priority: Google Indian > Microsoft Indian > any en-IN > any en-GB > any English female
    return (
      voices.find(v => v.name.includes('Google') && v.lang === 'en-IN') ||
      voices.find(v => v.lang === 'en-IN') ||
      voices.find(v => v.name.toLowerCase().includes('india')) ||
      voices.find(v => v.lang === 'en-GB' && v.name.toLowerCase().includes('female')) ||
      voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('zira')) ||
      voices.find(v => v.lang.startsWith('en')) ||
      null
    );
  };

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Try to get Indian voice, fallback gracefully
    const setVoiceAndSpeak = () => {
      const voice = getIndianVoice();
      if (voice) utterance.voice = voice;
      utterance.lang = 'en-IN';
      utterance.rate = 0.92;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      // Only the current utterance may report its end — a cancelled/replaced one
      // must not re-arm the microphone
      const finish = () => {
        if (utteranceRef.current !== utterance) return;
        utteranceRef.current = null;
        onEnd?.();
      };
      utterance.onstart = () => onStart?.();
      utterance.onend = finish;
      utterance.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') console.warn('TTS error:', e.error);
        finish();
      };

      window.speechSynthesis.speak(utterance);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      setVoiceAndSpeak();
    } else {
      // Voices not loaded yet — wait for them
      window.speechSynthesis.addEventListener('voiceschanged', setVoiceAndSpeak, { once: true });
    }
  }, [onStart, onEnd]);

  const stop = useCallback(() => {
    utteranceRef.current = null;
    window.speechSynthesis.cancel();
  }, []);

  const isSpeaking = () => window.speechSynthesis.speaking;

  return { speak, stop, isSpeaking };
}
