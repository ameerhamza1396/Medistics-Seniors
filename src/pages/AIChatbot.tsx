import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import { Moon, Sun, ArrowLeft, Send, Mic, X, Save, PlusSquare, MessageSquare, Menu } from 'lucide-react';
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
  avatar_url: string;
  created_at: string;
  full_name: string;
  id: string;
  medical_school: string;
  updated_at: string;
  username: string;
  year_of_study: number;
  plan?: string;
};

const API_BASE_URL = 'https://medistics-ai-bot.vercel.app';

// Custom Notification Component
const Notification: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // Hide after 3 seconds
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
  const { user, isLoading: isAuthLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Notification state
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');

  // Drawer state for mobile
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [currentTranslateX, setCurrentTranslateX] = useState(-256); // Initial position for closed drawer (w-64 is 256px)
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerWidth = 256; // Corresponds to w-64

  // Function to show notification
  const showTemporaryNotification = (message: string, type: 'success' | 'error') => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
  };

  // Fetch user profile for plan badge and avatar initial
  const { data: profile, isLoading: isProfileLoading } = useQuery<Profile | null>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
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

  // Define plan color schemes (copied from AI component, added 'iconic')
  const planColors = {
    'free': {
      light: 'bg-purple-100 text-purple-800 border-purple-300',
      dark: 'dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700'
    },
    'premium': {
      light: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      dark: 'dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700'
    },
    'pro': { // Keeping 'pro' as it was there, assuming it's an alias or another tier for display
      light: 'bg-green-100 text-green-800 border-green-300',
      dark: 'dark:bg-green-900/30 dark:text-green-200 dark:border-green-700'
    },
    'iconic': { // Added iconic plan with its own color scheme
      light: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      dark: 'dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-700'
    },
    'default': { // Fallback for unknown plans (e.g., 'basic' if it existed)
      light: 'bg-gray-100 text-gray-800 border-gray-300',
      dark: 'dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
    }
  };

  // Determine the user's plan and its display name
  const rawUserPlan = profile?.plan?.toLowerCase() || 'free'; // Ensure lowercase for lookup
  const userPlanDisplayName = rawUserPlan.charAt(0).toUpperCase() + rawUserPlan.slice(1) + ' Plan';

  // Get the color classes for the current plan
  const currentPlanColorClasses = planColors[rawUserPlan as keyof typeof planColors] || planColors['default'];

  // Access control logic
  const hasAccess = ['premium', 'iconic'].includes(rawUserPlan);


  // Fetch saved chats
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
    enabled: !!user?.id && hasAccess // Only fetch chat history if user has access
  });

  // Mutation: save current chat
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
      queryClient.invalidateQueries({ queryKey: ['chatHistory', user?.id] });
      showTemporaryNotification('Chat saved ✔️', 'success');
    },
    onError: err => {
      showTemporaryNotification(`Failed to save chat: ${err.message}`, 'error');
    }
  });

  // Load a saved chat
  const loadSavedChat = (chat: SavedChat) => {
    setMessages(chat.messages);
    setError(null);
    closeDrawer(); // Close drawer after loading chat on mobile
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]); // Also scroll when loading state changes (for typing indicator)

  // Handle drawer open/close
  const toggleDrawer = () => {
    setIsDrawerOpen(prev => {
      const newState = !prev;
      setCurrentTranslateX(newState ? 0 : -drawerWidth);
      return newState;
    });
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setCurrentTranslateX(-drawerWidth);
  };

  // Touch event handlers for draggable drawer
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStartX(e.touches[0].clientX);
      if (drawerRef.current) {
        drawerRef.current.style.transition = 'none'; // Disable transition during drag
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const currentTouchX = e.touches[0].clientX;
      const deltaX = currentTouchX - touchStartX;
      let newTranslateX = currentTranslateX + deltaX;

      // Clamp the translation to keep the drawer within bounds
      newTranslateX = Math.min(0, Math.max(-drawerWidth, newTranslateX));
      setCurrentTranslateX(newTranslateX);

      if (drawerRef.current) {
        drawerRef.current.style.transform = `translateX(${newTranslateX}px)`;
      }
    }
  };

  const handleTouchEnd = () => {
    if (drawerRef.current) {
      drawerRef.current.style.transition = 'transform 0.3s ease-in-out'; // Re-enable transition
    }

    const threshold = drawerWidth * 0.3; // If dragged more than 30% of its width
    if (currentTranslateX > -threshold) {
      // If opened more than threshold, open fully
      setIsDrawerOpen(true);
      setCurrentTranslateX(0);
    } else {
      // Otherwise, close fully
      setIsDrawerOpen(false);
      setCurrentTranslateX(-drawerWidth);
    }
    setTouchStartX(0); // Reset touch start X
  };

  // Effect to apply initial transform and react to isDrawerOpen changes from button
  useEffect(() => {
    if (drawerRef.current) {
      drawerRef.current.style.transform = `translateX(${isDrawerOpen ? 0 : -drawerWidth}px)`;
    }
  }, [isDrawerOpen]); // Only react when isDrawerOpen changes by button

  // Send a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading || !hasAccess) return; // Prevent sending if no access
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
    if (!hasAccess) { // Prevent mic use if no access
      showTemporaryNotification('Upgrade your plan to use voice input.', 'error');
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
      showTemporaryNotification(msg, 'error');
    };
    rec.onend = () => setRecording(false);
    try { rec.start(); }
    catch {
      showTemporaryNotification('Could not start microphone.', 'error');
    }
  };

  // Determine if AI is currently typing
  const isAITyping = loading && messages.length > 0 && messages[messages.length - 1].sender === 'user';


  // Loading & auth states
  if (isAuthLoading || isProfileLoading) { // Removed isHistoryLoading from here
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
        // Increased z-index to appear on top of header
        className={`fixed inset-y-0 left-0 z-[60] w-64 bg-white dark:bg-gray-800 border-r border-purple-200 dark:border-purple-800 p-4 overflow-y-auto transform transition-transform duration-300 ease-in-out
          ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:flex lg:flex-col lg:z-auto`}
        onTouchStart={hasAccess ? handleTouchStart : undefined} // Only enable drag if hasAccess
        onTouchMove={hasAccess ? handleTouchMove : undefined} // Only enable drag if hasAccess
        onTouchEnd={hasAccess ? handleTouchEnd : undefined} // Only enable drag if hasAccess
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Saved Chats</h3>
          <div className="flex items-center space-x-2">
            {/* Dark/Light mode toggle */}
            <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {/* Exit button for mobile drawer */}
            <Button
              variant="ghost"
              size="sm"
              onClick={closeDrawer} // Close the drawer
              className="lg:hidden w-9 h-9 p-0 hover:scale-110 transition-transform duration-200" // Show only on small screens
            >
              <X className="h-4 w-4" />
            </Button>
            {/* "Go to Dashboard" button (ArrowLeft) for larger screens */}
            <Link to="/ai" className="hidden lg:block"> {/* Hide Link on small screens */}
              <Button variant="ghost" size="sm" className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
        {hasAccess ? ( // Only show history if user has access
          chatHistory && chatHistory.length > 0 ? (
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
          )
        ) : (
          <p className="text-gray-500">Current plan is not compatible with this feature. Consider Upgrading your Plan.</p>
        )}
      </aside>

      {/* Backdrop for mobile drawer */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" // z-40 is below drawer's z-index
          onClick={closeDrawer}
        ></div>
      )}

      {/* Conditional Rendering for Upgrade Required (Full screen) or Chat Panel */}
      {!hasAccess ? (
        // This container now takes up the entire remaining screen width and height
        // and centers its content (the Card) within itself.
        <div className="flex-1 flex items-center justify-center w-full h-full p-4 lg:p-8">
          <Card className="w-full max-w-lg p-6 text-center bg-white border border-purple-200 text-gray-900 shadow-lg">
            <CardHeader><CardTitle className="text-xl font-bold text-gray-900">Upgrade Required</CardTitle></CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                Dr. Sultan Chat is a premium feature. Please upgrade your plan to access.
              </p>
              <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                <Button onClick={() => window.location.href = '/pricing'} className="bg-purple-600 hover:bg-purple-700 text-white">Upgrade Plan</Button>
                <Link to="/dashboard">
                  <Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50">Go to Dashboard</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Chat panel - now explicitly h-full to fit parent, and flex-1 to take horizontal space */
        <div className="flex-1 flex flex-col items-center h-full lg:ml-64"> {/* Added lg:ml-64 back here to push chat content over */}
          {/* Header */}
          <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50 w-full">
            <div className="w-full p-4 lg:p-8 flex justify-between items-center max-w-4xl mx-auto">
              {/* Left side: Menu for mobile */}
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={toggleDrawer} className="lg:hidden w-9 h-9 p-0 hover:scale-110 transition-transform duration-200">
                  <Menu className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center space-x-3">
                <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medistics Logo" className="w-8 h-8 object-contain" />
                {/* Dr. Sultan Chat for desktop */}
                <span className="text-xl font-bold text-gray-900 dark:text-white hidden lg:block">Dr. Sultan Chat</span>
                {/* Medistics.app for mobile */}
                <span className="text-base font-bold text-gray-900 dark:text-white block lg:hidden">Medistics.app</span>
              </div>

              <div className="flex items-center space-x-3">
                {/* Dynamic Plan Badge with dynamic colors */}
                <Badge
                  variant="secondary"
                  className={`${currentPlanColorClasses.light} ${currentPlanColorClasses.dark}`}
                >
                  {userPlanDisplayName}
                </Badge>
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {user?.email?.substring(0, 2).toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Main chat panel content */}
          <main className="flex-1 min-h-0 w-full flex flex-col p-4 lg:p-8 max-w-4xl mx-auto">
            <Card className="flex-1 flex flex-col min-h-0 shadow-lg bg-white border border-purple-200"> {/* Ensured bg-white and border for light theme */}
              <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-purple-200"> {/* Ensured border-purple-200 for light theme */}
                {/* This div now holds the ArrowLeft (mobile only) and the CardTitle */}
                <div className="flex items-center space-x-2">
                  <Link to="/ai" className="lg:hidden"> {/* Visible only on mobile */}
                    <Button variant="ghost" size="sm" className="w-9 h-9 p-0 text-gray-600 hover:bg-gray-100"> {/* Adjusted text and hover for light theme */}
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  </Link>
                  <CardTitle className="text-gray-900 text-lg">Dr. Sultan Chat</CardTitle> {/* Ensured text color for light theme */}
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => { setMessages([]); setError(null); }} className="p-2 w-9 h-9 text-gray-600 hover:bg-gray-100"> {/* Adjusted text and hover for light theme */}
                    <PlusSquare className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => saveChatMutation.mutate()}
                    disabled={!messages.length || saveChatMutation.isPending}
                    className="p-2 w-9 h-9 text-gray-600 hover:bg-gray-100"
                    // Adjusted text and hover for light theme
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[calc(100vh-250px)] bg-white"> {/* Ensured bg-white for light theme */}
                {messages.length === 0 && !isAITyping && (
                  <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 italic">
                    <MessageSquare className="w-16 h-16 mb-4 text-purple-400" />
                    <p className="text-lg text-gray-700">Start a new conversation with Dr. Sultan!</p> {/* Ensured text color for light theme */}
                    <p className="text-sm text-gray-500">Ask about medical conditions, treatments, and more.</p> {/* Ensured text color for light theme */}
                  </div>
                )}
                {messages.map((msg, i) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div key={i} className={`flex items-end ${isUser ? 'justify-end' : 'justify-start'} transition-opacity duration-300 ease-out opacity-100`}>
                      {!isUser && (
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mr-2 text-white font-bold text-sm"> {/* DS avatar color remains */}
                          DS
                        </div>
                      )}
                      <div className={`max-w-[70%] p-3 rounded-lg shadow ${isUser
                          ? 'bg-purple-600 text-white rounded-br-none'
                          : 'bg-gray-50 text-gray-900 rounded-bl-none border border-gray-100' /* Softer AI message background, added subtle border */
                        }`}>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        {msg.time && (
                          <span className="block text-xs mt-1 text-gray-300 text-right"> {/* Adjusted time text color for light theme */}
                            {msg.time}
                          </span>
                        )}
                      </div>
                      {isUser && (
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center ml-2 text-white font-bold text-sm"> {/* User avatar color remains */}
                          {user?.email?.substring(0, 2).toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                  );
                })}
                {isAITyping && (
                  <div className="flex items-end justify-start">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mr-2 text-white font-bold text-sm">
                      DS
                    </div>
                    <div className="max-w-[70%] p-3 rounded-lg shadow bg-gray-50 rounded-bl-none border border-gray-100"> {/* Softer AI typing background, added subtle border */}
                      <div className="flex items-center space-x-1 animate-pulse-dot">
                        <span className="w-2 h-2 bg-gray-500 rounded-full block"></span> {/* Adjusted dot color for light theme */}
                        <span className="w-2 h-2 bg-gray-500 rounded-full block"></span> {/* Adjusted dot color for light theme */}
                        <span className="w-2 h-2 bg-gray-500 rounded-full block"></span> {/* Adjusted dot color for light theme */}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </CardContent>
              {error && (
                <div className="p-4 text-red-500 bg-red-100 border-t border-red-200"> {/* Ensured error colors for light theme */}
                  Error: {error}
                </div>
              )}
              {/* Input + controls */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-purple-200 flex items-center space-x-2"> {/* Ensured border for light theme */}
                <Input
                  placeholder="Type or speak your medical question..."
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  disabled={loading || !hasAccess} // Disable if no access
                  className="flex-1 border-purple-300 bg-gray-50 text-gray-900 placeholder:text-gray-500 focus:ring-purple-500 focus:border-purple-500" // Adjusted input colors for light theme
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleMicClick}
                  disabled={loading || !hasAccess} // Disable if no access
                  className={`w-10 h-10 transition-colors duration-200 ${recording ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'}`} // Adjusted mic button colors for light theme
                >
                  {recording ? <X className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
                <Button type="submit" disabled={loading || !hasAccess} className="bg-purple-600 hover:bg-purple-700 text-white">
                  <Send className="w-5 h-5" />
                </Button>
              </form>
            </Card>
          </main>
        </div>
      )}
    </div>
  );
};

export default DrSultanChat;
