import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Clock, CheckCircle, XCircle, Timer, Bot, MessageSquare, X, Bookmark, BookmarkCheck, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { fetchMCQsByChapter, MCQ } from '@/utils/mcqData';
import { supabase } from '@/integrations/supabase/client';
import { AIChatbot } from './AIChatbot';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

interface MCQDisplayProps {
  subject: string;
  chapter: string;
  onBack: () => void;
  timerEnabled?: boolean;
  timePerQuestion?: number;
}

interface ShuffledMCQ extends Omit<MCQ, 'options'> {
  shuffledOptions: string[];
  originalCorrectIndex: number;
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

// --- Constants for Local Storage Keys ---
const LAST_ATTEMPTED_MCQ_KEY = 'lastAttemptedMCQIndex';
const LAST_ATTEMPTED_SUBJECT_KEY = 'lastAttemptedMCQSubject';
const LAST_ATTEMPTED_CHAPTER_KEY = 'lastAttemptedMCQChapter';
const IS_PAUSED_KEY = 'isMCQTestPaused'; // New key for pause state

export const MCQDisplay = ({
  subject,
  chapter,
  onBack,
  timerEnabled = false,
  timePerQuestion = 30
}: MCQDisplayProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [mcqs, setMcqs] = useState<ShuffledMCQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timePerQuestion);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [score, setScore] = useState(0);

  // States for AIChatbot visibility
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  // States for Dr. Sultan's help toast
  const [showHelpToast, setShowHelpToast] = useState(false);
  const [helpToastMessage, setHelpToastMessage] = useState('');
  const helpToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // State for saved MCQ status
  const [isCurrentMCQSaved, setIsCurrentMCQSaved] = useState(false);

  // New state for pause overlay
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Ref for timer interval

  const helpMessages = [
    "Hey, you look stuck. May I help you?",
    "Things going dude or may I help you?",
    "Hey, I am Dr. Sultan. Tap here to ask me if you need help.",
    "Don't hesitate to ask! Dr. Sultan is here.",
    "Need a hint? I'm here to assist!",
    "Feeling puzzled? Dr. Sultan has answers!",
    "Stuck on this one? Let's figure it out together.",
    "I can explain this question further. Just tap me!"
  ];

  // Derive username for the good luck message
  const username = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  // Fetch user profile data to get the plan
  const { data: profile } = useQuery({
    queryKey: ['profileForChatbot', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile for chatbot:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id
  });

  // Determine the user's plan for the chatbot
  const userPlanForChatbot = profile?.plan?.toLowerCase() || 'free';

  // --- NEW: Effect to load last attempted question from local storage and pause state ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastSubject = localStorage.getItem(LAST_ATTEMPTED_SUBJECT_KEY);
      const lastChapter = localStorage.getItem(LAST_ATTEMPTED_CHAPTER_KEY);
      const lastIndex = localStorage.getItem(LAST_ATTEMPTED_MCQ_KEY);
      const pausedState = localStorage.getItem(IS_PAUSED_KEY) === 'true';

      if (lastSubject === subject && lastChapter === chapter && lastIndex !== null) {
        const parsedIndex = parseInt(lastIndex, 10);
        if (!isNaN(parsedIndex) && parsedIndex >= 0) {
          setCurrentQuestionIndex(parsedIndex);
        }
      } else {
        localStorage.removeItem(LAST_ATTEMPTED_MCQ_KEY);
        localStorage.removeItem(LAST_ATTEMPTED_SUBJECT_KEY);
        localStorage.removeItem(LAST_ATTEMPTED_CHAPTER_KEY);
        localStorage.removeItem(IS_PAUSED_KEY); // Clear pause state if chapter changes
        setCurrentQuestionIndex(0);
      }
      setIsPaused(pausedState); // Restore pause state
    }
  }, [subject, chapter]);

  // Effect to load MCQs and shuffle options
  useEffect(() => {
    const loadMCQs = async () => {
      setLoading(true);
      const data = await fetchMCQsByChapter(chapter);

      const shuffledMCQs = data.map(mcq => {
        const correctAnswerIndex = mcq.options.indexOf(mcq.correct_answer);
        const shuffledOptions = shuffleArray(mcq.options);
        const newCorrectIndex = shuffledOptions.indexOf(mcq.correct_answer);

        return {
          ...mcq,
          shuffledOptions,
          originalCorrectIndex: newCorrectIndex
        };
      });

      setMcqs(shuffledMCQs);
      setLoading(false);
    };

    loadMCQs();
  }, [chapter]);

  // --- NEW: Effect to save current question index and pause state to local storage ---
  useEffect(() => {
    if (!loading && mcqs.length > 0 && typeof window !== 'undefined') {
      localStorage.setItem(LAST_ATTEMPTED_MCQ_KEY, currentQuestionIndex.toString());
      localStorage.setItem(LAST_ATTEMPTED_SUBJECT_KEY, subject);
      localStorage.setItem(LAST_ATTEMPTED_CHAPTER_KEY, chapter);
      localStorage.setItem(IS_PAUSED_KEY, String(isPaused)); // Save pause state
    }
  }, [currentQuestionIndex, subject, chapter, loading, mcqs.length, isPaused]);

  // Effect for the question timer
  useEffect(() => {
    if (timerEnabled && !showExplanation && !isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(intervalRef.current!);
            handleTimeUp();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerEnabled, showExplanation, isPaused, currentQuestionIndex, timePerQuestion]);

  // Effect to check if the current MCQ is saved
  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!user || !mcqs[currentQuestionIndex]?.id) {
        setIsCurrentMCQSaved(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('saved_mcqs')
          .select('id')
          .eq('user_id', user.id)
          .eq('mcq_id', mcqs[currentQuestionIndex].id)
          .single();

        setIsCurrentMCQSaved(!!data);
        if (error && error.code !== 'PGRST116') {
          console.error('Error checking saved status:', error);
        }
      } catch (error) {
        console.error('Error checking saved status:', error);
        setIsCurrentMCQSaved(false);
      }
    };

    if (!loading && mcqs.length > 0) {
      checkSavedStatus();
    }
  }, [mcqs, currentQuestionIndex, user, loading]);

  // Timer for Dr. Sultan's help toast
  useEffect(() => {
    if (helpToastTimerRef.current) {
      clearTimeout(helpToastTimerRef.current);
    }
    setShowHelpToast(false);

    if (user && userPlanForChatbot === 'premium' && !selectedAnswer && !isChatbotOpen && !isPaused) {
      helpToastTimerRef.current = setTimeout(() => {
        if (!selectedAnswer && !isChatbotOpen && !isPaused) {
          setHelpToastMessage(helpMessages[Math.floor(Math.random() * helpMessages.length)]);
          setShowHelpToast(true);
        }
      }, 10000);
    }

    return () => {
      if (helpToastTimerRef.current) {
        clearTimeout(helpToastTimerRef.current);
      }
    };
  }, [currentQuestionIndex, selectedAnswer, isChatbotOpen, user, userPlanForChatbot, isPaused]);

  const currentMCQ = mcqs[currentQuestionIndex];
  const totalQuestions = mcqs.length;
  const progressPercentage = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

  const handleTimeUp = () => {
    if (!showExplanation) {
      handleSubmitAnswer(true);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    if (showExplanation) return;
    setSelectedAnswer(answer);
    setShowHelpToast(false);
    if (helpToastTimerRef.current) {
      clearTimeout(helpToastTimerRef.current);
    }
  };

  const handleSubmitAnswer = async (timeUp = false) => {
    if (!currentMCQ || !user) return;

    const answer = timeUp ? '' : selectedAnswer;
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    const isCorrect = answer === currentMCQ.correct_answer;

    if (isCorrect && !timeUp) {
      setScore(prev => prev + 1);
    }

    try {
      await supabase.from('user_answers').insert({
        user_id: user.id,
        mcq_id: currentMCQ.id,
        selected_answer: answer || 'No answer',
        is_correct: isCorrect,
        time_taken: timeTaken
      });
    } catch (error) {
      console.error('Error saving answer:', error);
    }

    setShowExplanation(true);
    setShowHelpToast(false);
    if (helpToastTimerRef.current) {
      clearTimeout(helpToastTimerRef.current);
    }
  };

  const clearLocalStorageProgress = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LAST_ATTEMPTED_MCQ_KEY);
      localStorage.removeItem(LAST_ATTEMPTED_SUBJECT_KEY);
      localStorage.removeItem(LAST_ATTEMPTED_CHAPTER_KEY);
      localStorage.removeItem(IS_PAUSED_KEY);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setTimeLeft(timePerQuestion);
      setStartTime(Date.now());
    } else {
      toast({
        title: "Quiz Completed!",
        description: `You scored ${score}/${totalQuestions} (${Math.round((score / totalQuestions) * 100)}%)`,
      });
      clearLocalStorageProgress();
      onBack();
    }
  };

  const handleHelpToastClick = () => {
    setShowHelpToast(false);
    setIsChatbotOpen(true);
  };

  const handleSaveMCQ = async () => {
    if (!user || !currentMCQ?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save MCQs.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isCurrentMCQSaved) {
        const { error } = await (supabase as any)
          .from('saved_mcqs')
          .delete()
          .eq('user_id', user.id)
          .eq('mcq_id', currentMCQ.id);

        if (error) throw error;
        setIsCurrentMCQSaved(false);
        toast({
          title: "MCQ Unsaved",
          description: (
            <div className="flex items-center">
              <Bookmark className="w-4 h-4 mr-2" />
              <span>This question has been removed from your saved list.</span>
            </div>
          ),
        });
      } else {
        const { error } = await supabase
          .from('saved_mcqs')
          .insert({
            user_id: user.id,
            mcq_id: currentMCQ.id,
          });

        if (error) throw error;
        setIsCurrentMCQSaved(true);
        toast({
          title: "MCQ Saved!",
          description: (
            <div className="flex items-center">
              <BookmarkCheck className="w-4 h-4 mr-2" />
              <span>This question has been added to your saved list.</span>
            </div>
          ),
        });
      }
      queryClient.invalidateQueries({ queryKey: ['savedMcqs', user?.id] });
    } catch (error: any) {
      console.error('Error saving/unsaving MCQ:', error);
      toast({
        title: "Error",
        description: `Failed to save/unsave MCQ: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  // --- New Menu Functions ---

  const handleStartOver = () => {
    if (currentQuestionIndex === 0 && !selectedAnswer) {
      toast({
        title: "Already at the start",
        description: "You are already at the beginning of the chapter.",
      });
      return;
    }
    if (confirm("Are you sure you want to start this chapter over? Your current progress will be lost.")) {
      clearLocalStorageProgress();
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setTimeLeft(timePerQuestion);
      setStartTime(Date.now());
      setScore(0);
      toast({
        title: "Chapter Restarted",
        description: "You've started this chapter from the beginning.",
      });
    }
  };

  const handlePauseTest = () => {
    setIsPaused(true);
  };

  const handleResumeTest = () => {
    setIsPaused(false);
    setStartTime(Date.now());
  };

  const handleLeaveTest = () => {
    if (confirm("Are you sure you want to leave the test? Your current progress for this chapter will be lost.")) {
      clearLocalStorageProgress();
      navigate('/dashboard');
    }
  };

  const handleReportQuestion = async () => {
    if (!currentMCQ?.id || !user?.id) {
      toast({
        title: "Error",
        description: "Cannot report question. Missing question ID or user ID.",
        variant: "destructive",
      });
      return;
    }

    const reportReason = prompt("Please provide a brief reason for reporting this question (e.g., incorrect answer, unclear wording, duplicate):");

    if (reportReason === null || reportReason.trim() === "") {
      toast({
        title: "Report Cancelled",
        description: "No reason provided, question not reported.",
      });
      return;
    }

    try {
      const { error } = await supabase.from('reported_questions').insert({
        mcq_id: currentMCQ.id,
        user_id: user.id,
        reason: reportReason.trim(),
        status: 'pending'
      });

      if (error) throw error;

      toast({
        title: "Question Reported",
        description: "Thank you for reporting. We will review this question shortly.",
      });
    } catch (error: any) {
      console.error('Error reporting question:', error);
      toast({
        title: "Report Failed",
        description: `Failed to report question: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm mx-2 sm:mx-0">
        <CardContent className="text-center py-6 sm:py-8 flex flex-col items-center justify-center h-full">
          {/* Replaced the loading circles with the image */}
          <img
            src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
            alt="Loading"
            className="w-24 h-24 object-contain animate-pulse" // Added animate-pulse for a subtle effect
          />
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-4">Loading questions...</p>
        </CardContent>
      </Card>
    );
  }

  if (!mcqs || mcqs.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm mx-2 sm:mx-0">
        <CardContent className="text-center py-6 sm:py-8">
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">No questions available for this chapter.</p>
          <Button onClick={onBack} className="mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-sm sm:text-base">
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
            Back to Chapters
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-0">
      <Button
        variant="outline"
        onClick={onBack}
        className="mb-4 sm:mb-6 flex items-center space-x-2 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-sm sm:text-base"
      >
        <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
        <span>Back to Chapters</span>
      </Button>

      {/* Progress Header */}
      <Card className="mb-4 sm:mb-6 bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm">
        <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
            <CardTitle className="text-base sm:text-lg text-gray-900 dark:text-white">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </CardTitle>
            <div className="flex items-center space-x-3 sm:space-x-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {timerEnabled && (
                <div className={`flex items-center space-x-1 ${timeLeft <= 10 ? 'text-red-500' : ''}`}>
                  <Timer className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{timeLeft}s</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Score: {score}/{currentQuestionIndex}</span>
              </div>
            </div>
          </div>
          <Progress value={progressPercentage} className="w-full" />
          {timerEnabled && (
            <Progress
              value={(timeLeft / timePerQuestion) * 100}
              className="w-full h-2 mt-2"
              style={{
                background: timeLeft <= 10 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(147, 51, 234, 0.2)'
              }}
            />
          )}
        </CardHeader>
      </Card>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm">
            <CardHeader className="px-4 sm:px-6 py-4 sm:py-6 flex flex-row justify-between items-start">
              <CardTitle className="text-base sm:text-lg leading-relaxed text-gray-900 dark:text-white flex-grow">
                {currentMCQ?.question}
              </CardTitle>
              <div className="flex items-center space-x-2">
                {user && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSaveMCQ}
                    className="text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
                    title={isCurrentMCQSaved ? "Unsave Question" : "Save Question"}
                  >
                    {isCurrentMCQSaved ? (
                      <BookmarkCheck className="w-5 h-5 fill-purple-600 text-purple-600 dark:fill-purple-400 dark:text-purple-400" />
                    ) : (
                      <Bookmark className="w-5 h-5" />
                    )}
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={handleStartOver}
                      disabled={currentQuestionIndex === 0 && !selectedAnswer}
                    >
                      Start over chapter
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handlePauseTest}>
                      Pause test
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleReportQuestion}>
                      Report question
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLeaveTest} className="text-red-600 focus:text-red-700">
                      Leave test
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="space-y-2 sm:space-y-3">
                {currentMCQ?.shuffledOptions.map((option, index) => {
                  const isSelected = selectedAnswer === option;
                  const isCorrect = option === currentMCQ.correct_answer;
                  const showResult = showExplanation;

                  let buttonClass = "w-full p-3 sm:p-4 text-left border-2 rounded-lg transition-all duration-200 text-sm sm:text-base ";

                  if (showResult) {
                    if (isCorrect) {
                      buttonClass += "bg-green-50 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-400";
                    } else if (isSelected && !isCorrect) {
                      buttonClass += "bg-red-50 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-400";
                    } else {
                      buttonClass += "bg-gray-50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400";
                    }
                  } else {
                    if (isSelected) {
                      buttonClass += "bg-purple-50 dark:bg-purple-900/50 border-purple-500 text-purple-700 dark:text-purple-300";
                    } else {
                      buttonClass += "bg-white dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30";
                    }
                  }

                  return (
                    <motion.button
                      key={index}
                      className={buttonClass}
                      onClick={() => handleAnswerSelect(option)}
                      disabled={showExplanation || isPaused}
                      whileHover={!showExplanation && !isPaused ? { scale: 1.01 } : {}}
                      whileTap={!showExplanation && !isPaused ? { scale: 0.99 } : {}}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-gray-900 dark:text-white flex-1">{String.fromCharCode(65 + index)}. {option}</span>
                        {showResult && isCorrect && <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 ml-2" />}
                        {showResult && isSelected && !isCorrect && <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 ml-2" />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Explanation */}
              {showExplanation && currentMCQ?.explanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-800 rounded-lg"
                >
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2 text-sm sm:text-base">Explanation:</h4>
                  <p className="text-blue-800 dark:text-blue-300 text-sm sm:text-base">{currentMCQ.explanation}</p>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 sm:space-x-3 mt-4 sm:mt-6">
                {!showExplanation && selectedAnswer && (
                  <Button
                    onClick={() => handleSubmitAnswer()}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-sm sm:text-base px-4 sm:px-6"
                    disabled={isPaused}
                  >
                    Submit Answer
                  </Button>
                )}

                {showExplanation && (
                  <Button
                    onClick={handleNextQuestion}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-sm sm:text-base px-4 sm:px-6"
                    disabled={isPaused}
                  >
                    {currentQuestionIndex < totalQuestions - 1 ? 'Next Question' : 'Finish Quiz'}
                  </Button>
                )}
              </div>

              {/* Best of luck message */}
              {user && (
                <div className="mt-6 text-center text-gray-700 dark:text-gray-300 text-base sm:text-lg">
                  Best of luck,{' '}
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text font-bold">
                    {username}
                  </span>
                  !
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Dr. Sultan's Help Toast */}
      <AnimatePresence>
        {showHelpToast && !isPaused && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-24 right-6 z-50 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-purple-200 dark:border-purple-700 flex items-center space-x-2 cursor-pointer max-w-[calc(100vw-48px)] sm:max-w-xs"
            onClick={handleHelpToastClick}
          >
            <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <span className="text-sm text-gray-800 dark:text-gray-200 flex-grow">{helpToastMessage}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); setShowHelpToast(false); }}
              className="w-6 h-6 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-3 h-3" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Chatbot */}
      <AIChatbot
        currentQuestion={currentMCQ?.question}
        userPlan={userPlanForChatbot}
        isOpen={isChatbotOpen}
        setIsOpen={setIsChatbotOpen}
      />

      {/* Pause Overlay Dialog */}
      <Dialog open={isPaused} onOpenChange={setIsPaused}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Test Paused</DialogTitle>
            <DialogDescription>
              Your current test progress is saved. You can resume or go to the dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-center text-lg font-semibold text-gray-800 dark:text-gray-200">
              Time Left: {timeLeft}s
            </p>
            <p className="text-center text-md text-gray-600 dark:text-gray-400">
              Current Question: {currentQuestionIndex + 1} / {totalQuestions}
            </p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row justify-between gap-3">
            <Button onClick={handleResumeTest} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              Resume Test
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsPaused(false);
                handleLeaveTest();
              }}
              className="w-full border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30"
            >
              Go to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};