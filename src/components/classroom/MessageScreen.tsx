import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ArrowLeft, MessageSquare, Users, Send, Loader2, Search, UserPlus, MoreVertical, LogOut, Crown, UserX, RotateCcw, Palette } from 'lucide-react'; // Added Palette icon
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card'; // Import Card and CardContent

// Helper function to generate a consistent color based on user ID
const getUserColor = (userId: string) => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
};

// Define Chat Themes
const chatThemes = [
  {
    id: 'default',
    name: 'Default',
    imageUrl: '', // No specific image, or a generic placeholder
    otherBubbleColor: 'bg-gray-200 dark:bg-gray-700',
    myBubbleColor: 'bg-purple-600',
    myBubbleTextColor: 'text-white',
    otherBubbleTextColor: 'text-gray-900 dark:text-gray-100',
    overlayColor: 'bg-transparent', // No overlay for default
  },
  {
    id: 'medical',
    name: 'Medical',
    imageUrl: 'https://res.cloudinary.com/dabgjalqp/image/upload/v1751981710/1_njsrwz.jpg',
    otherBubbleColor: 'bg-green-800 dark:bg-green-800',
    myBubbleColor: 'bg-gray-400 dark:bg-gray-600',
    myBubbleTextColor: 'text-white',
    otherBubbleTextColor: 'text-white',
    overlayColor: 'bg-black/60', // Blackish fade
  },
  {
    id: 'sunflowers',
    name: 'Sunflowers',
    imageUrl: 'https://res.cloudinary.com/dabgjalqp/image/upload/v1751981710/2_zyq71a.jpg',
    otherBubbleColor: 'bg-yellow-400 dark:bg-yellow-600',
    myBubbleColor: 'bg-green-300 dark:bg-green-500',
    myBubbleTextColor: 'text-gray-900',
    otherBubbleTextColor: 'text-gray-900',
    overlayColor: 'bg-black/40', // Blackish fade
  },
  {
    id: 'girlies',
    name: 'Girlies',
    imageUrl: 'https://res.cloudinary.com/dabgjalqp/image/upload/v1751981709/5_zav5ex.jpg',
    otherBubbleColor: 'bg-pink-700 dark:bg-pink-700',
    myBubbleColor: 'bg-white dark:bg-gray-100',
    myBubbleTextColor: 'text-black',
    otherBubbleTextColor: 'text-white',
    overlayColor: 'bg-black/50', // Blackish fade
  },
  {
    id: 'art_colors',
    name: 'Art Colors',
    imageUrl: 'https://res.cloudinary.com/dabgjalqp/image/upload/v1751981709/4_oltakt.jpg',
    otherBubbleColor: 'bg-purple-800 dark:bg-purple-800',
    myBubbleColor: 'bg-purple-600',
    myBubbleTextColor: 'text-white',
    otherBubbleTextColor: 'text-white',
    overlayColor: 'bg-black/60', // Blackish fade
  },
  {
    id: 'king',
    name: 'King',
    imageUrl: 'https://res.cloudinary.com/dabgjalqp/image/upload/v1751981709/4_oltakt.jpg', // Re-using image as per user's request
    otherBubbleColor: 'bg-yellow-700 dark:bg-yellow-700',
    myBubbleColor: 'bg-purple-600',
    myBubbleTextColor: 'text-white',
    otherBubbleTextColor: 'text-white',
    overlayColor: 'bg-black/60', // Blackish fade
  },
  {
    id: 'black',
    name: 'Black',
    imageUrl: 'https://res.cloudinary.com/dabgjalqp/image/upload/v1751982360/6_n80ruf.jpg',
    otherBubbleColor: 'bg-blue-800 dark:bg-blue-800',
    myBubbleColor: 'bg-purple-600',
    myBubbleTextColor: 'text-white',
    otherBubbleTextColor: 'text-white',
    overlayColor: 'bg-white/60', // Whitish fade for dark image
  },
  {
    id: 'cats',
    name: 'Cats',
    imageUrl: 'https://res.cloudinary.com/dabgjalqp/image/upload/v1751982360/7_u53i8q.jpg',
    otherBubbleColor: 'bg-yellow-700 dark:bg-yellow-700',
    myBubbleColor: 'bg-purple-600',
    myBubbleTextColor: 'text-white',
    otherBubbleTextColor: 'text-white',
    overlayColor: 'bg-black/50', // Blackish fade
  },
  {
    id: 'nature',
    name: 'Nature',
    imageUrl: 'https://res.cloudinary.com/dabgjalqp/image/upload/v1751982359/8_hlpokg.jpg',
    otherBubbleColor: 'bg-gradient-to-r from-blue-500 to-white dark:from-blue-700 dark:to-gray-200',
    myBubbleColor: 'bg-purple-600',
    myBubbleTextColor: 'text-white',
    otherBubbleTextColor: 'text-white',
    overlayColor: 'bg-black/40', // Blackish fade
  },
];

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
  avatar_url?: string | null; // Added avatar_url
}

interface ClassroomMessage {
  id: string;
  created_at: string;
  classroom_id: string;
  user_id: string;
  content: string;
  user_name?: string;
  avatar_url?: string | null; // Added avatar_url
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string | null; // Added avatar_url
}

type ClassroomView = 'list' | 'chat';

interface MessageScreenProps {
  selectedClassroom: Classroom;
  user: User | null;
  messages: ClassroomMessage[];
  members: ClassroomMember[];
  newMessageContent: string;
  setNewMessageContent: React.Dispatch<React.SetStateAction<string>>;
  handleSendMessage: (e: React.FormEvent) => Promise<void>;
  isSendingMessage: boolean;
  setCurrentView: React.Dispatch<React.SetStateAction<ClassroomView>>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  fetchMembers: (classroomId: string) => Promise<void>;
  fetchClassrooms: () => Promise<void>; // Added fetchClassrooms to refresh invite code
}

export const MessageScreen: React.FC<MessageScreenProps> = ({
  selectedClassroom,
  user,
  messages,
  members,
  newMessageContent,
  setNewMessageContent,
  handleSendMessage,
  isSendingMessage,
  setCurrentView,
  messagesEndRef,
  fetchMembers,
  fetchClassrooms,
}) => {
  const { toast } = useToast();
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [showMembersListModal, setShowMembersListModal] = useState(false);
  const [showChatThemeModal, setShowChatThemeModal] = useState(false); // Renamed from showChangeChatColorModal
  const [showManageInviteCodeModal, setShowManageInviteCodeModal] = useState(false);
  const [showManageRolesModal, setShowManageRolesModal] = useState(false);

  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [currentChatTheme, setCurrentChatTheme] = useState(chatThemes[0]); // Initialize with default theme

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messagesEndRef]);

  // Fetch current chat theme for the classroom
  useEffect(() => {
    const fetchChatTheme = async () => {
      if (!selectedClassroom) return;
      try {
        const { data, error } = await supabase
          .from('classroom_settings')
          .select('setting_value')
          .eq('classroom_id', selectedClassroom.id)
          .eq('setting_key', 'chat_theme_id') // Using 'chat_theme_id' as the key
          .maybeSingle();

        if (error) throw error;

        const themeId = data?.setting_value;
        const foundTheme = chatThemes.find(theme => theme.id === themeId);
        setCurrentChatTheme(foundTheme || chatThemes[0]); // Set found theme or default
      } catch (error: any) {
        console.error('Error fetching chat theme:', error.message);
        toast({
          title: "Error",
          description: `Failed to load chat theme: ${error.message}`,
          variant: "destructive",
        });
        setCurrentChatTheme(chatThemes[0]); // Fallback to default on error
      }
    };
    fetchChatTheme();
  }, [selectedClassroom]); // Re-fetch when classroom changes

  const isHost = user?.id === selectedClassroom.host_id;

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearchingUsers(true);
    try {
      // Search for users by full_name or email
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url') // Fetch avatar_url
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);

      if (error) throw error;

      // Filter out users who are already members of this classroom
      const currentMemberIds = new Set(members.map(m => m.user_id));
      const filteredResults = data.filter(profile => !currentMemberIds.has(profile.id));

      setSearchResults(filteredResults);
    } catch (error: any) {
      console.error('Error searching users:', error.message);
      toast({
        title: "Error",
        description: `Failed to search users: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleAddMember = async (userId: string, userName: string) => {
    setIsAddingUser(true);
    try {
      const { error } = await supabase
        .from('classroom_members')
        .insert({
          classroom_id: selectedClassroom.id,
          user_id: userId,
          role: 'member',
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: `${userName} added to the classroom.`,
      });
      setShowAddMemberModal(false);
      setSearchQuery('');
      setSearchResults([]);
      fetchMembers(selectedClassroom.id); // Refresh members list
    } catch (error: any) {
      console.error('Error adding member:', error.message);
      toast({
        title: "Error",
        description: `Failed to add member: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!user || !selectedClassroom) return;

    // Confirm with user
    // IMPORTANT: In a real application, replace window.confirm with a custom modal UI.
    if (!window.confirm("Are you sure you want to leave this classroom?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('classroom_members')
        .delete()
        .eq('classroom_id', selectedClassroom.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Left Classroom",
        description: `You have left "${selectedClassroom.name}".`,
      });
      setCurrentView('list'); // Go back to classroom list
    } catch (error: any) {
      console.error('Error leaving classroom:', error.message);
      toast({
        title: "Error",
        description: `Failed to leave classroom: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleKickMember = async (memberId: string, memberName: string) => {
    if (!user || !selectedClassroom || !isHost || memberId === user.id) return; // Host cannot kick self

    // IMPORTANT: In a real application, replace window.confirm with a custom modal UI.
    if (!window.confirm(`Are you sure you want to kick ${memberName} from this classroom?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('classroom_members')
        .delete()
        .eq('classroom_id', selectedClassroom.id)
        .eq('user_id', memberId);

      if (error) throw error;

      toast({
        title: "Member Kicked",
        description: `${memberName} has been removed from the classroom.`,
      });
      fetchMembers(selectedClassroom.id); // Refresh members list
    } catch (error: any) {
      console.error('Error kicking member:', error.message);
      toast({
        title: "Error",
        description: `Failed to kick member: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleMakeHost = async (memberId: string, memberName: string) => {
    if (!user || !selectedClassroom || !isHost || memberId === user.id) return; // Cannot make self host again

    // IMPORTANT: In a real application, replace window.confirm with a custom modal UI.
    if (!window.confirm(`Are you sure you want to make ${memberName} the new host of this classroom? You will become a regular member.`)) {
      return;
    }

    try {
      // 1. Update current host's role to 'member'
      const { error: currentHostError } = await supabase
        .from('classroom_members')
        .update({ role: 'member' })
        .eq('classroom_id', selectedClassroom.id)
        .eq('user_id', user.id);

      if (currentHostError) throw currentHostError;

      // 2. Update new host's role to 'host'
      const { error: newHostMemberError } = await supabase
        .from('classroom_members')
        .update({ role: 'host' })
        .eq('classroom_id', selectedClassroom.id)
        .eq('user_id', memberId);

      if (newHostMemberError) throw newHostMemberError;

      // 3. Update the classroom's host_id
      const { error: classroomUpdateError } = await supabase
        .from('classrooms')
        .update({ host_id: memberId })
        .eq('id', selectedClassroom.id);

      if (classroomUpdateError) throw classroomUpdateError;

      toast({
        title: "Host Changed",
        description: `${memberName} is now the host of "${selectedClassroom.name}".`,
      });
      // Re-fetch everything to update roles and classroom details
      fetchMembers(selectedClassroom.id);
      fetchClassrooms(); // This will update the selectedClassroom's host_id in parent state
    } catch (error: any) {
      console.error('Error changing host:', error.message);
      toast({
        title: "Error",
        description: `Failed to change host: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleGenerateRevokeInviteCode = async () => {
    if (!selectedClassroom || !isHost) return;

    try {
      let newInviteCode = null;
      let toastMessage = '';

      if (selectedClassroom.invite_code) {
        // Revoke existing code
        const { error } = await supabase
          .from('classrooms')
          .update({ invite_code: null })
          .eq('id', selectedClassroom.id);
        if (error) throw error;
        toastMessage = 'Invite code revoked successfully.';
      } else {
        // Generate new code
        newInviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const { error } = await supabase
          .from('classrooms')
          .update({ invite_code: newInviteCode })
          .eq('id', selectedClassroom.id);
        if (error) throw error;
        toastMessage = `New invite code generated: ${newInviteCode}.`;
      }

      toast({
        title: "Success",
        description: toastMessage,
      });
      fetchClassrooms(); // Refresh classrooms to update the invite code
      setShowManageInviteCodeModal(false);
    } catch (error: any) {
      console.error('Error managing invite code:', error.message);
      toast({
        title: "Error",
        description: `Failed to manage invite code: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleSetChatTheme = async () => {
    if (!selectedClassroom || !isHost || !selectedThemeId) {
      toast({
        title: "Permission Denied",
        description: "Only the host can change chat themes, and a theme must be selected.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Upsert the setting
      const { error } = await supabase
        .from('classroom_settings')
        .upsert(
          {
            classroom_id: selectedClassroom.id,
            setting_key: 'chat_theme_id', // Store the theme ID
            setting_value: selectedThemeId,
          },
          { onConflict: 'classroom_id, setting_key' }
        );

      if (error) throw error;

      const newTheme = chatThemes.find(theme => theme.id === selectedThemeId);
      if (newTheme) {
        setCurrentChatTheme(newTheme);
        toast({
          title: "Chat Theme Updated",
          description: `Chat theme set to "${newTheme.name}".`,
        });
      } else {
        toast({
          title: "Error",
          description: "Selected theme not found.",
          variant: "destructive",
        });
      }
      setShowChatThemeModal(false);
      setSelectedThemeId(null); // Reset selected theme after setting
    } catch (error: any) {
      console.error('Error changing chat theme:', error.message);
      toast({
        title: "Error",
        description: `Failed to change chat theme: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-160px)]"> {/* Adjust height to fit within viewport, considering header/footer */}
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-purple-200 dark:border-purple-800">
        <Button variant="outline" onClick={() => setCurrentView('list')} className="flex items-center space-x-2 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Classrooms</span>
        </Button>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedClassroom?.name}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center">
            <Users className="w-3 h-3 mr-1" /> {members.length} Members
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
            <DropdownMenuItem onClick={() => setShowMembersListModal(true)} className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
              <Users className="mr-2 h-4 w-4" /> View Members
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowChatThemeModal(true)} className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
              <Palette className="mr-2 h-4 w-4" /> Chat Theme
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLeaveGroup} className="cursor-pointer text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
              <LogOut className="mr-2 h-4 w-4" /> Leave Group
            </DropdownMenuItem>
            {isHost && (
              <>
                <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
                <DropdownMenuItem onClick={() => setShowManageRolesModal(true)} className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Crown className="mr-2 h-4 w-4" /> Manage Roles
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowManageInviteCodeModal(true)} className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                  <RotateCcw className="mr-2 h-4 w-4" /> Manage Invite Code
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ScrollArea
        className="flex-1 min-h-[90%] p-4 rounded-lg mb-4 relative overflow-hidden"
        style={{
          backgroundImage: currentChatTheme.imageUrl ? `url(${currentChatTheme.imageUrl})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {currentChatTheme.imageUrl && (
          <div className={`absolute inset-0 ${currentChatTheme.overlayColor}`}></div>
        )}
        <div className="space-y-4 relative z-10"> {/* Ensure content is above overlay */}
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No messages yet. Be the first to say something!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.user_id === user?.id ? 'justify-end' : 'justify-start'
                }`}
              >
                <div className="flex items-start gap-2">
                  {message.user_id !== user?.id && ( // Show avatar for others' messages
                    <div className="flex-shrink-0">
                      {message.avatar_url ? (
                        <img
                          src={message.avatar_url}
                          alt={message.user_name || 'User'}
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => { e.currentTarget.src = `https://placehold.co/32x32/${getUserColor(message.user_id).substring(1)}/ffffff?text=${message.user_name?.charAt(0).toUpperCase() || '?'}`; e.currentTarget.onerror = null; }}
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: getUserColor(message.user_id) }}
                        >
                          {message.user_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] p-3 rounded-lg ${
                      message.user_id === user?.id
                        ? `${currentChatTheme.myBubbleColor} ${currentChatTheme.myBubbleTextColor}`
                        : `${currentChatTheme.otherBubbleColor} ${currentChatTheme.otherBubbleTextColor}`
                    }`}
                  >
                    <p className="font-semibold text-xs mb-1">
                      {message.user_name || 'Unknown User'}
                    </p>
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.user_id === user?.id ? 'text-purple-100' : 'text-gray-500'
                    }`}>
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  {message.user_id === user?.id && ( // Show avatar for own messages on the right
                    <div className="flex-shrink-0">
                      {message.avatar_url ? (
                        <img
                          src={message.avatar_url}
                          alt={message.user_name || 'User'}
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => { e.currentTarget.src = `https://placehold.co/32x32/${getUserColor(message.user_id).substring(1)}/ffffff?text=${message.user_name?.charAt(0).toUpperCase() || '?'}`; e.currentTarget.onerror = null; }}
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: getUserColor(message.user_id) }}
                        >
                          {message.user_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSendMessage} className="flex space-x-2 p-4 border-t border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-900 rounded-lg absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[85%] z-[999]">
        <Input
          value={newMessageContent}
          onChange={(e) => setNewMessageContent(e.target.value)}
          placeholder="Type your message..."
          className="flex-1"
          disabled={isSendingMessage}
        />
        <Button type="submit" disabled={isSendingMessage || !newMessageContent.trim()} className="bg-purple-600 hover:bg-purple-700">
          {isSendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>

      {/* Add Member Modal (re-using existing logic) */}
      <Dialog open={showAddMemberModal} onOpenChange={setShowAddMemberModal}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900 border-purple-200 dark:border-purple-800">
          <DialogHeader>
            <DialogTitle>Add Member to {selectedClassroom?.name}</DialogTitle>
            <DialogDescription>
              Search for users by name or email and add them to this classroom.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                disabled={isSearchingUsers || isAddingUser}
              />
              <Button onClick={handleSearchUsers} disabled={isSearchingUsers || isAddingUser}>
                {isSearchingUsers ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            <ScrollArea className="h-48 border rounded-md p-2">
              {searchResults.length === 0 && searchQuery.length > 0 && !isSearchingUsers ? (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">No users found.</p>
              ) : (
                searchResults.map(profile => (
                  <div key={profile.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md">
                    <div className="flex items-center space-x-2">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.full_name || 'User'} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: getUserColor(profile.id) }}
                        >
                          {profile.full_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{profile.full_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{profile.email}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleAddMember(profile.id, profile.full_name)}
                      disabled={isAddingUser}
                    >
                      {isAddingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                    </Button>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMemberModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Members Modal */}
      <Dialog open={showMembersListModal} onOpenChange={setShowMembersListModal}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900 border-purple-200 dark:border-purple-800">
          <DialogHeader>
            <DialogTitle>Members of {selectedClassroom?.name}</DialogTitle>
            <DialogDescription>
              List of all members in this classroom.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-64 border rounded-md p-2">
            {members.length === 0 ? (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">No members yet.</p>
            ) : (
              members.map(member => (
                <div key={member.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.user_name || 'User'} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: getUserColor(member.user_id) }}
                    >
                      {member.user_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{member.user_name || 'Unknown User'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Role: {member.role}</p>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMembersListModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat Theme Modal */}
      <Dialog open={showChatThemeModal} onOpenChange={setShowChatThemeModal}>
        <DialogContent className="sm:max-w-[600px] bg-white dark:bg-gray-900 border-purple-200 dark:border-purple-800">
          <DialogHeader>
            <DialogTitle>Select Chat Theme</DialogTitle>
            <DialogDescription>
              (Host Only) Choose a background image and chat bubble colors for this classroom.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4 max-h-96 overflow-y-auto">
            {!isHost ? (
              <p className="col-span-full text-center text-red-500">Only the host can change chat themes.</p>
            ) : (
              chatThemes.map(theme => (
                <Card
                  key={theme.id}
                  className={`relative cursor-pointer overflow-hidden rounded-lg shadow-md transition-all duration-200
                    ${selectedThemeId === theme.id ? 'border-4 border-purple-500 dark:border-purple-400' : 'border border-gray-200 dark:border-gray-700'}
                    hover:shadow-lg`}
                  onClick={() => setSelectedThemeId(theme.id)}
                >
                  <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative">
                    {theme.imageUrl ? (
                      <img
                        src={theme.imageUrl}
                        alt={theme.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400 text-sm">No Image</div>
                    )}
                    {theme.imageUrl && <div className={`absolute inset-0 ${theme.overlayColor}`}></div>}
                  </div>
                  <CardContent className="p-2 text-center">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{theme.name}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChatThemeModal(false)}>Close</Button>
            <Button onClick={handleSetChatTheme} disabled={!selectedThemeId || !isHost}>
              Set Theme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Roles Modal (Host Only) */}
      <Dialog open={showManageRolesModal} onOpenChange={setShowManageRolesModal}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900 border-purple-200 dark:border-purple-800">
          <DialogHeader>
            <DialogTitle>Manage Member Roles</DialogTitle>
            <DialogDescription>
              (Host Only) Change roles or kick members.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-64 border rounded-md p-2">
            {members.length === 0 ? (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">No members to manage.</p>
            ) : (
              members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md">
                  <div className="flex items-center space-x-2">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.user_name || 'User'} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: getUserColor(member.user_id) }}
                      >
                        {member.user_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{member.user_name || 'Unknown User'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Role: {member.role}</p>
                    </div>
                  </div>
                  {member.user_id !== user?.id && ( // Cannot manage self
                    <div className="flex space-x-2">
                      {member.role !== 'host' && ( // Only show "Make Host" if not already host
                        <Button size="sm" variant="outline" onClick={() => handleMakeHost(member.user_id, member.user_name || 'this member')}>
                          <Crown className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => handleKickMember(member.user_id, member.user_name || 'this member')}>
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManageRolesModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Invite Code Modal (Host Only) */}
      <Dialog open={showManageInviteCodeModal} onOpenChange={setShowManageInviteCodeModal}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900 border-purple-200 dark:border-purple-800">
          <DialogHeader>
            <DialogTitle>Manage Invite Code</DialogTitle>
            <DialogDescription>
              (Host Only) Generate or revoke the invite code for this private classroom.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedClassroom?.is_public ? (
              <p className="text-center text-gray-600 dark:text-gray-400">Public classrooms do not use invite codes.</p>
            ) : (
              <>
                {selectedClassroom?.invite_code ? (
                  <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                    <span className="font-mono text-lg text-gray-900 dark:text-gray-100">{selectedClassroom.invite_code}</span>
                    <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(selectedClassroom.invite_code || '')}>
                      <Copy className="h-4 w-4 mr-2" /> Copy
                    </Button>
                  </div>
                ) : (
                  <p className="text-center text-gray-600 dark:text-gray-400">No invite code currently active.</p>
                )}
                <Button 
                  onClick={handleGenerateRevokeInviteCode} 
                  className={selectedClassroom?.invite_code ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
                >
                  {selectedClassroom?.invite_code ? 'Revoke Invite Code' : 'Generate New Invite Code'}
                </Button>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManageInviteCodeModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
