import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bot, Zap, Brain, FileText, Moon, Sun, MessageSquare } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query'; // Import useQuery
import { supabase } from '@/integrations/supabase/client'; // Import supabase client

const AI = () => {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  // Get user profile data
  const { data: profile } = useQuery({
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
    enabled: !!user?.id
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
    'iconic': {
      light: 'bg-green-100 text-green-800 border-green-300',
      dark: 'dark:bg-green-900/30 dark:text-green-200 dark:border-green-700'
    },
    // Add more plans as needed
    'default': { // Fallback for unknown plans
      light: 'bg-gray-100 text-gray-800 border-gray-300',
      dark: 'dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
    }
  };

  // Determine the user's plan and its display name
  const rawUserPlan = profile?.plan?.toLowerCase() || 'free'; // Ensure lowercase for lookup
  const userPlanDisplayName = rawUserPlan.charAt(0).toUpperCase() + rawUserPlan.slice(1) + ' Plan';

  // Get the color classes for the current plan
  const currentPlanColorClasses = planColors[rawUserPlan] || planColors['default'];

  return (
    <div className="min-h-screen w-full bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
          <Link to="/dashboard" className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center space-x-3">
            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medistics Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">AI Study Assistant</span>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
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

      <div className="container mx-auto px-4 lg:px-8 py-8 max-w-7xl">
        {/* Hero Section */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            🤖 AI Study Assistant
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Choose your preferred AI study method. Get personalized help with your medical studies.
          </p>
        </div>

        {/* Main AI Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-4xl mx-auto">
          <Link to="/ai/chatbot">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800 hover:scale-105 hover:shadow-lg transition-all duration-300 animate-fade-in cursor-pointer h-full">
              <CardHeader className="text-center pb-4">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-gray-900 dark:text-white text-xl mb-2">AI Study Chatbot</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Get instant answers to your medical questions and study help through interactive chat
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                  Start Chatting
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/ai/test-generator">
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800 hover:scale-105 hover:shadow-lg transition-all duration-300 animate-fade-in cursor-pointer h-full">
              <CardHeader className="text-center pb-4">
                <FileText className="h-12 w-12 mx-auto mb-4 text-purple-600 dark:text-purple-400" />
                <CardTitle className="text-gray-900 dark:text-white text-xl mb-2">AI Test Generator</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Generate personalized practice tests with custom difficulty and topics
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button className="bg-purple-600 hover:bg-purple-700 text-white w-full">
                  Generate Test
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Feature Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:scale-105 transition-transform duration-300 animate-fade-in">
            <CardHeader className="text-center">
              <Bot className="h-8 w-8 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
              <CardTitle className="text-gray-900 dark:text-white">AI-Powered</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Advanced AI technology for medical education
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:scale-105 transition-transform duration-300 animate-fade-in">
            <CardHeader className="text-center">
              <Brain className="h-8 w-8 mx-auto mb-2 text-green-600 dark:text-green-400" />
              <CardTitle className="text-gray-900 dark:text-white">Smart Learning</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Adaptive learning that matches your pace
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:scale-105 transition-transform duration-300 animate-fade-in">
            <CardHeader className="text-center">
              <Zap className="h-8 w-8 mx-auto mb-2 text-yellow-600 dark:text-yellow-400" />
              <CardTitle className="text-gray-900 dark:text-white">Instant Results</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Get immediate feedback and explanations
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg text-sm text-blue-800 dark:text-blue-200 max-w-4xl mx-auto">
          <div className="flex items-start space-x-2">
            <Bot className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-2">How AI Study Assistant works:</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>AI Chatbot:</strong> Ask questions and get detailed explanations on any medical topic</li>
                <li>• <strong>Test Generator:</strong> Create custom practice tests with AI-generated questions</li>
                <li>• <strong>Progress Tracking:</strong> Monitor your learning progress and identify areas for improvement</li>
                <li>• <strong>Personalized Learning:</strong> AI adapts to your learning style and knowledge level</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AI;