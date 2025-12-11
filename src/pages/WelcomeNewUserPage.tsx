// src/pages/WelcomeNewUserPage.jsx
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon } from 'lucide-react';
import Seo from '@/components/Seo';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const WelcomeNewUserPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect if username exists
  useEffect(() => {
    const checkUsername = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (data?.username) {
        navigate('/dashboard');
      }
    };

    checkUsername();
  }, [user, navigate]);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'there';

  const handleChooseUsername = () => {
    navigate('/settings/username');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <p className="text-gray-700 dark:text-gray-300">Please log in to continue.</p>
        <Button onClick={() => navigate('/login')}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-950 px-4 text-center">
      <Seo
        title="Welcome to Medmacs App"
        description="Welcome to Medmacs App! Get started with your personalized MDCAT preparation journey."
        canonical="https://medmacs.app/welcome-new-user"
      />
      <UserIcon className="w-20 h-20 text-purple-600 dark:text-purple-400 mb-6 animate-bounce-slow" />
      <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">
        Welcome,{' '}
        <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent animate-pulse">
          {displayName}
        </span>
        !
      </h1>
      <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8 max-w-2xl">
        Get ready to supercharge your medical studies with Medmacs.
      </p>
      <p className="text-xl md:text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-10 max-w-xl">
        First, please choose your unique username for public visibility.
      </p>
      <Button
        onClick={handleChooseUsername}
        className="px-8 py-4 text-lg bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all duration-300 transform hover:scale-105"
      >
        Choose My Username
      </Button>
    </div>
  );
};

export default WelcomeNewUserPage;
