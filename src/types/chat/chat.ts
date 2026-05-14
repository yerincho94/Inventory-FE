export type ChatMessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
export type ChatMessageStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'INTERRUPTED';
export type ChatThreadStatus = 'ACTIVE' | 'ARCHIVED';
export type ChatModelPreference = 'AUTO' | 'FLASH' | 'REASONING';
export type ChatInterruptStrategy = 'AUTO' | 'ENQUEUE' | 'INTERRUPT_CURRENT';

export type ChatRealtimeEventType =
  | 'USER_MESSAGE_ACCEPTED'
  | 'CHAT_PROCESSING'
  | 'CHAT_RESPONSE_CREATED'
  | 'CHAT_FAILED'
  | 'CHAT_INTERRUPTED';

export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';

export interface ChatMessage {
  messageId: number;
  threadId: number;
  role: ChatMessageRole;
  status: ChatMessageStatus;
  content: string;
  clientMessageId?: string;
  replyToMessageId?: number | null;
  model?: string | null;
  errorMessage?: string | null;
  requestedModelPreference?: ChatModelPreference | null;
  createdAt: string;
}

export interface ChatThreadSummary {
  threadId: number;
  title: string;
  status: ChatThreadStatus;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  createdAt: string;
}

export interface ChatThreadCreateResponse {
  threadId: number;
  title: string;
  status: ChatThreadStatus;
  createdAt: string;
}

export interface ChatRealtimeEvent {
  eventType: ChatRealtimeEventType;
  threadId: number;
  requestMessageId?: number | null;
  clientMessageId?: string | null;
  requestStatus?: ChatMessageStatus | null;
  message?: ChatMessage | null;
  errorMessage?: string | null;
  occurredAt: string;
}

export interface ChatSendMessageRequest {
  threadId: number;
  clientMessageId: string;
  content: string;
  modelPreference?: ChatModelPreference;
  interruptStrategy?: ChatInterruptStrategy;
}

export interface ChatInterruptRequest {
  threadId: number;
}

export interface ChatCreateThreadRequest {
  title: string;
}
