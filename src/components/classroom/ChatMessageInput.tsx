import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2 } from 'lucide-react';

interface ChatMessageInputProps {
  newMessageContent: string;
  setNewMessageContent: React.Dispatch<React.SetStateAction<string>>;
  handleSendMessage: (e: React.FormEvent) => Promise<void>;
  isSendingMessage: boolean;
}

export const ChatMessageInput: React.FC<ChatMessageInputProps> = ({
  newMessageContent,
  setNewMessageContent,
  handleSendMessage,
  isSendingMessage,
}) => {
  return (
    <form onSubmit={handleSendMessage} className="flex space-x-2 p-4 border-t border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-900 rounded-lg absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[85%] z-[999]">
      <Input
        value={newMessageContent}
        onChange={(e) => setNewMessageContent(e.target.value)}
        placeholder="Type your message..."
        className="flex-1"
        disabled={isSendingMessage}
      />
      <Button type="submit" disabled={isSendingMessage || !newMessageContent.trim()} className="bg-purple-600 hover:bg-purple-700">
        {isSendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </form>
  );
};