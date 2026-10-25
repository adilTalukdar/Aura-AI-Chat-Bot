import { useEffect, useRef } from 'react';
import { AgentState } from '../types';

interface VoiceWaveformProps {
  state: AgentState;
}

export function VoiceWaveform({ state }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const BAR_COUNT = 28;
    const BAR_GAP = 4;

    const getColors = () => {
      const root = document.documentElement;
      const style = getComputedStyle(root);
      return {
        listening: style.getPropertyValue('--state-listening').trim() || '#22c55e',
        thinking:  style.getPropertyValue('--state-thinking').trim()  || '#eab308',
        speaking:  style.getPropertyValue('--state-speaking').trim()  || '#6366f1',
        idle:      style.getPropertyValue('--text-muted').trim()      || '#4b5563',
      };
    };

    const animate = () => {
      timeRef.current += 0.05;
      const t = timeRef.current;

      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width - (BAR_COUNT - 1) * BAR_GAP) / BAR_COUNT;
      const maxH = canvas.height * 0.85;
      const centerY = canvas.height / 2;
      const colors = getColors();

      for (let i = 0; i < BAR_COUNT; i++) {
        const x = i * (barWidth + BAR_GAP);
        let height: number;
        let alpha = 1;

        if (state === 'SPEAKING') {
          // Energetic bars with wave pattern
          const wave = Math.sin(t * 3.5 + i * 0.45) * 0.5 + 0.5;
          const wave2 = Math.sin(t * 2.2 + i * 0.8) * 0.3 + 0.3;
          height = maxH * 0.15 + maxH * 0.85 * ((wave + wave2) / 1.3);
          ctx.fillStyle = colors.speaking;
        } else if (state === 'LISTENING') {
          // Gentle slow oscillation
          const wave = Math.sin(t * 1.2 + i * 0.35) * 0.4 + 0.5;
          height = maxH * 0.08 + maxH * 0.35 * wave;
          ctx.fillStyle = colors.listening;
        } else if (state === 'THINKING') {
          // Pulsing dots
          const pulse = Math.abs(Math.sin(t * 2 + i * 0.3));
          height = maxH * 0.05 + maxH * 0.2 * pulse;
          alpha = 0.4 + 0.6 * pulse;
          ctx.fillStyle = colors.thinking;
        } else {
          // IDLE — tiny flat bars
          height = maxH * 0.04;
          ctx.fillStyle = colors.idle;
          alpha = 0.4;
        }

        ctx.globalAlpha = alpha;
        const radius = barWidth / 2;
        const y = centerY - height / 2;

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, radius);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [state]);

  return (
    <canvas
      ref={canvasRef}
      className="voice-waveform"
      aria-label={`Agent is ${state.toLowerCase()}`}
    />
  );
}
