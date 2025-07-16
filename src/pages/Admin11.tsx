import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, MoreHorizontal, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface ReportedQuestion {
  id: string;
  mcq_id: string;
  reason: string;
  status: 'pending' | 'resolved' | 'rejected';
  created_at: string;
  mcqs: {
    question: string;
  };
  // Adjusted to directly reflect the join path for user/profile info
  users: { // This will correspond to auth.users table
    id: string;
    email: string;
    profiles: { // Nested join to profiles table from auth.users
      full_name: string;
      // email: string; // profiles.email might be redundant if auth.users.email is sufficient
    } | null; // Use null if a profile might not exist for a user
  };
}

const ITEMS_PER_PAGE = 10;

export default function Admin11({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState<'resolved' | 'rejected' | null>(null);

  // Fetch user profile to check admin status
  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isAdmin = userProfile?.is_admin || false;

  const {
    data: reportedQuestions,
    isLoading,
    isError,
    error,
  } = useQuery<ReportedQuestion[], Error>({
    queryKey: ['reportedQuestions', currentPage, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('reported_questions')
        // *** KEY CHANGE HERE: Chain the select through 'users' (auth.users)
        // and then to 'profiles' (public.profiles)
        .select('*, mcqs(question), users(id, email, profiles(full_name))')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query
        .range(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE - 1);

      if (error) throw error;
      return data as ReportedQuestion[];
    },
  });

  const { data: totalReportedQuestions } = useQuery<number, Error>({
    queryKey: ['totalReportedQuestions', filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('reported_questions')
        .select('count', { count: 'exact', head: true });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { count, error } = await query;

      if (error) throw error;
      return count ?? 0;
    },
  });

  const totalPages = Math.ceil((totalReportedQuestions || 0) / ITEMS_PER_PAGE);

  const updateStatusMutation = useMutation<any, Error, { id: string; status: 'resolved' | 'rejected' }>({
    mutationFn: async ({ id, status }) => {
      const { data, error } = await supabase
        .from('reported_questions')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportedQuestions'] });
      queryClient.invalidateQueries({ queryKey: ['totalReportedQuestions'] });
      toast({
        title: 'Status Updated',
        description: 'Reported question status has been updated successfully.',
      });
      setIsConfirmDialogOpen(false);
      setSelectedReportId(null);
      setSelectedNewStatus(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update status: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleStatusChangeClick = (id: string, newStatus: 'resolved' | 'rejected') => {
    setSelectedReportId(id);
    setSelectedNewStatus(newStatus);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmStatusUpdate = () => {
    if (selectedReportId && selectedNewStatus) {
      updateStatusMutation.mutate({ id: selectedReportId, status: selectedNewStatus });
    }
  };

  if (isLoading || isProfileLoading) {
    return (
      <Card className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm mx-2 sm:mx-0">
        <CardContent className="text-center py-6 sm:py-8 flex flex-col items-center justify-center h-full">
          <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-4">Loading reported questions...</p>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm mx-2 sm:mx-0">
        <CardContent className="text-center py-6 sm:py-8">
          <p className="text-sm sm:text-base text-red-500 dark:text-red-400">Error: {error?.message || 'Failed to load reported questions.'}</p>
          <Button onClick={onBack} className="mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-sm sm:text-base">
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
            Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-0">
      <Button
        variant="outline"
        onClick={onBack}
        className="mb-4 sm:mb-6 flex items-center space-x-2 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-sm sm:text-base"
      >
        <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
        <span>Back</span>
      </Button>

      <Card className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm">
        <CardHeader className="px-4 sm:px-6 py-4 sm:py-6 flex flex-row justify-between items-center">
          <CardTitle className="text-xl sm:text-2xl text-gray-900 dark:text-white">Reported Questions</CardTitle>
          <div className="flex items-center space-x-3">
            <Select value={filterStatus} onValueChange={(value) => { setFilterStatus(value); setCurrentPage(0); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-0 sm:px-6 pb-4 sm:pb-6">
          {reportedQuestions?.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400 py-8">No reported questions found for the selected filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-purple-50 dark:bg-purple-900/20">
                    <TableHead className="w-[100px] text-gray-700 dark:text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Question</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Reason</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Reported By</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Date</TableHead>
                    {isAdmin && <TableHead className="text-gray-700 dark:text-gray-300 text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportedQuestions?.map((report) => (
                    <TableRow key={report.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <TableCell>
                        <Badge
                          className={`
                            ${report.status === 'pending' && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300'}
                            ${report.status === 'resolved' && 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300'}
                            ${report.status === 'rejected' && 'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300'}
                            capitalize
                          `}
                        >
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-gray-800 dark:text-gray-200">
                        {report.mcqs?.question || 'N/A'}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">{report.reason}</TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {/* Accessing profile info through the 'users' object */}
                        {report.users?.profiles?.full_name || report.users?.email || 'N/A'}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {format(new Date(report.created_at), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleStatusChangeClick(report.id, 'resolved')}
                                disabled={report.status === 'resolved' || updateStatusMutation.isPending}
                              >
                                Mark as Resolved
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusChangeClick(report.id, 'rejected')}
                                disabled={report.status === 'rejected' || updateStatusMutation.isPending}
                              >
                                Mark as Rejected
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex justify-between items-center mt-4 px-4 sm:px-0">
            <Button
              onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
              disabled={currentPage === 0 || isLoading}
              variant="outline"
              className="border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30"
            >
              Previous
            </Button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage + 1} of {totalPages}
            </span>
            <Button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage >= totalPages - 1 || isLoading || totalPages === 0}
              variant="outline"
              className="border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30"
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Update</DialogTitle>
            <DialogDescription>
              Are you sure you want to change the status of this report to "{selectedNewStatus}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmStatusUpdate} disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}