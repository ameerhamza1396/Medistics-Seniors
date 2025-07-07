import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, MessageSquare, Users, Copy, ClipboardCheck, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js'; // Import User type

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

type ClassroomView = 'list' | 'chat'; // Re-defined for clarity

interface GroupsDisplayProps {
  myClassrooms: Classroom[]; // Classrooms user is a member of
  discoverClassrooms: Classroom[]; // Public classrooms user is not a member of
  user: User | null;
  fetchClassrooms: () => Promise<void>;
  setSelectedClassroom: React.Dispatch<React.SetStateAction<Classroom | null>>;
  setCurrentView: React.Dispatch<React.SetStateAction<ClassroomView>>;
  
  // Modal states and handlers for creating/joining classrooms
  showCreateClassroomModal: boolean;
  setShowCreateClassroomModal: React.Dispatch<React.SetStateAction<boolean>>;
  showJoinClassroomModal: boolean;
  setShowJoinClassroomModal: React.Dispatch<React.SetStateAction<boolean>>;
  newClassroomName: string;
  setNewClassroomName: React.Dispatch<React.SetStateAction<string>>;
  newClassroomDescription: string;
  setNewClassroomDescription: React.Dispatch<React.SetStateAction<string>>;
  newClassroomIsPublic: boolean;
  setNewClassroomIsPublic: React.Dispatch<React.SetStateAction<boolean>>;
  joinInviteCode: string;
  setJoinInviteCode: React.Dispatch<React.SetStateAction<string>>;
  isCreatingClassroom: boolean;
  setIsCreatingClassroom: React.Dispatch<React.SetStateAction<boolean>>;
  isJoiningClassroom: boolean;
  setIsJoiningClassroom: React.Dispatch<React.SetStateAction<boolean>>;
  copiedInviteCode: string | null; // This is for the modal after creation
  setCopiedInviteCode: React.Dispatch<React.SetStateAction<string | null>>; // This is for the modal after creation
  handleCreateClassroom: () => Promise<void>;
  handleJoinClassroom: (classroomId?: string) => Promise<void>; // Modified to accept classroomId for public joins
  handleCopyInviteCode: (code: string) => void; // Modified to accept code
  toast: ReturnType<typeof useToast>['toast'];
}

export const GroupsDisplay: React.FC<GroupsDisplayProps> = ({
  myClassrooms,
  discoverClassrooms,
  user,
  fetchClassrooms,
  setSelectedClassroom,
  setCurrentView,
  showCreateClassroomModal,
  setShowCreateClassroomModal,
  showJoinClassroomModal,
  setShowJoinClassroomModal,
  newClassroomName,
  setNewClassroomName,
  newClassroomDescription,
  setNewClassroomDescription,
  newClassroomIsPublic,
  setNewClassroomIsPublic,
  joinInviteCode,
  setJoinInviteCode,
  isCreatingClassroom,
  setIsCreatingClassroom,
  isJoiningClassroom,
  setIsJoiningClassroom,
  copiedInviteCode,
  setCopiedInviteCode,
  handleCreateClassroom,
  handleJoinClassroom,
  handleCopyInviteCode,
  toast,
}) => {
  return (
    <div className="space-y-8"> {/* Increased space-y for separation */}
      {/* Your Classrooms Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Classrooms</h2>
          <div className="flex space-x-2">
            <Button onClick={() => setShowCreateClassroomModal(true)} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <Plus className="w-4 h-4 mr-2" /> Create
            </Button>
            <Button onClick={() => setShowJoinClassroomModal(true)} variant="outline" className="border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30">
              Join Private
            </Button>
          </div>
        </div>

        {myClassrooms.length === 0 ? (
          <Card className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm text-center py-8">
            <CardTitle className="text-xl text-gray-800 dark:text-gray-200 mb-2">No Classrooms Yet</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Create your first classroom or join an existing one!
            </CardDescription>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myClassrooms.map((classroom) => (
              <Card
                key={classroom.id}
                className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                onClick={() => {
                  setSelectedClassroom(classroom);
                  setCurrentView('chat');
                }}
              >
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center justify-between">
                    {classroom.name}
                    <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                    {classroom.description || 'No description provided.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-gray-500 dark:text-gray-400">
                  <p>Host: {classroom.host_name || 'Loading...'}</p>
                  <p>Type: {classroom.is_public ? 'Public' : 'Private'}</p>
                  {classroom.invite_code && (
                    <p className="flex items-center mt-1">
                      Invite Code: <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-gray-800 dark:text-gray-200 ml-1 text-xs">{classroom.invite_code}</span>
                      <Button variant="ghost" size="sm" className="ml-1 h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); handleCopyInviteCode(classroom.invite_code || ''); }}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Discover Public Classrooms Section */}
      <div className="space-y-4 pt-8 border-t border-purple-200 dark:border-purple-800">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Discover Public Classrooms</h2>
        {discoverClassrooms.length === 0 ? (
          <Card className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm text-center py-8">
            <CardTitle className="text-xl text-gray-800 dark:text-gray-200 mb-2">No Public Classrooms to Discover</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              All public classrooms are already in your list, or none exist.
            </CardDescription>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {discoverClassrooms.map((classroom) => (
              <Card
                key={classroom.id}
                className="bg-gradient-to-br from-blue-100/70 via-blue-50/50 to-indigo-50/30 dark:from-blue-900/30 dark:via-blue-800/20 dark:to-indigo-900/10 border-blue-200 dark:border-blue-800 backdrop-blur-sm hover:shadow-lg transition-shadow duration-200"
              >
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center justify-between">
                    {classroom.name}
                    <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                    {classroom.description || 'No description provided.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
                  <p>Host: {classroom.host_name || 'Loading...'}</p>
                  <Button 
                    size="sm" 
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1"
                    onClick={() => handleJoinClassroom(classroom.id)}
                    disabled={isJoiningClassroom}
                  >
                    {isJoiningClassroom ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                    Join
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>


      {/* Create Classroom Modal */}
      <Dialog open={showCreateClassroomModal} onOpenChange={setShowCreateClassroomModal}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900 border-purple-200 dark:border-purple-800">
          <DialogHeader>
            <DialogTitle>Create New Classroom</DialogTitle>
            <DialogDescription>
              Set up your new study group or discussion forum.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newClassroomName}
                onChange={(e) => setNewClassroomName(e.target.value)}
                className="col-span-3"
                disabled={isCreatingClassroom}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input
                id="description"
                value={newClassroomDescription}
                onChange={(e) => setNewClassroomDescription(e.target.value)}
                className="col-span-3"
                disabled={isCreatingClassroom}
              />
            </div>
            <div className="flex items-center space-x-2 col-span-4 justify-end">
              <Checkbox
                id="is_public"
                checked={newClassroomIsPublic}
                onCheckedChange={(checked) => setNewClassroomIsPublic(!!checked)}
                disabled={isCreatingClassroom}
              />
              <Label htmlFor="is_public">
                Public Classroom (Anyone can join without invite code)
              </Label>
            </div>
          </div>
          {copiedInviteCode && !newClassroomIsPublic && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 p-3 rounded-md text-sm text-green-700 dark:text-green-300 flex items-center justify-between mt-2">
              <span>Invite Code: <span className="font-bold">{copiedInviteCode}</span></span>
              <Button variant="ghost" size="sm" onClick={() => handleCopyInviteCode(copiedInviteCode)} className="ml-2 h-7 w-7 p-0">
                <ClipboardCheck className="h-4 w-4" />
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleCreateClassroom} disabled={isCreatingClassroom}>
              {isCreatingClassroom ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Classroom
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Classroom Modal (for private invite codes) */}
      <Dialog open={showJoinClassroomModal} onOpenChange={setShowJoinClassroomModal}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900 border-purple-200 dark:border-purple-800">
          <DialogHeader>
            <DialogTitle>Join Private Classroom</DialogTitle>
            <DialogDescription>
              Enter the invite code to join a private classroom.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="invite_code" className="text-right">
                Invite Code
              </Label>
              <Input
                id="invite_code"
                value={joinInviteCode}
                onChange={(e) => setJoinInviteCode(e.target.value)}
                className="col-span-3"
                disabled={isJoiningClassroom}
                placeholder="e.g., ABCDEF"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => handleJoinClassroom()} disabled={isJoiningClassroom}> {/* No classroomId for invite code join */}
              {isJoiningClassroom ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Join Classroom
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
