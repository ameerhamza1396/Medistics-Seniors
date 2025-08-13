// app/admin/page.tsx
'use client';

import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen } from 'lucide-react';
import { CSVImporter } from '@/components/admin/CSVImporter';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

// Import the new components
import AdminLockout from '@/components/admin/AdminLockout';
import AdminHeader from '@/components/admin/AdminHeader';

const Admin = () => {
  const { user } = useAuth(); // We only need user here to pass its email to AdminHeader

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
      const { count, error } = await supabase
        .from('mcqs') // <--- Double-check this table name in your Supabase project!
        .select('*', { count: 'exact' });

      if (error) {
        console.error('Error fetching total questions:', error);
        return 0;
      }
      return count;
    },
  });

  // Display loading state while data specific to this page is fetched.
  // AdminLockout handles its own loading states for authentication.
  if (isUsersLoading || isQuestionsLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
        Loading admin panel data...
      </div>
    );
  }

  // Wrap the entire admin panel content with AdminLockout.
  // AdminLockout will handle authentication and then render its children.
  return (
    <AdminLockout>
      <div className="min-h-screen w-full bg-white dark:bg-gray-900">
        {/* Use the shared AdminHeader component for consistency */}
        <AdminHeader userEmail={user?.email} />

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
          <div className="grid grid-cols-2 gap-4 lg:gap-6 mb-8 max-w-6xl mx-auto">
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
          <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300 animate-slide-up max-w-6xl mx-auto">
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
    </AdminLockout>
  );
};

export default Admin;
