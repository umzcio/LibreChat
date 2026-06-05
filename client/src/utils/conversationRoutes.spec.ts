import { buildConversationPath, getConversationModeFromPath } from './conversationRoutes';

describe('conversationRoutes', () => {
  it('detects code routes without changing chat routes', () => {
    expect(getConversationModeFromPath('/code/new')).toBe('code');
    expect(getConversationModeFromPath('/p/project_1/code/convo_1')).toBe('code');
    expect(getConversationModeFromPath('/c/new')).toBe('chat');
  });

  it('builds project-scoped code paths', () => {
    expect(
      buildConversationPath({
        conversationId: 'convo_1',
        mode: 'code',
        zdockId: 'project_1',
      }),
    ).toBe('/p/project_1/code/convo_1');
  });

  it('builds chat paths by default', () => {
    expect(
      buildConversationPath({
        conversationId: 'convo_1',
      }),
    ).toBe('/c/convo_1');
  });
});
