export interface TranscriptEntry {
  id: string;
  role: 'customer' | 'agent';
  text: string;
  timestamp: Date;
}

export interface CallSummary {
  customer_intent: string;
  order_id: string | null;
  resolution_status: 'RESOLVED' | 'UNRESOLVED' | 'ESCALATED';
  call_summary: string;
}

export type AgentState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING';

export interface WsMessage {
  type: string;
  state?: AgentState;
  role?: 'customer' | 'agent';
  text?: string;
  message?: string;
  data?: CallSummary | Record<string, unknown>;
}

export interface TestOrder {
  id: string;
  customer: string;
  product: string;
  value: string;
  status: 'Out for Delivery' | 'Delivered' | 'Processing' | 'Cancelled';
  notes: string;
}
