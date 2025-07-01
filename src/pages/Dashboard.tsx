import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  Zap,
  Trophy,
  Target,
  Users,
  Brain,
  Swords,
  Moon,
  Sun,
  Flame,
  Calendar,
  TrendingUp,
  Award,
  Briefcase,
  Book, // New icon for Study Materials
  Instagram, // New icon for Instagram
  Construction // Icon for maintenance message
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import { useTheme } from 'next-themes';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { LeaderboardPreview } from '@/components/dashboard/LeaderboardPreview';
import { StudyAnalytics } from '@/components/dashboard/StudyAnalytics';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react'; // Import useEffect

const Dashboard = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate(); // Initialize useNavigate

  // Define the profile type to include the optional plan property
  type Profile = {
    avatar_url: string;
    created_at: string;
    full_name: string;
    id: string;
    medical_school: string;
    updated_at: string;
    username: string;
    year_of_study: number;
    plan?: string; // Add plan as optional
  };

  // Get user profile data
  const { data: profile, isLoading: profileLoading } = useQuery<Profile | null>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      console.log('Fetching profile for user:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      console.log('Profile data:', data);
      return data;
    },
    enabled: !!user?.id
  });

  // Get user statistics
  const { data: userStats, isLoading: userStatsLoading } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      console.log('Fetching user stats for:', user.id);

      // Get user answers
      const { data: answers, error: answersError } = await supabase
        .from('user_answers')
        .select('*')
        .eq('user_id', user.id);

      if (answersError) {
        console.error('Error fetching answers:', answersError);
        return {
          totalQuestions: 0,
          correctAnswers: 0,
          accuracy: 0,
          currentStreak: 0,
          rankPoints: 0,
          battlesWon: 0,
          totalBattles: 0
        };
      }

      const totalQuestions = answers?.length || 0;
      const correctAnswers = answers?.filter(a => a.is_correct)?.length || 0;
      const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

      // Calculate streak
      const answerDates = answers?.map(a => new Date(a.created_at).toDateString()) || [];
      const uniqueDates = [...new Set(answerDates)].sort().reverse();

      let currentStreak = 0;
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      if (uniqueDates.includes(today) || uniqueDates.includes(yesterday)) {
        for (let i = 0; i < uniqueDates.length; i++) {
          const date = new Date(uniqueDates[i]);
          const expectedDate = new Date();
          expectedDate.setDate(expectedDate.getDate() - i);

          if (date.toDateString() === expectedDate.toDateString()) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      // Get battle results for rank points
      const { data: battles } = await supabase
        .from('battle_results')
        .select('*')
        .eq('user_id', user.id);

      const battlesWon = battles?.filter(b => b.rank === 1)?.length || 0;
      const rankPoints = correctAnswers * 10 + currentStreak * 5 + accuracy;

      return {
        totalQuestions,
        correctAnswers,
        accuracy,
        currentStreak,
        rankPoints,
        battlesWon,
        totalBattles: battles?.length || 0
      };
    },
    enabled: !!user?.id
  });

  // Effect for redirection based on user profile
  useEffect(() => {
    // Only proceed if user is logged in and profile data has been loaded
    if (user && !profileLoading) {
      const hasValidProfile = profile?.full_name && profile?.username;
      const isPlaceholderUsername = profile?.username === user?.email?.split('@')[0];

      // Redirect if profile is null, or if full_name/username are missing/placeholder
      if (!profile || !hasValidProfile || isPlaceholderUsername) {
        navigate('/welcome-new-user');
      }
    }
  }, [user, profile, profileLoading, navigate]);


  // Quick Actions - now with Mock Test and new additions
  const quickActions = [
    {
      title: 'Practice MCQs',
      description: 'Test your knowledge with curated questions',
      icon: BookOpen,
      link: '/mcqs',
      type: 'internal',
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
      darkBgGradient: 'from-blue-900/30 to-cyan-900/30'
    },
    
    {
      title: 'Mock Test',
      description: 'New Test Unlocks on every Sunday',
      icon: Calendar,
      link: '/mock-test',
      type: 'internal',
      gradient: 'from-teal-500 to-green-500',
      bgGradient: 'from-teal-800/50 to-green-50',
      darkBgGradient: 'from-teal-900/30 to-green-900/10',
      tag: 'Limited Time Free', // Added tag for Mock Test
      tagColor: 'bg-red-500 text-white animate-pulse'
    },
    
    {
    title: 'Mock Test Results',
    description: 'View your past test performance',
    icon: Award, // Changed icon to Award for results
    link: '/test-summary', // Updated link to the new results page
    type: 'internal',
    gradient: 'from-purple-500 to-indigo-500', // Adjusted gradient for results
    bgGradient: 'from-purple-800/50 to-indigo-50',
    darkBgGradient: 'from-purple-900/30 to-indigo-900/10',
    tag: 'Live Now',
    tagColor: 'bg-red-500 text-white animate-pulse',
  },
    // {
    //   title: 'Study Materials',
    //   description: 'Access notes, videos, and resources',
    //   icon: Book,
    //   link: '/study-materials',
    //   type: 'internal',
    //   gradient: 'from-orange-500 to-rose-500',
    //   bgGradient: 'from-orange-50 to-rose-50',
    //   darkBgGradient: 'from-orange-900/20 to-amber-900/10'
    // },

    
    {
      title: 'Classrooms',
      description: 'Join or create study groups (Under Maintenance)', // Updated description
      icon: Users,
      link: '/classroom',
      type: 'internal',
      gradient: 'from-indigo-500 to-purple-500',
      bgGradient: 'from-indigo-50 to-purple-50',
      darkBgGradient: 'from-purple-900/20 to-orange-900/20',
      disabled: true
    },
    
    {
      title: 'Battle Arena',
      description: 'Under Maintenance', // Updated description
      icon: Swords,
      link: '/battle',
      type: 'internal',
      gradient: 'from-red-500 to-orange-500',
      bgGradient: 'from-red-50 to-orange-50',
      darkBgGradient: 'from-red-900/20 to-orange-900/20',
      disabled: true // Marked as disabled
    },
    {
      title: 'Leaderboard',
      description: 'See your rank among peers',
      icon: Trophy,
      link: '/leaderboard',
      type: 'internal',
      gradient: 'from-yellow-500 to-amber-500',
      bgGradient: 'from-yellow-50 to-amber-50',
      darkBgGradient: 'from-yellow-900/30 to-amber-900/30'
    },
        {
      title: 'Summer Internship 2025', // New Card Title
      description: 'Apply for the Medistics Summer Internship Program!', // Description
      icon: Briefcase, // A relevant icon, assuming you have it imported from 'lucide-react'
      link: '/summerinternship2025', // Link to your internship application page
      type: 'internal',
      gradient: 'from-blue-500 to-cyan-500', // Unique gradient
      bgGradient: 'from-blue-50 to-cyan-50',
      darkBgGradient: 'from-blue-900/30 to-cyan-900/30',
      tag: 'Open now!', // The requested tag
      tagColor: 'bg-red-500 text-white animate-pulse' // Eye-catching tag color and animation
    },
  ];

  // New Premium Perks section - filtered for disabled features
  const premiumPerks = [
    {
      title: 'AI Test Generator',
      description: 'Generate custom tests with AI',
      icon: Brain,
      link: '/ai/test-generator',
      type: 'internal',
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-50 to-pink-50',
      darkBgGradient: 'from-purple-900/30 to-pink-900/30',
      tag: 'For Iconic & Premium accounts', // Added tag
      tagColor: 'bg-green-500 text-white'
    },
    {
      title: 'AI Chatbot',
      description: 'Get instant help from AI tutor', // Updated description
      icon: Zap,
      link: '/ai/chatbot',
      type: 'internal',
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-50 to-emerald-50',
      darkBgGradient: 'from-green-900/30 to-emerald-900/30',
      tag: 'For Premium Account', // Added tag
      tagColor: 'bg-indigo-500 text-white'
    },
    {
      title: 'Hire a Tutor',
      description: 'Coming Soon',
      icon: Users,
      link: '/hire-tutor',
      type: 'internal',
      gradient: 'from-blue-600 to-indigo-600',
      bgGradient: 'from-blue-50 to-indigo-50',
      darkBgGradient: 'from-blue-900/30 to-indigo-900/30',
      disabled: true
    }
  ];

  // New Socials section
  const socials = [
    {
      title: 'Follow us on Instagram',
      description: 'Stay updated with our latest posts!',
      icon: Instagram,
      link: 'https://www.instagram.com/medistics.app',
      type: 'external',
      gradient: 'from-pink-500 to-purple-600', // Instagram-like gradient
      bgGradient: 'from-pink-50 to-purple-50',
      darkBgGradient: 'from-purple-900/20 to-pink-700'
    },
    {
      title: 'Join our Whatsapp Community',
      description: 'Connect with other students and tutors',
      // Inline WhatsApp SVG as a functional component
      icon: (props) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none" // Changed fill to none for outline effect
          stroke="currentColor" // Changed stroke to currentColor to inherit text-white
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={props.className} // Pass down className for sizing (w-6 h-6)
        >
          {/* Path for WhatsApp outline logo */}
          <path d="M17.476 15.688c-.294.494-.858.913-1.685 1.171-.789.248-1.602.372-2.434.372-4.043 0-7.325-3.282-7.325-7.325 0-.832.124-1.645.372-2.434.258-.827.677-1.391 1.171-1.685.494-.294 1.058-.445 1.685-.445h.001c.627 0 1.25.151 1.835.452.585.301 1.07.728 1.455 1.27l.794 1.155c.083.12.125.26.125.421 0 .16-.042.3-.125.42l-.478.694c-.218.324-.469.575-.753.753-.284.179-.588.269-.912.269-.16 0-.301-.042-.421-.125l-.542-.294c-.12-.06-.24-.09-.361-.09-.12 0-.24.03-.361.09-.24.12-.42.27-.541.45-.12.18-.181.36-.181.541 0 .24.06.42.181.541.12.12.27.24.45.361l.541.294c.12.06.24.09.361.09.324 0 .628-.09.912-.269.284-.179.535-.43.753-.753l.478-.694c.083-.12.125-.26.125-.421 0-.16-.042-.3-.125-.42z" />
          <path d="M12 2C6.477 2 2 6.477 2 12c0 1.5.4 2.9 1.1 4.1L2 22l5.9-1.1C10.4 21.7 12 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zM12 20c-1.3 0-2.6-.3-3.8-.9L5.5 20.5l.8-2.6c-.8-1.2-1.3-2.6-1.3-4.1C5 8.1 8.1 5 12 5s7 3.1 7 7-3.1 7-7 7z" />
        </svg>
      ),
      link: 'https://whatsapp.com/channel/0029VaAGl767z4koufSZgA0W',
      type: 'external',
      gradient: 'from-green-500 to-lime-500', // WhatsApp-like gradient
      bgGradient: 'from-green-50 to-lime-50',
      darkBgGradient: 'from-green-900/30 to-lime-900/30'
    }
  ];

  // Safe display name with proper fallback
  const displayName = profile?.full_name || profile?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';

  // Define plan color schemes
  const planColors = {
    'free': {
      light: 'bg-purple-100 text-purple-800 border-purple-300',
      dark: 'dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700'
    },
    'premium': {
      light: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      dark: 'dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700'
    },
    'iconic': {
      light: 'bg-green-100 text-green-800 border-green-300',
      dark: 'dark:bg-green-900/30 dark:text-green-200 dark:border-green-700'
    },
    // Add more plans as needed
    'default': { // Fallback for unknown plans
      light: 'bg-gray-100 text-gray-800 border-gray-300',
      dark: 'dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
    }
  };

  // Determine the user's plan and its display name
  const rawUserPlan = profile?.plan?.toLowerCase() || 'free'; // Ensure lowercase for lookup
  const userPlanDisplayName = rawUserPlan.charAt(0).toUpperCase() + rawUserPlan.slice(1) + ' Plan';

  // Get the color classes for the current plan
  const currentPlanColorClasses = planColors[rawUserPlan] || planColors['default'];

  // Show a loading state or redirect immediately if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to access your dashboard</h1>
          <Link to="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Optionally, show a loading spinner while profile data is being fetched
  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600 dark:text-gray-300">Loading user profile...</p>
      </div>
    );
  }

  // If we reach here, user is authenticated and profile has been fetched.
  // The useEffect hook will handle the redirection for invalid profiles.
  // So, if the user is still on this page, their profile is considered valid.

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
      {/* Header */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img
              src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
              alt="Medistics Logo"
              className="w-8 h-8 object-contain"
            />
            <span className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</span>
          </div>

          <div className="flex items-center space-x-3">
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
            {/* Dynamic Plan Badge with dynamic colors */}
            <Badge
              variant="secondary"
              className={`${currentPlanColorClasses.light} ${currentPlanColorClasses.dark}`}
            >
              {userPlanDisplayName}
            </Badge>
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            <span className="text-gray-900 dark:text-white">Welcome back, </span>
            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent animate-pulse drop-shadow-lg filter blur-[0.5px]">
              {displayName}
            </span>
            <span className="text-gray-900 dark:text-white">! ✨</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
            Ready to continue your medical education journey?
          </p>

          {/* Progress Overview */}
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Flame className="w-5 h-5 text-orange-500 mr-2" />
                Study Streak: {userStats?.currentStreak || 0} days
              </h2>
              <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                🔥 {userStats?.currentStreak > 0 ? 'On Fire!' : 'Start Streak!'}
              </Badge>
            </div>
            <Progress value={userStats?.accuracy || 0} className="h-3 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">{userStats?.accuracy || 0}% overall accuracy</p>
          </div>
        </div>

        {/* Stats and Analytics in same row on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div>
            <StudyAnalytics />
          </div>
          <div>
            <LeaderboardPreview />
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 border-blue-200 dark:border-blue-800 hover:scale-105 transition-transform duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {userStats?.accuracy || 0}%
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Accuracy</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-green-200 dark:border-green-800 hover:scale-105 transition-transform duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <BookOpen className="w-5 h-5 text-green-600 dark:text-green-400" />
                <Calendar className="w-4 h-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {userStats?.totalQuestions || 0}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Questions</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/30 border-yellow-200 dark:border-yellow-800 hover:scale-105 transition-transform duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <Award className="w-4 h-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {userStats?.currentStreak || 0}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Best Streak</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-purple-200 dark:border-purple-800 hover:scale-105 transition-transform duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-bold text-green-600">#12</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {userStats?.rankPoints || 0}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Rank Points</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Quick Actions</h2>
          <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 p-4 mb-6 flex items-center space-x-3">
            <Construction className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            <p className="text-yellow-800 dark:text-yellow-200 text-sm">
              Battle Arena and Classrooms are currently undergoing maintenance. We appreciate your patience and will re-enable them soon!
            </p>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              action.type === 'internal' ? (
                <Link
                  key={index}
                  to={action.disabled ? '#' : action.link} // Change link to # if disabled
                  className={action.disabled ? 'opacity-50 pointer-events-none' : ''} // Apply disabled styling
                >
                  <Card className={`group hover:scale-105 hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br ${action.bgGradient} dark:${action.darkBgGradient} border-purple-200 dark:border-purple-800 overflow-hidden relative`}>
                    <div className={`absolute inset-0 bg-gradient-to-r ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                    <CardHeader className="relative pb-2"> {/* Added pb-2 to give some padding to the tag if it's there */}
                      {action.tag && (
                        <Badge className={`absolute top-2 right-2 ${action.tagColor}`}>
                          {action.tag}
                        </Badge>
                      )}
                      <div className="flex items-center space-x-3 mt-4"> {/* Adjusted margin-top to avoid overlap with tag */}
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${action.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <action.icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {action.title}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="relative">
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {action.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ) : (
                <a key={index} href={action.link} target="_blank" rel="noopener noreferrer">
                  <Card className={`group hover:scale-105 hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br ${action.bgGradient} dark:${action.darkBgGradient} border-purple-200 dark:border-purple-800 overflow-hidden relative`}>
                    <div className={`absolute inset-0 bg-gradient-to-r ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                    <CardHeader className="relative pb-2"> {/* Added pb-2 */}
                      {action.tag && (
                        <Badge className={`absolute top-2 right-2 ${action.tagColor}`}>
                          {action.tag}
                        </Badge>
                      )}
                      <div className="flex items-center space-x-3 mt-4"> {/* Adjusted margin-top */}
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${action.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          {/* Render the custom icon component */}
                          <action.icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {action.title}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="relative">
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {action.description}
                      </p>
                    </CardContent>
                  </Card>
                </a>
              )
            ))}
          </div>
        </div>

        {/* Premium Perks Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Premium Perks</h2>
          {/* <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 p-4 mb-6 flex items-center space-x-3">
            <Construction className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            <p className="text-yellow-800 dark:text-yellow-200 text-sm">
              The AI Chatbot is currently undergoing maintenance. We appreciate your patience and will re-enable it soon!
            </p>
          </Card> */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {premiumPerks.map((action, index) => (
              <Link
                key={index}
                to={action.disabled ? '#' : action.link} // Change link to # if disabled
                className={action.disabled ? 'opacity-50 pointer-events-none' : ''} // Apply disabled styling
              >
                <Card className={`group hover:scale-105 hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br ${action.bgGradient} dark:${action.darkBgGradient} border-purple-200 dark:border-purple-800 overflow-hidden relative`}>
                  <div className={`absolute inset-0 bg-gradient-to-r ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                  <CardHeader className="relative pb-2"> {/* Added pb-2 */}
                    {action.tag && (
                      <Badge className={`absolute top-2 right-2 ${action.tagColor}`}>
                        {action.tag}
                      </Badge>
                    )}
                    <div className="flex items-center space-x-3 mt-4"> {/* Adjusted margin-top */}
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${action.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <action.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {action.title}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {action.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Our Socials Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Our Socials</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {socials.map((action, index) => (
              <a key={index} href={action.link} target="_blank" rel="noopener noreferrer">
                <Card className={`group hover:scale-105 hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br ${action.bgGradient} dark:${action.darkBgGradient} border-purple-200 dark:border-purple-800 overflow-hidden relative`}>
                  <div className={`absolute inset-0 bg-gradient-to-r ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                  <CardHeader className="relative">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${action.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        {/* Render the custom icon component */}
                        <action.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {action.title}
                        </CardTitle>
                      </div >
                    </div >
                  </CardHeader>
                  <CardContent className="relative">
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {action.description}
                    </p>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>

        {/* Footer Text */}
        <div className="text-center mt-12 mb-4 text-gray-500 dark:text-gray-400 text-sm">
          <p>A Project by Educational Spot.</p>
          <p>&copy; 2025 Medistics. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
