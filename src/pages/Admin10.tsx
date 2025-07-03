import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
    ArrowLeft,
    PlusCircle,
    Edit,
    Trash2,
    UploadCloud,
    CheckCircle,
    XCircle,
    Loader2,
    BellRing,
    Moon,
    Sun,
    User,
    ClipboardList,
    Image as ImageIcon
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';

const Admin10 = () => {
    const queryClient = useQueryClient();
    const { theme, setTheme } = useTheme();
    const { user } = useAuth(); // Assuming useAuth provides user object

    const [formState, setFormState] = useState({
        id: null,
        title: '',
        content: '',
        media_url: '',
        is_published: false,
    });
    const [mediaFile, setMediaFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [announcementToDelete, setAnnouncementToDelete] = useState(null);

    // Cloudinary credentials (replace with your actual Cloudinary Cloud Name)
    // IMPORTANT: In a real application, you should handle Cloudinary uploads via a secure backend endpoint
    // to avoid exposing your API key and secret. This is simplified for a client-side example.
    const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dabgjalqp';
    const CLOUDINARY_UPLOAD_PRESET = 'announcements'; // Your specified preset

    // --- User Profile and Theme (reused from AnnouncementsPage for consistency) ---
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

    const { data: profile } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('role, plan, name')
                .eq('id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching profile:', error);
                return null;
            }
            return data;
        },
        enabled: !!user?.id
    });

    const rawUserPlan = profile?.plan?.toLowerCase() || 'default'; // Ensure 'default' if plan is null
    const userPlanDisplayName = rawUserPlan.charAt(0).toUpperCase() + rawUserPlan.slice(1) + ' Plan';
    const currentPlanColorClasses = planColors[rawUserPlan] || planColors['default'];

    // --- Data Fetching (Announcements) ---
    const { data: announcements, isLoading, isError, error } = useQuery({
        queryKey: ['adminAnnouncements'],
        queryFn: async () => {
            // Fetch all announcements, including unpublished, for admin view
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching announcements:', error);
                throw new Error('Failed to load announcements for admin.');
            }
            return data;
        },
        // Ensure this query is only enabled if the user is authenticated and has admin role
        // For simplicity, we'll enable if user exists, but real RLS on Supabase will control access.
        enabled: !!user?.id,
        staleTime: 1000 * 60, // 1 minute
    });

    // --- Mutations (Create, Update, Delete) ---

    // Upload media to Cloudinary
    const uploadMedia = async (file) => {
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

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Failed to upload media to Cloudinary.');
            }

            const data = await response.json();
            setIsUploading(false);
            setUploadProgress(100);
            toast.success('Media uploaded successfully!');
            return data.secure_url;
        } catch (uploadError) {
            console.error('Cloudinary Upload Error:', uploadError);
            setIsUploading(false);
            setUploadProgress(0);
            toast.error(`Media upload failed: ${uploadError.message}`);
            return null;
        }
    };

    // Create/Update announcement mutation
    const saveAnnouncementMutation = useMutation({
        mutationFn: async (announcementData) => {
            let mediaUrlToSave = announcementData.media_url;

            if (mediaFile) {
                // Only upload if a new file is selected
                const uploadedUrl = await uploadMedia(mediaFile);
                if (!uploadedUrl) {
                    throw new Error('Media upload failed, cannot save announcement.');
                }
                mediaUrlToSave = uploadedUrl;
            }

            if (announcementData.id) {
                // Update existing
                const { data, error } = await supabase
                    .from('announcements')
                    .update({
                        title: announcementData.title,
                        content: announcementData.content,
                        media_url: mediaUrlToSave,
                        is_published: announcementData.is_published,
                        published_at: announcementData.is_published && !announcementData.published_at ? new Date().toISOString() : announcementData.published_at,
                    })
                    .eq('id', announcementData.id);
                if (error) throw error;
                return data;
            } else {
                // Insert new
                const { data, error } = await supabase
                    .from('announcements')
                    .insert({
                        title: announcementData.title,
                        content: announcementData.content,
                        media_url: mediaUrlToSave,
                        is_published: announcementData.is_published,
                        published_at: announcementData.is_published ? new Date().toISOString() : null,
                        created_by: user?.id, // Link to the current admin user
                    });
                if (error) throw error;
                return data;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['adminAnnouncements']);
            toast.success('Announcement saved successfully!');
            resetForm();
        },
        onError: (err) => {
            toast.error(`Error saving announcement: ${err.message}`);
        },
    });

    // Delete announcement mutation
    const deleteAnnouncementMutation = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase
                .from('announcements')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['adminAnnouncements']);
            toast.success('Announcement deleted successfully!');
            setDialogOpen(false); // Close the dialog after successful deletion
            setAnnouncementToDelete(null);
        },
        onError: (err) => {
            toast.error(`Error deleting announcement: ${err.message}`);
        },
    });

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormState(prevState => ({
            ...prevState,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setMediaFile(file);
            // Optionally, preview the image/video here
            setFormState(prevState => ({ ...prevState, media_url: URL.createObjectURL(file) })); // For client-side preview
        } else {
            setMediaFile(null);
            if (formState.id) { // If editing, revert to original media_url if no new file is selected
                 const currentAnnouncement = announcements.find(a => a.id === formState.id);
                 setFormState(prevState => ({ ...prevState, media_url: currentAnnouncement?.media_url || '' }));
            } else { // If creating, clear media_url
                setFormState(prevState => ({ ...prevState, media_url: '' }));
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        saveAnnouncementMutation.mutate(formState);
    };

    const handleEdit = (announcement) => {
        setFormState({
            id: announcement.id,
            title: announcement.title,
            content: announcement.content,
            media_url: announcement.media_url,
            is_published: announcement.is_published,
            published_at: announcement.published_at, // Keep existing published_at if editing
        });
        setMediaFile(null); // Clear any previously selected file when editing
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top to see the form
    };

    const confirmDelete = (announcement) => {
        setAnnouncementToDelete(announcement);
        setDialogOpen(true);
    };

    const handleDelete = () => {
        if (announcementToDelete) {
            deleteAnnouncementMutation.mutate(announcementToDelete.id);
        }
    };

    const resetForm = () => {
        setFormState({
            id: null,
            title: '',
            content: '',
            media_url: '',
            is_published: false,
        });
        setMediaFile(null);
        setUploadProgress(0);
        setIsUploading(false);
    };

    // --- Render Component ---
    return (
        <div className="min-h-screen w-full bg-white dark:bg-gray-900">
            {/* Header - Consistent with other pages */}
            <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-blue-200 dark:border-blue-800 sticky top-0 z-50">
                <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
                    <Link to="/" className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>

                    <div className="flex items-center space-x-3">
                        <ClipboardList className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        <span className="text-xl font-bold text-gray-900 dark:text-white">Admin Panel</span>
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
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                    Manage Announcements
                </h1>

                {/* Announcement Form */}
                <Card className="mb-8 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-gray-900 dark:text-white">
                            {formState.id ? 'Edit Announcement' : 'Create New Announcement'}
                        </CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-400">
                            Use this form to add, modify, or publish announcements.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid gap-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    value={formState.title}
                                    onChange={handleInputChange}
                                    required
                                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="content">Content</Label>
                                <Textarea
                                    id="content"
                                    name="content"
                                    value={formState.content}
                                    onChange={handleInputChange}
                                    required
                                    rows={6}
                                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="media_file" className="flex items-center space-x-2">
                                    <ImageIcon className="w-4 h-4" />
                                    <span>Media (Image/Video)</span>
                                </Label>
                                <Input
                                    id="media_file"
                                    name="media_file"
                                    type="file"
                                    accept="image/*,video/*"
                                    onChange={handleFileChange}
                                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white file:text-blue-600 dark:file:text-blue-400"
                                />
                                {mediaFile && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Selected: {mediaFile.name} ({(mediaFile.size / 1024 / 1024).toFixed(2)} MB)
                                    </p>
                                )}
                                {formState.media_url && !mediaFile && ( // Display existing URL if no new file selected
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Current media: <a href={formState.media_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate">{formState.media_url}</a>
                                    </p>
                                )}
                                {isUploading && (
                                    <div className="flex items-center mt-2 text-blue-500 dark:text-blue-400">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        <span>Uploading... {uploadProgress.toFixed(0)}%</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="is_published"
                                    name="is_published"
                                    checked={formState.is_published}
                                    onCheckedChange={(checked) => setFormState(prevState => ({ ...prevState, is_published: checked }))}
                                />
                                <Label
                                    htmlFor="is_published"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Publish Announcement
                                </Label>
                            </div>
                            <div className="flex justify-end space-x-2">
                                {formState.id && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={resetForm}
                                        disabled={saveAnnouncementMutation.isPending || isUploading}
                                        className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                    >
                                        Cancel Edit
                                    </Button>
                                )}
                                <Button
                                    type="submit"
                                    disabled={saveAnnouncementMutation.isPending || isUploading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600"
                                >
                                    {saveAnnouncementMutation.isPending ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                    )}
                                    {formState.id ? 'Update Announcement' : 'Create Announcement'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* List of Announcements */}
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center mt-12">
                    Current Announcements
                </h2>
                <div className="space-y-4">
                    {isLoading && (
                        <div className="text-center text-blue-500 dark:text-blue-400 mt-8 flex flex-col items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin mb-3" />
                            <p>Loading announcements...</p>
                        </div>
                    )}

                    {isError && (
                        <div className="text-center text-red-600 dark:text-red-400 mt-8 flex flex-col items-center justify-center">
                            <XCircle className="h-8 w-8 mb-3" />
                            <p>{error?.message || 'Failed to load announcements. Please check your connection.'}</p>
                        </div>
                    )}

                    {!isLoading && !isError && announcements?.length === 0 && (
                        <div className="text-center text-gray-600 dark:text-gray-400 mt-8 flex flex-col items-center justify-center">
                            <BellRing className="h-8 w-8 mb-3" />
                            <p>No announcements found.</p>
                        </div>
                    )}

                    {announcements?.map((announcement) => (
                        <Card key={announcement.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-gray-900 dark:text-white flex justify-between items-center">
                                    <span>{announcement.title}</span>
                                    <div className="flex items-center space-x-2">
                                        <Badge variant={announcement.is_published ? 'default' : 'secondary'} className={announcement.is_published ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'}>
                                            {announcement.is_published ? 'Published' : 'Draft'}
                                        </Badge>
                                    </div>
                                </CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-400">
                                    Created: {new Date(announcement.created_at).toLocaleDateString()}
                                    {announcement.published_at && announcement.is_published && ` | Published: ${new Date(announcement.published_at).toLocaleDateString()}`}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col md:flex-row gap-4 items-start">
                                {announcement.media_url && (
                                    <div className="flex-shrink-0 w-full md:w-48 h-32 rounded-md overflow-hidden border border-gray-300 dark:border-gray-600">
                                        {announcement.media_url.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                                            <img
                                                src={announcement.media_url}
                                                alt="Announcement media"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : announcement.media_url.match(/\.(mp4|webm|ogg)$/i) ? (
                                            <video controls className="w-full h-full object-cover">
                                                <source src={announcement.media_url} type={`video/${announcement.media_url.split('.').pop()}`} />
                                                Your browser does not support the video tag.
                                            </video>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs">
                                                No Preview ({announcement.media_url.substring(announcement.media_url.lastIndexOf('.') + 1).toUpperCase()})
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="flex-grow">
                                    <p className="text-gray-700 dark:text-gray-300 line-clamp-3 mb-2">{announcement.content}</p>
                                    <div className="flex space-x-2 mt-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEdit(announcement)}
                                            className="flex items-center border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                        >
                                            <Edit className="h-4 w-4 mr-1" /> Edit
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => confirmDelete(announcement)}
                                            className="flex items-center"
                                            disabled={deleteAnnouncementMutation.isPending}
                                        >
                                            {deleteAnnouncementMutation.isPending && announcementToDelete?.id === announcement.id ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-4 w-4 mr-1" />
                                            )}
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the announcement titled "{announcementToDelete?.title}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteAnnouncementMutation.isPending}
                        >
                            {deleteAnnouncementMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                'Delete'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Admin10;
