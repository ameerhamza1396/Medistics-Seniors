// app/admin/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Moon, Sun, Lock, Users, Database, Upload, Code } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

// Define Theme type for clarity
type Theme = 'light' | 'dark';

export default function AdminPage() {
  const { theme, setTheme } = useTheme(); // Hook for theme management
  const { user, isLoading: isUserLoading } = useAuth(); // Hook for authentication

  const [enteredPin, setEnteredPin] = useState('');
  const [pinVerified, setPinVerified] = useState(false);
  const [pinError, setPinError] = useState('');
  const [accessAttempted, setAccessAttempted] = useState(false); // To track if PIN access was attempted

  // Get user profile data
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('role, plan') // Select role and plan
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id // Only run query if user ID is available
  });

  // Fetch admin PIN from Supabase `app_settings` table
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

  // Handle PIN verification
  const handlePinVerification = () => {
    setAccessAttempted(true);
    if (enteredPin === adminSettings) {
      setPinVerified(true);
      setPinError('');
    } else {
      setPinError('Invalid PIN. Please try again.');
    }
  };

  // Define plan color schemes (from your reference)
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
    'default': { // Fallback for unknown plans
      light: 'bg-gray-100 text-gray-800 border-gray-300',
      dark: 'dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
    }
  };

  // Determine the user's plan and its display name
  const rawUserPlan = profile?.plan?.toLowerCase() || 'free';
  const userPlanDisplayName = rawUserPlan.charAt(0).toUpperCase() + rawUserPlan.slice(1) + ' Plan';
  const currentPlanColorClasses = planColors[rawUserPlan] || planColors['default'];

  // Loading state for initial data fetch
  if (isUserLoading || isProfileLoading || isAdminSettingsLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
        Loading admin page...
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
        {/* You might want a link back to login or home */}
        <a href="/" className="text-blue-500 hover:underline">Go to Home</a>
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
        <a href="/dashboard" className="text-blue-500 hover:underline">Go to Dashboard</a>
      </div>
    );
  }

  if (isAdmin && !pinVerified) {
    // Admin, but PIN not verified
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 text-center">
        <Lock className="w-16 h-16 text-purple-600 dark:text-purple-400 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
        <p className="text-lg mb-4">Please enter the 4-digit PIN to access the admin panel.</p>
        <div className="flex flex-col items-center space-y-4">
          <input
            type="password" // Use type="password" for security
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

  // --- Admin Dashboard (if access granted) ---
  return (
    <div className="min-h-screen w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header (Replicated from your reference) */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
          {/* Using <a> for navigation for simplicity without react-router-dom context */}
          <a href="/dashboard" className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </a>

          <div className="flex items-center space-x-3">
            {/* Replace with your actual logo path */}
            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medistics Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold">Admin Panel</span>
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
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            🔒 Welcome, Admin!
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Manage your application's data and user settings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8 max-w-4xl mx-auto">
          {/* Admin 1: Update MCQs Database */}
          <a href="/admin1" className="block">
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
          </a>

          {/* Admin 2: Upload Mock Test Questions */}
          <a href="/admin2" className="block">
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
          </a>

          {/* Admin 3: Update User Plans */}
          <a href="/admin3" className="block">
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
          </a>

          {/* Admin 4: Scrutiny of MCQs Database */}
          <a href="/admin4" className="block">
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
          </a>
        </div>

        {/* New Admin List Section */}
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