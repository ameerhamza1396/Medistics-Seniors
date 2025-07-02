import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Moon,
  Sun,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Assuming your Supabase client is exported from this path
import { supabase } from '@/integrations/supabase/client';


const Checkout = () => {
  const { user } = useAuth(); // user object from useAuth should contain id and email
  const { theme, setTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [proofOfPayment, setProofOfPayment] = useState<File | null>(null);

  // Extract plan details from URL query parameters
  const planName = searchParams.get('planName');
  const price = searchParams.get('price');
  const duration = searchParams.get('duration');
  const currency = searchParams.get('currency');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setProofOfPayment(event.target.files[0]);
    }
  };

  const handleSubmitPaymentProof = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    if (!user) {
      setError("You must be logged in to submit a payment request.");
      setIsLoading(false);
      return;
    }

    if (!proofOfPayment) {
      setError("Please upload proof of payment.");
      setIsLoading(false);
      return;
    }

    if (!planName || !duration || !currency || !price) { // Ensure price is also checked
      setError("Missing plan details. Please go back and select a plan.");
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', proofOfPayment);
    formData.append('upload_preset', 'plans_purchase'); // Your Cloudinary upload preset
    formData.append('cloud_name', 'dabgjalqp'); // Your Cloudinary cloud name

    try {
      // 1. Upload to Cloudinary
      const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/dabgjalqp/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!cloudinaryResponse.ok) {
        const errorData = await cloudinaryResponse.json();
        throw new Error(errorData.error?.message || 'Failed to upload image to Cloudinary.');
      }

      const cloudinaryData = await cloudinaryResponse.json();
      const imageUrl = cloudinaryData.secure_url; // Get the secure URL of the uploaded image

      // 2. Insert data into Supabase table
      const { data, error: supabaseError } = await supabase
        .from('manual_payment_requests')
        .insert([
          {
            user_id: user.id,
            name: user.user_metadata?.full_name || user.email, // Use user's full name or email if name isn't available
            email: user.email,
            plan_name: planName,
            price: parseFloat(price), // Convert price to number for numeric column
            duration: duration,
            currency: currency,
            cloudinary_proof_url: imageUrl,
            // submission_timestamp will default to now()
            // status will default to 'pending'
          },
        ]);

      if (supabaseError) {
        throw new Error(supabaseError.message || 'Failed to record payment request in database.');
      }

      console.log('Payment request submitted to Supabase:', data);
      setSuccess("Your payment proof has been submitted. We will verify it shortly and activate your plan.");
      setProofOfPayment(null); // Clear the selected file after successful upload

    } catch (err: any) {
      console.error('Error during payment proof submission:', err);
      setError(err.message || 'An unexpected error occurred during submission. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img
              src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
              alt="Medistics Logo"
              className="w-8 h-8 object-contain"
            />
            <span className="text-xl font-bold text-gray-900 dark:text-white">Checkout</span>
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
            {user ? (
              <ProfileDropdown />
            ) : (
              <Link to="/login">
                <Button>Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 lg:px-8 py-12 lg:py-20 max-w-4xl">
        <div className="text-center mb-10 animate-fade-in">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Complete Your Purchase
          </h2>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Review your selected plan and proceed with manual payment.
          </p>
        </div>

        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-purple-200 dark:border-purple-800 shadow-xl mb-10 p-6 rounded-xl animate-slide-up">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl text-purple-700 dark:text-purple-300">Your Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="text-lg text-gray-700 dark:text-gray-300">
            <div className="flex justify-between items-center mb-2">
              <span>Plan:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{planName}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span>Duration:</span>
              <span className="font-semibold text-gray-900 dark:text-white capitalize">{duration}</span>
            </div>
            <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <span className="text-xl font-bold">Total:</span>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {currency === 'PKR' ? 'PKR ' : '$'}{price}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-purple-200 dark:border-purple-800 shadow-xl mb-10 p-6 rounded-xl animate-slide-up">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl text-purple-700 dark:text-purple-300">Manual Payment Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-lg text-gray-700 dark:text-gray-300">
            <p className="mb-4">
              Please transfer the total amount to the following JazzCash account:
            </p>
            <div className="flex items-center mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <img
                src="https://cdn.brandfetch.io/idkvKigo-P/w/1024/h/1024/theme/dark/logo.png?c=1dxbfHSJFAPEGdCLU4o5B"
                alt="JazzCash Logo"
                className="w-10 h-10 object-contain mr-3"
              />
              <div>
                <p className="font-semibold">Account Number: <span className="text-purple-600 dark:text-purple-400">03166891212</span></p>
                <p className="font-semibold">Account Name: <span className="text-purple-600 dark:text-purple-400">MedisticsApp</span></p>
              </div>
            </div>
            <p className="mb-4">
              Once you have made the payment, please upload a screenshot or photo of your payment receipt below. Your plan will be activated upon verification of your payment.
            </p>

            <div className="grid w-full max-w-sm items-center gap-1.5 mt-6">
              <Label htmlFor="payment-proof">Upload Payment Proof</Label>
              <Input
                id="payment-proof"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="file:text-purple-600 dark:file:text-purple-300"
              />
              {proofOfPayment && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Selected file: {proofOfPayment.name}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="text-center text-red-500 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 p-3 rounded-lg mb-6">
            <p className="font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="text-center text-green-600 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 p-3 rounded-lg mb-6">
            <p className="font-medium">{success}</p>
          </div>
        )}

        <div className="text-center mt-8">
          <Button
            className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 py-3 px-8 rounded-full text-lg font-semibold"
            onClick={handleSubmitPaymentProof}
            disabled={isLoading || !proofOfPayment || !planName || !duration || !currency || !price || !user}
          >
            {isLoading ? 'Submitting Proof...' : 'Submit Payment Proof'}
          </Button>
        </div>

        <div className="text-center mt-12 text-gray-500 dark:text-gray-400 text-sm italic">
          <p>Your plan will be activated after manual verification of the payment proof.</p>
        </div>
      </section>

      <div className="text-center mt-12 mb-4 text-gray-500 dark:text-gray-400 text-sm">
        <p>A Project by Educational Spot.</p>
        <p>&copy; 2025 Medistics. All rights reserved.</p>
      </div>
    </div>
  );
};

export default Checkout;