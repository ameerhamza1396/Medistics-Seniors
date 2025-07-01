import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Moon, Sun, Loader2, ExternalLink, ShieldOff, CheckCircle, XCircle, MoreVertical, BookOpen, UserCheck, Shield, ClipboardList, Eye } from 'lucide-react'; // Added Eye icon for clarity
import { useTheme } from 'next-themes';
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
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const Admin8 = () => {
    const { theme, setTheme } = useTheme();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [filterStatus, setFilterStatus] = useState('All');
    const [isCustomRemarkDialogOpen, setIsCustomRemarkDialogOpen] = useState(false);
    const [currentApplicationIdForRemark, setCurrentApplicationIdForRemark] = useState(null);
    const [customRemark, setCustomRemark] = useState('');

    const [selectedApplication, setSelectedApplication] = useState(null); // New state for detailed view

    // Get user profile data to determine role
    const { data: profile, isLoading: isProfileLoading, isError: isProfileError } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching profile:', error);
                throw new Error('Failed to fetch user profile.');
            }
            return data;
        },
        enabled: !!user?.id,
    });

    const isAdmin = profile?.role === 'admin';

    // Fetch internship applications
    const { data: applications, isLoading: isApplicationsLoading, isError: isApplicationsError, error: applicationsError } = useQuery({
        queryKey: ['internshipApplications'],
        queryFn: async () => {
            if (!isAdmin) {
                console.warn("Attempted to fetch applications without admin privileges.");
                throw new Error("Access Denied: You do not have administrative privileges.");
            }
            const { data, error } = await supabase
                .from('internship_applications')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching internship applications:', error);
                throw new Error('Failed to fetch applications: ' + error.message);
            }
            return data;
        },
        enabled: !isProfileLoading && isAdmin,
        retry: false,
    });

    // Mutation for updating application status
    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }) => {
            const { data, error } = await supabase
                .from('internship_applications')
                .update({ application_status: status })
                .eq('id', id);

            if (error) {
                throw error;
            }
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['internshipApplications']);
            setIsCustomRemarkDialogOpen(false); // Close custom remark dialog
            setCustomRemark(''); // Clear custom remark
        },
        onError: (error) => {
            console.error('Failed to update application status:', error);
            alert('Failed to update status: ' + error.message);
        },
    });

    const handleStatusUpdate = (id, status) => {
        if (status === 'Custom Remarks') {
            setCurrentApplicationIdForRemark(id);
            setIsCustomRemarkDialogOpen(true);
        } else {
            updateStatusMutation.mutate({ id, status });
        }
    };

    const handleCustomRemarkSubmit = () => {
        if (currentApplicationIdForRemark && customRemark.trim()) {
            updateStatusMutation.mutate({ id: currentApplicationIdForRemark, status: `Custom: ${customRemark.trim()}` });
        }
    };

    // Filter applications based on selected status
    const filteredApplications = useMemo(() => {
        if (!applications) return [];
        if (filterStatus === 'All') {
            return applications;
        }
        return applications.filter(app => app.application_status === filterStatus || (filterStatus === 'Custom Remarks' && app.application_status?.startsWith('Custom:')));
    }, [applications, filterStatus]);

    // Define plan color schemes (reused for header badge)
    const planColors = {
        'free': {
            light: 'bg-purple-100 text-purple-800 border-purple-300',
            dark: 'dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700'
        },
        'premium': {
            light: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            dark: 'dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700'
        },
        'pro': {
            light: 'bg-green-100 text-green-800 border-green-300',
            dark: 'dark:bg-green-900/30 dark:text-green-200 dark:border-green-700'
        },
        'default': {
            light: 'bg-gray-100 text-gray-800 border-gray-300',
            dark: 'dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
        }
    };

    const rawUserPlan = profile?.plan?.toLowerCase() || 'free';
    const userPlanDisplayName = rawUserPlan.charAt(0).toUpperCase() + rawUserPlan.slice(1) + ' Plan';
    const currentPlanColorClasses = planColors[rawUserPlan] || planColors['default'];

    const getStatusBadgeColors = (status) => {
        switch (status) {
            case 'Pending':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
            case 'Approved':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
            case 'Under Consideration':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
            case 'Declined':
            case 'Rejected':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
            default: // For 'Custom' or any other remarks
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        }
    };

    const renderApplicationCard = (app) => (
        <Card
            key={app.id}
            className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 shadow-md hover:shadow-lg transition-shadow duration-200 relative cursor-pointer"
            onClick={() => setSelectedApplication(app)} // Click to open detailed view
        >
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">{app.name}</CardTitle>
                <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className={getStatusBadgeColors(app.application_status)}>
                        {app.application_status || 'N/A'}
                    </Badge>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusUpdate(app.id, 'Pending'); }}>Pending</DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusUpdate(app.id, 'Approved'); }}>Approved</DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusUpdate(app.id, 'Under Consideration'); }}>Under Consideration</DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusUpdate(app.id, 'Declined'); }}>Declined</DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusUpdate(app.id, 'Rejected'); }}>Rejected</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusUpdate(app.id, 'Custom Remarks'); }}>Custom Remarks...</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <p><strong>Email:</strong> {app.email}</p>
                <p><strong>Skills:</strong> {app.skills_to_apply?.join(', ') || 'N/A'}</p>
                <p className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-2">
                    <Eye className="h-3 w-3 mr-1" /> Click for full details
                </p>
            </CardContent>
        </Card>
    );

    return (
        <div className="min-h-screen w-full bg-white dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-blue-200 dark:border-blue-800 sticky top-0 z-50">
                <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
                    <Link to="/dashboard" className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>

                    <div className="flex items-center space-x-3">
                        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medistics Logo" className="w-8 h-8 object-contain" />
                        <span className="text-xl font-bold text-gray-900 dark:text-white">Internship Applications Admin Panel</span>
                    </div>

                    <div className="flex items-center space-x-3">
                        <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200">
                            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </Button>
                        <Badge
                            variant="secondary"
                            className={`${currentPlanColorClasses.light} ${currentPlanColorClasses.dark}`}
                        >
                            {userPlanDisplayName}
                        </Badge>
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                                {user?.email?.substring(0, 2).toUpperCase() || 'U'}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 lg:px-8 py-8 max-w-7xl">
                <div className="text-center mb-8 animate-fade-in">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        💼 Internship Applications
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Review and manage applications for the Medistics Internship Program.
                    </p>
                </div>

                {isProfileLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                        <p className="ml-3 text-lg text-gray-600 dark:text-gray-300">Loading user profile...</p>
                    </div>
                ) : isProfileError || !user ? (
                    <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-lg max-w-2xl mx-auto">
                        <ShieldOff className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">Access Denied</h2>
                        <p className="text-red-600 dark:text-red-300">You must be logged in to view this page. Please log in to an admin account.</p>
                        {!user && (
                            <Link to="/login" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                                Login
                            </Link>
                        )}
                    </div>
                ) : !isAdmin ? (
                    <div className="text-center p-8 bg-orange-50 dark:bg-orange-900/20 rounded-lg max-w-2xl mx-auto">
                        <ShieldOff className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-orange-800 dark:text-orange-200 mb-2">Unauthorized Access</h2>
                        <p className="text-orange-600 dark:text-orange-300">Your account does not have administrator privileges to view this page.</p>
                    </div>
                ) : ( // User is an admin
                    <>
                        <div className="mb-6 flex justify-end">
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Applications</SelectItem>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Approved">Approved</SelectItem>
                                    <SelectItem value="Under Consideration">Under Consideration</SelectItem>
                                    <SelectItem value="Declined">Declined</SelectItem>
                                    <SelectItem value="Rejected">Rejected</SelectItem>
                                    <SelectItem value="Custom Remarks">Custom Remarks</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {isApplicationsLoading ? (
                            <div className="flex justify-center items-center h-48">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                <p className="ml-3 text-lg text-gray-600 dark:text-gray-300">Loading applications...</p>
                            </div>
                        ) : isApplicationsError ? (
                            <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-lg max-w-2xl mx-auto">
                                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                                <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Applications</h2>
                                <p className="text-red-600 dark:text-red-300">{applicationsError.message}</p>
                            </div>
                        ) : filteredApplications.length === 0 ? (
                            <div className="text-center p-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg max-w-2xl mx-auto">
                                <CheckCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                                <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-2">No Applications Found</h2>
                                <p className="text-blue-600 dark:text-blue-300">
                                    {filterStatus === 'All' ?
                                        "There are currently no internship applications to display." :
                                        `No applications found with status: "${filterStatus}".`
                                    }
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredApplications.map(renderApplicationCard)}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Custom Remark Alert Dialog */}
            <AlertDialog open={isCustomRemarkDialogOpen} onOpenChange={setIsCustomRemarkDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Add Custom Remark</AlertDialogTitle>
                        <AlertDialogDescription>
                            Enter a custom message or tag for this application.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="customRemark">Remark</Label>
                            <Input
                                id="customRemark"
                                value={customRemark}
                                onChange={(e) => setCustomRemark(e.target.value)}
                                placeholder="e.g., Follow up in 2 weeks, Interview scheduled"
                            />
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCustomRemarkSubmit} disabled={!customRemark.trim() || updateStatusMutation.isLoading}>
                            {updateStatusMutation.isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Remark'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Application Details Dialog */}
            <AlertDialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
                <AlertDialogContent className="max-w-xl md:max-w-2xl lg:max-w-3xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                            Application Details for {selectedApplication?.name}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
                            Comprehensive information about this internship application.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-200 overflow-y-auto max-h-[70vh] pr-2">
                        {selectedApplication && (
                            <>
                                <div>
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">Personal Information:</p>
                                    <p><strong>Name:</strong> {selectedApplication.name}</p>
                                    <p><strong>Email:</strong> {selectedApplication.email}</p>
                                    <p><strong>Contact:</strong> {selectedApplication.contact_number}</p>
                                    <p><strong>Gender:</strong> {selectedApplication.gender}</p>
                                    {selectedApplication.user_id && <p><strong>Supabase User ID:</strong> {selectedApplication.user_id}</p>}
                                    <p><strong>Submitted On:</strong> {new Date(selectedApplication.created_at).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">Application Details:</p>
                                    <p><strong>Status:</strong> <Badge className={getStatusBadgeColors(selectedApplication.application_status)}>{selectedApplication.application_status || 'N/A'}</Badge></p>
                                    <p><strong>Skill Exp.:</strong> {selectedApplication.skill_experience}</p>
                                    <p><strong>Skills to Apply:</strong> {selectedApplication.skills_to_apply?.join(', ') || 'N/A'}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">Why Join Medistics:</p>
                                    <p className="whitespace-pre-wrap">{selectedApplication.why_join_medistics}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">User Skills & Experience:</p>
                                    <p className="whitespace-pre-wrap">{selectedApplication.user_skills}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Uploaded Documents:</p>
                                    <ul className="space-y-1">
                                        <li>
                                            <a href={selectedApplication.profile_picture_url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 flex items-center">
                                                Profile Picture <ExternalLink className="ml-1 h-3 w-3" />
                                            </a>
                                        </li>
                                        <li>
                                            <a href={selectedApplication.cnic_student_card_url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 flex items-center">
                                                CNIC/Student Card <ExternalLink className="ml-1 h-3 w-3" />
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                            </>
                        )}
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setSelectedApplication(null)}>Close</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default Admin8;