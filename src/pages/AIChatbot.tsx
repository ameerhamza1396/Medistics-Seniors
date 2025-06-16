// src/pages/DrSultanChat.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import { Moon, Sun, ArrowLeft, Send, Mic, X, Save, PlusSquare } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProfileDropdown } from '@/components/ProfileDropdown';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  time: string;
}

interface SavedChat {
  id: string;
  created_at: string;
  messages: ChatMessage[];
}

const API_BASE_URL = 'https://medistics-ai-bot.vercel.app';

const DrSultanChat: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  // chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1️⃣ Fetch user profile for plan badge
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    retry: false
  });

  // 2️⃣ Fetch saved chats
  const { data: chatHistory, isLoading: isHistoryLoading } = useQuery<SavedChat[]>({
    queryKey: ['chatHistory', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('chats')
        .select('id, created_at, messages')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(r => ({
        id: r.id,
        created_at: r.created_at,
        messages: r.messages as ChatMessage[]
      }));
    },
    enabled: !!user?.id
  });

  // 3️⃣ Mutation: save current chat
  const saveChatMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      const { data, error } = await supabase
        .from('chats')
        .insert([{ user_id: user.id, messages }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chatHistory', user?.id]);
      alert('Chat saved ✔️');
    },
    onError: err => {
      alert(`Failed to save chat: ${err.message}`);
    }
  });

  // Load a saved chat
  const loadSavedChat = (chat: SavedChat) => {
    setMessages(chat.messages);
    setError(null);
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = { sender: 'user', text: inputMessage.trim(), time: ts };
    setMessages(m => [...m, userMsg]);
    setInputMessage('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/study-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg.text })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || `Status ${res.status}`);

      const aiMsg: ChatMessage = {
        sender: 'ai',
        text: payload.answer || 'Sorry, no answer.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(m => [...m, aiMsg]);
    } catch (err: any) {
      setError(err.message);
      setMessages(m => [...m, { sender: 'ai', text: 'Whoops—something went wrong.', time: '' }]);
    } finally {
      setLoading(false);
    }
  };

  // Voice-to-text handler
  const handleMicClick = () => {
    if (recording) {
      (window as any).recognition?.stop();
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return alert('Speech Recognition not supported');
    }
    const rec = new SpeechRecognition();
    (window as any).recognition = rec;
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    rec.onstart = () => setRecording(true);
    rec.onresult = (evt: SpeechRecognitionEvent) =>
      setInputMessage(evt.results[0][0].transcript);
    rec.onerror = evt => {
      let msg = evt.error === 'network'
        ? 'Network error—use HTTPS'
        : evt.error === 'no-speech'
          ? 'No speech detected'
          : evt.error === 'not-allowed' || evt.error === 'service-not-allowed'
            ? 'Mic permission denied'
            : `Error: ${evt.error}`;
      alert(msg);
    };
    rec.onend = () => setRecording(false);
    try { rec.start(); }
    catch { alert('Could not start mic'); }
  };

  // Loading & auth states
  if (isAuthLoading || isProfileLoading || isHistoryLoading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading…</p></div>;
  }
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Please sign in</h1>
          <Link to="/login"><Button>Sign In</Button></Link>
        </div>
      </div>
    );
  }

  // plan badge
  const plan = profile?.plan?.toLowerCase() || 'free';
  const badgeClasses = {
    free:    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
    premium: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-200',
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  };
  const badgeClass = badgeClasses[plan] || badgeClasses.default;
  const planLabel = `${plan.charAt(0).toUpperCase()}${plan.slice(1)} Plan`;

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white dark:bg-gray-800 p-4 overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">Saved Chats</h3>
        {chatHistory && chatHistory.length > 0 ? (
          chatHistory.map(chat => (
            <button
              key={chat.id}
              onClick={() => loadSavedChat(chat)}
              className="w-full text-left py-2 px-3 mb-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {new Date(chat.created_at).toLocaleString()}
            </button>
          ))
        ) : (
          <p className="text-gray-500">No chats yet.</p>
        )}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b p-4 flex items-center justify-between space-x-2">
          <Link to="/dashboard" className="text-gray-600 dark:text-gray-300 hover:text-gray-900">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 flex items-center justify-end space-x-2">
            <Button variant="ghost" size="icon" onClick={() => setRecording(false)}>
              <PlusSquare onClick={() => { setMessages([]); setError(null); }} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => saveChatMutation.mutate()}
              disabled={!messages.length || saveChatMutation.isLoading}
            >
              <Save />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun /> : <Moon />}
            </Button>
            <span className={`px-2 py-1 rounded ${badgeClass}`}>{planLabel}</span>
            <ProfileDropdown />
          </div>
        </header>

        {/* Chat panel */}
        <main className="flex-1 container mx-auto p-4 flex flex-col">
          <Card className="flex-1 flex flex-col shadow-lg">
            <CardHeader><CardTitle>Dr. Sultan Chat</CardTitle></CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6 space-y-4 bg-white dark:bg-gray-800">
              {messages.length === 0 && (
                <p className="text-center text-gray-400 italic">Start a new conversation!</p>
              )}
              {messages.map((msg, i) => {
                const isUser = msg.sender === 'user';
                return (
                  <div key={i} className={`flex items-end ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center mr-2 text-gray-600">🩺</div>
                    )}
                    <div className={`max-w-[70%] p-3 rounded-xl shadow ${
                      isUser
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      {msg.time && (
                        <span className="block text-xs mt-1 text-gray-500 dark:text-gray-400 text-right">
                          {msg.time}
                        </span>
                      )}
                    </div>
                    {isUser && (
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center ml-2 text-white">
                        {user.email?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </CardContent>
          </Card>

          {/* Input + controls */}
          <form onSubmit={handleSendMessage} className="mt-4 flex items-center space-x-2">
            <Input
              placeholder="Type or speak…"
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              disabled={loading}
              className="flex-1"
            />
            <button
              type="button"
              onClick={handleMicClick}
              disabled={loading}
              className={`p-2 rounded ${recording ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}
            >
              {recording ? <X /> : <Mic />}
            </button>
            <Button type="submit" disabled={loading}>Send</Button>
          </form>
        </main>
      </div>
    </div>
  );
};

export default DrSultanChat;
