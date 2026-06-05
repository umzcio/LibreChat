export type ConversationMode = 'chat' | 'code';

export function getConversationModeFromPath(pathname = ''): ConversationMode {
  return pathname.includes('/code') ? 'code' : 'chat';
}

export function buildConversationPath(params: {
  conversationId: string;
  mode?: ConversationMode;
  zdockId?: string;
}) {
  const { conversationId, zdockId, mode = 'chat' } = params;
  const prefix = zdockId ? `/p/${zdockId}` : '';
  const routeSegment = mode === 'code' ? 'code' : 'c';

  return `${prefix}/${routeSegment}/${conversationId}`;
}
