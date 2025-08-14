import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Moon,
    Sun,
    CheckCircle, // For success icon
    XCircle, // For error icon
    BadgePercent, // For promo code icon
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import React, { useState, useEffect } from 'react'; // Added useEffect
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client'; // Assuming your Supabase client is here
import Seo from '@/components/Seo'; // Import the Seo component

// Shadcn UI components for the Dialog
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';

const Checkout = () => {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const [searchParams] = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false); // State for the success dialog
    const [proofOfPayment, setProofOfPayment] = useState<File | null>(null);
    const [showQrModal, setShowQrModal] = useState(false); // State for JazzCash QR modal

    // Promocode states
    const [promoCode, setPromoCode] = useState('');
    const [promoCodeError, setPromoCodeError] = useState<string | null>(null);
    const [discountedPrice, setDiscountedPrice] = useState<number | null>(null);
    const [isPromoApplied, setIsPromoApplied] = useState(false);
    const [promoDiscountDisplay, setPromoDiscountDisplay] = useState<string | null>(null);

    // Extract plan details from URL query parameters
    const planName = searchParams.get('planName');
    const basePriceStr = searchParams.get('price'); // Original price string from URL
    const duration = searchParams.get('duration');
    const currency = searchParams.get('currency');

    // Convert basePrice to number for calculations
    const basePrice = basePriceStr ? parseFloat(basePriceStr) : 0;

    // Use a derived state for the current total price that can be affected by promo codes.
    // This is the price that will actually be charged/recorded.
    const currentTotalPrice = discountedPrice !== null ? discountedPrice : basePrice;

    // Effect to reset promo code states if plan details change in the URL.
    // This ensures that a promo code applied to one plan doesn't incorrectly persist
    // if the user navigates back and selects a different plan.
    useEffect(() => {
        setPromoCode('');
        setPromoCodeError(null);
        setDiscountedPrice(null);
        setIsPromoApplied(false);
        setPromoDiscountDisplay(null);
    }, [planName, duration, currency, basePriceStr]);


    // Handles file selection and basic validation for payment proof
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        setError(null); // Clear previous general errors
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];

            // File type validation (PNG, JPG, WebP)
            const acceptedTypes = ['image/png', 'image/jpeg', 'image/webp'];
            if (!acceptedTypes.includes(file.type)) {
                setError("Invalid file type. Please upload a PNG, JPG, or WebP image.");
                setProofOfPayment(null);
                return;
            }

            // File size validation (2 MB limit)
            const maxSize = 2 * 1024 * 1024; // 2 MB in bytes
            if (file.size > maxSize) {
                setError("File size exceeds 2MB. Please upload a smaller image.");
                setProofOfPayment(null);
                return;
            }

            setProofOfPayment(file);
        } else {
            setProofOfPayment(null);
        }
    };

    // Handles the application of a promo code by calling Supabase RPC function
    const handleApplyPromoCode = async () => {
        setPromoCodeError(null); // Clear previous promo code errors
        setIsPromoApplied(false); // Reset promo applied status
        setDiscountedPrice(null); // Reset discounted price
        setPromoDiscountDisplay(null); // Clear discount display

        if (!promoCode) {
            setPromoCodeError('Please enter a promo code.');
            return;
        }
        // Ensure all necessary plan details are available before attempting to apply promo
        if (!planName || !duration || !currency || !basePriceStr) {
            setPromoCodeError("Missing plan details. Cannot apply promo code.");
            return;
        }

        setIsLoading(true); // Set loading state for promo code application
        try {
            // Call the Supabase RPC function to validate the promo code.
            // Parameters MUST match the exact order and type of your SQL function signature.
            const { data, error: rpcError } = await supabase.rpc('validate_promo_code', {
                p_code: promoCode,
                p_plan_name: planName,
                p_duration: duration,
                p_currency: currency,
                p_current_price: basePrice, // Pass the original base price for validation
            });

            if (rpcError) {
                console.error('Detailed RPC Error:', rpcError); // Log detailed error for debugging
                setPromoCodeError(rpcError.message || 'An error occurred during promo code validation.');
                return;
            }

            // --- NEW CHECK HERE ---
            // If the RPC function returns no data or an empty array, handle it gracefully.
            if (!data || data.length === 0) {
                console.error('RPC function returned no data or empty array:', data);
                setPromoCodeError('Failed to get a valid response from the promo code service. Please try again.');
                return;
            }
            // --- END NEW CHECK ---

            const result = data[0]; // Now, we are more confident data[0] exists
            if (result.valid) {
                setDiscountedPrice(result.adjusted_price); // Set the new discounted price
                setIsPromoApplied(true); // Mark promo as applied

                // Determine how to display the discount (e.g., "50% OFF" or "$10 OFF")
                let discountText = '';
                if (result.discount_type === 'percentage') {
                    discountText = `${result.discount_value}% OFF`;
                } else if (result.discount_type === 'flat') {
                    discountText = `${currency === 'PKR' ? 'PKR ' : '$'}${result.discount_value} OFF`;
                }
                setPromoDiscountDisplay(discountText);
                setError(null); // Clear any general submission errors that might have been there
            } else {
                // If promo code is not valid, display the specific error message from the RPC
                setPromoCodeError(result.error_message || 'Promo code is not valid.');
                setDiscountedPrice(null); // Reset discounted price
                setIsPromoApplied(false); // Reset promo applied status
                setPromoDiscountDisplay(null); // Clear discount display
            }
        } catch (err: any) {
            console.error('Unexpected error applying promo code:', err);
            setPromoCodeError('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false); // End loading state
        }
    };

    // Handles the submission of payment proof to Cloudinary and Supabase
    const handleSubmitPaymentProof = async () => {
        setIsLoading(true); // Set loading state for submission
        setError(null); // Clear previous errors
        setShowSuccessDialog(false); // Hide success dialog just in case it's open

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

        // Re-check validation on submission to ensure file is still valid
        const acceptedTypes = ['image/png', 'image/jpeg', 'image/webp'];
        const maxSize = 2 * 1024 * 1024; // 2 MB
        if (!acceptedTypes.includes(proofOfPayment.type) || proofOfPayment.size > maxSize) {
            setError("Please re-upload a valid image (PNG, JPG, WebP) under 2MB.");
            setProofOfPayment(null);
            setIsLoading(false);
            return;
        }

        // Ensure all required plan details are present
        if (!planName || !duration || !currency || !basePriceStr) {
            setError("Missing plan details. Please go back and select a plan.");
            setIsLoading(false);
            return;
        }

        // Prepare FormData for Cloudinary upload
        const formData = new FormData();
        formData.append('file', proofOfPayment);
        formData.append('upload_preset', 'plans_purchase'); // Your Cloudinary upload preset
        formData.append('cloud_name', 'dabgjalqp'); // Your Cloudinary cloud name

        try {
            // 1. Upload payment proof image to Cloudinary
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

            // 2. Insert payment request data into Supabase table
            const { error: supabaseError } = await supabase
                .from('manual_payment_requests')
                .insert([
                    {
                        user_id: user.id,
                        name: user.user_metadata?.full_name || user.email,
                        email: user.email,
                        plan_name: planName,
                        price: currentTotalPrice, // Use the potentially discounted price here for the payment record
                        duration: duration,
                        currency: currency,
                        cloudinary_proof_url: imageUrl,
                        promo_code_applied: isPromoApplied ? promoCode : null, // Record applied promo code
                        original_price: basePrice, // Record the original price before discount
                        discount_amount: isPromoApplied ? (basePrice - currentTotalPrice) : 0, // Record the actual discount amount
                    },
                ]);

            if (supabaseError) {
                throw new Error(supabaseError.message || 'Failed to record payment request in database.');
            }

            // Optional: Increment current_uses for the promo code if successful.
            // This call assumes you have the `increment_promo_code_uses` RPC function in Supabase.
            // For higher security, this increment could ideally be done server-side after manual verification.
            if (isPromoApplied && promoCode) {
                   const { error: incrementError } = await supabase.rpc('increment_promo_code_uses', { p_code: promoCode });
                   if (incrementError) {
                       console.error('Error incrementing promo code uses:', incrementError);
                       // Decide how to handle this: log, or show a non-critical warning
                   }
            }

            console.log('Payment request submitted to Supabase successfully.');
            setShowSuccessDialog(true); // Show the success dialog
            setProofOfPayment(null); // Clear the selected file after successful upload
            setPromoCode(''); // Clear promo code field
            setPromoCodeError(null); // Clear promo code error
            setDiscountedPrice(null); // Reset discounted price
            setIsPromoApplied(false); // Reset promo applied status
            setPromoDiscountDisplay(null); // Clear discount display

        } catch (err: any) {
            console.error('Error during payment proof submission:', err);
            setError(err.message || 'An unexpected error occurred during submission. Please try again.');
        } finally {
            setIsLoading(false); // End loading state
        }
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
            <Seo
            title="Checkout"
            description="Complete your secure payment and subscribe to Medistics App's premium plans to unlock full features for MDCAT preparation."
            canonical="https://medistics.app/checkout"
            />
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

                <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-purple-200 dark:border-purple-800 shadow-xl mb-6 p-6 rounded-xl animate-slide-up">
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
                        {isPromoApplied && basePriceStr && (
                            <div className="flex justify-between items-center mb-2 text-red-500 dark:text-red-400">
                                <span className="line-through">Original Price:</span>
                                <span className="font-semibold line-through">
                                    {currency === 'PKR' ? 'PKR ' : '$'}{parseFloat(basePriceStr).toFixed(2)}
                                </span>
                            </div>
                        )}
                        {isPromoApplied && (
                            <div className="flex justify-between items-center mb-2 text-green-600 dark:text-green-400">
                                <span>Discount:</span>
                                <span className="font-semibold">{promoDiscountDisplay}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                            <span className="text-xl font-bold">Total:</span>
                            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                {currency === 'PKR' ? 'PKR ' : '$'}{currentTotalPrice.toFixed(2)}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Promo Code Section */}
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
                                    setPromoCodeError(null); // Clear error on input change
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

                        {/* JazzCash QR Code Image */}
                        <div className="flex justify-center my-6">
                            <img
                                src="/images/jazzcash_qr.jpg"
                                alt="JazzCash QR Code"
                                className="w-48 h-48 object-contain rounded-lg shadow-md border border-gray-200 dark:border-gray-700 cursor-pointer transition-transform duration-200 hover:scale-105"
                                onClick={() => setShowQrModal(true)} // Click handler to open modal
                            />
                        </div>
                        {/* End JazzCash QR Code Image */}

                        <p className="mb-4">
                            Once you have made the payment, please upload a screenshot or photo of your payment receipt below. Your plan will be activated upon verification of your payment.
                        </p>

                        <div className="grid w-full max-w-sm items-center gap-1.5 mt-6">
                            <Label htmlFor="payment-proof">Upload Payment Proof</Label>
                            <Input
                                id="payment-proof"
                                type="file"
                                accept=".png,.jpg,.jpeg,.webp"
                                onChange={handleFileUpload}
                                className="file:text-purple-600 dark:file:text-purple-300"
                            />
                            {proofOfPayment && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Selected file: {proofOfPayment.name} ({Math.round(proofOfPayment.size / 1024)} KB)
                                </p>
                            )}
                        </div>
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
                        onClick={handleSubmitPaymentProof}
                        disabled={isLoading || !proofOfPayment || !planName || !duration || !currency || !basePriceStr || !user || !!error}
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

            {/* Success Dialog */}
            <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                <DialogContent className="sm:max-w-[450px] p-6 text-center">
                    <DialogHeader className="flex flex-col items-center justify-center mb-4">
                        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                        <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                            Submission Received!
                        </DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-gray-300 mt-2">
                            Thank you for submitting your payment proof.
                            Your request has been received and is now under review.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 text-left text-gray-700 dark:text-gray-300">
                        <p className="font-medium">
                            Review may take up to <span className="text-purple-600 dark:text-purple-400 font-semibold">24 hours</span>.
                            We'll notify you once your plan is activated.
                        </p>
                        <p>
                            For any issues or inquiries, please contact our team:
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Email: <a href="mailto:medistics@dr.com" className="text-blue-600 hover:underline dark:text-blue-400">medistics@dr.com</a></li>
                            <li>WhatsApp: <a href="https://wa.me/923392456162" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">03392456162</a></li>
                        </ul>
                    </div>
                    <DialogFooter className="mt-6 flex justify-center">
                        <Button onClick={() => setShowSuccessDialog(false)} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                            Got it!
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* JazzCash QR Code Modal */}
            <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
                <DialogContent className="sm:max-w-[400px] p-4 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-xl animate-fade-in-scale">
                    <DialogHeader className="w-full text-center mb-4">
                        <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">JazzCash QR Code</DialogTitle>
                        <DialogDescription className="text-gray-600 dark:text-gray-300">Scan this QR code to make your payment.</DialogDescription>
                    </DialogHeader>
                    <div className="w-full max-w-[300px] aspect-square flex items-center justify-center p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                        <img
                            src="/images/jazzcash_qr.jpg"
                            alt="JazzCash QR Code"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <DialogFooter className="mt-6 w-full flex justify-center">
                        <Button onClick={() => setShowQrModal(false)} className="bg-purple-600 hover:bg-purple-700 text-white">
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* End JazzCash QR Code Modal */}
        </div>
    );
};

export default Checkout;
