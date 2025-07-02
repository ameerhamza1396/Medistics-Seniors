'use client';

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Moon,
  Sun,
  Lock,
  Users, // Existing for Admin3
  Database, // Existing for Admin1
  Upload, // Existing for Admin2
  Code, // Existing for Admin4
  ClipboardCheck, // Existing for Admin5
  UsersRound, // New for Admin6 Ambassador Applications
  GraduationCap, // New for Admin7 Teaching Ambassador Applications
  Briefcase, // New for Admin8 Internship Applications
  ShoppingCart // New for Admin9 Plan Purchase Applications
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

export default function AdminPage() {
  const { theme, setTheme } = useTheme();
  const { user, isLoading: isUserLoading } = useAuth();

  const [enteredPin, setEnteredPin] = useState('');
  const [pinVerified, setPinVerified] = useState(false);
  const [pinError, setPinError] = useState('');
  const [accessAttempted, setAccessAttempted] = useState(false);

  // Get user profile data (only role needed now)
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('role') // Only select role
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
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 text-center">
        <Lock className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-lg mb-4">You must be logged in to access this page.</p>
        <a href="/" className="text-blue-500 hover:underline">Go to Home</a>
      </div>
    );
  }

  if (!isAdmin) {
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

  // --- Admin Dashboard (if access granted) ---
  return (
    <div className="min-h-screen w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
          <a href="/dashboard" className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </a>

          <div className="flex items-center space-x-3">
            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medistics Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold">Admin Panel</span>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {/* Hardcoded Admin badge */}
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

        {/* Admin Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 max-w-6xl mx-auto">
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

          {/* Admin 5: Mock Test Results */}
          <a href="/admin5" className="block">
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
          </a>

          {/* Admin 6: Ambassador Applications */}
          <a href="/admin6" className="block">
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
          </a>

          {/* Admin 7: Teaching Ambassador Applications */}
          <a href="/admin7" className="block">
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
          </a>

          {/* Admin 8: Internship Applications */}
          <a href="/admin8" className="block">
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
          </a>

          {/* Admin 9: Plan Purchase Applications */}
          <a href="/admin9" className="block">
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
          </a>

        </div>

        {/* Admin List Section */}
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