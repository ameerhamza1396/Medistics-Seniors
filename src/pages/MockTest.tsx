import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import { Moon, Sun, ChevronLeft, PanelLeft } from 'lucide-react';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MockTest = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showUnattemptedDialog, setShowUnattemptedDialog] = useState(false);
  const [unattemptedCount, setUnattemptedCount] = useState(0);
  const [userPlan, setUserPlan] = useState<string | null>(null); // New state for user plan

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
    // Add more plans as needed
    'default': { // Fallback for unknown plans
      light: 'bg-gray-100 text-gray-800 border-gray-300',
      dark: 'dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
    }
  };

  // Function to get plan badge classes
  const getPlanBadgeClasses = (plan: string) => {
    const colors = planColors[plan as keyof typeof planColors] || planColors.default;
    return `${colors.light} ${colors.dark}`;
  };

  // Fetch user's plan on component mount or when user changes
  useEffect(() => {
    const fetchUserPlan = async () => {
      if (user?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user plan:', error);
          setUserPlan('default'); // Fallback to default if there's an error
        } else if (data) {
          setUserPlan(data.plan);
        }
      } else {
        setUserPlan(null); // Clear plan if user logs out
      }
    };

    fetchUserPlan();
  }, [user]); // Dependency array: re-run when `user` object changes


  // Define test unlock and end times
  // IMPORTANT: Set these dates/times in PKT (Pakistan Standard Time)
  // June 15, 2025, 00:00:00 PKT
  const testUnlockTime = new Date('2025-06-15T09:00:00+05:00'); // +05:00 for PKT
  const testEndTime = new Date(testUnlockTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours after unlock

  const now = new Date();
  const isTestActive = now >= testUnlockTime && now < testEndTime;
  const isTestUpcoming = now < testUnlockTime;
  const isTestClosed = now >= testEndTime;

  // Query to fetch mock questions
  const { data: mockMcqs, isLoading, isError, error } = useQuery({
    queryKey: ['mockQuestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_test_questions')
        .select('id, question, option_a, option_b, option_c, option_d, correct_answer');

      if (error) {
        console.error('Error fetching mock questions:', error);
        throw new Error(error.message);
      }
      return data.map(item => ({
        id: item.id,
        question: item.question,
        options: [item.option_a, item.option_b, item.option_c, item.option_d],
        correctAnswer: item.correct_answer
      }));
    },
    enabled: !!user && isTestActive, // Only enable if user is logged in AND test is active
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  // New Query to check if the user has already completed a test
  const { data: userTestResults, isLoading: isLoadingResults, isError: isErrorResults } = useQuery({
    queryKey: ['userTestCompletion', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_test_results')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (error) {
        console.error('Error checking user test completion:', error.message);
        throw new Error(error.message);
      }
      return data;
    },
    enabled: !!user, // Always check completion status if user is logged in
    staleTime: 0,
  });

  const hasCompletedTest = userTestResults && userTestResults.length > 0;

  const currentQuestion = mockMcqs ? mockMcqs[currentQuestionIndex] : null;

  // --- Local Storage Logic Start ---
  const getLocalStorageKey = () => `mockTestProgress_user_${user?.id}`;

  const saveProgress = () => {
    if (user && mockMcqs && isTestActive) { // Only save if user and questions are loaded and test is active
      const progressData = {
        index: currentQuestionIndex,
        answers: userAnswers,
      };
      localStorage.setItem(getLocalStorageKey(), JSON.stringify(progressData));
    }
  };

  useEffect(() => {
    if (user && mockMcqs && mockMcqs.length > 0 && isTestActive && !hasCompletedTest) {
      const savedProgress = localStorage.getItem(getLocalStorageKey());
      if (savedProgress) {
        try {
          const { index, answers } = JSON.parse(savedProgress);
          setCurrentQuestionIndex(index);
          setUserAnswers(answers);
        } catch (e) {
          console.error("Error parsing saved progress from localStorage", e);
          localStorage.removeItem(getLocalStorageKey());
        }
      }
    }
  }, [user, mockMcqs, hasCompletedTest, isTestActive]);

  useEffect(() => {
    if (user && mockMcqs && mockMcqs.length > 0 && isTestActive && !hasCompletedTest) {
      saveProgress();
    }
  }, [currentQuestionIndex, userAnswers, user, mockMcqs, isTestActive, hasCompletedTest]);

  const clearProgress = () => {
    if (user) {
      localStorage.removeItem(getLocalStorageKey());
    }
  };
  // --- Local Storage Logic End ---

  const handleOptionSelect = (questionId, selectedOption) => {
    setUserAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionId]: selectedOption
    }));
  };

  const goToNextQuestion = () => {
    if (mockMcqs && currentQuestionIndex < mockMcqs.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
    }
  };

  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index);
    setIsDrawerOpen(false);
  };

  const isQuestionAnswered = (questionId) => {
    return userAnswers.hasOwnProperty(questionId);
  };

  const countUnattempted = () => {
    if (!mockMcqs) return 0;
    let count = 0;
    mockMcqs.forEach(mcq => {
      if (!userAnswers.hasOwnProperty(mcq.id)) {
        count++;
      }
    });
    return count;
  };

  const submitTestToSupabase = async () => {
    if (!user || !mockMcqs) {
      console.error("User not logged in or mock questions not loaded. Cannot submit test.");
      return;
    }

    let score = 0;
    const totalQuestions = mockMcqs.length;

    mockMcqs.forEach(mcq => {
      if (userAnswers[mcq.id] === mcq.correctAnswer) {
        score++;
      }
    });

    const resultData = {
      user_id: user.id,
      username: user.email ? user.email.split('@')[0] : 'unknown',
      score: score,
      total_questions: totalQuestions,
      completed_at: new Date().toISOString(),
    };

    console.log("Attempting to submit test results to Supabase:", resultData);

    try {
      const { data, error: insertError } = await supabase
        .from('user_test_results')
        .insert([resultData]);

      if (insertError) {
        console.error('Error inserting test results:', insertError.message);
      } else {
        console.log('Test results successfully submitted to Supabase:', data);
        clearProgress();
        navigate('/test-completed');
      }
    } catch (err) {
      console.error('Unexpected error during test submission to Supabase:', err.message);
    }
  };

  const handleSubmitTest = () => {
    const unattempted = countUnattempted();
    if (unattempted > 0) {
      setUnattemptedCount(unattempted);
      setShowUnattemptedDialog(true);
    } else {
      submitTestToSupabase();
    }
  };

  const handleConfirmSubmission = () => {
    setShowUnattemptedDialog(false);
    submitTestToSupabase();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to access mock tests</h1>
          <Link to="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Handle loading states for all queries
  if (isLoading || isLoadingResults) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
        <p className="text-xl text-gray-700 dark:text-gray-300">Loading test status...</p>
      </div>
    );
  }

  // Handle error states for all queries
  if (isError || isErrorResults) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
        <p className="text-xl text-red-500">Error loading data: {error?.message || isErrorResults?.message || 'Unknown error'}</p>
        <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">Please try again later.</p>
      </div>
    );
  }

  // Conditional rendering based on test status
  if (isTestUpcoming) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10 p-4">
        <img
          src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
          alt="Medistics Logo"
          className="w-24 h-24 object-contain mb-6 animate-bounce-in"
        />
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 text-center animate-fade-in-up">
          Test Upcoming!
        </h1>
        <p className="text-xl text-gray-700 dark:text-gray-300 mb-8 text-center max-w-lg animate-fade-in-up delay-100">
          The Weekly Mock Test will be unlocked on Sunday, June 15, 2025 - 09 AM Pakistan Standard Time. Please check back then!
        </p>
        <Button
          onClick={() => navigate('/dashboard')}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transition-all duration-300 px-8 py-3 text-lg animate-fade-in-up delay-200"
        >
          Go to Dashboard
        </Button>
      </div>
    );
  }

  if (isTestClosed && !hasCompletedTest) { // Test closed and user hasn't completed it
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10 p-4">
        <img
          src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
          alt="Medistics Logo"
          className="w-24 h-24 object-contain mb-6 animate-bounce-in"
        />
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 text-center animate-fade-in-up">
          Test Window Closed
        </h1>
        <p className="text-xl text-gray-700 dark:text-gray-300 mb-8 text-center max-w-lg animate-fade-in-up delay-100">
          The Weekly Mock Test window has now closed.
        </p>
        <Button
          onClick={() => navigate('/dashboard')}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transition-all duration-300 px-8 py-3 text-lg animate-fade-in-up delay-200"
        >
          Go to Dashboard
        </Button>
      </div>
    );
  }

  // If user has completed the test, display a message (this comes after upcoming/closed checks)
  if (hasCompletedTest) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10 p-4">
        <img
          src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
          alt="Medistics Logo"
          className="w-24 h-24 object-contain mb-6 animate-bounce-in"
        />
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 text-center animate-fade-in-up">
          Test Already Completed!
        </h1>
        <p className="text-xl text-gray-700 dark:text-gray-300 mb-8 text-center max-w-lg animate-fade-in-up delay-100">
          You have already completed the Weekly Mock Test. You can go back to your dashboard.
        </p>
        <Button
          onClick={() => navigate('/dashboard')}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transition-all duration-300 px-8 py-3 text-lg animate-fade-in-up delay-200"
        >
          Go to Dashboard
        </Button>
      </div>
    );
  }

  // If no mock questions are available, even after loading and not completed
  if (!mockMcqs || mockMcqs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
        <p className="text-xl text-gray-700 dark:text-gray-300">No mock test questions available at the moment.</p>
        <Link to="/dashboard" className="mt-4">
          <Button>Go to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const displayUsername = user?.email ? user.email.split('@')[0] : 'User';

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10 flex flex-col">
      {/* Header - Reused from Dashboard */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {/* Drawer Trigger for mobile/smaller screens */}
            <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <PanelLeft className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[250px] sm:w-[300px] bg-white dark:bg-gray-900 border-r border-purple-200 dark:border-purple-800 p-4 flex flex-col">
                <SheetHeader>
                  <SheetTitle className="text-xl font-bold text-gray-900 dark:text-white mb-4">Question Map</SheetTitle>
                </SheetHeader>
                {/* Scrollable content area for the drawer */}
                <div className="flex-grow overflow-y-auto pr-2">
                  <div className="grid grid-cols-4 gap-2">
                    {mockMcqs.map((mcq, index) => (
                      <Button
                        key={mcq.id}
                        variant={isQuestionAnswered(mcq.id) ? "default" : "outline"}
                        className={`w-full ${currentQuestionIndex === index ? 'bg-purple-600 hover:bg-purple-700 text-white' : isQuestionAnswered(mcq.id) ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                        onClick={() => goToQuestion(index)}
                      >
                        {index + 1}
                      </Button>
                    ))}
                  </div>
                  <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
                    <p className="mb-2"><span className="inline-block w-4 h-4 rounded-full bg-purple-600 mr-2"></span>Current Question</p>
                    <p className="mb-2"><span className="inline-block w-4 h-4 rounded-full bg-green-500 mr-2"></span>Answered</p>
                    <p><span className="inline-block w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-700 mr-2"></span>Unanswered</p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/dashboard" className="text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors hidden lg:inline-flex items-center">
              <ChevronLeft className="w-6 h-6 mr-2 inline-block" />
              <span className="text-xl font-bold">Mock Test</span>
            </Link>
            <span className="text-xl font-bold text-gray-900 dark:text-white lg:hidden">Mock Test</span> {/* Title for mobile */}
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            {/* Dynamically rendered user plan badge */}
            {userPlan ? (
              <Badge className={getPlanBadgeClasses(userPlan)}>
                {userPlan.charAt(0).toUpperCase() + userPlan.slice(1)} Plan
              </Badge>
            ) : (
              <Badge variant="secondary" className="hidden sm:block bg-gray-100 dark:bg-gray-700/30 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 text-xs">
                Loading Plan...
              </Badge>
            )}
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <div className="flex flex-grow">
        {/* Desktop Drawer (visible on larger screens) */}
        <div className="hidden lg:block w-64 bg-white dark:bg-gray-900 border-r border-purple-200 dark:border-purple-800 p-6 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Question Map</h2>
          <div className="grid grid-cols-4 gap-2">
            {mockMcqs.map((mcq, index) => (
              <Button
                key={mcq.id}
                variant={isQuestionAnswered(mcq.id) ? "default" : "outline"}
                className={`w-full ${currentQuestionIndex === index ? 'bg-purple-600 hover:bg-purple-700 text-white' : isQuestionAnswered(mcq.id) ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                onClick={() => goToQuestion(index)}
              >
                {index + 1}
              </Button>
            ))}
          </div>
          <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
            <p className="mb-2"><span className="inline-block w-4 h-4 rounded-full bg-purple-600 mr-2"></span>Current Question</p>
            <p className="mb-2"><span className="inline-block w-4 h-4 rounded-full bg-green-500 mr-2"></span>Answered</p>
            <p><span className="inline-block w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-700 mr-2"></span>Unanswered</p>
          </div>
        </div>

        {/* Main Content Area (Question Display) */}
        {/* Removed justify-center to align content to the top */}
        <main className="flex-grow container mx-auto px-4 lg:px-8 py-8 flex flex-col items-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900 dark:text-white text-center flex items-center justify-center">
            <img
              src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
              alt="Medistics Logo"
              className="w-12 h-12 object-contain mr-3"
            />
            Weekly Mock Test
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 text-center">
            Question {currentQuestionIndex + 1} of {mockMcqs.length}
          </p>

          {currentQuestion && (
            <Card className="w-full max-w-2xl bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-xl text-gray-900 dark:text-white"></CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 text-lg mb-6">{currentQuestion.question}</p>
                <div className="space-y-3">
                  {currentQuestion.options.map((option, idx) => (
                    <Button
                      key={idx}
                      variant={userAnswers[currentQuestion.id] === option ? "default" : "outline"}
                      className={`w-full justify-start text-left py-3 ${userAnswers[currentQuestion.id] === option ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-50 dark:bg-gray-700 hover:bg-purple-100 dark:hover:bg-purple-900/20 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'}`}
                      onClick={() => handleOptionSelect(currentQuestion.id, option)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between items-center mt-6">
                <Button
                  onClick={goToPreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  variant="outline"
                  className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" /> Previous
                </Button>
                {currentQuestionIndex < mockMcqs.length - 1 ? (
                  <Button
                    onClick={goToNextQuestion}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-all duration-300"
                  >
                    Next Question
                    <ChevronLeft className="w-4 h-4 ml-2 rotate-180" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmitTest}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
                  >
                    Finish Test
                  </Button>
                )}
              </CardFooter>
            </Card>
          )}

          <p className="mt-8 text-lg font-semibold text-gray-700 dark:text-gray-300 animate-fade-in">
            Best of luck, <span className="text-purple-600 dark:text-pink-400">{displayUsername}</span>!
          </p>

        </main>
      </div>

      {/* Confirmation Dialog for Unattempted Questions */}
      <AlertDialog open={showUnattemptedDialog} onOpenChange={setShowUnattemptedDialog}>
        <AlertDialogContent className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-purple-200 dark:border-purple-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Unattempted Questions</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700 dark:text-gray-300">
              You have {unattemptedCount} question(s) unattempted. Are you sure you want to submit the test?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">
              Go Back to Test
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSubmission}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
            >
              Submit Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default MockTest;
