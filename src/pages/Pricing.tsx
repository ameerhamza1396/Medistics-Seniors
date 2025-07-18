import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const Pricing = () => {
    const { user, isLoading: isAuthLoading } = useAuth();
    const { theme, setTheme } = useTheme();
    const [isMonthly, setIsMonthly] = useState(true);
    const [currency, setCurrency] = useState('PKR');

    // Fetch user profile to determine current plan
    const { data: profile, isLoading: isProfileLoading } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('plan')
                .eq('id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching profile for pricing:', error);
                return null;
            }
            return data;
        },
        enabled: !!user?.id,
    });

    const currentUserPlan = profile?.plan?.toLowerCase();

    // Define pricing plans data with original prices
    const plans = [
        {
            name: 'Free',
            display: 'Free',
            id: 'free',
            monthly: {
                PKR: { price: '0', features: ['Access to Question Bank', 'Basic Dashboard Access', '50 MCQ Submissions/Day', 'Join & Chat in Classrooms'] },
                USD: { price: '0', features: ['Access to Question Bank', 'Basic Dashboard Access', '50 MCQ Submissions/Day', 'Join & Chat in Classrooms'] }
            },
            yearly: {
                PKR: { price: '0', features: ['Access to Question Bank', 'Basic Dashboard Access', '50 MCQ Submissions/Day', 'Join & Chat in Classrooms'] },
                USD: { price: '0', features: ['Access to Question Bank', 'Basic Dashboard Access', '50 MCQ Submissions/Day', 'Join & Chat in Classrooms'] }
            },
            gradient: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50',
            border: 'border-gray-200 dark:border-gray-700',
            popular: false
        },
        {
            name: 'Iconic',
            display: 'Iconic',
            id: 'iconic',
            monthly: {
                PKR: { price: '250', originalPrice: '500', features: ['Access to Question Bank', 'Unlimited MCQ Submissions', 'Battle Arena', 'Basic Analytics', 'Standard Support', 'Exclusive Community Access'] },
                USD: { price: '0.99', originalPrice: '1.98', features: ['Access to Question Bank', 'Unlimited MCQ Submissions', 'Battle Arena', 'Basic Analytics', 'Standard Support', 'Exclusive Community Access'] }
            },
            yearly: {
                PKR: { price: '2400', originalPrice: '4800', features: ['Access to Question Bank', 'Unlimited MCQ Submissions', 'Battle Arena', 'Basic Analytics', 'Standard Support', 'Exclusive Community Access', 'Save PKR 600!'] },
                USD: { price: '10.99', originalPrice: '21.98', features: ['Access to Question Bank', 'Unlimited MCQ Submissions', 'Battle Arena', 'Basic Analytics', 'Standard Support', 'Exclusive Community Access', 'Save $0.89!'] }
            },
            gradient: 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20',
            border: 'border-purple-200 dark:border-purple-800',
            popular: true
        },
        {
            name: 'Premium',
            display: 'Premium',
            id: 'premium',
            monthly: {
                PKR: { price: '500', originalPrice: '1000', features: ['Access to Question Bank', 'Unlimited MCQ Submissions', 'AI Test Generator', 'AI Chatbot (Dr. Sultan)', 'Voice Input for Chat', 'Unlimited Battle Arena Challenges', 'Advanced Analytics', 'Priority Support (24/7)', 'Weekly Mock Tests (Sundays)', 'Early Access to New Features', 'Personalized Study Plans', 'Create Classrooms', 'Exclusive Classroom Badges'] },
                USD: { price: '1.99', originalPrice: '3.98', features: ['Access to Question Bank', 'Unlimited MCQ Submissions', 'AI Test Generator', 'AI Chatbot (Dr. Sultan)', 'Voice Input for Chat', 'Unlimited Battle Arena Challenges', 'Advanced Analytics', 'Priority Support (24/7)', 'Weekly Mock Tests (Sundays)', 'Early Access to New Features', 'Personalized Study Plans', 'Create Classrooms', 'Exclusive Classroom Badges'] }
            },
            yearly: {
                PKR: { price: '5200', originalPrice: '10400', features: ['Access to Question Bank', 'Unlimited MCQ Submissions', 'AI Test Generator', 'AI Chatbot (Dr. Sultan)', 'Voice Input for Chat', 'Unlimited Battle Arena Challenges', 'Advanced Analytics', 'Priority Support (24/7)', 'Weekly Mock Tests (Sundays)', 'Early Access to New Features', 'Personalized Study Plans', 'Create Classrooms', 'Exclusive Classroom Badges', 'Save PKR 800!'] },
                USD: { price: '19.99', originalPrice: '39.98', features: ['Access to Question Bank', 'Unlimited MCQ Submissions', 'AI Test Generator', 'AI Chatbot (Dr. Sultan)', 'Voice Input for Chat', 'Unlimited Battle Arena Challenges', 'Advanced Analytics', 'Priority Support (24/7)', 'Weekly Mock Tests (Sundays)', 'Early Access to New Features', 'Personalized Study Plans', 'Create Classrooms', 'Exclusive Classroom Badges', 'Save $3.89!'] }
            },
            gradient: 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
            border: 'border-blue-200 dark:border-blue-800',
            popular: false
        }
    ];

    const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';

    if (isAuthLoading || isProfileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10 text-gray-900 dark:text-white">
                <p>Loading pricing plans...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
            <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50">
                <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <Link to="/dashboard" className="mr-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200"
                                aria-label="Back to Dashboard"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-5 w-5 text-gray-700 dark:text-white">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                                </svg>
                            </Button>
                        </Link>
                        <img
                            src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
                            alt="Medistics Logo"
                            className="w-8 h-8 object-contain"
                        />
                        <span className="text-xl font-bold text-gray-900 dark:text-white">Pricing</span>
                    </div>

                    <div className="flex items-center space-x-3">
                        {/* Currency switch for desktop/tablet */}
                        <div className="inline-flex rounded-full bg-gray-200 dark:bg-gray-700 p-1 hidden sm:inline-flex">
                            <Button
                                variant="ghost"
                                size="sm"
                                className={`px-3 py-1 rounded-full text-sm font-semibold transition-all duration-300 ${
                                    currency === 'PKR'
                                        ? 'bg-red-600 text-white shadow-md' // Changed to red
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                                onClick={() => setCurrency('PKR')}
                            >
                                PKR
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={`px-3 py-1 rounded-full text-sm font-semibold transition-all duration-300 ${
                                    currency === 'USD'
                                        ? 'bg-red-600 text-white shadow-md' // Changed to red
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                                onClick={() => setCurrency('USD')}
                            >
                                USD
                            </Button>
                        </div>

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

            {/* Currency switch for mobile, placed below the header */}
            <div className="flex justify-center px-4 py-4 sm:hidden">
                <div className="inline-flex rounded-full bg-gray-200 dark:bg-gray-700 p-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`px-3 py-1 rounded-full text-sm font-semibold transition-all duration-300 ${
                            currency === 'PKR'
                                ? 'bg-red-600 text-white shadow-md' // Changed to red
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                        onClick={() => setCurrency('PKR')}
                    >
                        PKR
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`px-3 py-1 rounded-full text-sm font-semibold transition-all duration-300 ${
                            currency === 'USD'
                                ? 'bg-red-600 text-white shadow-md' // Changed to red
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                        onClick={() => setCurrency('USD')}
                    >
                        USD
                    </Button>
                </div>
            </div>

            <section className="container mx-auto px-4 lg:px-8 py-12 lg:py-20 max-w-7xl">
                <div className="text-center mb-16 animate-fade-in">
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Choose Your Learning Path
                    </h2>
                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Flexible plans designed for every stage of your medical journey.
                    </p>
                </div>

                <div className="flex justify-center mb-8">
                    <div className="inline-flex rounded-full bg-gray-200 dark:bg-gray-700 p-1">
                        <Button
                            variant="ghost"
                            className={`px-6 py-2 rounded-full text-lg font-semibold transition-all duration-300 ${
                                isMonthly
                                    ? 'bg-purple-600 text-white shadow-md'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                            onClick={() => setIsMonthly(true)}
                        >
                            Monthly
                        </Button>
                        <Button
                            variant="ghost"
                            className={`px-6 py-2 rounded-full text-lg font-semibold transition-all duration-300 ${
                                !isMonthly
                                    ? 'bg-purple-600 text-white shadow-md'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                            onClick={() => setIsMonthly(false)}
                        >
                            Yearly
                        </Button>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
                    {plans.map((plan, index) => {
                        const currentPlanDetails = isMonthly ? plan.monthly[currency] : plan.yearly[currency];
                        const originalPrice = currentPlanDetails.originalPrice;
                        const displayPrice = currentPlanDetails.price;

                        return (
                            <Card
                                key={plan.id}
                                className={`relative ${plan.gradient} ${plan.border} ${plan.popular ? 'border-purple-500 dark:border-purple-400 scale-105 shadow-2xl' : 'shadow-lg'} transition-all duration-500 hover:shadow-2xl hover:scale-105 animate-scale-in group overflow-hidden flex flex-col`}
                                style={{ animationDelay: `${index * 0.2}s` }}
                            >
                                {plan.popular && (
                                    <Badge className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg animate-pulse">
                                        Most Popular
                                    </Badge>
                                )}
                                {currentUserPlan === plan.id && (
                                    <Badge className="absolute top-4 right-4 bg-green-500 text-white shadow-md">
                                        Your Current Plan
                                    </Badge>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <CardHeader className="text-center relative z-10">
                                    <CardTitle className="text-xl md:text-2xl text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">{plan.display}</CardTitle>
                                    <div className="mt-4">
                                        {originalPrice && ( // Display original price only if it exists
                                            <div className="text-gray-400 dark:text-gray-500 text-sm mb-1">
                                                <span className="line-through">
                                                    {currency === 'PKR' ? 'PKR ' : '$'}{originalPrice}
                                                </span>
                                            </div>
                                        )}
                                        <span className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                            {currency === 'PKR' ? 'PKR ' : '$'}{displayPrice}
                                        </span>
                                        <span className="text-gray-600 dark:text-gray-400">/{isMonthly ? 'month' : 'year'}</span>
                                        {originalPrice && ( // Display 50% off only if original price exists
                                            <p className="text-green-500 dark:text-green-400 text-sm font-semibold mt-1">
                                                50% off!
                                            </p>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="relative z-10 flex flex-col flex-grow">
                                    <ul className="space-y-3 mb-6 flex-grow">
                                        {currentPlanDetails.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start text-gray-700 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors duration-300">
                                                <div className="w-2 h-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mr-3 mt-2 flex-shrink-0 animate-pulse"></div>
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="mt-auto">
                                        {currentUserPlan === plan.id ? (
                                            <Button disabled className="w-full bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-not-allowed">
                                                Your Current Plan
                                            </Button>
                                        ) : (
                                            <Link
                                                to={`/checkout?planName=${plan.name}&price=${displayPrice}&duration=${isMonthly ? 'monthly' : 'yearly'}&currency=${currency}`}
                                            >
                                                <Button className={`w-full hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl ${plan.popular ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white' : 'bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white'}`}>
                                                    {plan.id === 'free' ? 'Get Started' : 'Upgrade Plan'}
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </section>

            <div className="text-center mt-12 mb-4 text-gray-500 dark:text-gray-400 text-sm">
                <p>A Project by Educational Spot.</p>
                <p>&copy; 2025 Medistics. All rights reserved.</p>
            </div>
        </div>
    );
};

export default Pricing;
