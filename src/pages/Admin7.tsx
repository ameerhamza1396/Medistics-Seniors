import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Moon, Sun, Loader2, ExternalLink, ShieldOff, CheckCircle, XCircle, BookOpen, UserCheck, Shield, ClipboardList } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const Admin7 = () => {
    const { theme, setTheme } = useTheme();
    const { user } = useAuth(); // Get authenticated user details

    // Get user profile data to determine role
    const { data: profile, isLoading: isProfileLoading, isError: isProfileError } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('role') // Only fetch the role
                .eq('id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching profile:', error);
                throw new Error('Failed to fetch user profile.');
            }
            return data;
        },
        enabled: !!user?.id, // Only run if user is logged in
    });

    const isAdmin = profile?.role === 'admin';

    // Fetch teaching ambassador applications
    const { data: applications, isLoading: isApplicationsLoading, isError: isApplicationsError, error: applicationsError } = useQuery({
        queryKey: ['teachingAmbassadorApplications'], // NEW query key
        queryFn: async () => {
            if (!isAdmin) {
                console.warn("Attempted to fetch applications without admin privileges.");
                throw new Error("Access Denied: You do not have administrative privileges.");
            }
            const { data, error } = await supabase
                .from('teaching_ambassador_applications') // NEW table name
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching teaching ambassador applications:', error);
                throw new Error('Failed to fetch applications: ' + error.message);
            }
            return data;
        },
        enabled: !isProfileLoading && isAdmin,
        retry: false,
    });


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

    const renderApplicationCard = (app) => (
        <Card key={app.id} className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Application from {app.name}</CardTitle>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                    ID: {app.id.substring(0, 8)}...
                </Badge>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <p><strong>Email:</strong> {app.email}</p>
                <p><strong>Contact:</strong> {app.contact_number}</p>
                <p><strong>Gender:</strong> {app.gender}</p>
                <p><strong>Teaching Exp.:</strong> {app.teaching_experience}</p>
                <p><strong>Why Join:</strong> {app.why_join_medistics}</p>
                <p><strong>Subjects:</strong> {app.subjects?.join(', ') || 'N/A'}</p> {/* Display subjects */}
                {app.user_id && <p><strong>Supabase User ID:</strong> {app.user_id}</p>}
                <p><strong>Submitted On:</strong> {new Date(app.created_at).toLocaleString()}</p>

                <div className="pt-3 border-t border-gray-200 dark:border-gray-700 mt-3 space-y-2">
                    <p className="font-medium text-gray-800 dark:text-gray-200">Uploaded Documents:</p>
                    <ul className="space-y-1">
                        <li>
                            <a href={app.profile_picture_url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 flex items-center">
                                Profile Picture <ExternalLink className="ml-1 h-3 w-3" />
                            </a>
                        </li>
                        <li>
                            <a href={app.cnic_url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 flex items-center">
                                CNIC Upload <ExternalLink className="ml-1 h-3 w-3" />
                            </a>
                        </li>
                    </ul>
                </div>
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
                        <span className="text-xl font-bold text-gray-900 dark:text-white">Teaching Ambassadors Admin Panel</span>
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
                        🧑‍🏫 Teaching Ambassador Applications
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Review and manage applications from aspiring teaching ambassadors.
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
                        ) : applications?.length === 0 ? (
                            <div className="text-center p-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg max-w-2xl mx-auto">
                                <CheckCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                                <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-2">No Applications Found</h2>
                                <p className="text-blue-600 dark:text-blue-300">There are currently no teaching ambassador applications to display.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {applications.map(renderApplicationCard)}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Admin7;
