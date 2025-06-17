// app/admin/page.tsx
'use client'; // This directive is typically for Next.js App Router for client components

import React from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Users,
  BookOpen,
  Lock,
  Moon, // <--- Add Moon import here
  Sun,  // <--- Add Sun import here
} from 'lucide-react';
import { CSVImporter } from '@/components/admin/CSVImporter';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

const Admin = () => {
  const { theme, setTheme } = useTheme();
  const { user, isLoading: isUserLoading } = useAuth();

  // Fetch user profile data
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

  // Fetch total user count
  const { data: totalUsers, isLoading: isUsersLoading } = useQuery({
    queryKey: ['totalUsers'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' });

      if (error) {
        console.error('Error fetching total users:', error);
        return 0;
      }
      return count;
    },
  });

  // Fetch total question count
  const { data: totalQuestions, isLoading: isQuestionsLoading } = useQuery({
    queryKey: ['totalQuestions'],
    queryFn: async () => {
      // --- IMPORTANT: Replace 'MCQs' with your actual table name if it's different ---
      const { count, error } = await supabase
        .from('mcqs') // <--- Double check this table name in your Supabase project!
        .select('*', { count: 'exact' });

      if (error) {
        console.error('Error fetching total questions:', error);
        return 0;
      }
      return count;
    },
  });

  // Loading state for initial data fetch
  if (isUserLoading || isProfileLoading || isUsersLoading || isQuestionsLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
        Loading admin panel...
      </div>
    );
  }

  // --- Access Control Logic ---
  const isAdmin = profile?.role === 'admin';

  if (!user) {
    // Not logged in
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
    // Logged in but not an admin
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 text-center">
        <Lock className="w-16 h-16 text-red-500 dark:text-red-400 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-lg mb-4">You do not have administrative privileges to view this page.</p>
        <Link to="/dashboard" className="text-blue-500 hover:underline">Go to Dashboard</Link>
      </div>
    );
  }

  // If user is logged in and is an admin, render the full admin panel
  return (
    <div className="min-h-screen w-full bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
          <Link to="/dashboard" className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center space-x-3">
            <img
              src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
              alt="Medistics Logo"
              className="w-8 h-8 object-contain"
            />
            <span className="text-xl font-bold text-gray-900 dark:text-white">Admin Panel</span>
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
            <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700">
              Admin
            </Badge>
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {user?.email?.substring(0, 2).toUpperCase() || 'A'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 lg:px-8 py-8 max-w-7xl">
        {/* Hero Section */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            ⚙️ Admin Panel
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Manage the platform, import questions, and monitor system performance.
          </p>
        </div>

        {/* Admin Stats */}
        <div className="grid grid-cols-2 gap-4 lg:gap-6 mb-8">
          <Card className="text-center bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:scale-105 transition-transform duration-300 animate-fade-in">
            <CardHeader className="pb-2">
              <Users className="h-5 md:h-6 w-5 md:w-6 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
              <CardTitle className="text-xs md:text-sm text-gray-900 dark:text-white">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400">{totalUsers || 0}</div>
            </CardContent>
          </Card>

          <Card className="text-center bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:scale-105 transition-transform duration-300 animate-fade-in">
            <CardHeader className="pb-2">
              <BookOpen className="h-5 md:h-6 w-5 md:w-6 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-xs md:text-sm text-gray-900 dark:text-white">Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">{totalQuestions || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* CSV Importer */}
        <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300 animate-slide-up">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Question Management</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Import MCQ questions from CSV files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CSVImporter />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;