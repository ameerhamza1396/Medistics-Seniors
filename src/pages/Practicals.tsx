import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Moon, Sun, BookOpen, Microscope } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import Seo from '@/components/Seo';

const SubjectCard = ({ subject, colorClass, linkLabel }) => (
    // CRITICAL CHANGE: Link to the new SubjectPracticalDetails component
    <Link to={`/practical-notes/subject/${subject.id}`} className="block h-full">
        <Card className={`bg-gradient-to-br ${colorClass} border-2 border-opacity-50 hover:scale-[1.02] hover:shadow-xl transition-all duration-300 animate-fade-in cursor-pointer h-full`}>
            <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                    <BookOpen className="h-10 w-10 text-current" style={{ color: subject.color || '#6d28d9' }} />
                </div>
                <CardTitle className="text-gray-900 dark:text-white text-xl mb-1">{subject.name}</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                    {subject.description || `Practical notes for ${subject.name}`}
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
                <Button className="w-full" style={{ backgroundColor: subject.color || '#6d28d9', borderColor: subject.color || '#6d28d9' }}>
                    {linkLabel}
                </Button>
            </CardContent>
        </Card>
    </Link>
);

const PracticalNotes = () => {
    const { theme, setTheme } = useTheme();
    const { user } = useAuth();

    // 1. Get user profile data (for plan badge AND year filter)
    const { data: profile } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('id, plan, year') // Select only necessary fields
                .eq('id', user.id)
                .maybeSingle();
            if (error) return console.error('Error fetching profile:', error);
            return data;
        },
        enabled: !!user?.id
    });

    const userYear = profile?.year;

    // 2. Fetch subjects data, filtered by user's year
    const { data: subjects, isLoading: isLoadingSubjects } = useQuery({
        queryKey: ['practicalSubjects', userYear], // Changed queryKey for clarity
        queryFn: async () => {
            if (!userYear) return [];

            const { data, error } = await supabase
                // FIX: Query the new dedicated table 'practical_subjects'
                .from('practical_subjects')
                .select('id, name, description, color, year, practical_components')
                .eq('year', userYear)
                .order('name', { ascending: true });

            if (error) {
                console.error('Error fetching practical subjects:', error);
                throw new Error('Could not fetch practical subjects');
            }
            return data;
        },
        enabled: !!user?.id && !!userYear
    });

    // --- Plan Badge Logic (Unchanged) ---
    const planColors = {
        'free': { light: 'bg-purple-100 text-purple-800 border-purple-300', dark: 'dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700' },
        'premium': { light: 'bg-yellow-100 text-yellow-800 border-yellow-300', dark: 'dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700' },
        'iconic': { light: 'bg-green-100 text-green-800 border-green-300', dark: 'dark:bg-green-900/30 dark:text-green-200 dark:border-green-700' },
        'default': { light: 'bg-gray-100 text-gray-800 border-gray-300', dark: 'dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600' }
    };
    const rawUserPlan = profile?.plan?.toLowerCase() || 'free';
    const userPlanDisplayName = rawUserPlan.charAt(0).toUpperCase() + rawUserPlan.slice(1) + ' Plan';
    const currentPlanColorClasses = planColors[rawUserPlan] || planColors['default'];
    // -----------------------------------------------------------

    const cardColorClasses = {
        light: 'from-purple-50 to-purple-100 border-purple-200',
        dark: 'dark:from-purple-900/20 dark:to-purple-800/20 dark:border-purple-800'
    };

    const renderSubjectCards = () => {
        if (isLoadingSubjects || !userYear) {
            return (
                <p className="col-span-full text-center text-gray-500 dark:text-gray-400">
                    {userYear === undefined ? "Fetching your profile year..." : "Loading subjects..."}
                </p>
            );
        }

        if (subjects && subjects.length > 0) {
            return subjects.map((subject) => (
                <SubjectCard
                    key={`subject-${subject.id}`}
                    subject={subject}
                    colorClass={`${cardColorClasses.light} ${cardColorClasses.dark}`}
                    linkLabel="Select Practical"
                />
            ));
        }

        return (
            <p className="col-span-full text-center text-gray-500 dark:text-gray-400">
                No practical subjects found for your current year ({userYear || 'Not Set'}).
            </p>
        );
    }

    return (
        <div className="min-h-screen w-full bg-white dark:bg-gray-900">
            <Seo title="Practical Notes" description="Access OSCE and VIVA practical notes categorized by subject for efficient medical exam preparation." canonical="https://www.medistics.app/practical-notes" />

            {/* Header (Unchanged) */}
            <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50">
                <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
                    <Link to="/dashboard" className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div className="flex items-center space-x-3">
                        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medmacs Logo" className="w-8 h-8 object-contain" />
                        <span className="text-xl font-bold text-gray-900 dark:text-white">Practical Notes</span>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200">
                            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </Button>
                        <Badge variant="secondary" className={`hidden sm:flex ${currentPlanColorClasses.light} ${currentPlanColorClasses.dark}`}>
                            {userPlanDisplayName}
                        </Badge>
                        <ProfileDropdown />
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 lg:px-8 py-8 max-w-7xl">
                {/* Hero Section */}
                <div className="text-center mb-8 animate-fade-in">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        📝 Practical Notes Hub
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Select a **Subject** to view organized OSCE and VIVA practical materials.
                    </p>
                </div>

                {/* Unified Practical Notes Section */}
                <div className="space-y-12">
                    <section>
                        <h2 className="text-2xl md:text-3xl font-semibold text-purple-600 dark:text-purple-400 mb-6 flex items-center justify-center space-x-3">
                            <Microscope className="h-7 w-7" />
                            <span>Practical Subjects for {userYear || 'Your Year'}</span>
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {renderSubjectCards()}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PracticalNotes;
