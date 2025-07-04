import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Added CardDescription
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, X, Loader2, Bot, Lock } from 'lucide-react'; // Added Lock icon
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AIChatbotProps {
  currentQuestion?: string;
  userPlan?: string; // Prop for user's plan (e.g., 'free', 'iconic', 'premium')
}

export const AIChatbot: React.FC<AIChatbotProps> = ({ currentQuestion, userPlan }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine if the user has premium access
  const hasPremiumAccess = userPlan === 'premium';

  const API_BASE_URL = 'https://medistics-ai-bot.vercel.app';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (message: string) => {
    // Only allow sending messages if premium access is granted
    if (!hasPremiumAccess) {
      console.warn("User does not have premium access. Cannot send message.");
      return;
    }

    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let questionToSend = message.trim();
      
      // If there's a current question context, include it
      if (currentQuestion && !message.toLowerCase().includes('question')) {
        questionToSend = `Context: I'm working on this MCQ question: "${currentQuestion}"\n\nMy question: ${message.trim()}`;
      }

      console.log('Sending request to:', `${API_BASE_URL}/study-chat`);
      console.log('Request payload:', { question: questionToSend });

      const response = await fetch(`${API_BASE_URL}/study-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: questionToSend
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);

      const aiMessage: Message = {
        role: 'assistant',
        content: data.answer || 'Sorry, I could not generate a response.',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, there was an error connecting to the AI service. Please check if the server at ${API_BASE_URL} is running and try again.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuestionHelp = () => {
    // Only allow this action if premium access is granted
    if (!hasPremiumAccess) {
      console.warn("User does not have premium access. Cannot use question help.");
      return;
    }
    if (currentQuestion) {
      sendMessage(`Can you help me understand this question: ${currentQuestion}`);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
        >
          <Bot className="w-6 h-6 text-white" />
        </Button>
      </motion.div>

      {/* Chat Popup - Positioned in bottom-right corner */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 100, y: 100 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 100, y: 100 }}
            className="fixed bottom-24 right-6 z-50 w-96 h-[500px] bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <Card className="h-full flex flex-col border-none shadow-none">
              <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <Bot className="w-5 h-5" />
                  <CardTitle className="text-lg">Dr. Sultan</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 p-0 text-white hover:bg-white/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>

              <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
                {hasPremiumAccess ? (
                  <>
                    <ScrollArea className="flex-1 px-4 py-4">
                      {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
                          <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p className="text-sm">Ask me anything about your studies!</p>
                          <p className="text-xs text-gray-500 mt-2">I'm Dr. Sultan, your MCAT tutor specialized in medical sciences.</p>
                          {currentQuestion && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleQuestionHelp}
                              className="mt-3"
                            >
                              Help with current question
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {messages.map((message, index) => (
                            <div
                              key={index}
                              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[80%] p-3 rounded-lg ${
                                  message.role === 'user'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                <p className={`text-xs mt-1 ${
                                  message.role === 'user' ? 'text-purple-100' : 'text-gray-500'
                                }`}>
                                  {new Date(message.timestamp).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          ))}
                          {isLoading && (
                            <div className="flex justify-start">
                              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                                <Loader2 className="w-4 h-4 animate-spin" />
                              </div>
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </ScrollArea>

                    <div className="border-t p-4 flex-shrink-0">
                      <form onSubmit={handleSubmit} className="flex space-x-2">
                        <Input
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Ask about the question..."
                          disabled={isLoading}
                          className="flex-1"
                        />
                        <Button
                          type="submit"
                          disabled={isLoading || !input.trim()}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </form>
                    </div>
                  </>
                ) : (
                  // Content for non-premium users
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <Lock className="w-16 h-16 text-purple-600 mb-4 opacity-70" />
                    <CardTitle className="text-xl mb-2">Premium Feature</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400 mb-4">
                      Unlock full access to Dr. Sultan AI Chatbot with a Premium plan.
                    </CardDescription>
                    <Button
                      asChild
                      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105"
                    >
                      <a href="/pricing">Upgrade to Premium</a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
