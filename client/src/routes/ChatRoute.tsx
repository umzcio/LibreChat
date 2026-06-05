import { Spinner } from '@librechat/client';
import { ToolCallsMapProvider } from '~/Providers';
import ChatView from '~/components/Chat/ChatView';
import useConversationRoute from './useConversationRoute';

const isValidChatProjectId = (projectId: string | null): projectId is string =>
  projectId != null && /^[a-f\d]{24}$/i.test(projectId);

export default function ChatRoute() {
  const { conversation, conversationId, isAuthenticated, isConversationReady, isLoading } =
    useConversationRoute();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center" aria-live="polite" role="status">
        <Spinner className="text-text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !conversationId || !isConversationReady) {
    return null;
  }

  return (
    <ToolCallsMapProvider conversationId={conversation?.conversationId ?? ''}>
      <ChatView index={0} />
    </ToolCallsMapProvider>
  );
}
