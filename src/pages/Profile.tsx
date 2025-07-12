import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
    ArrowLeft,
    Moon,
    Sun,
    User,
    Mail,
    Phone,
    ImageIcon,
    Loader2,
    CheckCircle,
    XCircle,
    UploadCloud,
    Pencil, // Added Pencil icon
    Trash2 // Added Trash2 icon for delete
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'; // Added Dialog components

const Profile = () => {
    const queryClient = useQueryClient();
    const { user, isLoading: authLoading } = useAuth();
    const { theme, setTheme } = useTheme();

    // State for editable profile fields (full_name, username)
    const [editableProfile, setEditableProfile] = useState({
        full_name: '',
        username: ''
    });
    const [loadingUpdateProfile, setLoadingUpdateProfile] = useState(false);

    // State for profile picture upload/edit dialog
    const [profilePictureFile, setProfilePictureFile] = useState(null);
    const [profilePictureError, setProfilePictureError] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showAvatarEditDialog, setShowAvatarEditDialog] = useState(false); // New state for dialog visibility

    // Cloudinary credentials
    const CLOUDINARY_CLOUD_NAME = 'dabgjalqp';
    const CLOUDINARY_UPLOAD_PRESET = 'profiles_pictures';

    // Define plan color schemes (reused for consistency)
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
        'iconic': {
            light: 'bg-red-100 text-red-800 border-red-300',
            dark: 'dark:bg-red-900/30 dark:text-red-200 dark:border-red-700'
        },
        'default': {
            light: 'bg-gray-100 text-gray-800 border-gray-300',
            dark: 'dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
        }
    };

    // Fetch user profile data using React Query
    const { data: profileData, isLoading: profileLoading, isError: profileFetchError, error: profileFetchErrorMessage } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, username, email, avatar_url, plan, plan_expiry_date, role')
                .eq('id', user.id)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error);
                throw new Error(error.message || 'Failed to fetch profile data.');
            }
            return data;
        },
        enabled: !!user?.id && !authLoading,
        staleTime: 1000 * 60,
    });

    // Effect to populate editableProfile state when profileData changes
    useEffect(() => {
        if (profileData) {
            setEditableProfile({
                full_name: profileData.full_name || user?.user_metadata?.full_name || '',
                username: profileData.username || user?.user_metadata?.username || ''
            });
        } else if (!user) {
            setEditableProfile({
                full_name: '',
                username: ''
            });
        }
    }, [profileData, user]);


    // Derived values for display
    const displayName = editableProfile.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
    const userEmail = profileData?.email || user?.email || 'N/A';
    const userAvatarUrl = profileData?.avatar_url;
    const rawUserPlan = profileData?.plan?.toLowerCase() || 'free';
    const userPlanDisplayName = rawUserPlan.charAt(0).toUpperCase() + rawUserPlan.slice(1) + ' Plan';
    const currentPlanColorClasses = planColors[rawUserPlan] || planColors['default'];
    const planExpiryDate = profileData?.plan_expiry_date;


    // --- Profile Picture Upload Logic ---
    const handleFileChange = (e) => {
        setProfilePictureError('');
        setProfilePictureFile(null);

        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            const maxSizeMB = 2;
            const maxSizeBytes = maxSizeMB * 1024 * 1024;

            if (!allowedTypes.includes(file.type)) {
                setProfilePictureError(`Invalid file type. Please upload a JPEG, PNG, or WEBP image.`);
                e.target.value = '';
                return;
            }

            if (file.size > maxSizeBytes) {
                setProfilePictureError(`File size exceeds ${maxSizeMB}MB limit.`);
                e.target.value = '';
                return;
            }

            setProfilePictureFile(file);
        }
    };

    const uploadFileToCloudinary = async (file) => {
        if (!file) return null;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`, {
                method: 'POST',
                body: formData,
            });

            for (let i = 0; i <= 100; i += 10) {
                await new Promise(resolve => setTimeout(resolve, 50));
                setUploadProgress(i);
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Failed to upload image to Cloudinary.');
            }

            const data = await response.json();
            setIsUploading(false);
            setUploadProgress(100);
            toast.success('Profile picture uploaded successfully to Cloudinary!');
            return data.secure_url;
        } catch (uploadError) {
            console.error('Cloudinary Upload Error:', uploadError);
            setIsUploading(false);
            setUploadProgress(0);
            setProfilePictureError(`Upload failed: ${uploadError.message}`);
            toast.error(`Failed to upload profile picture: ${uploadError.message}`);
            return null;
        }
    };

    // Mutation to update avatar_url in Supabase
    const updateAvatarUrlMutation = useMutation({
        mutationFn: async (newAvatarUrl) => {
            if (!user?.id) throw new Error('User not authenticated.');

            const { data, error } = await supabase
                .from('profiles')
                .update({ avatar_url: newAvatarUrl })
                .eq('id', user.id);

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['profile', user.id]);
            toast.success('Profile picture updated successfully!');
            setProfilePictureFile(null);
            setProfilePictureError('');
            setShowAvatarEditDialog(false); // Close dialog on success
        },
        onError: (err) => {
            toast.error(`Failed to update profile: ${err.message}`);
        },
    });

    // Mutation to delete avatar_url in Supabase (set to null)
    const deleteAvatarMutation = useMutation({
        mutationFn: async () => {
            if (!user?.id) throw new Error('User not authenticated.');

            const { data, error } = await supabase
                .from('profiles')
                .update({ avatar_url: null }) // Set avatar_url to null to delete
                .eq('id', user.id);

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['profile', user.id]); // Invalidate to refetch updated profile data
            toast.success('Profile picture deleted successfully!');
            setShowAvatarEditDialog(false); // Close dialog on success
        },
        onError: (err) => {
            toast.error(`Failed to delete profile picture: ${err.message}`);
        },
    });


    const handleSubmitProfilePicture = async (e) => {
        e.preventDefault();
        if (!profilePictureFile) {
            setProfilePictureError('Please select an image to upload.');
            return;
        }
        if (profilePictureError) {
            toast.error('Please fix the file upload error before saving.');
            return;
        }

        const uploadedUrl = await uploadFileToCloudinary(profilePictureFile);
        if (uploadedUrl) {
            updateAvatarUrlMutation.mutate(uploadedUrl);
        }
    };

    const handleDeleteAvatar = () => {
        deleteAvatarMutation.mutate();
    };

    // --- Existing Profile Update Logic (Full Name, Username) ---
    const updateProfile = async (e) => {
        e.preventDefault();

        if (!editableProfile.full_name.trim() || !editableProfile.username.trim()) {
            toast.error("Please fill in all required fields.");
            return;
        }

        setLoadingUpdateProfile(true);

        try {
            const { data: existingProfile, error: checkError } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', editableProfile.username)
                .neq('id', user?.id)
                .maybeSingle();

            if (checkError && checkError.code !== 'PGRST116') {
                throw checkError;
            }

            if (existingProfile) {
                toast.error("This username is already in use. Please choose another.");
                setLoadingUpdateProfile(false);
                return;
            }

            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user?.id,
                    full_name: editableProfile.full_name.trim(),
                    username: editableProfile.username.trim(),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'id'
                });

            if (error) throw error;

            queryClient.invalidateQueries(['profile', user.id]);
            toast.success("Your profile has been updated successfully.");

        } catch (error) {
            console.error('Profile update error:', error);
            toast.error(error.message || "Failed to update profile. Please try again.");
        } finally {
            setLoadingUpdateProfile(false);
        }
    };


    // --- Loading and Error States for the entire page ---
    if (authLoading || profileLoading) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-gray-900">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                <p className="ml-3 text-lg text-gray-700 dark:text-gray-300">Loading profile...</p>
            </div>
        );
    }

    if (profileFetchError) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-gray-900 text-red-600 dark:text-red-400">
                <XCircle className="h-8 w-8 mr-2" />
                <p>{profileFetchErrorMessage?.message || 'Error loading profile data.'}</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400">
                <User className="h-8 w-8 mr-2" />
                <p>Please log in to view your profile.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-white dark:bg-gray-900">
            {/* Header - Consistent with other pages */}
            <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-blue-200 dark:border-blue-800 sticky top-0 z-50">
                <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
                    <Link to="/" className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>

                    <div className="flex items-center space-x-3">
                        <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        <span className="text-xl font-bold text-gray-900 dark:text-white">My Profile</span>
                    </div>

                    <div className="flex items-center space-x-3">
                        <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200">
                            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </Button>
                        <Badge
                            variant="secondary"
                            className={`text-xs px-2 py-1 ${currentPlanColorClasses.light} ${currentPlanColorClasses.dark}`}
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

            <div className="container mx-auto px-4 lg:px-8 py-8 max-w-3xl">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                    User Profile
                </h1>

                <Card className="mb-8 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 shadow-lg">
                    <CardHeader className="text-center">
                        <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-blue-400 dark:border-blue-600 shadow-md mb-4 group"> {/* Added 'group' class */}
                            {userAvatarUrl ? (
                                <img
                                    src={userAvatarUrl}
                                    alt="Profile Avatar"
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/128x128/cccccc/333333?text=${displayName.substring(0,1).toUpperCase()}`; }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white text-5xl font-bold">
                                    {displayName.substring(0, 1).toUpperCase()}
                                </div>
                            )}
                            {/* Pencil Icon Overlay */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute bottom-1 right-1 bg-white/80 dark:bg-gray-700/80 rounded-full p-2 shadow-md hover:bg-white dark:hover:bg-gray-600 transition-all duration-200 opacity-0 group-hover:opacity-100"
                                onClick={() => setShowAvatarEditDialog(true)}
                                aria-label="Edit profile picture"
                            >
                                <Pencil className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                            </Button>
                        </div>
                        <CardTitle className="text-gray-900 dark:text-white text-2xl mb-1">{displayName}</CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-400">
                            {userEmail}
                        </CardDescription>
                        <Badge
                            variant="secondary"
                            className={`mt-2 text-xs px-2 py-1 w-fit mx-auto ${currentPlanColorClasses.light} ${currentPlanColorClasses.dark}`} // Added w-fit and mx-auto
                        >
                            {userPlanDisplayName}
                        </Badge>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Existing Personal Information Form */}
                        <form onSubmit={updateProfile} className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center mb-2">
                                <User className="h-5 w-5 mr-2 text-blue-500" /> Personal Information
                            </h3>
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={userEmail}
                                    disabled
                                    className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                                />
                                <p className="text-sm text-gray-500 mt-1">Email cannot be changed here</p>
                            </div>

                            <div>
                                <Label htmlFor="full_name">Full Name *</Label>
                                <Input
                                    id="full_name"
                                    value={editableProfile.full_name}
                                    onChange={(e) => setEditableProfile({ ...editableProfile, full_name: e.target.value })}
                                    placeholder="Enter your full name"
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="username">Username *</Label>
                                <Input
                                    id="username"
                                    value={editableProfile.username}
                                    onChange={(e) => setEditableProfile({ ...editableProfile, username: e.target.value })}
                                    placeholder="Enter your username"
                                    required
                                />
                                <p className="text-sm text-gray-500 mt-1">This will be displayed on leaderboards</p>
                            </div>

                            <Button type="submit" disabled={loadingUpdateProfile} className="w-full">
                                {loadingUpdateProfile ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    'Update Profile'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Account Security</CardTitle>
                        <CardDescription>Manage your password and security settings</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link to="/profile/password">
                            <Button variant="outline" className="w-full">
                                Change Password
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Subscription</CardTitle>
                        <CardDescription>Manage your plan and billing</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Current Plan: {userPlanDisplayName}</p>
                                {planExpiryDate && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Plan expires on: {new Date(planExpiryDate).toLocaleDateString()}</p>
                                )}
                                {!planExpiryDate && rawUserPlan !== 'premium' && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">You are on free plan.</p>
                                )}
                                {!planExpiryDate && rawUserPlan === 'premium' && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">You are on premium plan.</p>
                                )}
                            </div>
                            <Link to="/pricing">
                                <Button disabled={rawUserPlan === 'premium'}>
                                    {rawUserPlan === 'premium' ? 'Current Plan' : 'Upgrade Plan'}
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Profile Picture Edit Dialog */}
            <Dialog open={showAvatarEditDialog} onOpenChange={setShowAvatarEditDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center">
                            <ImageIcon className="h-5 w-5 mr-2 text-blue-600" /> Edit Profile Picture
                        </DialogTitle>
                        <DialogDescription>
                            Upload a new profile picture or remove your current one.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center space-y-4 py-4">
                        <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-blue-300 dark:border-blue-700 shadow-sm">
                            {userAvatarUrl ? (
                                <img
                                    src={userAvatarUrl}
                                    alt="Current Avatar"
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/96x96/cccccc/333333?text=${displayName.substring(0,1).toUpperCase()}`; }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white text-3xl font-bold">
                                    {displayName.substring(0, 1).toUpperCase()}
                                </div>
                            )}
                        </div>
                        {userAvatarUrl && (
                            <Button
                                variant="destructive"
                                onClick={handleDeleteAvatar}
                                disabled={deleteAvatarMutation.isPending}
                                className="w-full max-w-xs"
                            >
                                {deleteAvatarMutation.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                Delete Current Picture
                            </Button>
                        )}
                        <div className="w-full max-w-xs border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                            <Label htmlFor="dialogProfilePictureUpload" className="mb-2 block">Upload New Image (JPEG, PNG, WEBP, max 2MB)</Label>
                            <Input
                                id="dialogProfilePictureUpload"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleFileChange}
                                className="bg-gray-50 dark:bg-gray-700 file:text-blue-600 dark:file:text-blue-400"
                            />
                            {profilePictureFile && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Selected: {profilePictureFile.name} ({(profilePictureFile.size / 1024 / 1024).toFixed(2)} MB)
                                </p>
                            )}
                            {profilePictureError && (
                                <p className="text-red-500 text-sm mt-1 flex items-center">
                                    <XCircle className="h-4 w-4 mr-1" /> {profilePictureError}
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                            type="submit"
                            onClick={handleSubmitProfilePicture}
                            disabled={isUploading || updateAvatarUrlMutation.isPending || !profilePictureFile || profilePictureError}
                        >
                            {isUploading || updateAvatarUrlMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <UploadCloud className="mr-2 h-4 w-4" />
                            )}
                            {isUploading ? `Uploading (${uploadProgress.toFixed(0)}%)` : 'Save New Picture'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Profile;
