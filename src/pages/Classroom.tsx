import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Import the new components
import { GroupsDisplay } from '@/components/classroom/GroupsDisplay';
import { MessageScreen } from '@/components/classroom/MessageScreen';

// Type definitions (re-defined here for component self-containment)
interface Classroom {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  is_public: boolean;
  host_id: string;
  invite_code: string | null;
  host_name?: string;
}

interface ClassroomMember {
  id: string;
  created_at: string;
  user_id: string;
  classroom_id: string;
  role: string;
  user_name?: string;
}

interface ClassroomMessage {
  id: string;
  created_at: string;
  classroom_id: string;
  user_id: string;
  content: string;
  user_name?: string;
}

type ClassroomView = 'list' | 'chat';

export const Classroom = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<ClassroomView>('list');
  const [myClassrooms, setMyClassrooms] = useState<Classroom[]>([]); // Classrooms user is a member of
  const [discoverClassrooms, setDiscoverClassrooms] = useState<Classroom[]>([]); // Public classrooms user is NOT a member of
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [messages, setMessages] = useState<ClassroomMessage[]>([]);
  const [members, setMembers] = useState<ClassroomMember[]>([]);
  const [newMessageContent, setNewMessageContent] = useState('');
  
  // States for modals and loading
  const [showCreateClassroomModal, setShowCreateClassroomModal] = useState(false);
  const [showJoinClassroomModal, setShowJoinClassroomModal] = useState(false);
  const [newClassroomName, setNewClassroomName] = useState('');
  const [newClassroomDescription, setNewClassroomDescription] = useState('');
  const [newClassroomIsPublic, setNewClassroomIsPublic] = useState(true);
  const [joinInviteCode, setJoinInviteCode] = useState('');
  const [isCreatingClassroom, setIsCreatingClassroom] = useState(false);
  const [isJoiningClassroom, setIsJoiningClassroom] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedInviteCode, setCopiedInviteCode] = useState<string | null>(null);


  // Fetch classrooms (public and user's private/member ones)
  const fetchClassrooms = async () => {
    if (!user) return;

    try {
      // 1. Fetch all public classrooms
      const { data: publicClassroomsRaw, error: publicError } = await supabase
        .from('classrooms')
        .select('*')
        .eq('is_public', true);

      if (publicError) throw publicError;

      // 2. Fetch all classroom memberships for the current user
      const { data: userMemberships, error: membershipsError } = await supabase
        .from('classroom_members')
        .select('classroom_id')
        .eq('user_id', user.id);

      if (membershipsError) throw membershipsError;

      const userMemberClassroomIds = new Set(userMemberships.map(m => m.classroom_id));

      // 3. Fetch all classrooms where the user is explicitly a member (including private ones)
      const { data: memberClassroomsData, error: memberClassroomsError } = await supabase
        .from('classroom_members')
        .select('classroom_id, classrooms(*)')
        .eq('user_id', user.id);

      if (memberClassroomsError) throw memberClassroomsError;

      const myClassroomsRaw = memberClassroomsData.map(m => m.classrooms).filter(Boolean) as Classroom[];

      // Collect all unique host_ids and user_ids from all relevant classrooms for profile fetching
      const allRelevantClassrooms = [...publicClassroomsRaw, ...myClassroomsRaw];
      const allUserIdsToFetchProfiles = new Set<string>();
      allRelevantClassrooms.forEach(c => allUserIdsToFetchProfiles.add(c.host_id));
      myClassroomsRaw.forEach(c => allUserIdsToFetchProfiles.add(c.host_id)); // Ensure host of my classrooms are included

      // 4. Fetch profiles for all collected user IDs
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', Array.from(allUserIdsToFetchProfiles));

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData.map(p => [p.id, p.full_name]));

      // 5. Populate myClassrooms with host names
      const myClassroomsWithHostNames = myClassroomsRaw.map(c => ({
        ...c,
        host_name: profilesMap.get(c.host_id) || 'Unknown Host'
      }));
      setMyClassrooms(myClassroomsWithHostNames);

      // 6. Populate discoverClassrooms (public classrooms user is not a member of)
      const discoverable = publicClassroomsRaw.filter(
        (classroom: Classroom) => !userMemberClassroomIds.has(classroom.id)
      ).map((classroom: Classroom) => ({
        ...classroom,
        host_name: profilesMap.get(classroom.host_id) || 'Unknown Host'
      }));
      setDiscoverClassrooms(discoverable);

    } catch (error: any) {
      console.error('Error fetching classrooms:', error.message);
      toast({
        title: "Error",
        description: `Failed to load classrooms: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Fetch messages for a specific classroom
  const fetchMessages = async (classroomId: string) => {
    try {
      const { data: messagesRaw, error } = await supabase
        .from('classroom_messages')
        .select('*') // Select all columns from messages
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Collect all unique user_ids from messages
      const userIds = Array.from(new Set(messagesRaw.map(msg => msg.user_id)));
      
      // Fetch profiles for all collected user_ids in a single query
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData.map(p => [p.id, p.full_name]));

      // Map user_names to messages
      setMessages(messagesRaw.map(msg => ({
        ...msg,
        user_name: profilesMap.get(msg.user_id) || 'Unknown User'
      })));
    } catch (error: any) {
      console.error('Error fetching messages:', error.message);
      toast({
        title: "Error",
        description: `Failed to load messages: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Fetch members for a specific classroom
  const fetchMembers = async (classroomId: string) => {
    try {
      const { data: membersRaw, error } = await supabase
        .from('classroom_members')
        .select('*') // Select all columns from members
        .eq('classroom_id', classroomId);

      if (error) throw error;

      // Collect all unique user_ids from members
      const userIds = Array.from(new Set(membersRaw.map(member => member.user_id)));
      
      // Fetch profiles for all collected user_ids in a single query
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData.map(p => [p.id, p.full_name]));

      // Map user_names to members
      setMembers(membersRaw.map(member => ({
        ...member,
        user_name: profilesMap.get(member.user_id) || 'Unknown User'
      })));
    } catch (error: any) {
      console.error('Error fetching members:', error.message);
      toast({
        title: "Error",
        description: `Failed to load members: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchClassrooms();
  }, [user]);

  useEffect(() => {
    if (selectedClassroom) {
      fetchMessages(selectedClassroom.id);
      fetchMembers(selectedClassroom.id);

      // Set up real-time listener for messages
      const messageChannel = supabase
        .channel(`classroom_messages:${selectedClassroom.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'classroom_messages', filter: `classroom_id=eq.${selectedClassroom.id}` },
          async (payload: any) => {
            if (payload.eventType === 'INSERT') {
              // Fetch the full profile for the new message sender
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', payload.new.user_id)
                .maybeSingle();

              if (profileError) {
                console.error('Error fetching profile for new message:', profileError.message);
              }

              setMessages(prev => [
                ...prev,
                {
                  ...payload.new,
                  user_name: profileData?.full_name || 'Unknown User'
                }
              ]);
            }
            // Add logic for UPDATE or DELETE if needed
          }
        )
        .subscribe();

      // Set up real-time listener for members (e.g., new members joining)
      const memberChannel = supabase
        .channel(`classroom_members:${selectedClassroom.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'classroom_members', filter: `classroom_id=eq.${selectedClassroom.id}` },
          async (payload: any) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
              fetchMembers(selectedClassroom.id); // Re-fetch members list on change
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messageChannel);
        supabase.removeChannel(memberChannel);
      };
    }
  }, [selectedClassroom]);

  const handleCreateClassroom = async () => {
    if (!user || !newClassroomName.trim()) {
      toast({
        title: "Validation Error",
        description: "Classroom name cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingClassroom(true);
    try {
      let inviteCode = null;
      if (!newClassroomIsPublic) {
        // Generate a simple invite code (e.g., 6 random alphanumeric characters)
        inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      }

      const { data: newClassroom, error: classroomError } = await supabase
        .from('classrooms')
        .insert({
          name: newClassroomName.trim(),
          description: newClassroomDescription.trim() || null,
          is_public: newClassroomIsPublic,
          host_id: user.id,
          invite_code: inviteCode,
        })
        .select()
        .single();

      if (classroomError) throw classroomError;

      // Add host as a member
      const { error: memberError } = await supabase
        .from('classroom_members')
        .insert({
          user_id: user.id,
          classroom_id: newClassroom.id,
          role: 'host',
        });

      if (memberError) throw memberError;

      toast({
        title: "Success!",
        description: `Classroom "${newClassroom.name}" created successfully.`,
      });

      if (!newClassroomIsPublic && newClassroom.invite_code) {
        setCopiedInviteCode(newClassroom.invite_code); // Show invite code for copying
      }
      
      setShowCreateClassroomModal(false);
      setNewClassroomName('');
      setNewClassroomDescription('');
      setNewClassroomIsPublic(true);
      fetchClassrooms(); // Refresh list
    } catch (error: any) {
      console.error('Error creating classroom:', error.message);
      toast({
        title: "Error",
        description: `Failed to create classroom: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsCreatingClassroom(false);
    }
  };

  const handleJoinClassroom = async (classroomId?: string) => {
    // If classroomId is provided, it's a public join from discover section
    // If not, it's a private join via invite code from the modal
    const targetClassroomId = classroomId || (joinInviteCode.trim() ? '' : null); // Placeholder, will fetch by invite code

    if (!user || (!targetClassroomId && !joinInviteCode.trim())) {
      toast({
        title: "Validation Error",
        description: "Classroom ID or Invite code cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    setIsJoiningClassroom(true);
    try {
      let classroomToJoin: Classroom | null = null;
      if (targetClassroomId) {
        // Joining a public classroom via its ID
        const { data, error } = await supabase
          .from('classrooms')
          .select('id, name, host_id, is_public')
          .eq('id', targetClassroomId)
          .maybeSingle();
        if (error) throw error;
        classroomToJoin = data;
      } else if (joinInviteCode.trim()) {
        // Joining a private classroom via invite code
        const { data, error } = await supabase
          .from('classrooms')
          .select('id, name, host_id, is_public')
          .eq('invite_code', joinInviteCode.trim())
          .maybeSingle();
        if (error) throw error;
        classroomToJoin = data;
      }

      if (!classroomToJoin) {
        toast({
          title: "Error",
          description: "Invalid invite code or classroom not found.",
          variant: "destructive",
        });
        return;
      }

      // Check if user is already a member
      const { data: existingMember, error: memberCheckError } = await supabase
        .from('classroom_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('classroom_id', classroomToJoin.id)
        .maybeSingle();

      if (memberCheckError) throw memberCheckError;

      if (existingMember) {
        toast({
          title: "Already a Member",
          description: `You are already a member of "${classroomToJoin.name}".`,
          variant: "default",
        });
        setShowJoinClassroomModal(false);
        setJoinInviteCode('');
        // Fetch host_name for the classroom just joined
        const { data: hostProfile, error: hostProfileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', classroomToJoin.host_id)
          .maybeSingle();

        if (hostProfileError) console.error('Error fetching host profile after join:', hostProfileError.message);

        setSelectedClassroom({ ...classroomToJoin, host_name: hostProfile?.full_name || 'Unknown' });
        setCurrentView('chat');
        return;
      }

      // Add user as a member
      const { error: joinError } = await supabase
        .from('classroom_members')
        .insert({
          user_id: user.id,
          classroom_id: classroomToJoin.id,
          role: 'member',
        });

      if (joinError) throw joinError;

      toast({
        title: "Success!",
        description: `Successfully joined "${classroomToJoin.name}".`,
      });
      setShowJoinClassroomModal(false);
      setJoinInviteCode('');
      fetchClassrooms(); // Refresh list to include the newly joined classroom
      
      // Fetch host_name for the classroom just joined
      const { data: hostProfile, error: hostProfileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', classroomToJoin.host_id)
        .maybeSingle();

      if (hostProfileError) console.error('Error fetching host profile after join:', hostProfileError.message);

      setSelectedClassroom({ ...classroomToJoin, host_name: hostProfile?.full_name || 'Unknown' });
      setCurrentView('chat');
    } catch (error: any) {
      console.error('Error joining classroom:', error.message);
      toast({
        title: "Error",
        description: `Failed to join classroom: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsJoiningClassroom(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedClassroom || !newMessageContent.trim()) return;

    setIsSendingMessage(true);
    try {
      const { error } = await supabase.from('classroom_messages').insert({
        classroom_id: selectedClassroom.id,
        user_id: user.id,
        content: newMessageContent.trim(),
      });

      if (error) throw error;

      setNewMessageContent('');
      // Messages will be updated via real-time listener
    } catch (error: any) {
      console.error('Error sending message:', error.message);
      toast({
        title: "Error",
        description: `Failed to send message: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleCopyInviteCode = (code: string) => {
    if (code) {
      navigator.clipboard.writeText(code)
        .then(() => {
          toast({
            title: "Copied!",
            description: "Invite code copied to clipboard.",
          });
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
          toast({
            title: "Error",
            description: "Failed to copy invite code.",
            variant: "destructive",
          });
        });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10 p-4 text-center">
        <Card className="w-full max-w-md bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-purple-200 dark:border-purple-800 shadow-lg p-6">
          <CardHeader className="mb-4">
            <Lock className="w-16 h-16 mx-auto text-purple-600 dark:text-purple-400 mb-4" />
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Please log in to access the Classrooms.
            </p>
            <Button asChild className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-[1.01]">
              <Link to="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
      {/* Header */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4 flex justify-between items-center max-w-full">
          <Link to="/dashboard" className="flex items-center space-x-1 sm:space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medistics Logo" className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
            <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white hidden sm:inline">Classrooms</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white sm:hidden">Classrooms</span>
          </div>

          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xs sm:text-sm">
              {user?.email?.substring(0, 2).toUpperCase() || 'U'}
            </span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 max-w-full">
        {currentView === 'list' ? (
          <GroupsDisplay
            myClassrooms={myClassrooms}
            discoverClassrooms={discoverClassrooms}
            user={user}
            fetchClassrooms={fetchClassrooms}
            setSelectedClassroom={setSelectedClassroom}
            setCurrentView={setCurrentView}
            showCreateClassroomModal={showCreateClassroomModal}
            setShowCreateClassroomModal={setShowCreateClassroomModal}
            showJoinClassroomModal={showJoinClassroomModal}
            setShowJoinClassroomModal={setShowJoinClassroomModal}
            newClassroomName={newClassroomName}
            setNewClassroomName={setNewClassroomName}
            newClassroomDescription={newClassroomDescription}
            setNewClassroomDescription={setNewClassroomDescription}
            newClassroomIsPublic={newClassroomIsPublic}
            setNewClassroomIsPublic={setNewClassroomIsPublic}
            joinInviteCode={joinInviteCode}
            setJoinInviteCode={setJoinInviteCode}
            isCreatingClassroom={isCreatingClassroom}
            setIsCreatingClassroom={setIsCreatingClassroom}
            isJoiningClassroom={isJoiningClassroom}
            setIsJoiningClassroom={setIsJoiningClassroom}
            copiedInviteCode={copiedInviteCode}
            setCopiedInviteCode={setCopiedInviteCode}
            handleCreateClassroom={handleCreateClassroom}
            handleJoinClassroom={handleJoinClassroom}
            handleCopyInviteCode={handleCopyInviteCode}
            toast={toast}
          />
        ) : (
          selectedClassroom && (
            <MessageScreen
              selectedClassroom={selectedClassroom}
              user={user}
              messages={messages}
              members={members}
              newMessageContent={newMessageContent}
              setNewMessageContent={setNewMessageContent}
              handleSendMessage={handleSendMessage}
              isSendingMessage={isSendingMessage}
              setCurrentView={setCurrentView}
              messagesEndRef={messagesEndRef}
              fetchMembers={fetchMembers} // Pass fetchMembers
            />
          )
        )}
      </div>
    </div>
  );
};

export default Classroom;
