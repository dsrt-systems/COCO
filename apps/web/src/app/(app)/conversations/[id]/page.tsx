'use client';

import { useParams } from 'next/navigation';
import { ConversationView } from '@/components/conversations/conversation-view';

export default function ConversationDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <ConversationView conversationId={id} />
    </div>
  );
}
