'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, CalendarIcon, Search as SearchIcon } from 'lucide-react'; // Removed unused icons like ArrowLeft, Moon, Sun, Lock, Loader2
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';

// New imports for date picker
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils'; // Assuming you have this utility for class names

// Import the new components for authentication and header
import AdminLockout from '@/components/admin/AdminLockout';
import AdminHeader from '@/components/admin/AdminHeader';

// Define the interface for the fetched test result
interface UserTestResult {
  user_id: string;
  score: number | null; // score can be null
  username: string;
  completed_at: string; // Added completed_at timestamp
}

export default function Admin5() {
  const { user } = useAuth(); // Only 'user' is needed here, loading handled by AdminLockout

  const [sortBy, setSortBy] = useState<'score' | 'username'>('score');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date()); // State for selected date

  // --- Fetch User Test Results ---
  const { data: rawResults, isLoading: isResultsLoading, error: resultsError } = useQuery<UserTestResult[]>({
    queryKey: ['userTestResults', selectedDate?.toDateString()], // Add selectedDate to query key
    queryFn: async () => {
      let query = supabase
        .from('user_test_results')
        .select(`
          score,
          username,
          user_id,
          completed_at
        `)
        .not('score', 'is', null); // Ensure score is not null from DB

      // Apply date filter if a date is selected
      if (selectedDate) {
        const startOfDay = format(selectedDate, 'yyyy-MM-dd 00:00:00');
        const endOfDay = format(selectedDate, 'yyyy-MM-dd 23:59:59');
        query = query.gte('completed_at', startOfDay).lte('completed_at', endOfDay);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching user test results:', error.message || error);
        return [];
      }
      return data || [];
    },
    // This query is enabled only after AdminLockout has granted access.
    // The previous `enabled: !isUserLoading && !isProfileLoading && isAdmin,` is no longer needed here.
    enabled: true, // AdminLockout ensures user is authenticated and admin before this component renders
  });

  // --- Step 1: Process rawResults to get unique users with their highest score ---
  const uniqueUserResults = useMemo(() => {
    if (!rawResults) return [];

    const userScoresMap = new Map<string, UserTestResult>(); // Map user_id to their best result

    rawResults.forEach(result => {
      // Ensure score is not null and username exists before processing
      if (result.score !== null && result.username) {
        const existingResult = userScoresMap.get(result.user_id);

        if (!existingResult || result.score > existingResult.score!) { // Use ! for score as it's checked above
          userScoresMap.set(result.user_id, result);
        }
      }
    });

    // Convert map values back to an array
    return Array.from(userScoresMap.values());
  }, [rawResults]);

  // --- Step 2: Apply Sorting Logic to uniqueUserResults ---
  const sortedResults = useMemo(() => {
    const resultsCopy = [...uniqueUserResults]; // Use uniqueUserResults here

    if (sortBy === 'score') {
      return resultsCopy.sort((a, b) => (b.score as number) - (a.score as number));
    } else if (sortBy === 'username') {
      return resultsCopy.sort((a, b) => {
        const usernameA = a.username || '';
        const usernameB = b.username || '';
        return usernameA.localeCompare(usernameB);
      });
    }
    return resultsCopy;
  }, [uniqueUserResults, sortBy]); // Depends on uniqueUserResults

  // --- Step 3: Calculate Top 3 Positions from sortedResults ---
  const topPositions = useMemo(() => {
    const positions: { [key: number]: { score: number; users: { username: string; score: number }[] } } = {};
    let currentRank = 0;
    let lastScore = -1;

    // sortedResults already contains unique users with best scores and is filtered for nulls
    const validAndSorted = sortedResults;

    validAndSorted.forEach((result) => {
      if (result.score! !== lastScore) {
        currentRank = Object.keys(positions).length + 1;
        lastScore = result.score!;
      }

      if (currentRank <= 3) {
        if (!positions[currentRank]) {
          positions[currentRank] = { score: result.score!, users: [] };
        }
        positions[currentRank].users.push({
          username: result.username,
          score: result.score!,
        });
      }
    });

    return positions;
  }, [sortedResults]);

  // Render a loading state for Admin5's specific content
  if (isResultsLoading) {
    return (
      <AdminLockout> {/* AdminLockout provides its own loading/access screens */}
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
          <AdminHeader userEmail={user?.email} /> {/* Render header even during content loading */}
          <div className="flex-grow flex items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="ml-2">Loading mock test results...</span>
          </div>
        </div>
      </AdminLockout>
    );
  }

  return (
    <AdminLockout>
      <div className="min-h-screen w-full bg-white dark:bg-gray-900">
        {/* Use the shared AdminHeader component for consistency across admin pages */}
        <AdminHeader userEmail={user?.email} />

        <div className="container mx-auto px-4 lg:px-8 py-8 max-w-7xl">
          {/* Hero Section */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              🏆 Mock Test Leaderboard
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              View and analyze student performance in mock tests {selectedDate && `for ${format(selectedDate, 'PPP')}`}.
            </p>
          </div>

          {/* Date Picker and Sorting Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Calendar Button for Date Selection */}
            <div className="flex items-center space-x-2">
              <Label htmlFor="date-picker-trigger" className="text-gray-700 dark:text-gray-300">Filter by Date:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    id="date-picker-trigger"
                    className={cn(
                      "w-[180px] justify-start text-left font-normal dark:bg-gray-800 dark:border-gray-700 dark:text-white",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 dark:bg-gray-800 dark:border-gray-700">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    className="dark:bg-gray-800 dark:text-white"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Sorting Dropdown */}
            <div className="flex items-center space-x-2">
              <Label htmlFor="sort-by" className="mr-2 self-center text-gray-700 dark:text-gray-300">Sort by:</Label>
              <Select value={sortBy} onValueChange={(value: 'score' | 'username') => setSortBy(value)}>
                <SelectTrigger id="sort-by" className="w-[180px] dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                  <SelectValue placeholder="Select sorting option" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                  <SelectItem value="score">Score (Highest First)</SelectItem>
                  <SelectItem value="username">Username (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Top 3 Positions Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-8">
            {[1, 2, 3].map(rank => (
              <Card
                key={`rank-${rank}`}
                className={`text-center transition-transform duration-300 animate-fade-in
                  ${rank === 1 ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30 border-yellow-400 dark:border-yellow-700 shadow-lg' :
                  rank === 2 ? 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700/30 dark:to-gray-600/30 border-gray-400 dark:border-gray-600' :
                  'bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 border-orange-400 dark:border-orange-700'
                }`}
              >
                <CardHeader className="pb-2">
                  <Award className={`h-8 w-8 mx-auto mb-2
                    ${rank === 1 ? 'text-yellow-600 dark:text-yellow-400' :
                    rank === 2 ? 'text-gray-600 dark:text-gray-400' :
                    'text-orange-600 dark:text-orange-400'
                  }`} />
                  <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
                    {rank === 1 ? '1st Place' : rank === 2 ? '2nd Place' : '3rd Place'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {topPositions[rank] && topPositions[rank].users.length > 0 ? (
                    topPositions[rank].users.map((userEntry, userIndex) => (
                      <div key={`${rank}-${userEntry.username}-${userIndex}`} className="text-sm">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{userEntry.username}</span>
                        <span className={`ml-2 text-md font-bold
                          ${rank === 1 ? 'text-yellow-700 dark:text-yellow-300' :
                          rank === 2 ? 'text-gray-700 dark:text-gray-300' :
                          'text-orange-700 dark:text-orange-300'
                        }`}>
                          ({userEntry.score})
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">N/A</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* All Results List */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-md">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">All Test Results</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                A comprehensive list of all student mock test attempts (best score per student){selectedDate && ` for ${format(selectedDate, 'PPP')}`}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sortedResults.length > 0 ? (
                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                  {sortedResults.map((result, index) => (
                    <div key={result.user_id} className="flex justify-between items-center p-3 rounded-md border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-sm">
                      <span className="text-gray-800 dark:text-gray-200 font-medium">
                        {result.username || 'Unknown User'}
                      </span>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                        Score: {result.score}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                  No mock test results found {selectedDate ? `for ${format(selectedDate, 'PPP')}` : ''}.
                  {/* Removed conditional messages about login/admin as AdminLockout handles them */}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLockout>
  );
}
