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
  BellRing,
  Book,
  Construction,
  Bookmark,
  ScrollText,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { LeaderboardPreview } from '@/components/dashboard/LeaderboardPreview';
import { StudyAnalytics } from '@/components/dashboard/StudyAnalytics';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import AnnouncementToastManager from '@/components/ui/AnnouncementToastManager';
import AuthErrorDisplay from '@/components/AuthErrorDisplay';
import Seo from '@/components/Seo';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import SignInPrompt from '@/components/SigninPrompt'; // Import SignInPrompt

const Dashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  type Profile = {
    avatar_url: string;
    created_at: string;
    full_name: string;
    id: string;
    medical_school: string;
    updated_at: string;
    username: string;
    year_of_study: number;
    plan?: string;
  };

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

  const { data: userStats, isLoading: userStatsLoading } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      console.log('Fetching user stats for:', user.id);
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

  useEffect(() => {
    if (!authLoading && user && !profileLoading) {
      if (profile?.username === null) {
        navigate('/welcome-new-user');
      }
    }
  }, [user, profile, profileLoading, authLoading, navigate]);

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
      title: 'Saved MCQs',
      description: 'Review your bookmarked questions',
      icon: Bookmark,
      link: '/saved-mcqs',
      type: 'internal',
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-50 to-pink-50',
      darkBgGradient: 'from-purple-900/30 to-pink-900/30'
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
      title: 'Summer Internship 2025',
      description: 'Apply for the Medistics Summer Internship Program!',
      icon: Briefcase,
      link: '/summerinternship2025',
      type: 'internal',
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
      darkBgGradient: 'from-blue-900/30 to-cyan-900/30',
      tag: 'Open now!',
      tagColor: 'bg-red-500 text-white animate-pulse'
    },
    {
      title: 'Classrooms',
      description: 'Join or create study groups (Under Maintenance)',
      icon: Users,
      link: '/classroom',
      type: 'internal',
      gradient: 'from-indigo-500 to-purple-500',
      bgGradient: 'from-indigo-50 to-purple-50',
      darkBgGradient: 'from-purple-900/20 to-orange-900/20',
    },
    {
      title: 'Battle Arena',
      description: 'Compete with friends in medical quizzes',
      icon: Swords,
      link: '/battle',
      type: 'internal',
      gradient: 'from-red-500 to-orange-500',
      bgGradient: 'from-red-50 to-orange-50',
      darkBgGradient: 'from-red-900/20 to-orange-900/20'
    },
  ];

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
      tag: <img src="\lovable-uploads\star.gif" alt="medistics" width={30} />,
      tagColor: 'bg-transparent'
    },
    {
      title: 'AI Chatbot',
      description: 'Get instant help from AI tutor',
      icon: Zap,
      link: '/ai/chatbot',
      type: 'internal',
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-50 to-emerald-50',
      darkBgGradient: 'from-green-900/30 to-emerald-900/30',
      tag: <img src="\lovable-uploads\star.gif" alt="medistics" width={30} />,
      tagColor: 'bg-transparent'
    },
    {
      title: 'Full-Length Paper',
      description: 'Practice timed exams with mixed subjects',
      icon: ScrollText,
      link: '/flp',
      type: 'internal',
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
      darkBgGradient: 'from-blue-900/30 to-cyan-900/30',
      tag: <img src="\lovable-uploads\star.gif" alt="premium" width={30} />,
      tagColor: 'bg-transparent'
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

  const socials = [
    {
      title: 'Follow us on Instagram',
      description: 'Stay updated with our latest posts!',
      icon: ({ className }) => <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" alt="Instagram" className={className} />,
      link: 'https://www.instagram.com/medistics.app',
      type: 'external',
      gradient: 'from-pink-500 to-purple-600',
      bgGradient: 'from-pink-50 to-purple-50',
      darkBgGradient: 'from-purple-900/20 to-pink-700'
    },
    {
      title: 'Join our Whatsapp Community',
      description: 'Connect with other students and tutors',
      icon: ({ className }) => <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className={className} />,
      link: 'https://whatsapp.com/channel/0029VaAGl767z4koufSZgA0W',
      type: 'external',
      gradient: 'from-green-500 to-lime-500',
      bgGradient: 'from-green-50 to-lime-50',
      darkBgGradient: 'from-green-900/30 to-lime-900/30'
    },
    {
      title: 'Join our Reddit Community',
      description: 'Connect with students and discuss topics!',
      icon: ({ className }) => <img src="https://www.redditstatic.com/desktop2x/img/favicon/apple-icon-57x57.png" alt="Reddit" className={className} />, // Updated Reddit logo URL
      link: 'https://www.reddit.com/r/medistics/',
      type: 'external',
      gradient: 'from-orange-500 to-red-500',
      bgGradient: 'from-orange-50 to-red-50',
      darkBgGradient: 'from-orange-900/30 to-red-900/30'
    },
    {
      title: 'Like us on Facebook',
      description: 'Follow our page for updates and news!',
      icon: ({ className }) => <img src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" alt="Facebook" className={className} />,
      link: 'https://www.facebook.com/medisticsapp',
      type: 'external',
      gradient: 'from-blue-600 to-indigo-600',
      bgGradient: 'from-blue-50 to-indigo-50',
      darkBgGradient: 'from-blue-900/30 to-indigo-900/30'
    }
  ];

  const displayName = profile?.full_name || profile?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Medistics User';

  if (authLoading || profileLoading || userStatsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <img
          src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
          alt="Loading Medistics"
          className="w-32 h-32 object-contain"
        />
      </div>
    );
  }

  // Render SignInPrompt if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
        <SignInPrompt />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
      <Seo
        title="Dashboard"
        description="Your personalized Medistics App dashboard. Track your progress, review past quizzes, and plan your study schedule effectively."
        canonical="https://medistics.app/dashboard"
      />
      
      <DashboardHeader profile={profile} user={user} displayName={displayName} />

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              action.type === 'internal' ? (
                <Link
                  key={index}
                  to={action.disabled ? '#' : action.link}
                  className={action.disabled ? 'opacity-50 pointer-events-none' : ''}
                >
                  <Card className={`group hover:scale-105 hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br ${action.bgGradient} dark:${action.darkBgGradient} border-purple-200 dark:border-purple-800 overflow-hidden relative`}>
                    <div className={`absolute inset-0 bg-gradient-to-r ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                    <CardHeader className="relative pb-2">
                      {action.tag && (
                        <Badge className={`absolute top-2 right-2 ${action.tagColor}`}>
                          {action.tag}
                        </Badge>
                      )}
                      <div className="flex items-center space-x-3 mt-4">
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
                    <CardHeader className="relative pb-2">
                      {action.tag && (
                        <Badge className={`absolute top-2 right-2 ${action.tagColor}`}>
                          {action.tag}
                        </Badge>
                      )}
                      <div className="flex items-center space-x-3 mt-4">
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
                </a>
              )
            ))}
          </div>
        </div>

        {/* Premium Perks Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Premium Perks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {premiumPerks.map((action, index) => (
              <Link
                key={index}
                to={action.disabled ? '#' : action.link}
                className={action.disabled ? 'opacity-50 pointer-events-none' : ''}
              >
                <Card className={`group hover:scale-105 hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br ${action.bgGradient} dark:${action.darkBgGradient} border-purple-200 dark:border-purple-800 overflow-hidden relative`}>
                  <div className={`absolute inset-0 bg-gradient-to-r ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                  <CardHeader className="relative pb-2">
                    {action.tag && (
                      <Badge className={`absolute top-2 right-2 ${action.tagColor}`}>
                        {action.tag}
                      </Badge>
                    )}
                    <div className="flex items-center space-x-3 mt-4">
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
                        {/* Render the image directly */}
                        {action.icon({ className: "w-6 h-6 object-contain" })} {/* Pass className as prop */}
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
