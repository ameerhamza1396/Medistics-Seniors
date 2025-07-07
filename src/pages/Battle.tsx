
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BattleLobby } from '@/components/battle/BattleLobby';
import { BattleRoom } from '@/components/battle/BattleRoom';
import { BattleGame } from '@/components/battle/BattleGame';
import { BattleResults } from '@/components/battle/BattleResults';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { useTheme } from 'next-themes';
import { Sun, Moon, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

type BattleState = 'lobby' | 'room' | 'game' | 'results';

interface RoomData {
  id: string;
  room_code: string;
  battle_type: '1v1' | '2v2' | 'ffa';
  max_players: number;
  status: 'waiting' | 'in_progress' | 'completed';
  time_per_question: number;
  total_questions: number;
  subject: string;
  host_id: string;
  questions: any[] | null;
  current_question: number;
  battle_participants: { id: string; user_id: string; username: string; score: number; }[];
}

const Battle: React.FC = () => {
  const { user, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [battleState, setBattleState] = useState<BattleState>('lobby');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [gameData, setGameData] = useState<RoomData | null>(null);
  const [battleResults, setBattleResults] = useState<any>(null);

  // Handle joining a battle room
  const handleJoinBattle = async (roomId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to join a battle room.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get user profile for username
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      const username = profile?.username || user.email?.split('@')[0] || 'Anonymous';

      // Check if room exists and has space
      const { data: roomData, error: roomError } = await supabase
        .from('battle_rooms')
        .select('*, battle_participants(*)')
        .eq('id', roomId)
        .single();

      if (roomError) {
        throw new Error('Room not found');
      }

      // Check if user is already in the room
      const existingParticipant = roomData.battle_participants?.find(
        (p: any) => p.user_id === user.id
      );

      if (!existingParticipant) {
        // Check room capacity
        if ((roomData.battle_participants?.length || 0) >= roomData.max_players) {
          toast({
            title: "Room Full",
            description: "This battle room is already full.",
            variant: "destructive",
          });
          return;
        }

        // Join the room
        const { error: joinError } = await supabase
          .from('battle_participants')
          .insert([{
            battle_room_id: roomId,
            user_id: user.id,
            username: username,
            score: 0,
            is_ready: false
          }]);

        if (joinError) {
          throw joinError;
        }

        // Update room participant count
        await supabase
          .from('battle_rooms')
          .update({ 
            current_players: (roomData.battle_participants?.length || 0) + 1,
            host_id: roomData.host_id || user.id // Set host if not set
          })
          .eq('id', roomId);
      }

      setCurrentRoomId(roomId);
      setBattleState('room');

      toast({
        title: "Joined Battle Room!",
        description: `You've joined room ${roomData.room_code}`,
      });
    } catch (error: any) {
      console.error('Error joining battle:', error);
      toast({
        title: "Failed to Join",
        description: error.message || "Could not join the battle room",
        variant: "destructive",
      });
    }
  };

  // Handle leaving battle room
  const handleLeaveBattle = () => {
    setCurrentRoomId(null);
    setGameData(null);
    setBattleResults(null);
    setBattleState('lobby');
  };

  // Handle battle start
  const handleBattleStart = (roomData: RoomData) => {
    console.log('Battle starting with data:', roomData);
    setGameData(roomData);
    setBattleState('game');
  };

  // Handle game completion
  const handleGameComplete = (results: any) => {
    setBattleResults(results);
    setBattleState('results');
  };

  // Handle viewing results and returning to lobby
  const handleReturnToLobby = () => {
    handleLeaveBattle();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-red-900/20 dark:via-orange-900/20 dark:to-yellow-900/20">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        <span className="ml-3 text-lg text-gray-700 dark:text-gray-300">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-red-900/20 dark:via-orange-900/20 dark:to-yellow-900/20 p-4">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Authentication Required</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please log in to access the Battle Arena and compete with other students.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login">
              <Button className="bg-red-600 hover:bg-red-700 text-white">
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-red-900/20 dark:via-orange-900/20 dark:to-yellow-900/20">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-red-200 dark:border-red-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              {battleState !== 'lobby' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLeaveBattle}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Lobby
                </Button>
              )}
              <Link to="/dashboard" className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Battle Arena
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <ProfileDropdown />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {battleState === 'lobby' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Welcome to the Battle Arena!
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Challenge other students in real-time MCQ battles. Test your knowledge and climb the leaderboard!
              </p>
            </div>
            <BattleLobby onJoinBattle={handleJoinBattle} />
          </div>
        )}

        {battleState === 'room' && currentRoomId && (
          <BattleRoom
            roomId={currentRoomId}
            userId={user.id}
            onLeave={handleLeaveBattle}
            onBattleStart={handleBattleStart}
          />
        )}

        {battleState === 'game' && gameData && (
          <BattleGame
            roomData={gameData}
            userId={user.id}
            onGameComplete={handleGameComplete}
          />
        )}

        {battleState === 'results' && battleResults && (
          <BattleResults
            results={battleResults}
            onReturnToLobby={handleReturnToLobby}
          />
        )}
      </main>
    </div>
  );
};

export default Battle;
