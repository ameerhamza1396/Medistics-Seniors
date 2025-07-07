// BattleGame.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Using alias path
import { Button } from '@/components/ui/button'; // Using alias path
import { Progress } from '@/components/ui/progress'; // Using alias path
import { Badge } from '@/components/ui/badge'; // Using alias path
import { Clock, Trophy, Users, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client'; // Using alias path
import { useToast } from '@/hooks/use-toast'; // Using alias path

interface BattleGameProps {
  roomData: {
    id: string;
    room_code: string;
    battle_type: '1v1' | '2v2' | 'ffa';
    max_players: number;
    time_per_question: number;
    total_questions: number;
    subject: string;
    battle_participants: { 
      id: string; 
      user_id: string; 
      username: string; 
      score: number; 
      answers?: any[];
      is_finished?: boolean; // Added for client-side simulation
    }[];
  };
  userId: string;
  // onGameComplete now expects the full results object
  onGameComplete: (results: {
    finalScore: number;
    totalQuestions: number;
    correctAnswers: number;
    accuracy: number;
    rank: number;
    roomCode: string;
  }) => void; 
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
}

export const BattleGame = ({ roomData, userId, onGameComplete }: BattleGameProps) => {
  const { toast } = useToast();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(roomData.time_per_question);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [gameFinishedLocally, setGameFinishedLocally] = useState(false); // Local state for this player's game status
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sample questions for demo (in real implementation, fetch from database)
  const sampleQuestions: Question[] = [
    {
      id: '1',
      question: 'What is the powerhouse of the cell?',
      options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi apparatus'],
      correct_answer: 'Mitochondria',
      explanation: 'Mitochondria are known as the powerhouse of the cell because they produce ATP.'
    },
    {
      id: '2',
      question: 'Which organ system is responsible for transporting blood throughout the body?',
      options: ['Respiratory system', 'Digestive system', 'Circulatory system', 'Nervous system'],
      correct_answer: 'Circulatory system',
      explanation: 'The circulatory system, consisting of the heart and blood vessels, transports blood throughout the body.'
    },
    {
      id: '3',
      question: 'What is the basic unit of heredity?',
      options: ['Chromosome', 'Gene', 'DNA', 'Protein'],
      correct_answer: 'Gene',
      explanation: 'A gene is the basic unit of heredity that carries genetic information.'
    },
    {
      id: '4',
      question: 'Which part of the brain controls balance and coordination?',
      options: ['Cerebrum', 'Cerebellum', 'Brainstem', 'Hypothalamus'],
      correct_answer: 'Cerebellum',
      explanation: 'The cerebellum is responsible for balance, coordination, and fine motor control.'
    },
    {
      id: '5',
      question: 'What type of blood cell fights infections?',
      options: ['Red blood cells', 'White blood cells', 'Platelets', 'Plasma cells'],
      correct_answer: 'White blood cells',
      explanation: 'White blood cells are part of the immune system and help fight infections.'
    }
  ];

  useEffect(() => {
    // Initialize questions (in real implementation, fetch from Supabase based on roomData.subject)
    setQuestions(sampleQuestions.slice(0, roomData.total_questions));
    setIsLoading(false);
  }, [roomData.total_questions]);

  useEffect(() => {
    if (!isLoading && !gameFinishedLocally) {
      startTimer();
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentQuestionIndex, isLoading, gameFinishedLocally]);

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setTimeLeft(roomData.time_per_question);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeUp = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    // Auto-submit with no answer
    handleAnswerSubmit(null);
  };

  const handleAnswerSelect = (answer: string) => {
    if (selectedAnswer !== null) return; // Already answered
    setSelectedAnswer(answer);
    
    // Auto-submit after selection
    setTimeout(() => {
      handleAnswerSubmit(answer);
    }, 500);
  };

  const handleAnswerSubmit = async (answer: string | null) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = answer === currentQuestion.correct_answer;
    
    let questionScore = 0;
    if (isCorrect) {
      const timeBonus = Math.max(0, timeLeft);
      questionScore = 100 + timeBonus * 2;
      setScore(prev => prev + questionScore);
      
      toast({
        title: "Correct! 🎉",
        description: `+${questionScore} points (including time bonus)`,
      });
    } else {
      toast({
        title: "Incorrect ❌",
        description: `Correct answer: ${currentQuestion.correct_answer}`,
        variant: "destructive",
      });
    }

    // --- Client-side Supabase Update (for current player's score/answers) ---
    // This part remains to simulate saving the current player's progress.
    try {
      const { data: participantData, error: fetchError } = await supabase
        .from('battle_participants')
        .select('score, answers')
        .eq('battle_room_id', roomData.id)
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
        throw fetchError;
      }

      const existingAnswers = participantData?.answers || [];
      const updatedScore = (participantData?.score || 0) + questionScore;

      await supabase
        .from('battle_participants')
        .update({
          score: updatedScore,
          answers: [...existingAnswers, {
            questionId: currentQuestion.id,
            selectedAnswer: answer,
            isCorrect,
            timeLeft,
            points: questionScore
          }]
        })
        .eq('battle_room_id', roomData.id)
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error saving answer:', error);
      toast({
        title: "Error",
        description: "Failed to save answer to database",
        variant: "destructive"
      });
    }
    // ---------------------------------------------------------------------

    // Move to next question or finish game
    setTimeout(() => {
      if (currentQuestionIndex + 1 >= questions.length) {
        finishGame();
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
      }
    }, 2000);
  };

  const finishGame = async () => {
    setGameFinishedLocally(true); // Mark this player's game as finished locally
    
    try {
      // --- Client-side Supabase Update (for current player's final score and finished status) ---
      const { error: updateParticipantError } = await supabase
        .from('battle_participants')
        .update({ score: score, is_finished: true })
        .eq('battle_room_id', roomData.id)
        .eq('user_id', userId);

      if (updateParticipantError) throw updateParticipantError;
      // -----------------------------------------------------------------------------------------

      // --- CLIENT-SIDE RANK CALCULATION SIMULATION ---
      // This is the key change to make the rank dynamic without backend logic.
      // We'll gather all participant scores (including this player's and mock others)
      // and calculate the rank here.
      
      // Fetch all participants for the room to get their latest scores
      // In a real app, this would be a real-time stream or a final fetch from server.
      // For this client-side simulation, we'll use roomData.battle_participants
      // and assume they are up-to-date or we fetch them.
      const { data: allParticipants, error: fetchParticipantsError } = await supabase
        .from('battle_participants')
        .select('user_id, username, score')
        .eq('battle_room_id', roomData.id);

      if (fetchParticipantsError) {
        console.error('Error fetching all participants for ranking:', fetchParticipantsError);
        toast({
          title: "Error",
          description: "Failed to fetch participant data for ranking",
          variant: "destructive"
        });
        return; // Exit if we can't get participant data
      }

      // Ensure current player's score is updated in the list for accurate ranking
      const updatedParticipants = allParticipants.map(p => 
        p.user_id === userId ? { ...p, score: score } : p
      );

      // Sort participants by score to determine rank
      const sortedParticipants = [...updatedParticipants].sort((a, b) => b.score - a.score);

      // Find the current player's rank
      const playerRank = sortedParticipants.findIndex(p => p.user_id === userId) + 1;

      const totalCorrect = (score - (score % 100)) / 100; // Assuming 100 base points per correct answer
      const accuracyPercentage = (totalCorrect / questions.length) * 100;

      // --- Client-side Supabase Upsert for Battle Results (now with calculated rank) ---
      const { error: upsertResultError } = await supabase
        .from('battle_results')
        .upsert({
          battle_room_id: roomData.id,
          user_id: userId,
          final_score: score,
          rank: playerRank, // Set the calculated rank here!
          total_correct: totalCorrect,
          total_questions: questions.length,
          accuracy_percentage: accuracyPercentage,
          time_bonus: score - (totalCorrect * 100)
        }, { onConflict: ['battle_room_id', 'user_id'] }); // Use onConflict to update if exists

      if (upsertResultError) throw upsertResultError;
      // ----------------------------------------------------------------------------------

      console.log('Player score, finished status, and client-side rank updated.');

      // Prepare results object to pass to onGameComplete
      const results = {
        finalScore: score,
        totalQuestions: questions.length,
        correctAnswers: totalCorrect,
        accuracy: accuracyPercentage,
        rank: playerRank, // Pass the calculated rank
        roomCode: roomData.room_code
      };

      // Delay for a moment to show "Processing results..." then call onGameComplete
      setTimeout(() => {
        onGameComplete(results); // Pass the full results object to the parent
      }, 2000);

    } catch (error) {
      console.error('Error finishing game:', error);
      toast({
        title: "Error",
        description: "Failed to save game results or calculate rank",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <Card className="w-full max-w-md p-8 text-center">
          <CardTitle className="text-2xl mb-4">Loading Battle...</CardTitle>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        </Card>
      </div>
    );
  }

  if (gameFinishedLocally) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <Card className="w-full max-w-md p-8 text-center">
          <CardTitle className="text-2xl mb-4 flex items-center justify-center">
            <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
            Battle Complete!
          </CardTitle>
          <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">
            Final Score: {score}
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Calculating ranks...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mt-4"></div>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Users className="w-4 h-4 mr-2" />
            Room: {roomData.room_code}
          </Badge>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Trophy className="w-4 h-4 mr-2" />
            Score: {score}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-red-500" />
            <span className={`font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-700 dark:text-gray-300'}`}>
              {timeLeft}s
            </span>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-center">
            {currentQuestion.question}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentQuestion.options.map((option, index) => {
            const letters = ['A', 'B', 'C', 'D'];
            const isSelected = selectedAnswer === option;
            const isCorrect = selectedAnswer && option === currentQuestion.correct_answer;
            const isWrong = selectedAnswer && selectedAnswer !== currentQuestion.correct_answer && isSelected;
            
            return (
              <Button
                key={index}
                variant="outline"
                className={`w-full p-4 h-auto text-left justify-start text-wrap ${
                  isCorrect ? 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900/30 dark:border-green-400 dark:text-green-200' :
                  isWrong ? 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900/30 dark:border-red-400 dark:text-red-200' :
                  isSelected ? 'bg-blue-100 border-blue-500 dark:bg-blue-900/30 dark:border-blue-400' :
                  'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => handleAnswerSelect(option)}
                disabled={selectedAnswer !== null}
              >
                <div className="flex items-start space-x-3">
                  <Badge variant="secondary" className="mt-0.5 flex-shrink-0">
                    {letters[index]}
                  </Badge>
                  <span className="flex-1">{option}</span>
                  {isCorrect && <Zap className="w-4 h-4 text-green-600 flex-shrink-0" />}
                </div>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {/* Battle Type Info */}
      <div className="max-w-4xl mx-auto mt-6 text-center">
        <Badge variant="secondary" className="px-4 py-2">
          {roomData.battle_type.toUpperCase()} Battle • {roomData.subject}
        </Badge>
      </div>
    </div>
  );
};
