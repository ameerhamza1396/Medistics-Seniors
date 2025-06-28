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
import React, { useState } from 'react'; // Import useState for local state

const Checkout = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false); // New state for loading indicator
  const [error, setError] = useState<string | null>(null); // New state for errors

  // Extract plan details from URL query parameters
  const planName = searchParams.get('planName');
  const price = searchParams.get('price'); // This price is for display only now
  const duration = searchParams.get('duration');
  const currency = searchParams.get('currency');

  // --- NEW: Function to handle Stripe Checkout initiation ---
  const handleStripeCheckout = async () => {
    setIsLoading(true);
    setError(null); // Clear any previous errors

    // Basic validation of plan details
    if (!planName || !duration || !currency) {
      setError("Missing plan details. Please go back and select a plan.");
      setIsLoading(false);
      return;
    }

    try {
      // Prepare data to send to your backend
      const checkoutData = {
        planName,
        duration,
        currency,
        userId: user?.id, // Pass Supabase user ID if available (important for linking)
        userEmail: user?.email, // Pass user email for pre-filling Stripe checkout
      };

      // Make an API call to your backend to create a Stripe Checkout Session
      // You'll need to create this API endpoint on your separate backend server
      const response = await fetch('/api/create-stripe-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create Stripe Checkout session.');
      }

      const { url } = await response.json();

      // Redirect the user to Stripe's hosted Checkout page
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('Stripe Checkout URL not received.');
      }

    } catch (err: any) { // Type the error as 'any' for simpler handling
      console.error('Error initiating Stripe Checkout:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
      {/* Header - Consistent with Dashboard */}
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
            {/* Theme Toggle */}
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

      {/* Checkout Section */}
      <section className="container mx-auto px-4 lg:px-8 py-12 lg:py-20 max-w-4xl">
        <div className="text-center mb-10 animate-fade-in">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Complete Your Purchase
          </h2>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Review your selected plan and proceed to secure payment.
          </p>
        </div>

        {/* Selected Plan Summary */}
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
              {/* NOTE: This 'price' is from your URL params. Stripe will ultimately determine the price based on the Price ID sent from the backend. */}
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {currency === 'PKR' ? 'PKR ' : '$'}{price}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Removed the manual payment methods section entirely */}

        {/* Error Display */}
        {error && (
          <div className="text-center text-red-500 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 p-3 rounded-lg mb-6">
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* NEW: Proceed to Secure Payment Button */}
        <div className="text-center mt-8">
          <Button
            className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 py-3 px-8 rounded-full text-lg font-semibold"
            onClick={handleStripeCheckout}
            disabled={isLoading || !planName || !duration || !currency} // Disable if loading or missing params
          >
            {isLoading ? 'Redirecting to Payment...' : 'Proceed to Secure Payment'}
          </Button>
        </div>

        {/* Note about Autopayment - Removed/Updated for Stripe */}
        <div className="text-center mt-12 text-gray-500 dark:text-gray-400 text-sm italic">
          <p>Your payment will be securely processed by Stripe.</p>
        </div>
      </section>

      {/* Footer Text - Consistent with Dashboard */}
      <div className="text-center mt-12 mb-4 text-gray-500 dark:text-gray-400 text-sm">
        <p>A Project by Educational Spot.</p>
        <p>&copy; 2025 Medistics. All rights reserved.</p>
      </div>
    </div>
  );
};

export default Checkout;