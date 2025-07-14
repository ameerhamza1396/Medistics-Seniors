import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import { Moon, Sun, ArrowLeft, Send, Mic, X, Save, PlusSquare, MessageSquare, Menu, PanelLeftClose, PanelLeftOpen, Crown } from 'lucide-react'; // Added Crown icon
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
import { Badge } from '@/components/ui/badge';
import { ProfileDropdown } from '@/components/ProfileDropdown'; // NEW: Import ProfileDropdown

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

type Profile = {
  avatar_url: string | null;
  created_at?: string;
  full_name: string | null;
  id: string;
  medical_school?: string;
  updated_at: string | null;
  username: string | null;
  plan: string;
  plan_expiry_date: string | null;
  role: string | null;
  website: string | null;
};

const API_BASE_URL = 'https://medistics-ai-bot.vercel.app';

// Custom Notification Component
const Notification: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const textColor = 'text-white';

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 p-3 rounded-md shadow-lg z-[70] transition-all duration-300 ${bgColor} ${textColor}`}>
      {message}
    </div>
  );
};

const DrSultanChat: React.FC = () => {
  const { user, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [apiLoading, setApiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Notification state
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');

  // Drawer state for mobile (controlled by Menu icon)
  const [isDrawerOpenMobile, setIsDrawerOpenMobile] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [currentTranslateX, setCurrentTranslateX] = useState(-256);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerWidth = 256;

  // Drawer state for desktop (controlled by new PanelLeftClose/Open button)
  const [isDrawerOpenDesktop, setIsDrawerOpenDesktop] = useState(true);

  // Function to show notification
  const showTemporaryNotification = (message: string, type: 'success' | 'error') => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
  };

  // Fetch user profile for plan badge and avatar initial
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async (): Promise<Profile | null> => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id,
    retry: false
  });

  // Define plan color schemes
  const planColors = {
    'free': {
      light: 'bg-purple-100 text-purple-800 border-purple-300',
      dark: 'dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700'
    },
    'premium': {
      light: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      dark: 'dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700'
    },
    'pro': {
      light: 'bg-green-100 text-green-800 border-green-300',
      dark: 'dark:bg-green-900/30 dark:text-green-200 dark:border-green-700'
    },
    'iconic': {
      light: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      dark: 'dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-700'
    },
    'default': {
      light: 'bg-gray-100 text-gray-800 border-gray-300',
      dark: 'dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
    }
  };

  // Determine the user's plan and its display name
  const rawUserPlan = profile?.plan?.toLowerCase() || 'free';
  const userPlanDisplayName = rawUserPlan.charAt(0).toUpperCase() + rawUserPlan.slice(1) + ' Plan';

  // Get the color classes for the current plan
  const currentPlanColorClasses = planColors[rawUserPlan as keyof typeof planColors] || planColors['default'];

  // Access control logic: Only 'premium' plan has access
  const canUseChat = rawUserPlan === 'premium';

  // Fetch saved chats using ai_chat_sessions table
  const { data: chatHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['chatHistory', user?.id],
    queryFn: async (): Promise<SavedChat[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('ai_chat_sessions')
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
    enabled: !!user?.id && canUseChat
  });

  // Mutation: save current chat
  const saveChatMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .insert([{ user_id: user.id, messages }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatHistory', user?.id] });
      showTemporaryNotification('Chat saved ✔️', 'success');
    },
    onError: (err: any) => {
      showTemporaryNotification(`Failed to save chat: ${err.message}`, 'error');
    }
  });

  // Load a saved chat
  const loadSavedChat = (chat: SavedChat) => {
    setMessages(chat.messages);
    setError(null);
    closeDrawerMobile();
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, apiLoading]);

  // Handle mobile drawer open/close
  const toggleDrawerMobile = () => {
    setIsDrawerOpenMobile(prev => {
      const newState = !prev;
      setCurrentTranslateX(newState ? 0 : -drawerWidth);
      return newState;
    });
  };

  const closeDrawerMobile = () => {
    setIsDrawerOpenMobile(false);
    setCurrentTranslateX(-drawerWidth);
  };

  // Handle desktop drawer open/close
  const toggleDrawerDesktop = () => {
    setIsDrawerOpenDesktop(prev => !prev);
  };

  // Send a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || apiLoading || !canUseChat) return;
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = { sender: 'user', text: inputMessage.trim(), time: ts };
    setMessages(m => [...m, userMsg]);
    setInputMessage('');
    setApiLoading(true);
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
      setApiLoading(false);
    }
  };

  // Voice-to-text handler
  const handleMicClick = () => {
    if (!canUseChat) {
      showTemporaryNotification('Your current plan is not compatible with voice input; upgrade to Premium to continue.', 'error');
      return;
    }
    if (recording) {
      (window as any).recognition?.stop();
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showTemporaryNotification('Speech Recognition not supported by your browser.', 'error');
      return;
    }
    const rec = new SpeechRecognition();
    (window as any).recognition = rec;
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    rec.onstart = () => setRecording(true);
    rec.onresult = (evt: any) =>
      setInputMessage(evt.results[0][0].transcript);
    rec.onerror = (evt: any) => {
      let msg = evt.error === 'network'
        ? 'Network error—use HTTPS'
        : evt.error === 'no-speech'
          ? 'No speech detected'
          : evt.error === 'not-allowed' || evt.error === 'service-not-allowed'
            ? 'Mic permission denied'
            : `Error: ${evt.error}`;
      showTemporaryNotification(msg, 'error');
    };
    rec.onend = () => setRecording(false);
    try { rec.start(); }
    catch {
      showTemporaryNotification('Could not start microphone.', 'error');
    }
  };

  // Determine if AI is currently typing
  const isAITyping = apiLoading && messages.length > 0 && messages[messages.length - 1].sender === 'user';

  // Loading & auth states
  if (loading || isProfileLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 text-gray-900 dark:text-white"><p>Loading…</p></div>;
  }
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Please sign in</h1>
          <Link to="/login"><Button>Sign In</Button></Link>
        </div>
      </div>
    );
  }

  // Redirect users without access to the purchase plan page
  if (!canUseChat) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center p-4">
          <Crown className="w-20 h-20 mx-auto mb-6 text-purple-600 dark:text-purple-400" /> {/* Added Crown icon */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Upgrade Required</h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
            Your current plan is not compatible with this feature; upgrade to <span className="text-purple-600 font-bold dark:text-purple-400">Premium</span> to continue.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/pricing">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto">Upgrade Your Plan</Button>
            </Link>
            <Link to="/dashboard">
              <Button className="bg-white text-gray-900 hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 w-full sm:w-auto">Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex bg-white dark:bg-gray-900 font-sans">
      {/* Global CSS for typing indicator */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .animate-pulse-dot span:nth-child(1) { animation: pulse-dot 1s infinite; }
        .animate-pulse-dot span:nth-child(2) { animation: pulse-dot 1s infinite 0.2s; }
        .animate-pulse-dot span:nth-child(3) { animation: pulse-dot 1s infinite 0.4s; }
      `}</style>

      {showNotification && (
        <Notification
          message={notificationMessage}
          type={notificationType}
          onClose={() => setShowNotification(false)}
        />
      )}

      {/* Sidebar / Draggable Drawer */}
      <aside
        ref={drawerRef}
        className={`fixed inset-y-0 left-0 z-[60] w-64 bg-white dark:bg-gray-800 border-r border-purple-200 dark:border-purple-800 p-4 overflow-y-auto transform transition-transform duration-300 ease-in-out
          ${isDrawerOpenMobile ? 'translate-x-0' : '-translate-x-full'}
          ${isDrawerOpenDesktop ? 'lg:translate-x-0' : 'lg:-translate-x-full'} lg:relative lg:flex lg:flex-col lg:z-auto`}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Saved Chats</h3>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeDrawerMobile}
              className="lg:hidden w-9 h-9 p-0 hover:scale-110 transition-transform duration-200"
            >
              <X className="h-4 w-4" />
            </Button>
            <Link to="/ai" className="lg:block hidden">
              <Button variant="ghost" size="sm" className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
        {isHistoryLoading ? (
          <p className="text-gray-500">Loading chat history...</p>
        ) : chatHistory && chatHistory.length > 0 ? (
          chatHistory.map(chat => (
            <button
              key={chat.id}
              onClick={() => loadSavedChat(chat)}
              className="w-full text-left py-2 px-3 mb-2 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-200 transition-colors duration-200"
            >
              {new Date(chat.created_at).toLocaleString()}
            </button>
          ))
        ) : (
          <p className="text-gray-500">No chats yet.</p>
        )}
      </aside>

      {/* Main chat panel content */}
      <main className="flex-1 min-h-0 w-full flex flex-col p-4 lg:p-8 max-w-4xl mx-auto">
        <Card className="flex-1 flex flex-col min-h-0 shadow-lg bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-purple-200 dark:border-purple-800">
            <CardTitle className="text-gray-900 text-lg dark:text-white">Dr. Sultan Chat</CardTitle>
            {/* NEW: Replaced hardcoded avatar with ProfileDropdown */}
            <ProfileDropdown />
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[calc(100vh-250px)] bg-white dark:bg-gray-800">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 italic">
                <MessageSquare className="w-16 h-16 mb-4 text-purple-400" />
                <p className="text-lg text-gray-700 dark:text-gray-300">Start a new conversation with Dr. Sultan!</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ask about medical conditions, treatments, and more.</p>
              </div>
            )}
            {messages.map((msg, i) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={i} className={`flex items-end ${isUser ? 'justify-end' : 'justify-start'} transition-opacity duration-300 ease-out opacity-100`}>
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mr-2 text-white font-bold text-sm">
                      DS
                    </div>
                  )}
                  <div className={`max-w-[70%] p-3 rounded-lg shadow ${isUser
                      ? 'bg-purple-600 text-white rounded-br-none'
                      : 'bg-gray-50 text-gray-900 rounded-bl-none border border-gray-100 dark:bg-gray-700 dark:text-white dark:border-gray-600'
                    }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {msg.time && (
                      <span className="block text-xs mt-1 text-gray-300 text-right dark:text-gray-400">
                        {msg.time}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {isAITyping && (
              <div className="flex items-end justify-start">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mr-2 text-white font-bold text-sm">
                  DS
                </div>
                <div className="max-w-[70%] p-3 rounded-lg shadow bg-gray-50 rounded-bl-none border border-gray-100 dark:bg-gray-700 dark:border-gray-600">
                  <div className="flex items-center space-x-1 animate-pulse-dot">
                    <span className="w-2 h-2 bg-gray-500 rounded-full block dark:bg-gray-400"></span>
                    <span className="w-2 h-2 bg-gray-500 rounded-full block dark:bg-gray-400"></span>
                    <span className="w-2 h-2 bg-gray-500 rounded-full block dark:bg-gray-400"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>
          {error && (
            <div className="p-4 text-red-500 bg-red-100 border-t border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">
              Error: {error}
            </div>
          )}
          {/* Input + controls */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-purple-200 flex items-center space-x-2 dark:border-purple-800">
            <Input
              placeholder="Type or speak your medical question..."
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              disabled={apiLoading}
              className="flex-1 border-purple-300 bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:ring-purple-500 focus:border-purple-500 dark:border-purple-700 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleMicClick}
              disabled={apiLoading}
              className={`w-10 h-10 transition-colors duration-200 ${recording ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-800'}`}
            >
              {recording ? <X className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            <Button type="submit" disabled={apiLoading} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
};

export default DrSultanChat;