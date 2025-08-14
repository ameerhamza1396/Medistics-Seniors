import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client'; // Still needed for profile creation via signUp
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import Seo from '@/components/Seo'; // Import the Seo component

const Signup = () => {
  const { signUp, user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    // username: '', // Removed: Username input is no longer part of signup form
    fullName: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  // Removed username-related state variables as they are no longer needed for pre-checking
  // const [emailExists, setEmailExists] = useState(false); // This is not used for pre-checking as per security best practices
  // const [usernameExists, setUsernameExists] = useState(false);
  // const [checkingEmail, setCheckingEmail] = useState(false);
  // const [checkingUsername, setCheckingUsername] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard'); // User is already logged in, go to dashboard
    }
  }, [user, navigate]);

  // Removed: Email validation and availability check useEffect
  // Removed: Username validation and availability check useEffect

  // Real-time validation (updated for removed username)
  useEffect(() => {
    const errors: Record<string, string> = {};

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Full name validation
    if (formData.fullName && formData.fullName.length < 2) {
      errors.fullName = 'Full name must be at least 2 characters';
    }

    // Password validation
    if (formData.password) {
      if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
      }
    }

    // Confirm password validation
    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    } else if (formData.confirmPassword && !formData.password) {
        errors.confirmPassword = 'Please enter your password first';
    }

    setValidationErrors(errors);
  }, [formData]); // Dependencies reduced as username-related states are removed

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for validation errors
    if (Object.keys(validationErrors).length > 0) { // usernameExists check removed
      toast({
        title: "Validation Error",
        description: "Please fix the errors before submitting",
        variant: "destructive",
      });
      return;
    }

    // Ensure all required fields have data before attempting signup
    // Removed !formData.username as it's no longer collected on this form
    if (!formData.email || !formData.fullName || !formData.password || !formData.confirmPassword) {
        toast({
            title: "Missing Information",
            description: "Please fill in all required fields.",
            variant: "destructive",
        });
        return;
    }

    setLoading(true);

    try {
      console.log('Submitting signup with data:', {
        email: formData.email,
        fullName: formData.fullName,
        // username is NOT sent here; it will be NULL by default in Supabase
      });

      const { data, error } = await signUp(formData.email, formData.password, {
        fullName: formData.fullName,
        // username: null // Explicitly pass null, or omit it if useAuth handles default null
                        // Assuming `useAuth`'s signUp properly handles optional fields.
      });

      if (!error && data) {
        // For email/password signup, Supabase typically sends a verification email.
        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account.",
          duration: 7000,
        });
        navigate('/verify-email', { state: { email: formData.email } }); // Redirect to a new page asking the user to check their inbox
      } else if (error) {
          if (error.message.includes("already registered")) {
              toast({
                  title: "Signup Failed",
                  description: "This email is already registered. Please try logging in or use a different email.",
                  variant: "destructive",
              });
          } else {
              throw error; // Re-throw other errors
          }
      }
    } catch (error: any) {
      console.error('Signup submission error:', error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred during signup",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      // The signInWithGoogle function will handle the redirect
    } catch (error) {
      console.error('Error signing up with Google:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInputIcon = (fieldName: string, isChecking: boolean, hasError: boolean, hasValue: boolean) => {
    // isChecking parameter is now unused for email as we removed its check.
    // If you plan to add real-time email validity checks (not existence), you can use it.
    if (hasValue && !hasError) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (hasError) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Seo
        title="Sign Up"
        description="Create a free account on Medistics App to start your MDCAT preparation journey with AI-powered quizzes, mock tests, and study materials."
        canonical="https://medistics.app/signup"
      />
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center text-purple-600 hover:text-purple-700 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Account</h1>
          <p className="text-gray-600 dark:text-gray-300">Join the best medical learning platform</p>
        </div>

        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>Enter your details to create your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    className={validationErrors.email ? "border-red-500" : ""}
                    required
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {getInputIcon('email', false, !!validationErrors.email, !!formData.email)}
                  </div>
                </div>
                {validationErrors.email && (
                  <p className="text-red-500 text-sm">{validationErrors.email}</p>
                )}
              </div>

              {/* Removed Username Input Section */}
              {/*
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Choose a username"
                    className={validationErrors.username ? "border-red-500" : ""}
                    required
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {getInputIcon('username', checkingUsername, !!validationErrors.username, !!formData.username)}
                  </div>
                </div>
                {validationErrors.username && (
                  <p className="text-red-500 text-sm">{validationErrors.username}</p>
                )}
              </div>
              */}

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <Input
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className={validationErrors.fullName ? "border-red-500" : ""}
                    required
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {getInputIcon('fullName', false, !!validationErrors.fullName, !!formData.fullName)}
                  </div>
                </div>
                {validationErrors.fullName && (
                  <p className="text-red-500 text-sm">{validationErrors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Create a password"
                    className={validationErrors.password ? "border-red-500" : ""}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="text-red-500 text-sm">{validationErrors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your password"
                    className={validationErrors.confirmPassword ? "border-red-500" : ""}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {validationErrors.confirmPassword && (
                  <p className="text-red-500 text-sm">{validationErrors.confirmPassword}</p>
                )}
              </div>

              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                By continuing, you agree to our{' '}
                <Link to="/privacypolicy" className="underline text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300">
                  Privacy Policy
                </Link>{' '}
                and{' '}
                <Link to="/terms" className="underline text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300">
                  Terms & Conditions
                </Link>.
              </p>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                disabled={loading || Object.keys(validationErrors).length > 0} // usernameExists removed from disabled condition
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-purple-300 dark:border-purple-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white/80 dark:bg-gray-800/80 px-2 text-gray-500 dark:text-gray-400">Or</span>
                </div>
            </div>

            <Button
                type="button"
                variant="outline"
                className="w-full border-purple-300 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:scale-105 transition-all duration-200"
                onClick={handleGoogleSignIn}
                disabled={loading}
            >
                <div className="flex items-center justify-center space-x-2">
                    <img src="/googlelogo.svg" // Corrected path to be relative from public folder if it is in root
                    alt="Google Logo"
                    className="w-4 h-4" />
                    <span className="text-gray-900 dark:text-white">Sign up with Google</span>
                </div>
            </Button>

            <div className="text-center mt-4">
              <p className="text-gray-600 dark:text-gray-300">
                Already have an account?{' '}
                <Link to="/login" className="text-purple-600 hover:text-purple-700 font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
