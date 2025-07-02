// src/pages/AdminApplicationsPage.tsx

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Moon,
  Sun,
  MoreVertical, // For the three-dot menu icon
  Loader2, // For loading spinner
  ExternalLink, // For proof link icon
  ArrowLeft, // Added for the back button
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Shadcn UI components (ensure these are installed in your project)
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


// Define a type for your application data
interface Application {
  id: string;
  user_id: string;
  name: string;
  email: string;
  plan_name: string;
  price: number;
  duration: string;
  currency: string;
  cloudinary_proof_url: string;
  submission_timestamp: string; // ISO string
  status: 'pending' | 'approved' | 'declined' | 'followed_up' | 'under_consideration' | 'custom';
}

// Helper function to format timestamp
const formatTimestamp = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleString(); // e.g., "7/2/2025, 10:30:00 AM"
};

const getStatusColor = (status: Application['status']) => {
  switch (status) {
    case 'approved':
      return 'border-green-500 text-green-700 dark:border-green-400 dark:text-green-300 bg-green-50/50 dark:bg-green-900/20';
    case 'declined':
      return 'border-red-500 text-red-700 dark:border-red-400 dark:text-red-300 bg-red-50/50 dark:bg-red-900/20';
    case 'pending':
      return 'border-yellow-500 text-yellow-700 dark:border-yellow-400 dark:text-yellow-300 bg-yellow-50/50 dark:bg-yellow-900/20';
    case 'under_consideration':
      return 'border-blue-500 text-blue-700 dark:border-blue-400 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-900/20';
    case 'followed_up':
      return 'border-purple-500 text-purple-700 dark:border-purple-400 dark:text-purple-300 bg-purple-50/50 dark:bg-purple-900/20';
    case 'custom':
      return 'border-gray-500 text-gray-700 dark:border-gray-400 dark:text-gray-300 bg-gray-50/50 dark:bg-gray-900/20';
    default:
      return 'border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300';
  }
};

const Admin9: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  // State for custom tag dialog
  const [isCustomTagDialogOpen, setIsCustomTagDialogOpen] = useState(false);
  const [currentAppToTag, setCurrentAppToTag] = useState<Application | null>(null);
  const [customTagValue, setCustomTagValue] = useState('');

  // State for filtering
  const [filterStatus, setFilterStatus] = useState<string>('all'); // 'all', 'pending', 'approved', etc.

  // --- Admin Access Check ---
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error("Error checking admin status:", profileError);
          setError("Failed to verify user role. Please try again.");
          setIsAdmin(false);
        } else if (data && data.role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false); // Not logged in
      }
      setCheckingAdmin(false);
    };

    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading]);

  // --- Fetch Applications ---
  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('manual_payment_requests')
        .select('*')
        .order('submission_timestamp', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(fetchError.message || 'Failed to fetch applications.');
      }
      setApplications(data || []);
    } catch (err: any) {
      console.error('Error fetching applications:', err);
      setError(err.message || 'An error occurred while fetching applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!checkingAdmin && isAdmin) { // Only fetch if we've checked admin status and they ARE an admin
      fetchApplications();
    }
  }, [checkingAdmin, isAdmin, filterStatus]); // Refetch when filter changes

  // --- Handle Status Update ---
  const handleUpdateStatus = async (appId: string, newStatus: Application['status'], customTag?: string) => {
    setLoading(true); // Indicate loading for the update
    setError(null);

    let updateData: Partial<Application> = { status: newStatus };
    if (newStatus === 'custom' && customTag) {
        // For custom tags, we might store the custom value if the 'status' column design allows.
        // If your 'status' column only accepts predefined values, you might need a separate 'custom_tag_value' column.
        // For now, we are assuming 'custom' is a valid status value.
        // If you need to store the specific custom string, add a new column like 'custom_tag_text text'.
        // For simplicity, this example just marks it as 'custom' status.
    }


    try {
      const { error: updateError } = await supabase
        .from('manual_payment_requests')
        .update(updateData)
        .eq('id', appId);

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update application status.');
      }
      // Re-fetch applications to show the updated status
      await fetchApplications();
    } catch (err: any) {
      console.error('Error updating status:', err);
      setError(err.message || 'An error occurred while updating status.');
    } finally {
      setLoading(false);
      setIsCustomTagDialogOpen(false); // Close dialog
      setCustomTagValue(''); // Clear input
      setCurrentAppToTag(null); // Clear current app
    }
  };

  // --- Summary Counts ---
  const summaryCounts = useMemo(() => {
    const counts = {
      all: applications.length,
      pending: 0,
      approved: 0,
      declined: 0, // Maps to 'rejected'
      under_consideration: 0,
      followed_up: 0,
      custom: 0,
    };
    applications.forEach(app => {
      if (app.status in counts) {
        counts[app.status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [applications]);

  // --- Conditional Rendering for Admin Access ---
  if (authLoading || checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:text-white">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading admin page...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
        <h1 className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400 mb-4">Access Denied</h1>
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">You do not have administrative privileges to view this page.</p>
        <Link to="/">
          <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md">Go to Home</Button>
        </Link>
        <div className="text-center mt-12 mb-4 text-gray-500 dark:text-gray-400 text-sm">
          <p>A Project by Educational Spot.</p>
          <p>&copy; 2025 Medistics. All rights reserved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
      {/* Header - Consistent with Dashboard */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {/* Back Button Added */}
            <Link to="/admin" className="text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Go back to Admin Dashboard</span>
              </Button>
            </Link>
            <img
              src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
              alt="Medistics Logo"
              className="w-8 h-8 object-contain"
            />
            <span className="text-xl font-bold text-gray-900 dark:text-white">Admin Dashboard</span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
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
            {user ? (
              <ProfileDropdown />
            ) : (
              <Link to="/login">
                <Button>Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Admin Applications Section */}
      <section className="container mx-auto px-4 lg:px-8 py-12 lg:py-20 max-w-6xl">
        <div className="text-center mb-10 animate-fade-in">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Manage Plan Purchase Applications
          </h2>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Review and manage all incoming requests for plan purchases.
          </p>
        </div>

        {error && (
          <div className="text-center text-red-500 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 p-3 rounded-lg mb-6">
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Summary and Filter */}
        <div className="mb-8 p-6 bg-white/80 dark:bg-gray-800/80 rounded-xl shadow-lg border border-purple-200 dark:border-purple-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full md:w-auto">
            {Object.entries(summaryCounts).map(([statusKey, count]) => (
              <div key={statusKey} className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 capitalize">
                  {statusKey.replace(/_/g, ' ')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
              </div>
            ))}
          </div>
          <div className="w-full md:w-fit min-w-[200px]">
            <Label htmlFor="filter-status" className="sr-only">Filter by Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger id="filter-status" className="w-full">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Applications</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_consideration">Under Consideration</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="declined">Rejected</SelectItem>
                <SelectItem value="followed_up">Followed Up</SelectItem>
                <SelectItem value="custom">Custom Tagged</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Applications List */}
        {loading && (
          <div className="text-center text-gray-600 dark:text-gray-400 flex items-center justify-center mt-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading applications...
          </div>
        )}

        {!loading && applications.length === 0 && (
          <div className="text-center text-gray-600 dark:text-gray-400 mt-8 p-4 bg-white/80 dark:bg-gray-800/80 rounded-xl shadow-lg border border-purple-200 dark:border-purple-800">
            <p>No applications found matching the current filter.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {!loading && applications.map((app) => (
            <Card key={app.id} className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg p-5 rounded-xl transition-all duration-200 ${getStatusColor(app.status)}`}>
              <CardHeader className="flex flex-row items-start justify-between pb-4 space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                    {app.name || app.email}
                  </CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatTimestamp(app.submission_timestamp)}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleUpdateStatus(app.id, 'approved')}>
                      Mark as Approved
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateStatus(app.id, 'under_consideration')}>
                      Mark as Under Consideration
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateStatus(app.id, 'declined')}>
                      Mark as Rejected
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateStatus(app.id, 'followed_up')}>
                      Mark as Followed Up
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setCurrentAppToTag(app);
                        setIsCustomTagDialogOpen(true);
                      }}
                    >
                      Custom Tag...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="text-sm text-gray-700 dark:text-gray-300">
                <div className="mb-2">
                  <p><span className="font-semibold">Plan:</span> {app.plan_name}</p>
                  <p><span className="font-semibold">Duration:</span> {app.duration}</p>
                  <p><span className="font-semibold">Amount:</span> {app.currency === 'PKR' ? 'PKR ' : '$'}{app.price}</p>
                </div>
                <div className="mb-2 flex items-center justify-between">
                    <p><span className="font-semibold">Status:</span> <Badge className={`capitalize ${getStatusColor(app.status)}`}>{app.status.replace(/_/g, ' ')}</Badge></p>
                    <a
                      href={app.cloudinary_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200 transition-colors"
                    >
                      View Proof <ExternalLink className="ml-1 h-4 w-4" />
                    </a>
                </div>
                <p><span className="font-semibold">User Email:</span> {app.email}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Custom Tag Dialog */}
      <Dialog open={isCustomTagDialogOpen} onOpenChange={setIsCustomTagDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Apply Custom Tag</DialogTitle>
            <DialogDescription>
              Enter a custom tag for application ID: {currentAppToTag?.id.substring(0, 8)}...
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="custom-tag" className="text-right">
                Tag
              </Label>
              <Input
                id="custom-tag"
                value={customTagValue}
                onChange={(e) => setCustomTagValue(e.target.value)}
                className="col-span-3"
                placeholder="e.g., 'Requires follow-up call'"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomTagDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (currentAppToTag && customTagValue.trim()) {
                  handleUpdateStatus(currentAppToTag.id, 'custom', customTagValue.trim());
                } else {
                    setError("Custom tag cannot be empty."); // Simple client-side validation
                }
              }}
              disabled={!customTagValue.trim()}
            >
              Apply Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Footer Text - Consistent with Dashboard */}
      <div className="text-center mt-12 mb-4 text-gray-500 dark:text-gray-400 text-sm">
        <p>A Project by Educational Spot.</p>
        <p>&copy; 2025 Medistics. All rights reserved.</p>
      </div>
    </div>
  );
};

export default Admin9;