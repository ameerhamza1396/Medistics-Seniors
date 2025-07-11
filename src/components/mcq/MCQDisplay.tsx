import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Clock, CheckCircle, XCircle, Timer, Bot, MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { fetchMCQsByChapter, MCQ } from '@/utils/mcqData';
import { supabase } from '@/integrations/supabase/client';
import { AIChatbot } from './AIChatbot';
import { useQuery } from '@tanstack/react-query';
import Script from 'next/script'; // Import Script for AdSense global script
import { AdSenseInfeedAd } from '@/components/AdSenseInfeedAd'; // Import the new Ad component

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

// Define constants for ad frequency
const ADS_INTERVAL = 8; // Show ad after every 8 questions
const ADS_SKIP_THRESHOLD = 2; // Allow skipping after 2 questions

export const MCQDisplay = ({ 
  subject, 
  chapter, 
  onBack, 
  timerEnabled = false, 
  timePerQuestion = 30 
}: MCQDisplayProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
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

  // Ad related states
  const [showAd, setShowAd] = useState(false);
  const [adDisplayCount, setAdDisplayCount] = useState(0); // Track how many times we've shown an ad
  const [questionsSinceLastAd, setQuestionsSinceLastAd] = useState(0);

  // --- AdSense Configuration ---
  // IMPORTANT: Replace with your actual AdSense Publisher ID (ca-pub-...)
  const GOOGLE_ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID || 'ca-pub-YOUR_ADSENSE_CLIENT_ID'; 
  // IMPORTANT: Replace with the actual data-ad-slot for your in-feed/display ad unit
  const GOOGLE_ADSENSE_AD_SLOT_ID = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_AD_SLOT_ID || 'YOUR_ADSENSE_AD_SLOT_ID';
  // --- End AdSense Configuration ---


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

  // Determine the user's plan for the chatbot (and now for ads)
  const userPlanForAdDisplay = profile?.plan?.toLowerCase() || 'free';
  const showAdsForFreeUser = userPlanForAdDisplay === 'free'; // Flag to simplify ad logic

  // Effect to load MCQs
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

  // Timer for Dr. Sultan's help toast (existing logic, with userPlanForAdDisplay update)
  useEffect(() => {
    if (helpToastTimerRef.current) {
      clearTimeout(helpToastTimerRef.current);
    }
    setShowHelpToast(false);

    // Only show help toast if user is premium and chatbot is not open and no answer selected
    if (user && userPlanForAdDisplay === 'premium' && !selectedAnswer && !isChatbotOpen) {
      helpToastTimerRef.current = setTimeout(() => {
        if (!selectedAnswer && !isChatbotOpen) {
          setHelpToastMessage(helpMessages[Math.floor(Math.random() * helpMessages.length)]);
          setShowHelpToast(true);
        }
      }, 10000); // 10 seconds
    }

    return () => {
      if (helpToastTimerRef.current) {
        clearTimeout(helpToastTimerRef.current);
      }
    };
  }, [currentQuestionIndex, selectedAnswer, isChatbotOpen, user, userPlanForAdDisplay]);

  // Timer for question time limit
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timerEnabled && !showExplanation && timeLeft > 0 && !showAd) { // Stop timer during ad
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerEnabled && !showExplanation) {
      handleTimeUp();
    }
    return () => clearInterval(timer);
  }, [timeLeft, timerEnabled, showExplanation, showAd]); // Add showAd to dependencies

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

    // Save answer to database
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

  const handleNextQuestion = () => {
    // Reset help toast timer when moving to next question
    if (helpToastTimerRef.current) {
      clearTimeout(helpToastTimerRef.current);
    }
    setShowHelpToast(false); // Hide toast for new question

    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setTimeLeft(timePerQuestion);
      setStartTime(Date.now()); // Reset start time for new question

      // Ad Logic: Check if it's time to show an ad for free users
      setQuestionsSinceLastAd(prev => prev + 1);
      if (showAdsForFreeUser && (questionsSinceLastAd + 1) % ADS_INTERVAL === 0) {
        setShowAd(true);
        setAdDisplayCount(0); // Reset ad display count for the new ad
      } else {
        setShowAd(false); // Ensure ad is hidden if not triggered
      }

    } else {
      // Quiz completed
      toast({
        title: "Quiz Completed!",
        description: `You scored ${score}/${totalQuestions} (${Math.round((score/totalQuestions)*100)}%)`,
      });
      onBack();
    }
  };

  // Function to handle clicking the help toast
  const handleHelpToastClick = () => {
    setShowHelpToast(false);
    setIsChatbotOpen(true);
  };

  // Function to handle skipping the ad
  const handleSkipAd = () => {
    if (adDisplayCount >= ADS_SKIP_THRESHOLD) {
      setShowAd(false);
      // Immediately move to the next question or ensure it progresses
      // No need to reset questionsSinceLastAd here, as it naturally increments
      // when handleNextQuestion is called after the ad is skipped/viewed.
    } else {
      toast({
        title: "Please wait!",
        description: `You can skip in ${ADS_SKIP_THRESHOLD - adDisplayCount} seconds.`,
        variant: "destructive",
      });
    }
  };

  // Effect for ad timer (if you want an ad to automatically skip/progress after a duration)
  useEffect(() => {
    let adTimer: NodeJS.Timeout | undefined;
    if (showAd) {
      setAdDisplayCount(0); // Reset counter when a new ad starts showing
      adTimer = setInterval(() => {
        setAdDisplayCount(prev => prev + 1);
      }, 1000); // Increment every second
    } else if (adTimer) {
      clearInterval(adTimer);
    }
    return () => {
      if (adTimer) clearInterval(adTimer);
    };
  }, [showAd]);


  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm mx-2 sm:mx-0">
        <style jsx>{`
          @keyframes wave-animation {
            0%, 100% {
              transform: scaleY(0.4);
              opacity: 0.5;
            }
            50% {
              transform: scaleY(1);
              opacity: 1;
            }
          }
          .wave-bar {
            animation: wave-animation 1.2s ease-in-out infinite;
            transform-origin: bottom;
          }
          .wave-bar:nth-child(1) { animation-delay: 0s; }
          .wave-bar:nth-child(2) { animation-delay: 0.1s; }
          .wave-bar:nth-child(3) { animation-delay: 0.2s; }
          .wave-bar:nth-child(4) { animation-delay: 0.3s; }
          .wave-bar:nth-child(5) { animation-delay: 0.4s; }
        `}</style>
        <CardContent className="text-center py-6 sm:py-8 flex flex-col items-center justify-center h-full">
          <div className="flex justify-center items-end h-24 space-x-2">
            <div className="w-3 h-12 bg-purple-600 dark:bg-purple-400 rounded-full wave-bar" style={{ animationDelay: '0s' }}></div>
            <div className="w-3 h-12 bg-purple-600 dark:bg-purple-400 rounded-full wave-bar" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-12 bg-purple-600 dark:bg-purple-400 rounded-full wave-bar" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-12 bg-purple-600 dark:bg-purple-400 rounded-full wave-bar" style={{ animationDelay: '0.3s' }}></div>
            <div className="w-3 h-12 bg-purple-600 dark:bg-purple-400 rounded-full wave-bar" style={{ animationDelay: '0.4s' }}></div>
          </div>
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
      {/* Google AdSense Global Script (only loaded once) */}
      {showAdsForFreeUser && (
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${GOOGLE_ADSENSE_CLIENT_ID}`}
          strategy="afterInteractive" // Load after page is interactive
          crossOrigin="anonymous"
          onError={(e) => console.error('Failed to load Google AdSense script:', e)}
        />
      )}

      <Button 
        variant="outline" 
        onClick={onBack}
        className="mb-4 sm:mb-6 flex items-center space-x-2 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-sm sm:text-base"
      >
        <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
        <span>Back to Chapters</span>
      </Button>

      {/* Conditional Ad Display */}
      <AnimatePresence mode="wait">
        {showAd && showAdsForFreeUser ? (
          <motion.div
            key="ad-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="mb-4 sm:mb-6"
          >
            <AdSenseInfeedAd 
              onSkip={handleSkipAd} 
              adSlotId={GOOGLE_ADSENSE_AD_SLOT_ID} 
              adClient={GOOGLE_ADSENSE_CLIENT_ID} 
            />
             {adDisplayCount < ADS_SKIP_THRESHOLD && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Ad will be skippable in {ADS_SKIP_THRESHOLD - adDisplayCount} seconds...
                </p>
              )}
          </motion.div>
        ) : (
          <motion.div
            key="mcq-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
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
                  <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                    <CardTitle className="text-base sm:text-lg leading-relaxed text-gray-900 dark:text-white">
                      {currentMCQ?.question}
                    </CardTitle>
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
                            disabled={showExplanation}
                            whileHover={!showExplanation ? { scale: 1.01 } : {}}
                            whileTap={!showExplanation ? { scale: 0.99 } : {}}
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
                        >
                          Submit Answer
                        </Button>
                      )}
                      
                      {showExplanation && (
                        <Button 
                          onClick={handleNextQuestion}
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-sm sm:text-base px-4 sm:px-6"
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dr. Sultan's Help Toast */}
      <AnimatePresence>
        {showHelpToast && (
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
        userPlan={userPlanForAdDisplay} // Pass the same plan variable
        isOpen={isChatbotOpen}
        setIsOpen={setIsChatbotOpen}
      />
    </div>
  );
};