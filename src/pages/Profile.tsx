import { useState, useEffect } from 'react';
 import { useAuth } from '@/hooks/useAuth';
 import { supabase } from '@/integrations/supabase/client';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { useToast } from '@/hooks/use-toast';
 import { ArrowLeft } from 'lucide-react';
 import { Link } from 'react-router-dom';

 const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
  full_name: '',
  username: ''
  });
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [planExpiryDate, setPlanExpiryDate] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  useEffect(() => {
  if (user) {
  fetchProfile();
  fetchPlanDetails();
  }
  }, [user]);

  const fetchProfile = async () => {
  try {
  const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user?.id)
  .single();

  if (error && error.code !== 'PGRST116') {
  console.error('Error fetching profile:', error);
  return;
  }

  if (data) {
  setProfile({
  full_name: data.full_name || user?.user_metadata?.full_name || '',
  username: data.username || user?.user_metadata?.username || ''
  });
  } else {
  // If no profile exists, use user metadata
  setProfile({
  full_name: user?.user_metadata?.full_name || '',
  username: user?.user_metadata?.username || ''
  });
  }
  } catch (error: any) {
  console.error('Error fetching profile:', error);
  }
  };

  const fetchPlanDetails = async () => {
  if (user?.id) {
  setLoadingPlan(true);
  try {
  const { data, error } = await supabase
  .from('profiles')
  .select('plan, plan_expiry_date')
  .eq('id', user.id)
  .single();

  if (error) {
  console.error('Error fetching user plan:', error);
  setUserPlan('basic'); // Default plan
  setPlanExpiryDate(null);
  } else if (data) {
  setUserPlan(data.plan || 'basic');
  setPlanExpiryDate(data.plan_expiry_date || null);
  } else {
  setUserPlan('basic');
  setPlanExpiryDate(null);
  }
  } catch (err) {
  console.error('Unexpected error fetching user plan:', err);
  setUserPlan('basic');
  setPlanExpiryDate(null);
  } finally {
  setLoadingPlan(false);
  }
  } else {
  setUserPlan(null);
  setPlanExpiryDate(null);
  setLoadingPlan(false);
  }
  };


  const updateProfile = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!profile.full_name.trim() || !profile.username.trim()) {
  toast({
  title: "Validation Error",
  description: "Please fill in all required fields.",
  variant: "destructive",
  });
  return;
  }

  setLoading(true);

  try {
  // Check if username is already taken (by someone else)
  const { data: existingProfile, error: checkError } = await supabase
  .from('profiles')
  .select('id')
  .eq('username', profile.username)
  .neq('id', user?.id)
  .single();

  if (checkError && checkError.code !== 'PGRST116') {
  throw checkError;
  }

  if (existingProfile) {
  toast({
  title: "Username Taken",
  description: "This username is already in use. Please choose another.",
  variant: "destructive",
  });
  setLoading(false);
  return;
  }

  // Upsert the profile
  const { error } = await supabase
  .from('profiles')
  .upsert({
  id: user?.id,
  full_name: profile.full_name.trim(),
  username: profile.username.trim(),
  updated_at: new Date().toISOString()
  }, {
  onConflict: 'id'
  });

  if (error) throw error;

  toast({
  title: "Profile updated",
  description: "Your profile has been updated successfully.",
  });
  } catch (error: any) {
  console.error('Profile update error:', error);
  toast({
  title: "Error",
  description: error.message || "Failed to update profile. Please try again.",
  variant: "destructive",
  });
  } finally {
  setLoading(false);
  }
  };

  return (
  <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
  <div className="container mx-auto px-4 py-8 max-w-2xl">
  <div className="mb-6">
  <Link to="/dashboard" className="flex items-center text-purple-600 hover:text-purple-700 mb-4">
  <ArrowLeft className="w-4 h-4 mr-2" />
  </Link>
  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
  <p className="text-gray-600 dark:text-gray-300">Manage your account information</p>
  </div>

  <Card>
  <CardHeader>
  <CardTitle>Personal Information</CardTitle>
  <CardDescription>Update your personal details</CardDescription>
  </CardHeader>
  <CardContent>
  <form onSubmit={updateProfile} className="space-y-4">
  <div>
  <Label htmlFor="email">Email</Label>
  <Input
  id="email"
  type="email"
  value={user?.email || ''}
  disabled
  className="bg-gray-100 dark:bg-gray-800"
  />
  <p className="text-sm text-gray-500 mt-1">Email cannot be changed here</p>
  </div>

  <div>
  <Label htmlFor="full_name">Full Name *</Label>
  <Input
  id="full_name"
  value={profile.full_name}
  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
  placeholder="Enter your full name"
  required
  />
  </div>

  <div>
  <Label htmlFor="username">Username *</Label>
  <Input
  id="username"
  value={profile.username}
  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
  placeholder="Enter your username"
  required
  />
  <p className="text-sm text-gray-500 mt-1">This will be displayed on leaderboards</p>
  </div>

  <Button type="submit" disabled={loading} className="w-full">
  {loading ? 'Updating...' : 'Update Profile'}
  </Button>
  </form>
  </CardContent>
  </Card>

  <Card className="mt-6">
  <CardHeader>
  <CardTitle>Account Security</CardTitle>
  <CardDescription>Manage your password and security settings</CardDescription>
  </CardHeader>
  <CardContent>
  <Link to="/profile/password">
  <Button variant="outline" className="w-full">
  Change Password
  </Button>
  </Link>
  </CardContent>
  </Card>

  <Card className="mt-6">
  <CardHeader>
  <CardTitle>Subscription</CardTitle>
  <CardDescription>Manage your plan and billing</CardDescription>
  </CardHeader>
  <CardContent>
  <div className="flex items-center justify-between">
  <div>
  <p className="font-medium">Current Plan: {userPlan ? userPlan.charAt(0).toUpperCase() + userPlan.slice(1) : 'Basic'}</p>
  {planExpiryDate && (
  <p className="text-sm text-gray-600">Plan expires on: {new Date(planExpiryDate).toLocaleDateString()}</p>
  )}
  {!planExpiryDate &&  userPlan !== 'premium' && (
      <p className="text-sm text-gray-600">You are on free plan.</p>
  )}
  {!planExpiryDate &&  userPlan === 'premium' && (
      <p className="text-sm text-gray-600">You are on premium plan.</p>
  )}
  </div>
  <Link to="/pricing">
  <Button disabled={userPlan === 'premium'}>
  {userPlan === 'premium' ? 'Current Plan' : 'Upgrade Plan'}
  </Button>
  </Link>
  </div>
  </CardContent>
  </Card>
  </div>
  </div>
  );
 };

 export default Profile;
