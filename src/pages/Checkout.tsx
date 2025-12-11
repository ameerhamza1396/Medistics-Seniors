import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Moon,
    Sun,
    CheckCircle,
    XCircle,
    BadgePercent,
    ShieldCheck,
    MessageSquare,
    Send
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import Seo from '@/components/Seo';

// Shadcn UI components for the Dialog
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';

// WhatsApp number and Instagram handle
const WHATSAPP_NUMBER = '+923242456162';
const INSTAGRAM_HANDLE = '@ameerhamza.exe';
const INSTAGRAM_LINK = 'https://www.instagram.com/ameerhamza.exe';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}`; // Format for WhatsApp link

// PostgreSQL Error Code for unique_violation
const POSTGRES_UNIQUE_VIOLATION_CODE = '23505';

const Checkout = () => {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const [searchParams] = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    // NEW STATE: To track if access has been requested
    const [hasRequestedAccess, setHasRequestedAccess] = useState(false);

    // Promocode states
    const [promoCode, setPromoCode] = useState('');
    const [promoCodeError, setPromoCodeError] = useState<string | null>(null);
    const [discountedPrice, setDiscountedPrice] = useState<number | null>(null);
    const [isPromoApplied, setIsPromoApplied] = useState(false);
    const [promoDiscountDisplay, setPromoDiscountDisplay] = useState<string | null>(null);

    // Extract plan details from URL query parameters
    const planName = searchParams.get('planName');
    const basePriceStr = searchParams.get('price');
    const duration = searchParams.get('duration');
    const currency = searchParams.get('currency');

    // Convert basePrice to number for calculations
    const basePrice = basePriceStr ? parseFloat(basePriceStr) : 0;

    // Use a derived state for the current total price
    const currentTotalPrice = discountedPrice !== null ? discountedPrice : basePrice;

    // Effect to reset promo code states if plan details change
    useEffect(() => {
        setPromoCode('');
        setPromoCodeError(null);
        setDiscountedPrice(null);
        setIsPromoApplied(false);
        setPromoDiscountDisplay(null);
        setError(null);
        // Reset request status on plan change - optional, but useful if user is choosing a *different* plan
        setHasRequestedAccess(false);
    }, [planName, duration, currency, basePriceStr]);

    // NEW useEffect: Check for existing request on component load if the user is logged in
    // This assumes the 'beta_access_requests' table has RLS policies allowing authenticated users to read their own request status.
    useEffect(() => {
        const checkExistingRequest = async () => {
            if (user && planName && duration) { // Only check if logged in and plan details exist
                try {
                    const { data, error: fetchError } = await supabase
                        .from('beta_access_requests')
                        .select('id')
                        .eq('user_id', user.id)
                        .eq('plan_name', planName)
                        .eq('duration', duration) // Filter by plan/duration to be specific
                        .limit(1);

                    if (data && data.length > 0) {
                        setHasRequestedAccess(true);
                        setError("You have already submitted a request for this plan. The developer will review and update your status shortly.");
                    }
                } catch (e) {
                    console.error('Error checking existing request:', e);
                }
            }
        };

        checkExistingRequest();
    }, [user, planName, duration]);


    // Handles the application of a promo code by calling Supabase RPC function (Kept logic for promo calculation)
    const handleApplyPromoCode = async () => {
        setPromoCodeError(null);
        setIsPromoApplied(false);
        setDiscountedPrice(null);
        setPromoDiscountDisplay(null);

        if (!promoCode) {
            setPromoCodeError('Please enter a promo code.');
            return;
        }
        if (!planName || !duration || !currency || !basePriceStr) {
            setPromoCodeError("Missing plan details. Cannot apply promo code.");
            return;
        }

        setIsLoading(true);
        try {
            // NOTE: This call assumes the 'validate_promo_code' RPC function exists in your Supabase schema.
            const { data, error: rpcError } = await supabase.rpc('validate_promo_code', {
                p_code: promoCode,
                p_plan_name: planName,
                p_duration: duration,
                p_currency: currency,
                p_current_price: basePrice,
            });

            if (rpcError) {
                setPromoCodeError(rpcError.message || 'An error occurred during promo code validation.');
                return;
            }

            if (!data || data.length === 0) {
                setPromoCodeError('Failed to get a valid response from the promo code service. Please try again.');
                return;
            }

            const result = data[0];
            if (result.valid) {
                setDiscountedPrice(result.adjusted_price);
                setIsPromoApplied(true);

                let discountText = '';
                if (result.discount_type === 'percentage') {
                    discountText = `${result.discount_value}% OFF`;
                } else if (result.discount_type === 'flat') {
                    const symbol = currency === 'PKR' ? 'PKR ' : (currency === '$' ? '$' : '');
                    discountText = `${symbol}${result.discount_value} OFF`;
                }
                setPromoDiscountDisplay(discountText);
                setError(null);
            } else {
                setPromoCodeError(result.error_message || 'Promo code is not valid.');
                setDiscountedPrice(null);
                setIsPromoApplied(false);
                setPromoDiscountDisplay(null);
            }
        } catch (err: any) {
            console.error('Unexpected error applying promo code:', err);
            setPromoCodeError('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // MODIFIED: Handles the submission of a Beta Access Request to Supabase
    const handleBetaAccessRequest = async () => {
        setError(null);
        setIsLoading(true);

        if (!user) {
            setError("You must be logged in to request beta access.");
            setIsLoading(false);
            return;
        }

        if (!planName || !duration || !currency || !basePriceStr) {
            setError("Missing plan details. Please go back and select a plan.");
            setIsLoading(false);
            return;
        }

        try {
            // 1. Insert the beta access request data into a new Supabase table
            // You MUST ensure a table named 'beta_access_requests' exists in your Supabase DB.
            const { error: supabaseError } = await supabase
                .from('beta_access_requests')
                .insert([
                    {
                        user_id: user.id,
                        email: user.email,
                        plan_name: planName,
                        price: currentTotalPrice,
                        duration: duration,
                        currency: currency,
                        promo_code_applied: isPromoApplied ? promoCode : null,
                        original_price: basePrice,
                        discount_amount: isPromoApplied ? (basePrice - currentTotalPrice) : 0,
                        status: 'requested', // Default status
                    },
                ]);

            if (supabaseError) {
                // Check for the unique constraint violation error code
                if (supabaseError.code === POSTGRES_UNIQUE_VIOLATION_CODE) {
                    console.warn('Supabase Beta Request Duplicate Error:', supabaseError);
                    setHasRequestedAccess(true); // Set state to disable button
                    setError("A premium access request for this plan has already been submitted by your account. The developer is reviewing all pending requests.");
                } else {
                    console.error('Supabase Beta Request Error:', supabaseError);
                    throw new Error(supabaseError.message || 'Failed to record beta access request in database.');
                }
                return; // Exit if there was an error
            }

            console.log('Beta Access Request submitted to Supabase successfully.');
            setHasRequestedAccess(true); // Set state to disable the button on success
            setShowSuccessDialog(true); // Show the success dialog

            // Clear fields/states after successful submission
            setPromoCode('');
            setPromoCodeError(null);
            setDiscountedPrice(null);
            setIsPromoApplied(false);
            setPromoDiscountDisplay(null);
            setError(null); // Clear any general error before showing success dialog

        } catch (err: any) {
            console.error('Error during beta access request submission:', err);
            setError(err.message || 'An unexpected error occurred during submission. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const isSubmissionDisabled = isLoading || hasRequestedAccess || !planName || !duration || !currency || !basePriceStr || !user;

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
            <Seo
                title="Checkout (Beta)"
                description="This application is in beta preview. Contact the developer for premium access."
                canonical="https://medmacs.app/checkout"
            />
            <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50">
                <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <img
                            src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
                            alt="Medmacs Logo"
                            className="w-8 h-8 object-contain"
                        />
                        <span className="text-xl font-bold text-gray-900 dark:text-white">Checkout (Beta Preview)</span>
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
                        Premium Access is Currently in Beta
                    </h2>
                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Review your selected plan. To unlock full features and AI mode, please contact the developer directly.
                    </p>
                </div>

                <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-purple-200 dark:border-purple-800 shadow-xl mb-6 p-6 rounded-xl animate-slide-up">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-2xl text-purple-700 dark:text-purple-300">Your Selected Plan</CardTitle>
                    </CardHeader>
                    <CardContent className="text-lg text-gray-700 dark:text-gray-300">
                        <div className="flex justify-between items-center mb-2">
                            <span>Plan:</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{planName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span>Duration:</span>
                            <span className="font-semibold text-gray-900 dark:text-white capitalize">{duration || 'N/A'}</span>
                        </div>
                        {/* Conditional display for original price if promo is applied */}
                        {isPromoApplied && basePriceStr && (
                            <div className="flex justify-between items-center mb-2 text-red-500 dark:text-red-400">
                                <span className="line-through">Original Price:</span>
                                <span className="font-semibold line-through">
                                    {currency === 'PKR' ? 'PKR ' : '$'}{parseFloat(basePriceStr).toFixed(2)}
                                </span>
                            </div>
                        )}
                        {/* Conditional display for discount */}
                        {isPromoApplied && (
                            <div className="flex justify-between items-center mb-2 text-green-600 dark:text-green-400">
                                <span>Discount:</span>
                                <span className="font-semibold">{promoDiscountDisplay}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                            <span className="text-xl font-bold">Total Price:</span>
                            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                {currency === 'PKR' ? 'PKR ' : '$'}{currentTotalPrice.toFixed(2)}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Promo Code Section (Kept for demonstration/logic testing) */}
                <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-purple-200 dark:border-purple-800 shadow-xl mb-10 p-6 rounded-xl animate-slide-up">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-2xl text-purple-700 dark:text-purple-300 flex items-center">
                            <BadgePercent className="mr-2 h-6 w-6" /> Apply Promo Code
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="flex space-x-2">
                            <Input
                                type="text"
                                placeholder="Enter promo code"
                                value={promoCode}
                                onChange={(e) => {
                                    setPromoCode(e.target.value);
                                    setPromoCodeError(null);
                                    setIsPromoApplied(false);
                                    setDiscountedPrice(null);
                                    setPromoDiscountDisplay(null);
                                }}
                                className="flex-grow dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                disabled={isLoading}
                            />
                            <Button
                                onClick={handleApplyPromoCode}
                                disabled={isLoading || !promoCode || !planName || !duration || !currency || !basePriceStr}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                {isLoading ? 'Applying...' : 'Apply'}
                            </Button>
                        </div>
                        {promoCodeError && (
                            <p className="text-red-500 text-sm flex items-center">
                                <XCircle className="h-4 w-4 mr-1" /> {promoCodeError}
                            </p>
                        )}
                        {isPromoApplied && !promoCodeError && (
                            <p className="text-green-600 text-sm flex items-center">
                                <CheckCircle className="h-4 w-4 mr-1" /> Promo code applied: <span className="font-semibold ml-1">{promoDiscountDisplay}</span>
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* MODIFIED Payment Instructions/Beta Access Card */}
                <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-green-400 dark:border-green-600 shadow-xl mb-10 p-6 rounded-xl animate-slide-up">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-2xl text-green-700 dark:text-green-300 flex items-center">
                            <ShieldCheck className="mr-2 h-6 w-6" /> Premium Access (Beta)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-lg text-gray-700 dark:text-gray-300">
                        <p className="mb-4 font-semibold text-xl">
                            The application is currently in <span className="font-bold">Beta Preview</span>, and payment functionality is disabled.
                        </p>
                        <p className="mb-4">
                            If you are interested in <span className="font-bold">testing paid plans</span> and <span className="font-bold">unlocking the AI mode</span>, please contact the developer directly for access.
                        </p>
                        <div className="space-y-3">
                            <div className="flex items-center p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                                <MessageSquare className="w-6 h-6 mr-3 text-green-600 dark:text-green-400" />
                                <p className="font-bold">
                                    Contact me on Instagram:
                                    <a
                                        href={INSTAGRAM_LINK}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-2 text-purple-600 dark:text-purple-400 hover:underline transition-colors"
                                    >
                                        {INSTAGRAM_HANDLE}
                                    </a>
                                </p>
                            </div>
                            {/* Added WhatsApp Contact */}
                            <div className="flex items-center p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                                <Send className="w-6 h-6 mr-3 text-green-600 dark:text-green-400" />
                                <p className="font-bold">
                                    Message me on WhatsApp:
                                    <a
                                        href={WHATSAPP_LINK}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-2 text-purple-600 dark:text-purple-400 hover:underline transition-colors"
                                    >
                                        {WHATSAPP_NUMBER}
                                    </a>
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-6 italic">
                            No payment is required at this time. Click the button below to register your interest for premium beta access.
                        </p>
                    </CardContent>
                </Card>

                {error && (
                    <div className="text-center text-red-500 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 p-3 rounded-lg mb-6 flex items-center justify-center">
                        <XCircle className="h-5 w-5 mr-2" />
                        <p className="font-medium">{error}</p>
                    </div>
                )}

                <div className="text-center mt-8">
                    <Button
                        className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 py-3 px-8 rounded-full text-lg font-semibold"
                        onClick={handleBetaAccessRequest}
                        disabled={isSubmissionDisabled}
                    >
                        {
                            hasRequestedAccess ? 'Request Already Submitted' :
                                isLoading ? 'Sending Request...' :
                                    'Request Premium Beta Access'
                        }
                    </Button>
                </div>

                <div className="text-center mt-12 text-gray-500 dark:text-gray-400 text-sm italic">
                    <p>Your plan status will be updated after developer-side approval.</p>
                </div>
            </section>

            <div className="text-center mt-12 mb-4 text-gray-500 dark:text-gray-400 text-sm">
                <p>A Project by Hmacs Studios.</p>
                <p>&copy; 2025 Medmaccs. All rights reserved.</p>
            </div>

            {/* Success Dialog (Modified to be the Beta Access Confirmation) */}
            <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                <DialogContent className="sm:max-w-[450px] p-6 text-center">
                    <DialogHeader className="flex flex-col items-center justify-center mb-4">
                        <MessageSquare className="h-16 w-16 text-purple-500 mb-4" />
                        <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                            Beta Access Request Sent!
                        </DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-gray-300 mt-2">
                            Thank you for your interest in the <span className="font-bold">Premium Beta</span>. Your request has been recorded.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 text-left text-gray-700 dark:text-gray-300">
                        <p className="font-medium">
                            To gain access to the premium features and AI mode, please contact the developer via:
                        </p>
                        <div className="space-y-2">
                            <p className="text-center text-xl font-bold text-purple-600 dark:text-purple-400">
                                Instagram: <a href={INSTAGRAM_LINK} target="_blank" rel="noopener noreferrer" className="hover:underline">{INSTAGRAM_HANDLE}</a>
                            </p>
                            <p className="text-center text-xl font-bold text-purple-600 dark:text-purple-400">
                                WhatsApp: <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="hover:underline">{WHATSAPP_NUMBER}</a>
                            </p>
                        </div>
                        <p>
                            Mention the <span className="font-bold">plan you selected</span> to expedite your access!
                        </p>
                    </div>
                    <DialogFooter className="mt-6 flex justify-center space-x-4">
                        <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                            <Button className="bg-green-600 hover:bg-green-700 text-white">
                                Message on WhatsApp
                            </Button>
                        </a>
                        <a href={INSTAGRAM_LINK} target="_blank" rel="noopener noreferrer">
                            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                                Message on Instagram
                            </Button>
                        </a>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};


export default Checkout;