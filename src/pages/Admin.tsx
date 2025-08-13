import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Moon,
  Sun,
  Lock,
  Users,
  Database,
  Upload,
  Code,
  ClipboardCheck,
  UsersRound,
  GraduationCap,
  Briefcase,
  ShoppingCart,
  Megaphone,
  DollarSign,
  Edit
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

export default function AdminPage() {
  const { theme, setTheme } = useTheme();
  const { user, isLoading: isUserLoading } = useAuth();
  const navigate = useNavigate();

  const [enteredPin, setEnteredPin] = useState('');
  const [pinVerified, setPinVerified] = useState(false);
  const [pinError, setPinError] = useState('');
  const [accessAttempted, setAccessAttempted] = useState(false);

  useEffect(() => {
    const storedTimestamp = localStorage.getItem('adminPinVerifiedTimestamp');
    if (storedTimestamp) {
      const timeElapsed = Date.now() - parseInt(storedTimestamp, 10);
      const timeoutSeconds = 100;
      if (timeElapsed < timeoutSeconds * 1000) {
        setPinVerified(true);
        console.log(`Access granted from local storage. Expires in ${timeoutSeconds - Math.floor(timeElapsed / 1000)} seconds.`);
      } else {
        localStorage.removeItem('adminPinVerifiedTimestamp');
      }
    }
  }, []);

  const { data: profile, isLoading: isProfileLoading } = useQuery({
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
        return null;
      }
      return data;
    },
    enabled: !!user?.id
  });

  const { data: adminSettings, isLoading: isAdminSettingsLoading } = useQuery({
    queryKey: ['admin_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_name', 'admin_pin')
        .maybeSingle();
      if (error) {
        console.error('Error fetching admin PIN:', error);
        return null;
      }
      return data?.setting_value;
    }
  });

  const handlePinVerification = () => {
    setAccessAttempted(true);
    if (enteredPin === adminSettings) {
      setPinVerified(true);
      setPinError('');
      localStorage.setItem('adminPinVerifiedTimestamp', Date.now().toString());
    } else {
      setPinError('Invalid PIN. Please try again.');
    }
  };

  if (isUserLoading || isProfileLoading || isAdminSettingsLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
        Loading admin page...
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';

  if (!user) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 text-center">
        <Lock className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-lg mb-4">You must be logged in to access this page.</p>
        <Link to="/" className="text-blue-500 hover:underline">Go to Home</Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 text-center">
        <Lock className="w-16 h-16 text-red-500 dark:text-red-400 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-lg mb-4">You do not have administrative privileges to view this page.</p>
        <Link to="/dashboard" className="text-blue-500 hover:underline">Go to Dashboard</Link>
      </div>
    );
  }

  if (isAdmin && !pinVerified) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 text-center">
        <Lock className="w-16 h-16 text-purple-600 dark:text-purple-400 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
        <p className="text-lg mb-4">Please enter the 4-digit PIN to access the admin panel.</p>
        <div className="flex flex-col items-center space-y-4">
          <input
            type="password"
            maxLength={4}
            value={enteredPin}
            onChange={(e) => setEnteredPin(e.target.value)}
            className="w-32 p-2 text-center border border-gray-300 dark:border-gray-600 rounded-md text-xl tracking-widest bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="****"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handlePinVerification();
              }
            }}
          />
          {pinError && <p className="text-red-500 text-sm mt-2">{pinError}</p>}
          <Button
            onClick={handlePinVerification}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-md transition-colors"
          >
            Verify PIN
          </Button>
          {!accessAttempted && <p className="text-xs text-gray-500 dark:text-gray-400">PIN is typically configured in Supabase 'app_settings' table.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
          <Link to="/dashboard" className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center space-x-3">
            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medistics Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold">Admin Panel</span>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Badge
              variant="secondary"
              className="bg-purple-600 text-white border-purple-800 dark:bg-purple-700 dark:text-white dark:border-purple-900"
            >
              Admin
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
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            🔒 Welcome, Admin!
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Manage your application's data and user settings.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 max-w-6xl mx-auto">
          {/* Admin 1: Update MCQs Database */}
          <Link to="/admin1?auth=true" className="block">
            <Card className="hover:scale-105 hover:shadow-lg transition-all duration-300 animate-fade-in cursor-pointer h-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
              <CardHeader className="text-center pb-4">
                <Database className="h-12 w-12 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-xl mb-2">Admin1: Update MCQs Database</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Modify existing Multiple Choice Questions.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                  Go to Admin1
                </Button>
              </CardContent>
            </Card>
          </Link>
          {/* Admin 2: Upload Mock Test Questions */}
          <Link to="/admin2?auth=true" className="block">
            <Card className="hover:scale-105 hover:shadow-lg transition-all duration-300 animate-fade-in cursor-pointer h-full bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
              <CardHeader className="text-center pb-4">
                <Upload className="h-12 w-12 mx-auto mb-4 text-green-600 dark:text-green-400" />
                <CardTitle className="text-xl mb-2">Admin2: Upload Mock Test Questions</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Add new mock test questions in bulk.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button className="bg-green-600 hover:bg-green-700 text-white w-full">
                  Go to Admin2
                </Button>
              </CardContent>
            </Card>
          </Link>
          {/* Admin 3: Update User Plans */}
          <Link to="/admin3?auth=true" className="block">
            <Card className="hover:scale-105 hover:shadow-lg transition-all duration-300 animate-fade-in cursor-pointer h-full bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
              <CardHeader className="text-center pb-4">
                <Users className="h-12 w-12 mx-auto mb-4 text-yellow-600 dark:text-yellow-400" />
                <CardTitle className="text-xl mb-2">Admin3: Update User Plans</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Manage user subscription plans and access levels.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button className="bg-yellow-600 hover:bg-yellow-700 text-white w-full">
                  Go to Admin3
                </Button>
              </CardContent>
            </Card>
          </Link>
          {/* Admin 4: Scrutiny of MCQs Database */}
          <Link to="/admin4?auth=true" className="block">
            <Card className="hover:scale-105 hover:shadow-lg transition-all duration-300 animate-fade-in cursor-pointer h-full bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
              <CardHeader className="text-center pb-4">
                <Code className="h-12 w-12 mx-auto mb-4 text-red-600 dark:text-red-400" />
                <CardTitle className="text-xl mb-2">Admin4: Scrutiny of MCQs Database</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Review and fix problematic MCQs.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button className="bg-red-600 hover:bg-red-700 text-white w-full">
                  Go to Admin4
                </Button>
              </CardContent>
            </Card>
          </Link>
          {/* Admin 5: Mock Test Results */}
          <Link to="/admin5?auth=true" className="block">
            <Card className="hover:scale-105 hover:shadow-lg transition-all duration-300 animate-fade-in cursor-pointer h-full bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
              <CardHeader className="text-center pb-4">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-purple-600 dark:text-purple-400" />
                <CardTitle className="text-xl mb-2">Admin5: Mock Test Results</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Review and analyze mock test performances.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button className="bg-purple-600 hover:bg-purple-700 text-white w-full">
                  Go to Admin5
                </Button>
              </CardContent>
            </Card>
          </Link>
          {/* Admin 6: Ambassador Applications */}
          <Link to="/admin6?auth=true" className="block">
            <Card className="hover:scale-105 hover:shadow-lg transition-all duration-300 animate-fade-in cursor-pointer h-full bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border-indigo-200 dark:border-indigo-800">
              <CardHeader className="text-center pb-4">
                <UsersRound className="h-12 w-12 mx-auto mb-4 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-xl mb-2">Admin6: Ambassador Applications</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Manage applications for ambassador roles.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white w-full">
                  Go to Admin6
                </Button>
              </CardContent>
            </Card>
          </Link>
          {/* Admin 7: Teaching Ambassador Applications */}
          <Link to="/admin7?auth=true" className="block">
            <Card className="hover:scale-105 hover:shadow-lg transition-all duration-300 animate-fade-in cursor-pointer h-full bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 border-teal-200 dark:border-teal-800">
              <CardHeader className="text-center pb-4">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 text-teal-600 dark:text-teal-400" />
                <CardTitle className="text-xl mb-2">Admin7: Teaching Ambassador Applications</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Review applications for teaching ambassador positions.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button className="bg-teal-600 hover:bg-teal-700 text-white w-full">
                  Go to Admin7
                </Button>
              </CardContent>
            </Card>
          </Link>
          {/* Admin 8: Internship Applications */}
          <Link to="/admin8?auth=true" className="block">
            <Card className="hover:scale-105 hover:shadow-lg transition-all duration-300 animate-fade-in cursor-pointer h-full bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
              <CardHeader className="text-center pb-4">
                <Briefcase className="h-12 w-12 mx-auto mb-4 text-orange-600 dark:text-orange-400" />
                <CardTitle className="text-xl mb-2">Admin8: Internship Applications</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Process applications for internships.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button className="bg-orange-600 hover:bg-orange-700 text-white w-full">
                  Go to Admin8
                </Button>
              </CardContent>
            </Card>
          </Link>
          {/* Admin 9: Plan Purchase Applications */}
          <Link to="/admin9?auth=true" className="block">
            <Card className="hover:scale-105 hover:shadow-lg transition-all duration-300 animate-fade-in cursor-pointer h-full bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 border-pink-200 dark:border-pink-800">
              <CardHeader className="text-center pb-4">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-pink-600 dark:text-pink-400" />
                <CardTitle className="text-xl mb-2">Admin9: Plan Purchase Applications</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Review and manage manual plan purchase requests.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button className="bg-pink-600 hover:bg-pink-700 text-white w-full">
                  Go to Admin9
                </Button>
              </CardContent>
            </Card>
          </Link>
          {/* Admin 10: Announcement Manager */}
          <Link to="/admin10?auth=true" className="block">
            <Card className="hover:scale-105 hover:shadow-lg transition-all duration-300 animate-fade-in cursor-pointer h-full bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 border-cyan-200 dark:border-cyan-800">
              <CardHeader className="text-center pb-4">
                <Megaphone className="h-12 w-12 mx-auto mb-4 text-cyan-600 dark:text-cyan-400" />
                <CardTitle className="text-xl mb-2">Admin10: Announcement Manager</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Create, edit, and publish announcements.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button className="bg-cyan-600 hover:bg-cyan-700 text-white w-full">
                  Go to Admin10
                </Button>
              </CardContent>
            </Card>
          </Link>
          {/* Admin 11: Price & Promocodes */}
          <Link to="/admin11?auth=true" className="block">
            <Card className="hover:scale-105 hover:shadow-lg transition-all duration-300 animate-fade-in cursor-pointer h-full bg-gradient-to-br from-lime-50 to-lime-100 dark:from-lime-900/20 dark:to-lime-800/20 border-lime-200 dark:border-lime-800">
              <CardHeader className="text-center pb-4">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-lime-600 dark:text-lime-400" />
                <CardTitle className="text-xl mb-2">Admin11: Price & Promocodes</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Manage subscription prices and promotional codes.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button className="bg-lime-600 hover:bg-lime-700 text-white w-full">
                  Go to Admin11
                </Button>
              </CardContent>
            </Card>
          </Link>
          {/* Admin 12: Modify MCQs */}
          <Link to="/admin12?auth=true" className="block">
            <Card className="hover:scale-105 hover:shadow-lg transition-all duration-300 animate-fade-in cursor-pointer h-full bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/20 dark:to-violet-800/20 border-violet-200 dark:border-violet-800">
              <CardHeader className="text-center pb-4">
                <Edit className="h-12 w-12 mx-auto mb-4 text-violet-600 dark:text-violet-400" />
                <CardTitle className="text-xl mb-2">Admin12: Modify MCQs</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Edit or remove Multiple Choice Questions.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button className="bg-violet-600 hover:bg-violet-700 text-white w-full">
                  Go to Admin12
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>
        <div className="mt-12 text-center max-w-4xl mx-auto p-6 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Admins</h2>
          <ul className="text-lg text-gray-700 dark:text-gray-300 space-y-2">
            <li><span className="font-semibold">Aima Khan</span> - drrahimashakir</li>
            <li><span className="font-semibold">Abdul Ahad Awan</span> - AbdulBhaiGreat</li>
            <li><span className="font-semibold">Dr Ameer Hamza</span> - drswag</li>
          </ul>
        </div>
      </div>
    </div>
  );
}