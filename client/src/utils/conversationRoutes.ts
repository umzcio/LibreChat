export type ConversationMode = 'chat' | 'code';

export function getConversationModeFromPath(pathname = ''): ConversationMode {
  return pathname.includes('/code') ? 'code' : 'chat';
}

export function buildConversationPath(params: {
  conversationId: string;
  mode?: ConversationMode;
  projectId?: string;
}) {
  const { conversationId, projectId, mode = 'chat' } = params;
  const prefix = projectId ? `/p/${projectId}` : '';
  const routeSegment = mode === 'code' ? 'code' : 'c';

  return `${prefix}/${routeSegment}/${conversationId}`;
}
