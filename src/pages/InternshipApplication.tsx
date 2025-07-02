import { useState, useRef, useEffect } from 'react'; // Import useEffect
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bot, Zap, Brain, FileText, Moon, Sun, MessageSquare, User, Mail, Phone, BookOpen, UserCheck, Shield, ClipboardList, PenTool, Image as ImageIcon, CheckCircle, XCircle, Lightbulb, Laptop, Share2, Palette } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import ReCAPTCHA from 'react-google-recaptcha';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const InternshipApplication = () => {
    const { theme, setTheme } = useTheme();
    const { user } = useAuth();

    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [gender, setGender] = useState('');
    const [skillExperience, setSkillExperience] = useState('');
    const [whyJoinMedistics, setWhyJoinMedistics] = useState('');
    const [userSkills, setUserSkills] = useState('');
    const [selectedSkills, setSelectedSkills] = useState([]);
    const [profilePicture, setProfilePicture] = useState(null);
    const [cnicOrStudentCard, setCnicOrStudentCard] = useState(null);
    const [captchaVerified, setCaptchaVerified] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState(null); // 'success', 'error', 'loading'
    const [errorMessage, setErrorMessage] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false); // State for modal visibility

    const recaptchaRef = useRef(null);

    // List of skills for the checklist
    const skills = ['Academics & Content', 'Tech & AI', 'Marketing & Social Media', 'Digital Content'];

    // Handle skill checkbox changes
    const handleSkillChange = (skill) => {
        setSelectedSkills(prev =>
            prev.includes(skill)
                ? prev.filter(s => s !== skill)
                : [...prev, skill]
        );
    };

    // Get user profile data (for header badge and pre-filling form)
    const { data: profile } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('role, plan, name') // Select 'name' from profiles table
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

    // --- NEW: Populate name and email if user is logged in ---
    useEffect(() => {
        if (user) {
            setEmail(user.email || '');
            // Prioritize name from profile table, then user_metadata, fallback to empty string
            if (profile?.name) { // Assuming 'name' column in profiles table
                setName(profile.name);
            } else if (user.user_metadata?.full_name) { // Fallback to user_metadata
                setName(user.user_metadata.full_name);
            } else {
                setName('');
            }
        } else {
            // Clear fields if user logs out or is not logged in initially
            setName('');
            setEmail('');
        }
    }, [user, profile]); // Re-run when user or profile data changes


    // Define plan color schemes (reused from AI.jsx)
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

    const handleFileChange = (e, setter, allowedTypes, maxSizeMB) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            const fileType = file.type;
            const fileSize = file.size; // in bytes

            if (!allowedTypes.includes(fileType)) {
                setErrorMessage(`Invalid file type. Please upload ${allowedTypes.join(', ')}.`);
                setter(null);
                e.target.value = ''; // Clear the input
                return;
            }

            if (fileSize > maxSizeMB * 1024 * 1024) { // Convert MB to bytes
                setErrorMessage(`File size exceeds ${maxSizeMB}MB limit.`);
                setter(null);
                e.target.value = ''; // Clear the input
                return;
            }

            setErrorMessage(''); // Clear previous file-related errors
            setter(file);
        }
    };

    const handleCaptchaChange = (value) => {
        setCaptchaVerified(!!value);
    };

    const uploadFileToCloudinary = async (file, folder) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'internship_applications'); // Updated Cloudinary bucket/preset
        formData.append('folder', folder);

        try {
            const response = await fetch('https://api.cloudinary.com/v1_1/dabgjalqp/image/upload', { // Replace 'dabgjalqp' with your Cloudinary cloud name
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            if (response.ok) {
                return data.secure_url;
            } else {
                throw new Error(data.error?.message || 'Cloudinary upload failed');
            }
        } catch (error) {
            console.error(`Error uploading file to Cloudinary (${folder}):`, error);
            throw error;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmissionStatus('loading');
        setErrorMessage('');

        // CAPTCHA check only for non-signed-in users
        if (!user && !captchaVerified) {
            setErrorMessage('Please complete the CAPTCHA verification.');
            setSubmissionStatus('error');
            return;
        }

        // Validate required fields (name and email will be pre-filled for logged-in users)
        if (!name || !email || !contactNumber || !gender || !skillExperience || !whyJoinMedistics || selectedSkills.length === 0 || !userSkills || !profilePicture || !cnicOrStudentCard) {
            setErrorMessage('Please fill in all required fields and upload all documents.');
            setSubmissionStatus('error');
            return;
        }

        if (whyJoinMedistics.length < 70 || whyJoinMedistics.length > 500) {
            setErrorMessage('The "Why join Medistics" field must be between 70 and 500 characters.');
            setSubmissionStatus('error');
            return;
        }

        if (userSkills.length < 70 || userSkills.length > 500) {
            setErrorMessage('The "Tell us about your skills" field must be between 70 and 500 characters.');
            setSubmissionStatus('error');
            return;
        }

        try {
            // 1. Upload files to Cloudinary
            const profilePictureUrl = await uploadFileToCloudinary(profilePicture, 'medistics-internship/profile-pictures');
            const cnicOrStudentCardUrl = await uploadFileToCloudinary(cnicOrStudentCard, 'medistics-internship/cnic-student-cards');

            // 2. Save application data to Supabase
            const { data, error } = await supabase
                .from('internship_applications') // Targeting the specific table
                .insert([
                    {
                        name,
                        email,
                        contact_number: contactNumber,
                        gender,
                        skill_experience: skillExperience,
                        why_join_medistics: whyJoinMedistics,
                        user_skills: userSkills,
                        skills_to_apply: selectedSkills,
                        profile_picture_url: profilePictureUrl,
                        cnic_student_card_url: cnicOrStudentCardUrl,
                        user_id: user?.id || null,
                        application_status: 'Pending' // Default status for new applications
                    },
                ]);

            if (error) {
                throw error;
            }

            setSubmissionStatus('success');
            setShowSuccessModal(true); // Show the success modal

            // Optionally clear form fields after successful submission
            // Note: Name and Email are not cleared if user is logged in, as they are pre-filled
            if (!user) {
                setName('');
                setEmail('');
            }
            setContactNumber('');
            setGender('');
            setSkillExperience('');
            setWhyJoinMedistics('');
            setUserSkills('');
            setSelectedSkills([]);
            setProfilePicture(null);
            setCnicOrStudentCard(null);
            setCaptchaVerified(false);
            if (recaptchaRef.current) {
                recaptchaRef.current.reset();
            }

        } catch (error) {
            console.error('Submission error:', error);
            setErrorMessage(`Failed to submit application: ${error.message || 'An unknown error occurred.'}`);
            setSubmissionStatus('error');
        }
    };

    return (
        <div className="min-h-screen w-full bg-white dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-blue-200 dark:border-blue-800 sticky top-0 z-50">
                <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
                    <Link to="/" className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>

                    <div className="flex items-center space-x-3">
                        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medistics Logo" className="w-8 h-8 object-contain" />
                        <span className="text-xl font-bold text-gray-900 dark:text-white">Become a Medistics Intern</span>
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
                {/* Hero Section */}
                <div className="text-center mb-8 animate-fade-in">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        🚀 Apply for the Medistics Internship Program!
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Gain invaluable experience, contribute to innovative projects, and kickstart your career.
                    </p>
                </div>

                {/* Internship Application Form */}
                <Card className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 shadow-lg animate-fade-in">
                    <CardHeader className="text-center pb-6">
                        <CardTitle className="text-gray-900 dark:text-white text-2xl mb-2">Internship Application Form</CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-400">
                            Complete the form below to submit your application.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="name" className="text-gray-700 dark:text-gray-300 flex items-center mb-1">
                                        <User className="h-4 w-4 mr-2 text-blue-500" /> Full Name
                                    </Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="Your Full Name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        readOnly={!!user} // Read-only if user is logged in
                                        disabled={!!user} // Visually disabled if user is logged in
                                        required={!user} // Only required if user is NOT logged in
                                        className={user ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : ''}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="email" className="text-gray-700 dark:text-gray-300 flex items-center mb-1">
                                        <Mail className="h-4 w-4 mr-2 text-green-500" /> Email
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="your@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        readOnly={!!user} // Read-only if user is logged in
                                        disabled={!!user} // Visually disabled if user is logged in
                                        required={!user} // Only required if user is NOT logged in
                                        className={user ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : ''}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="contactNumber" className="text-gray-700 dark:text-gray-300 flex items-center mb-1">
                                        <Phone className="h-4 w-4 mr-2 text-orange-500" /> Contact Number
                                    </Label>
                                    <Input id="contactNumber" type="tel" placeholder="e.g., +923001234567" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} required />
                                </div>
                                <div>
                                    <Label htmlFor="gender" className="text-gray-700 dark:text-gray-300 flex items-center mb-1">
                                        <UserCheck className="h-4 w-4 mr-2 text-purple-500" /> Gender
                                    </Label>
                                    <Select value={gender} onValueChange={setGender} required>
                                        <SelectTrigger id="gender">
                                            <SelectValue placeholder="Select your gender" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                            <SelectItem value="other">Other/Prefer not to say</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="skillExperience" className="text-gray-700 dark:text-gray-300 flex items-center mb-1">
                                    <BookOpen className="h-4 w-4 mr-2 text-red-500" /> Skill Experience
                                </Label>
                                <Select value={skillExperience} onValueChange={setSkillExperience} required>
                                    <SelectTrigger id="skillExperience">
                                        <SelectValue placeholder="Years of experience" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="less_than_1_year">Less than 1 year</SelectItem>
                                        <SelectItem value="2-3_years">2-3 years</SelectItem>
                                        <SelectItem value="4-5_years">4-5 years</SelectItem>
                                        <SelectItem value="5_plus_years">5+ years</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-gray-700 dark:text-gray-300 flex items-center mb-2">
                                    <ClipboardList className="h-4 w-4 mr-2 text-teal-500" /> Skills to Apply For:
                                </Label>
                                <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                                    {skills.map((skill) => (
                                        <div key={skill} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id={skill}
                                                checked={selectedSkills.includes(skill)}
                                                onChange={() => handleSkillChange(skill)}
                                                className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out dark:bg-gray-700 dark:border-gray-600"
                                            />
                                            <Label htmlFor={skill} className="text-gray-700 dark:text-gray-300 text-sm cursor-pointer">
                                                {skill}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                                {selectedSkills.length === 0 && (
                                    <p className="text-red-500 text-xs mt-1">Please select at least one skill area.</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="whyJoinMedistics" className="text-gray-700 dark:text-gray-300 flex items-center mb-1">
                                    <PenTool className="h-4 w-4 mr-2 text-indigo-500" /> Why do you want to join Medistics as an Intern?
                                </Label>
                                <Textarea
                                    id="whyJoinMedistics"
                                    placeholder="Write a short answer (min 70, max 500 characters)"
                                    value={whyJoinMedistics}
                                    onChange={(e) => setWhyJoinMedistics(e.target.value)}
                                    rows={4}
                                    minLength={70}
                                    maxLength={500}
                                    required
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {whyJoinMedistics.length} / 500 characters (Min: 70)
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="userSkills" className="text-gray-700 dark:text-gray-300 flex items-center mb-1">
                                    <Lightbulb className="h-4 w-4 mr-2 text-yellow-500" /> Tell us about your relevant skills and experience.
                                </Label>
                                <Textarea
                                    id="userSkills"
                                    placeholder="Describe your skills and how they relate to your chosen internship areas (min 70, max 500 characters)"
                                    value={userSkills}
                                    onChange={(e) => setUserSkills(e.target.value)}
                                    rows={4}
                                    minLength={70}
                                    maxLength={500}
                                    required
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {userSkills.length} / 500 characters (Min: 70)
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="profilePicture" className="text-gray-700 dark:text-gray-300 flex items-center mb-1">
                                        <ImageIcon className="h-4 w-4 mr-2 text-blue-500" /> Profile Picture
                                    </Label>
                                    <Input
                                        id="profilePicture"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={(e) => handleFileChange(e, setProfilePicture, ['image/jpeg', 'image/png', 'image/webp'], 2)}
                                        required
                                    />
                                    {profilePicture && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{profilePicture.name}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="cnicOrStudentCard" className="text-gray-700 dark:text-gray-300 flex items-center mb-1">
                                        <Shield className="h-4 w-4 mr-2 text-green-500" /> CNIC / Student Card
                                    </Label>
                                    <Input
                                        id="cnicOrStudentCard"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,application/pdf"
                                        onChange={(e) => handleFileChange(e, setCnicOrStudentCard, ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], 2)}
                                        required
                                    />
                                    {cnicOrStudentCard && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{cnicOrStudentCard.name}</p>}
                                </div>
                            </div>

                            {/* Conditional reCAPTCHA */}
                            {!user && (
                                <div className="flex justify-center">
                                    <ReCAPTCHA
                                        ref={recaptchaRef}
                                        sitekey="6LeIhW0rAAAAAL2oxCpELWA74Cb93-x9utqxBAdZ"
                                        onChange={handleCaptchaChange}
                                        theme={theme}
                                    />
                                </div>
                            )}

                            {submissionStatus === 'loading' && (
                                <p className="text-center text-blue-500 dark:text-blue-400 mt-4">Submitting your application...</p>
                            )}
                            {submissionStatus === 'error' && (
                                <div className="text-center text-red-600 dark:text-red-400 mt-4 flex items-center justify-center">
                                    <XCircle className="h-5 w-5 mr-2" /> {errorMessage || 'An error occurred during submission. Please try again.'}
                                </div>
                            )}

                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2" disabled={submissionStatus === 'loading'}>
                                Submit Application
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Success Modal */}
                <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center text-green-600 dark:text-green-400">
                                <CheckCircle className="h-6 w-6 mr-2" /> Application Submitted!
                            </DialogTitle>
                            <DialogDescription className="mt-2 text-gray-700 dark:text-gray-300">
                                Thank you for your interest in the Medistics Internship Program. Your application has been successfully received. We will review it and get back to you shortly!
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="mt-4">
                            <Button onClick={() => setShowSuccessModal(false)}>Close</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Perks of Being a Medistics Intern */}
                <div className="mt-12 text-center animate-fade-in">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">
                        ✨ Perks of Being a Medistics Intern!
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 hover:scale-105 transition-transform duration-300">
                            <CardHeader className="text-center">
                                <Zap className="h-8 w-8 mx-auto mb-2 text-yellow-600 dark:text-yellow-400" />
                                <CardTitle className="text-gray-900 dark:text-white">Free Premium Access</CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-400">
                                    Enjoy full access to all Medistics Premium features.
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:scale-105 transition-transform duration-300">
                            <CardHeader className="text-center">
                                <FileText className="h-8 w-8 mx-auto mb-2 text-red-600 dark:text-red-400" />
                                <CardTitle className="text-gray-900 dark:text-white">Official Certificates</CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-400">
                                    Receive a certificate of internship completion from Medistics.
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:scale-105 transition-transform duration-300">
                            <CardHeader className="text-center">
                                <Laptop className="h-8 w-8 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
                                <CardTitle className="text-gray-900 dark:text-white">Professional Portfolio</CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-400">
                                    Build a strong professional portfolio with real-world projects.
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:scale-105 transition-transform duration-300">
                            <CardHeader className="text-center">
                                <Share2 className="h-8 w-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                                <CardTitle className="text-gray-900 dark:text-white">Networking Opportunities</CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-400">
                                    Connect with industry experts and expand your professional network.
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card className="bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 hover:scale-105 transition-transform duration-300">
                            <CardHeader className="text-center">
                                <Brain className="h-8 w-8 mx-auto mb-2 text-teal-600 dark:text-teal-400" />
                                <CardTitle className="text-gray-900 dark:text-white">Mentorship & Training</CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-400">
                                    Receive guidance from experienced mentors and specialized training.
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:scale-105 transition-transform duration-300">
                            <CardHeader className="text-center">
                                <Palette className="h-8 w-8 mx-auto mb-2 text-green-600 dark:text-green-400" />
                                <CardTitle className="text-gray-900 dark:text-white">Creative Freedom</CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-400">
                                    Opportunity to contribute fresh ideas and innovate.
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </div>
                </div>

                {/* Info Section (reused from AI.jsx for consistent look) */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg text-sm text-blue-800 dark:text-blue-200 max-w-4xl mx-auto mt-12">
                    <div className="flex items-start space-x-2">
                        <Bot className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium mb-2">Medistics Internship Program Details:</p>
                            <ul className="space-y-1 text-xs">
                                <li>• <strong>Hands-on Projects:</strong> Work on real-world projects that impact Medistics and its users.</li>
                                <li>• <strong>Skill Development:</strong> Enhance your technical, creative, and soft skills through practical application.</li>
                                <li>• <strong>Team Collaboration:</strong> Collaborate with a dynamic team of professionals.</li>
                                <li>• <strong>Career Launchpad:</strong> Pave the way for future career opportunities within Medistics or beyond.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InternshipApplication;