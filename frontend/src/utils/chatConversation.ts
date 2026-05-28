import { ChatMessage, Conversation } from '@/stores/messageStore';

export const normalizeChatId = (id?: string | number | null): string =>
  id == null || id === '' ? '' : String(id).trim().toLowerCase();

export function messageBelongsToConversation(
  message: ChatMessage,
  conversation: Conversation,
  currentUserId?: string | null
): boolean {
  if (!conversation?.id) return false;

  const convId = normalizeChatId(conversation.id);
  const meId = normalizeChatId(currentUserId);

  if (conversation.type === 'group') {
    return normalizeChatId(message.group?.id) === convId;
  }
  if (conversation.type === 'department') {
    return normalizeChatId(message.department?.id) === convId;
  }

  const senderId = normalizeChatId(message.sender?.id);
  const recipientId = normalizeChatId(message.recipient?.id);

  return (
    senderId === convId ||
    recipientId === convId ||
    (senderId === meId && recipientId === convId) ||
    (recipientId === meId && senderId === convId)
  );
}

export function mergeChatMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  for (const msg of existing) {
    if (msg?.id) map.set(msg.id, msg);
  }
  for (const msg of incoming) {
    if (msg?.id) map.set(msg.id, msg);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}
