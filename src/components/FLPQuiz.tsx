import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import { Moon, Sun, ChevronLeft, PanelLeft, Clock } from 'lucide-react'; // Removed Bookmark and CheckCircle, XCircle as they are now in FLPResults
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
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
import { FLPResults } from '@/components//FLPResults'; // Import the new results component

// Define the MCQ type (should match your database schema for 'mcqs' table)
interface MCQ {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string; // Explanation is needed for results page
  chapter_id: string;
}

// Define the ShuffledMCQ type for internal use
interface ShuffledMCQ extends Omit<MCQ, 'options'> {
  shuffledOptions: string[];
  originalCorrectIndex: number; // Index of the correct answer in shuffledOptions
}

// Define type for storing quiz results (for the final display) - This will be saved to Supabase
interface QuizResultForDb {
  mcq_id: string; // Changed from 'mcq' to 'mcq_id' for easier database storage
  selectedAnswer: string | null;
  isCorrect: boolean;
  timeTaken: number;
}

interface FLPQuizProps {
  mcqs: MCQ[]; // The pre-fetched list of MCQs for the FLP
  onFinish: (score: number, totalQuestions: number) => void; // This will now typically navigate away
  timePerQuestion?: number; // Default to 60 seconds
}

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const FLPQuiz = ({ mcqs, onFinish, timePerQuestion = 60 }: FLPQuizProps) => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [shuffledMcqs, setShuffledMcqs] = useState<ShuffledMCQ[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string | null>>({}); // Stores selected answer for each question ID

  const [totalTimeLeft, setTotalTimeLeft] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [isQuizEnded, setIsQuizEnded] = useState(false);
  const [currentTestResultId, setCurrentTestResultId] = useState<string | null>(null); // New state to hold the ID of the saved test result

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showUnattemptedDialog, setShowUnattemptedDialog] = useState(false);
  const [unattemptedCount, setUnattemptedCount] = useState(0);

  // Placeholder for userPlan, as the premium check is done in FLP.tsx
  const userPlan = 'premium'; // FLP is premium only, so hardcode for display

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
    'default': {
      light: 'bg-gray-100 text-gray-800 border-gray-300',
      dark: 'dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
    }
  };

  const getPlanBadgeClasses = (plan: string) => {
    const colors = planColors[plan as keyof typeof planColors] || planColors.default;
    return `${colors.light} ${colors.dark}`;
  };

  const totalQuestions = shuffledMcqs.length;
  const totalTestTime = totalQuestions * timePerQuestion;

  // Initialize and shuffle MCQs when component mounts or mcqs prop changes
  useEffect(() => {
    if (mcqs && mcqs.length > 0) {
      const initialShuffled = mcqs.map(mcq => {
        const shuffledOptions = shuffleArray(mcq.options);
        const newCorrectIndex = shuffledOptions.indexOf(mcq.correct_answer);
        return {
          ...mcq,
          shuffledOptions,
          originalCorrectIndex: newCorrectIndex
        };
      });
      setShuffledMcqs(initialShuffled);

      const initialUserAnswers: Record<string, string | null> = {};
      initialShuffled.forEach(mcq => {
        initialUserAnswers[mcq.id] = null;
      });
      setUserAnswers(initialUserAnswers);

      setCurrentQuestionIndex(0);
      setIsQuizEnded(false);
      setCurrentTestResultId(null); // Reset result ID
      setTotalTimeLeft(totalTestTime);
    }
  }, [mcqs, timePerQuestion, totalTestTime]);

  // Timer for the entire test
  useEffect(() => {
    if (totalTimeLeft <= 0 && !isQuizEnded && totalQuestions > 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      submitTestToSupabase(true); // true indicates auto-submission due to time up
      return;
    }

    if (isQuizEnded || totalQuestions === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTotalTimeLeft(prevTime => prevTime - 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [totalTimeLeft, isQuizEnded, totalQuestions]);


  const currentMCQ = shuffledMcqs[currentQuestionIndex];
  // Removed progressPercentage as it's not directly displayed in this version
  // const progressPercentage = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

  // Handles selecting an option
  const handleOptionSelect = (mcqId: string, selectedOption: string) => {
    if (isQuizEnded) return;
    setUserAnswers(prevAnswers => ({
      ...prevAnswers,
      [mcqId]: selectedOption
    }));
  };

  // Navigate to the next question
  const goToNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    }
  };

  // Navigate to the previous question
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
    }
  };

  // Navigate to a specific question from the drawer
  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    setIsDrawerOpen(false);
  };

  // Check if a question has been answered (selected an option)
  const isQuestionAnswered = (mcqId: string) => {
    return userAnswers[mcqId] !== null && userAnswers[mcqId] !== undefined;
  };

  // Count unattempted questions
  const countUnattempted = () => {
    if (!shuffledMcqs) return 0;
    let count = 0;
    shuffledMcqs.forEach(mcq => {
      if (!isQuestionAnswered(mcq.id)) {
        count++;
      }
    });
    return count;
  };

  // Submit test results to Supabase and prepare for display
  const submitTestToSupabase = async (autoSubmit: boolean = false) => {
    if (!user || !shuffledMcqs || isQuizEnded) {
      console.error("User not logged in, questions not loaded, or quiz already ended. Cannot submit test.");
      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current); // Stop the timer immediately on submission
    }

    let finalScore = 0;
    const questionsAttemptDetails: QuizResultForDb[] = [];

    shuffledMcqs.forEach(mcq => {
      const userAnswer = userAnswers[mcq.id] || null;
      const isCorrect = userAnswer === mcq.correct_answer;

      if (isCorrect) {
        finalScore++;
      }

      questionsAttemptDetails.push({
        mcq_id: mcq.id,
        selectedAnswer: userAnswer,
        isCorrect: isCorrect,
        timeTaken: 0 // Time taken per question is not tracked in this new flow per question, only total.
      });
    });

    const flpTestConfigId = 'flp_weekly_test_id'; // Placeholder ID for FLP test type

    const resultData = {
      user_id: user.id,
      username: user.email ? user.email.split('@')[0] : 'unknown',
      score: finalScore,
      total_questions: totalQuestions,
      completed_at: new Date().toISOString(),
      test_config_id: flpTestConfigId,
      question_attempts: questionsAttemptDetails, // Store the array of detailed attempts as JSONB
    };

    try {
      // First, delete any previous FLP attempts by this user
      const { error: deleteError } = await supabase
        .from('flp_user_attempts')
        .delete()
        .eq('user_id', user.id)
        .eq('test_config_id', flpTestConfigId); // Ensure we only delete FLP attempts

      if (deleteError) {
        console.error('Error deleting previous FLP attempts:', deleteError.message);
        // Don't prevent insertion, just log the error
      }

      // Then, insert the new attempt
      const { data: insertedResult, error: insertError } = await supabase
        .from('flp_user_attempts')
        .insert([resultData])
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      const newTestResultId = insertedResult.id;
      setCurrentTestResultId(newTestResultId);
      setIsQuizEnded(true); // Mark quiz as ended
      toast({
        title: autoSubmit ? "Time's Up! Test Submitted." : "Test Submitted!",
        description: `You scored ${finalScore}/${totalQuestions}.`,
        duration: 3000,
      });

      // Navigate to the results page immediately
      navigate(`/results/flp/${newTestResultId}`);

    } catch (err: any) {
      console.error('Error during FLP test submission to Supabase:', err.message);
      toast({
        title: "Submission Error",
        description: `An unexpected error occurred: ${err.message}`,
        variant: "destructive",
      });
      // If submission fails, quiz remains active or user is informed
      setIsQuizEnded(false);
    }
  };

  // Handle final submission button click
  const handleSubmitTest = () => {
    const unattempted = countUnattempted();
    if (unattempted > 0) {
      setUnattemptedCount(unattempted);
      setShowUnattemptedDialog(true);
    } else {
      submitTestToSupabase();
    }
  };

  // Confirm submission from dialog
  const handleConfirmSubmission = () => {
    setShowUnattemptedDialog(false);
    submitTestToSupabase();
  };

  // Format time for display (MM:SS)
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // If quiz has ended and we have a result ID, render the results component
  if (isQuizEnded && currentTestResultId) {
    // FLPResults component will handle its own data fetching based on currentTestResultId
    return <FLPResults />;
  }

  // Loading state for initial MCQs
  if (shuffledMcqs.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm mx-2 sm:mx-0">
        <CardContent className="text-center py-6 sm:py-8 flex flex-col items-center justify-center h-full">
          <div className="flex justify-center items-end h-24 space-x-2">
            <div className="w-3 h-12 bg-purple-600 dark:bg-purple-400 rounded-full wave-bar" style={{ animationDelay: '0s' }}></div>
            <div className="w-3 h-12 bg-purple-600 dark:bg-purple-400 rounded-full wave-bar" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-12 bg-purple-600 dark:bg-purple-400 rounded-full wave-bar" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-12 bg-purple-600 dark:bg-purple-400 rounded-full wave-bar" style={{ animationDelay: '0.3s' }}></div>
            <div className="w-3 h-12 bg-purple-600 dark:bg-purple-400 rounded-full wave-bar" style={{ animationDelay: '0.4s' }}></div>
          </div>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-4">Preparing your FLP questions...</p>
        </CardContent>
      </Card>
    );
  }

  const displayUsername = user?.email ? user.email.split('@')[0] : 'User';

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10 flex flex-col">
      {/* Header - Reused from Dashboard */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50 flex-shrink-0">
        <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {/* Timer Display */}
            <div className="flex items-center space-x-1 text-lg font-bold text-gray-800 dark:text-gray-200 min-w-[80px]">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span>{formatTime(totalTimeLeft)}</span>
            </div>

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
                    {shuffledMcqs.map((mcq, index) => (
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
              <span className="text-xl font-bold">Full-Length Paper</span>
            </Link>
            <span className="text-xl font-bold text-gray-900 dark:text-white lg:hidden">Full-Length Paper</span>
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

      <div className="flex flex-grow overflow-hidden">
        {/* Desktop Drawer (visible on larger screens) */}
        <div className="hidden lg:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-purple-200 dark:border-purple-800 flex-shrink-0 h-[calc(100vh-64px)]">
          <div className="p-4 border-b border-purple-200 dark:border-purple-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Question Map</h2>
          </div>

          <div className="flex-grow overflow-y-auto p-4">
            <div className="grid grid-cols-4 gap-2 mb-6">
              {shuffledMcqs.map((mcq, index) => (
                <Button
                  key={mcq.id}
                  variant={isQuestionAnswered(mcq.id) ? "default" : "outline"}
                  className={`w-full ${
                    currentQuestionIndex === index
                      ? "bg-purple-600 hover:bg-purple-700 text-white"
                      : isQuestionAnswered(mcq.id)
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                  onClick={() => goToQuestion(index)}
                >
                  {index + 1}
                </Button>
              ))}
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p><span className="inline-block w-4 h-4 rounded-full bg-purple-600 mr-2"></span>Current Question</p>
              <p><span className="inline-block w-4 h-4 rounded-full bg-green-500 mr-2"></span>Answered</p>
              <p><span className="inline-block w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-700 mr-2"></span>Unanswered</p>
            </div>
          </div>
        </div>


        {/* Main content area - now correctly takes remaining height and scrolls */}
        <main className="flex-grow container mx-auto px-4 lg:px-8 py-8 flex flex-col items-center overflow-y-auto h-full">
          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900 dark:text-white text-center flex items-center justify-center">
            <img
              src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
              alt="Medistics Logo"
              className="w-12 h-12 object-contain mr-3"
            />
            Full-Length Paper
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 text-center">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </p>

          {currentMCQ && (
            <Card className="w-full max-w-2xl bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-xl text-gray-900 dark:text-white"></CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 text-lg mb-6">{currentMCQ.question}</p>
                <div className="space-y-3">
                  {currentMCQ.shuffledOptions.map((option, idx) => (
                    <Button
                      key={idx}
                      variant={userAnswers[currentMCQ.id] === option ? "default" : "outline"}
                      className={`w-full justify-start text-left py-3 ${userAnswers[currentMCQ.id] === option ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-50 dark:bg-gray-700 hover:bg-purple-100 dark:hover:bg-purple-900/20 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'}`}
                      onClick={() => handleOptionSelect(currentMCQ.id, option)}
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
                {currentQuestionIndex < totalQuestions - 1 ? (
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