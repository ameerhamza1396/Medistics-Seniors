// src/pages/VerifyEmail.tsx
import { Link } from 'react-router-dom';
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react'; // <--- Add ArrowLeft here
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const VerifyEmail = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in text-center">
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-col items-center">
            <Mail className="w-16 h-16 text-purple-600 dark:text-purple-400 mb-4" />
            <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
              Verify Your Email
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300 mt-2 text-center">
              We've sent a verification link to your email address.
              Please check your inbox (and spam folder!) to confirm your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <p>Once you've verified your email, you can proceed to log in.</p>
            </div>
            <Link to="/login">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                Go to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Link to="/" className="inline-flex items-center text-purple-600 hover:text-purple-700 mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> {/* This is where ArrowLeft is used */}
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default VerifyEmail;