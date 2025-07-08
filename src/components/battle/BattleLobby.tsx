import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Clock, Trophy, Swords, RefreshCw } from 'lucide-react';
import { BattleRoom, DatabaseBattleRoom } from '@/types/battle';
import { SubjectChapterSelector } from './SubjectChapterSelector';

interface BattleLobbyProps {
  onJoinBattle: (roomId: string) => void;
}

export const BattleLobby = ({ onJoinBattle }: BattleLobbyProps) => {
  const [rooms, setRooms] = useState<BattleRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [battleType, setBattleType] = useState<'1v1' | '2v2' | 'ffa'>('1v1');
  
  // New state for subject/chapter selection
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedSubjectName, setSelectedSubjectName] = useState<string | null>(null);
  const [selectedChapterName, setSelectedChapterName] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadRooms();
    
    // Set up real-time subscription for battle rooms
    const channel = supabase
      .channel('battle_rooms_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_rooms'
        },
        (payload) => {
          console.log('Real-time battle rooms change:', payload);
          loadRooms(); // Refresh the rooms list
        }
      )
      .subscribe();

    // Refresh every 10 seconds as backup
    const interval = setInterval(loadRooms, 10000);
    
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const loadRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('battle_rooms')
        .select(`
          *,
          battle_participants(id, username, user_id)
        `)
        .eq('status', 'waiting')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Convert database types to app types with proper type casting
      const typedRooms: BattleRoom[] = (data || []).map((room: any) => ({
        ...room,
        battle_type: room.battle_type as '1v1' | '2v2' | 'ffa',
        status: room.status as 'waiting' | 'in_progress' | 'completed',
        current_players: room.battle_participants?.length || 0,
        current_question: room.current_question || 0,
        time_per_question: room.time_per_question || 15,
        total_questions: room.total_questions || 10,
        questions: Array.isArray(room.questions) ? room.questions : null,
        subject: room.subject || 'Biology'
      }));
      
      setRooms(typedRooms);
    } catch (error: any) {
      console.error('Error loading rooms:', error);
      toast({
        title: "Error Loading Rooms",
        description: "Failed to load battle rooms. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createRoom = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create a battle room.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedSubjectId || !selectedChapterId) {
      toast({
        title: "Topic Required",
        description: "Please select a subject and chapter before creating a room.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreating(true);
      
      const maxPlayers = battleType === '1v1' ? 2 : battleType === '2v2' ? 4 : 4;
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data, error } = await supabase
        .from('battle_rooms')
        .insert([{
          room_code: roomCode,
          battle_type: battleType,
          max_players: maxPlayers,
          current_players: 0,
          status: 'waiting',
          host_id: user.id,
          time_per_question: 15,
          total_questions: 10,
          subject: selectedSubjectName,
          subject_id: selectedSubjectId,
          chapter_id: selectedChapterId
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Room Created!",
        description: `Room code: ${roomCode}. Topic: ${selectedSubjectName} - ${selectedChapterName}`,
      });

      onJoinBattle(data.id);
    } catch (error: any) {
      console.error('Error creating room:', error);
      toast({
        title: "Error",
        description: "Failed to create battle room. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const joinRoomByCode = async () => {
    if (!roomCode.trim()) {
      toast({
        title: "Invalid Code",
        description: "Please enter a room code.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('battle_rooms')
        .select(`
          *,
          battle_participants(id, user_id)
        `)
        .eq('room_code', roomCode.toUpperCase().trim())
        .eq('status', 'waiting')
        .single();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Room Not Found",
          description: "No active room found with this code.",
          variant: "destructive",
        });
        return;
      }

      if ((data.battle_participants?.length || 0) >= data.max_players) {
        toast({
          title: "Room Full",
          description: "This battle room is already full.",
          variant: "destructive",
        });
        return;
      }

      onJoinBattle(data.id);
      setRoomCode(''); // Clear the input
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: "Failed to join room. Please check the code and try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubjectChange = (subjectId: string, subjectName: string) => {
    setSelectedSubjectId(subjectId);
    setSelectedSubjectName(subjectName);
    setSelectedChapterId(null);
    setSelectedChapterName(null);
  };

  const handleChapterChange = (chapterId: string, chapterName: string) => {
    setSelectedChapterId(chapterId);
    setSelectedChapterName(chapterName);
  };

  const getBattleTypeColor = (type: string) => {
    switch (type) {
      case '1v1': return 'bg-blue-500 hover:bg-blue-600';
      case '2v2': return 'bg-green-500 hover:bg-green-600';
      case 'ffa': return 'bg-purple-500 hover:bg-purple-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getBattleTypeIcon = (type: string) => {
    switch (type) {
      case '1v1': return <Swords className="w-4 h-4" />;
      case '2v2': return <Users className="w-4 h-4" />;
      case 'ffa': return <Trophy className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getBattleTypeLabel = (type: string) => {
    switch (type) {
      case '1v1': return '1v1 Duel';
      case '2v2': return '2v2 Team';
      case 'ffa': return 'Free For All';
      default: return type.toUpperCase();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        <span className="ml-2 text-gray-700 dark:text-gray-300">Loading battle rooms...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subject/Chapter Selection */}
      <SubjectChapterSelector
        selectedSubjectId={selectedSubjectId}
        selectedChapterId={selectedChapterId}
        onSubjectChange={handleSubjectChange}
        onChapterChange={handleChapterChange}
      />

      {/* Create Room Section */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center">
            <Swords className="w-5 h-5 mr-2 text-red-600" />
            Create New Battle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="w-full sm:w-auto">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Battle Type
              </label>
              <Select value={battleType} onValueChange={(value: '1v1' | '2v2' | 'ffa') => setBattleType(value)}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1v1">1v1 Duel</SelectItem>
                  <SelectItem value="2v2">2v2 Team</SelectItem>
                  <SelectItem value="ffa">Free For All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-auto">
              <Button 
                onClick={createRoom} 
                disabled={isCreating || !selectedSubjectId || !selectedChapterId}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white mt-6"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4 mr-2" />
                    Create Battle Room
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Join by Code Section */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center">
            <Users className="w-5 h-5 mr-2 text-red-600" />
            Join by Room Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Input
              placeholder="Enter room code (e.g., ABC123)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="flex-1 uppercase"
              maxLength={6}
            />
            <Button 
              onClick={joinRoomByCode} 
              disabled={!roomCode.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Join Room
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Rooms */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-gray-900 dark:text-white flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-red-600" />
            Available Battle Rooms
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadRooms}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {rooms.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Swords className="w-16 h-16 mx-auto mb-4 opacity-30 text-red-300" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Active Battles</h3>
              <p className="text-gray-600 dark:text-gray-400">
                No battle rooms are currently available. Create one or check back later!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <Badge className={`${getBattleTypeColor(room.battle_type)} text-white border-0`}>
                      {getBattleTypeIcon(room.battle_type)}
                      <span className="ml-1">{getBattleTypeLabel(room.battle_type)}</span>
                    </Badge>
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        Room: <span className="font-mono text-red-600">{room.room_code}</span>
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {room.current_players}/{room.max_players} players
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {room.time_per_question}s per question
                        </span>
                        {room.subject && (
                          <span className="text-purple-600 dark:text-purple-400">
                            {room.subject}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => onJoinBattle(room.id)}
                    disabled={room.current_players >= room.max_players}
                    variant={room.current_players >= room.max_players ? "secondary" : "default"}
                    className={room.current_players >= room.max_players 
                      ? "cursor-not-allowed" 
                      : "bg-red-600 hover:bg-red-700 text-white"
                    }
                  >
                    {room.current_players >= room.max_players ? 'Full' : 'Join Battle'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
