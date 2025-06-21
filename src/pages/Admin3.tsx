import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Moon, Sun, Search, CalendarDays, Lock, Loader2 } from 'lucide-react'; // Import Lock icon
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const Admin3 = () => {
  const { theme, setTheme } = useTheme();
  const { user, isLoading: isUserLoading } = useAuth(); // Destructure isLoading from useAuth
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null); // The user currently being edited
  const [selectedPlanName, setSelectedPlanName] = useState('free'); // 'free', 'iconic', 'premium', 'custom'
  const [selectedDurationOption, setSelectedDurationOption] = useState('30_day'); // '24_hour', '3_day', '7_day', '30_day', '365_day', 'custom_date'
  const [customExpiryDate, setCustomExpiryDate] = useState('');

  // --- Fetch User Profile to Check Role ---
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle to handle cases where no profile is found

      if (error) {
        console.error('Error fetching profile:', error);
        // Optionally toast an error, but don't prevent loading if it's just no profile
        return null;
      }
      return data;
    },
    enabled: !!user?.id, // Only run this query if a user is logged in
  });

  // Determine if the current user is an admin
  const isAdmin = profile?.role === 'admin';

  // --- Search Users Query ---
  const { data: users, isLoading: isSearching, refetch: refetchUsers } = useQuery({
    queryKey: ['adminUsers', searchTerm],
    queryFn: async () => {
      if (!searchTerm) return []; // Don't search if no term is entered
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, plan, plan_expiry_date')
        .ilike('username', `%${searchTerm}%`);

      if (error) {
        toast({
          title: "Error searching users",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }
      return data;
    },
    // Only enable this query if a search term is present AND the user is an admin
    enabled: !!searchTerm.length && isAdmin,
    staleTime: 0,
  });

  // --- Update User Plan Mutation ---
  const updatePlanMutation = useMutation({
    mutationFn: async ({ userId, newPlan, newExpiryDate }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          plan: newPlan,
          plan_expiry_date: newExpiryDate,
        })
        .eq('id', userId);

      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Plan Updated",
        description: `User plan successfully updated.`,
        variant: "success",
      });
      queryClient.invalidateQueries(['adminUsers', searchTerm]);
      setSelectedUser(null);
      setSearchTerm('');
    },
    onError: (error) => {
      toast({
        title: "Failed to Update Plan",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  // --- Plan Expiry Date Calculation ---
  const calculateExpiryDate = (planType, durationOption, customDate = null) => {
    if (planType === 'free') {
      return null;
    }

    let expiryDate = new Date();

    if (planType === 'custom' && customDate) {
      const parsedDate = new Date(customDate);
      if (!isNaN(parsedDate.getTime())) { // Use getTime() for robust date validation
        return parsedDate.toISOString();
      } else {
        toast({
          title: "Invalid Custom Date",
          description: "Please enter a valid date for the custom plan.",
          variant: "destructive",
        });
        return null;
      }
    }

    // Handle duration options for 'iconic' and 'premium'
    if (durationOption === '24_hour') {
      expiryDate.setHours(expiryDate.getHours() + 24);
    } else if (durationOption === '3_day') {
      expiryDate.setDate(expiryDate.getDate() + 3);
    } else if (durationOption === '7_day') {
      expiryDate.setDate(expiryDate.getDate() + 7);
    } else if (durationOption === '30_day') {
      expiryDate.setDate(expiryDate.getDate() + 30);
    } else if (durationOption === '365_day') {
      expiryDate.setDate(expiryDate.getDate() + 365);
    } else if (durationOption === 'custom_date' && customDate) {
      const parsedDate = new Date(customDate);
      if (!isNaN(parsedDate.getTime())) {
        expiryDate = parsedDate;
      } else {
        toast({
          title: "Invalid Custom Date",
          description: "Please enter a valid date for the custom duration.",
          variant: "destructive",
        });
        return null;
      }
    } else {
      // Default to 30 days if no specific duration option is selected or custom date is invalid
      expiryDate.setDate(expiryDate.getDate() + 30);
    }

    return expiryDate.toISOString();
  };

  const handleUpdatePlan = () => {
    if (!selectedUser) {
      toast({
        title: "No User Selected",
        description: "Please select a user to update their plan.",
        variant: "destructive",
      });
      return;
    }

    let newExpiry = null;
    if (selectedPlanName === 'free') {
      newExpiry = null;
    } else if (selectedPlanName === 'custom') {
      newExpiry = calculateExpiryDate('custom', null, customExpiryDate);
    } else {
      newExpiry = calculateExpiryDate(selectedPlanName, selectedDurationOption, customExpiryDate);
    }

    if (newExpiry === null && selectedPlanName !== 'free') {
      return; // Stop if expiry date calculation failed for a paid plan
    }

    updatePlanMutation.mutate({
      userId: selectedUser.id,
      newPlan: selectedPlanName,
      newExpiryDate: newExpiry,
    });
  };

  useEffect(() => {
    if (selectedUser) {
      let initialPlan = selectedUser.plan || 'free';
      // Map existing plan types to the UI radio buttons
      if (['24_hour', '3_day', '7_day', '30_day'].includes(initialPlan)) {
        initialPlan = 'iconic';
      } else if (['365_day'].includes(initialPlan)) {
        initialPlan = 'premium';
      }
      setSelectedPlanName(initialPlan);

      // Set initial duration option based on current plan or default
      if (['iconic', 'premium'].includes(initialPlan)) {
        // If the user's plan is actually a specific duration (e.g., '24_hour'), pre-select it
        if (['24_hour', '3_day', '7_day', '30_day', '365_day'].includes(selectedUser.plan)) {
            setSelectedDurationOption(selectedUser.plan);
        } else {
            setSelectedDurationOption('30_day'); // Default for iconic/premium if no specific duration is set
        }
      } else if (initialPlan === 'custom' && selectedUser.plan_expiry_date) {
        setSelectedDurationOption('custom_date');
      } else {
        setSelectedDurationOption('30_day');
      }

      if (selectedUser.plan_expiry_date) {
        setCustomExpiryDate(new Date(selectedUser.plan_expiry_date).toISOString().split('T')[0]);
      } else {
        setCustomExpiryDate('');
      }
    } else {
      setSelectedPlanName('free');
      setSelectedDurationOption('30_day');
      setCustomExpiryDate('');
    }
  }, [selectedUser]);


  // --- Render Logic for Access Control ---
  // Display a loading screen while user and profile data are being fetched
  if (isUserLoading || isProfileLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading admin panel...
      </div>
    );
  }

  // If no user is logged in, show access denied
  if (!user) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 text-center">
        <Lock className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-lg mb-4">You must be logged in to access this page.</p>
        <Link to="/login" className="text-blue-500 hover:underline">Go to Login</Link>
      </div>
    );
  }

  // If user is logged in but not an admin, show unauthorized access
  if (!isAdmin) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 text-center">
        <Lock className="w-16 h-16 text-red-500 dark:text-red-400 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Unauthorized Access</h1>
        <p className="text-lg mb-4">You do not have administrative privileges to view this page.</p>
        <Link to="/dashboard" className="text-blue-500 hover:underline">Go to Dashboard</Link>
      </div>
    );
  }

  // --- Main Component Render (only if authorized and data loaded) ---
  return (
    <div className="min-h-screen w-full bg-white dark:bg-gray-900">
      {/* Header - Consistent with Dashboard and other Admin pages */}
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
            <span className="text-xl font-bold text-gray-900 dark:text-white">User Plan Management</span>
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
            👤 User Plan Management
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Search for users and update their subscription plans and expiry dates.
          </p>
        </div>

        {/* User Search Card */}
        <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300 animate-slide-up mb-8">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Search Users</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Enter a username (or part of it) to find users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder="Search by username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-grow dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
              <Button onClick={refetchUsers} disabled={!searchTerm || isSearching} className="bg-gradient-to-r from-blue-600 to-teal-600 text-white hover:from-blue-700 hover:to-teal-700">
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
            {isSearching && <p className="text-center text-gray-500 dark:text-gray-400 mt-4">Searching...</p>}
            {users && users.length > 0 && (
              <div className="mt-6 space-y-4 max-h-96 overflow-y-auto">
                <p className="text-gray-800 dark:text-gray-200 font-semibold">Search Results:</p>
                {users.map((u) => (
                  <Card key={u.id} className={`p-4 cursor-pointer ${selectedUser?.id === u.id ? 'bg-purple-100 dark:bg-purple-800/50 border-purple-500' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700'}`}
                    onClick={() => setSelectedUser(u)}>
                    <CardTitle className="text-lg">{u.username}</CardTitle>
                    <CardDescription className="text-sm">
                      Current Plan: <Badge variant="outline" className="mr-2">{u.plan || 'Free'}</Badge>
                      Expires: {u.plan_expiry_date ? new Date(u.plan_expiry_date).toLocaleDateString() : 'N/A'}
                    </CardDescription>
                  </Card>
                ))}
              </div>
            )}
            {users && users.length === 0 && searchTerm && !isSearching && (
              <p className="text-center text-gray-500 dark:text-gray-400 mt-4">No users found for "{searchTerm}".</p>
            )}
          </CardContent>
        </Card>

        {/* Plan Update Card (shown only when a user is selected) */}
        {selectedUser && (
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-300 animate-slide-up">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Update Plan for {selectedUser.username}</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Set a new subscription plan and expiry date for this user.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Plan Type Selection (Free, Iconic, Premium, Custom) */}
                <div>
                  <Label htmlFor="plan-type" className="mb-2 block">Select Plan Type:</Label>
                  <RadioGroup value={selectedPlanName} onValueChange={setSelectedPlanName} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="free" id="plan-free" />
                      <Label htmlFor="plan-free">Free Plan</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="iconic" id="plan-iconic" />
                      <Label htmlFor="plan-iconic">Iconic Plan</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="premium" id="plan-premium" />
                      <Label htmlFor="plan-premium">Premium Plan</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="plan-custom" />
                      <Label htmlFor="plan-custom">Custom Plan</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Duration Options (for Iconic/Premium Plans) */}
                {(selectedPlanName === 'iconic' || selectedPlanName === 'premium') && (
                  <div>
                    <Label htmlFor="duration-option" className="mb-2 block">Select Duration:</Label>
                    <Select value={selectedDurationOption} onValueChange={setSelectedDurationOption}>
                      <SelectTrigger id="duration-option" className="w-full dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                        <SelectValue placeholder="Select a duration" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                        <SelectItem value="24_hour">24 Hours</SelectItem>
                        <SelectItem value="3_day">3 Days</SelectItem>
                        <SelectItem value="7_day">7 Days</SelectItem>
                        <SelectItem value="30_day">30 Days (Default)</SelectItem>
                        <SelectItem value="365_day">365 Days</SelectItem>
                        <SelectItem value="custom_date">Custom Date Input</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Custom Date Input (shown for 'custom' plan or 'custom_date' duration) */}
                {(selectedPlanName === 'custom' || selectedDurationOption === 'custom_date') && (
                  <div>
                    <Label htmlFor="custom-date" className="mb-2 block">
                      <CalendarDays className="inline-block w-4 h-4 mr-2" /> Custom Expiry Date:
                    </Label>
                    <Input
                      type="date"
                      id="custom-date"
                      value={customExpiryDate}
                      onChange={(e) => setCustomExpiryDate(e.target.value)}
                      className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Enter the exact date for plan expiry.
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleUpdatePlan}
                  disabled={updatePlanMutation.isPending}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
                >
                  {updatePlanMutation.isPending ? 'Updating...' : 'Update Plan'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Admin3;
