import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, MoreVertical } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
    AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Import the new components for authentication and header
import AdminLockout from '@/components/admin/AdminLockout';
import AdminHeader from '@/components/admin/AdminHeader';


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
    const { user } = useAuth(); // Only 'user' is needed, loading and admin check handled by AdminLockout
    const queryClient = useQueryClient();

    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'approved', etc.
    const [isCustomTagDialogOpen, setIsCustomTagDialogOpen] = useState(false);
    const [currentAppToTag, setCurrentAppToTag] = useState<Application | null>(null);
    const [customTagValue, setCustomTagValue] = useState('');

    // Mutation for updating application status (Moved here for consistency)
    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: Application['status'] }) => {
            const { data, error } = await supabase
                .from('manual_payment_requests')
                .update({ application_status: status }) // Assuming 'application_status' is the column to update
                .eq('id', id);

            if (error) {
                throw error;
            }
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['manualPaymentApplications']);
            setIsCustomTagDialogOpen(false); // Close custom remark dialog
            setCustomTagValue(''); // Clear custom remark
        },
        onError: (error) => {
            console.error('Failed to update application status:', error);
            alert('Failed to update status: ' + error.message);
        },
    });


    // Fetch applications
    const { data: applications, isLoading: isApplicationsLoading, error: applicationsError } = useQuery<Application[], Error>({
        queryKey: ['manualPaymentApplications', filterStatus], // Include filterStatus in query key
        queryFn: async () => {
            let query = supabase
                .from('manual_payment_requests')
                .select('*')
                .order('submission_timestamp', { ascending: false });

            if (filterStatus !== 'all') {
                query = query.eq('status', filterStatus);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) {
                console.error('Error fetching applications:', fetchError);
                throw new Error(fetchError.message || 'Failed to fetch applications.');
            }
            return data || [];
        },
        enabled: true, // AdminLockout ensures admin access before this component renders
    });

    // Handle Status Update
    const handleUpdateStatus = async (appId: string, newStatus: Application['status'], customTag?: string) => {
        // Optimistic update
        queryClient.setQueryData(['manualPaymentApplications', filterStatus], (oldData: Application[] | undefined) => {
            if (!oldData) return [];
            return oldData.map(app =>
                app.id === appId ? { ...app, status: newStatus } : app
            );
        });

        try {
            const updateData: Partial<Application> = { status: newStatus };
            // If the status is 'custom', and you have a separate column for the custom tag text, update it here.
            // For now, as per your interface, 'status' itself holds 'custom'.
            // If you had `custom_remark_text: string;` in your table:
            // if (newStatus === 'custom' && customTag) {
            //   updateData.custom_remark_text = customTag;
            // }

            const { error: updateError } = await supabase
                .from('manual_payment_requests')
                .update(updateData)
                .eq('id', appId);

            if (updateError) {
                throw updateError;
            }
            // Invalidate and refetch after successful update to ensure fresh data
            await queryClient.invalidateQueries(['manualPaymentApplications']);
        } catch (err: any) {
            console.error('Error updating status:', err);
            alert('Failed to update status: ' + err.message);
            // Rollback optimistic update on error if needed
            queryClient.invalidateQueries(['manualPaymentApplications']); // Force refetch on error
        } finally {
            setIsCustomTagDialogOpen(false); // Close dialog
            setCustomTagValue(''); // Clear input
            setCurrentAppToTag(null); // Clear current app
        }
    };

    const handleCustomTagSubmit = () => {
        if (currentAppToTag && customTagValue.trim()) {
            handleUpdateStatus(currentAppToTag.id, 'custom', customTagValue.trim());
        } else {
            alert("Custom tag cannot be empty."); // Simple client-side validation, consider using toast
        }
    };

    // Summary Counts
    const summaryCounts = useMemo(() => {
        const counts = {
            all: applications?.length || 0,
            pending: 0,
            approved: 0,
            declined: 0,
            under_consideration: 0,
            followed_up: 0,
            custom: 0,
        };
        applications?.forEach(app => {
            if (app.status in counts) {
                counts[app.status as keyof typeof counts]++;
            }
        });
        return counts;
    }, [applications]);

    return (
        <AdminLockout>
            <div className="min-h-screen w-full bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
                {/* Use the shared AdminHeader component for consistency */}
                <AdminHeader userEmail={user?.email} />

                <div className="container mx-auto px-4 lg:px-8 py-8 max-w-6xl">
                    <div className="text-center mb-8 animate-fade-in">
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            💳 Manage Plan Purchase Applications
                        </h1>
                        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                            Review and manage all incoming requests for plan purchases.
                        </p>
                    </div>

                    {applicationsError && (
                        <div className="text-center text-red-500 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 p-3 rounded-lg mb-6">
                            <p className="font-medium">{applicationsError.message}</p>
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
                                <SelectTrigger id="filter-status" className="w-full dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                                    <SelectValue placeholder="Filter by Status" />
                                </SelectTrigger>
                                <SelectContent className="dark:bg-gray-800 dark:border-gray-700 dark:text-white">
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
                    {isApplicationsLoading ? (
                        <div className="text-center text-gray-600 dark:text-gray-400 flex items-center justify-center mt-8">
                            <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="ml-3 text-lg">Loading applications...</p>
                        </div>
                    ) : applications?.length === 0 ? (
                        <div className="text-center text-gray-600 dark:text-gray-400 mt-8 p-4 bg-white/80 dark:bg-gray-800/80 rounded-xl shadow-lg border border-purple-200 dark:border-purple-800">
                            <p>
                                {filterStatus === 'all' ?
                                    "No applications found." :
                                    `No applications found with status: "${filterStatus.replace(/_/g, ' ')}".`
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {applications.map((app) => (
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
                                            <DropdownMenuContent align="end" className="dark:bg-gray-700 dark:border-gray-600">
                                                <DropdownMenuLabel className="dark:text-white">Actions</DropdownMenuLabel>
                                                <DropdownMenuSeparator className="dark:bg-gray-600" />
                                                <DropdownMenuItem className="dark:text-white hover:dark:bg-gray-600" onClick={() => handleUpdateStatus(app.id, 'approved')}>
                                                    Mark as Approved
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="dark:text-white hover:dark:bg-gray-600" onClick={() => handleUpdateStatus(app.id, 'under_consideration')}>
                                                    Mark as Under Consideration
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="dark:text-white hover:dark:bg-gray-600" onClick={() => handleUpdateStatus(app.id, 'declined')}>
                                                    Mark as Rejected
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="dark:text-white hover:dark:bg-gray-600" onClick={() => handleUpdateStatus(app.id, 'followed_up')}>
                                                    Mark as Followed Up
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="dark:bg-gray-600" />
                                                <DropdownMenuItem
                                                    className="dark:text-white hover:dark:bg-gray-600"
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
                    )}
                </div>

                {/* Custom Tag Dialog */}
                <AlertDialog open={isCustomTagDialogOpen} onOpenChange={setIsCustomTagDialogOpen}>
                    <AlertDialogContent className="sm:max-w-[425px] dark:bg-gray-800 dark:border-gray-700">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-gray-900 dark:text-white">Apply Custom Tag</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
                                Enter a custom tag for application ID: {currentAppToTag?.id.substring(0, 8)}...
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="custom-tag" className="text-right text-gray-900 dark:text-white">
                                    Tag
                                </Label>
                                <Input
                                    id="custom-tag"
                                    value={customTagValue}
                                    onChange={(e) => setCustomTagValue(e.target.value)}
                                    className="col-span-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="e.g., 'Requires follow-up call'"
                                />
                            </div>
                        </div>
                        <AlertDialogFooter>
                            <Button variant="outline" onClick={() => setIsCustomTagDialogOpen(false)} className="dark:bg-gray-700 dark:text-white dark:border-gray-600 hover:dark:bg-gray-600">Cancel</Button>
                            <Button
                                onClick={handleCustomTagSubmit}
                                disabled={!customTagValue.trim() || updateStatusMutation.isPending}
                                className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 dark:bg-purple-700 dark:hover:bg-purple-600"
                            >
                                {updateStatusMutation.isPending ? (
                                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : 'Apply Tag'}
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AdminLockout>
    );
};

export default Admin9;
