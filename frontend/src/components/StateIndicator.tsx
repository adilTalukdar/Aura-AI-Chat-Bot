import React from 'react';
import { AgentState } from '../types/index';

interface StateIndicatorProps {
  state: AgentState;
}

const STATE_CONFIG = {
  IDLE:      { label: 'Ready',     color: 'var(--state-idle)',      icon: '○' },
  LISTENING: { label: 'Listening', color: 'var(--state-listening)', icon: '◉' },
  THINKING:  { label: 'Thinking',  color: 'var(--state-thinking)',  icon: '◎' },
  SPEAKING:  { label: 'Speaking',  color: 'var(--state-speaking)',  icon: '◈' },
};

export function StateIndicator({ state }: StateIndicatorProps) {
  const config = STATE_CONFIG[state as keyof typeof STATE_CONFIG] ?? STATE_CONFIG.IDLE;

  return (
    <div className="state-indicator" style={{ '--state-color': config.color } as React.CSSProperties}>
      <span className={`state-dot state-dot--${state.toLowerCase()}`} />
      <span className="state-label">{config.label}</span>
    </div>
  );
}
