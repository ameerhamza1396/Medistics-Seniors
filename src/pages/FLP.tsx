import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, Zap, Crown, History } from 'lucide-react'; // Import History icon
import { useNavigate, Link } from 'react-router-dom'; // Import Link
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FLPQuiz } from '@/components/FLPQuiz';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

// Define a type for subjects with a specific structure
interface SubjectData {
    name: string;
    percentage: number;
    chapters: { id: string; name: string; subject_id: string }[];
}

// Define the MCQ type (should match your database schema for 'mcqs' table)
interface MCQ {
    id: string;
    question: string;
    options: string[];
    correct_answer: string;
    explanation: string;
    chapter_id: string;
    // Add subject property if it's being added dynamically during fetch
    subject?: string;
}

// --- Upgrade Account Modal Component ---
interface UpgradeAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgradeClick: () => void;
}

const UpgradeAccountModal: React.FC<UpgradeAccountModalProps> = ({ isOpen, onClose, onUpgradeClick }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] p-6 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-purple-200 dark:border-purple-800">
                <DialogHeader className="text-center">
                    <Crown className="w-12 h-12 mx-auto text-yellow-500 dark:text-yellow-400 mb-3" />
                    <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">Upgrade Your Account</DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-400 mt-2">
                        Full-Length Papers are exclusive to Premium users. Upgrade for unlimited access!
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-6">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        className="w-full sm:w-auto border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                    >
                        Maybe Later
                    </Button>
                    <Button
                        onClick={onUpgradeClick}
                        className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold"
                    >
                        Upgrade Now
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


const FLP = () => {
    const { user, isLoading: isAuthLoading } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [selectedMcqCount, setSelectedMcqCount] = useState<number | null>(null);
    const [isFetchingMcqs, setIsFetchingMcqs] = useState(false);
    const [userPlan, setUserPlan] = useState<'free' | 'premium' | 'iconic' | null>(null);
    const [fetchedMcqs, setFetchedMcqs] = useState<MCQ[]>([]);
    const [showQuiz, setShowQuiz] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true); // New loading state for profile

    // Fetch user plan on component mount
    useEffect(() => {
        const fetchUserPlan = async () => {
            if (!user) {
                setUserPlan(null);
                setIsLoadingProfile(false); // No user, so stop loading profile
                return;
            }
            setIsLoadingProfile(true); // Start loading profile
            const { data, error } = await supabase
                .from('profiles')
                .select('plan')
                .eq('id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching user plan:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load user plan. Please try again.',
                    variant: 'destructive',
                });
                setUserPlan(null);
            } else {
                setUserPlan(data?.plan?.toLowerCase() || 'free');
            }
            setIsLoadingProfile(false); // Stop loading profile once fetched
        };
        // Only fetch if not already authenticating and user is potentially available
        if (!isAuthLoading) {
            fetchUserPlan();
        }
    }, [user, isAuthLoading, toast]);

    const handleStartTest = async () => {
        if (!user) {
            toast({
                title: 'Authentication Required',
                description: 'Please log in to start the test.',
                variant: 'destructive',
            });
            navigate('/login');
            return;
        }

        // Check user plan after it has been loaded
        if (userPlan === null || isLoadingProfile) {
            // Should not happen if button is disabled, but good for safety
            toast({
                title: 'Loading Plan',
                description: 'Please wait while your account plan is being loaded.',
                variant: 'info',
            });
            return;
        }

        if (userPlan !== 'premium') {
            setShowUpgradeModal(true);
            return;
        }

        if (selectedMcqCount === null) {
            toast({
                title: 'Selection Required',
                description: 'Please select the number of MCQs to attempt.',
                variant: 'destructive',
            });
            return;
        }

        setIsFetchingMcqs(true);

        const subjectDistribution = [
            { name: 'Biology', percentage: 0.45 },
            { name: 'Chemistry', percentage: 0.25 },
            { name: 'Physics', percentage: 0.20 },
            { name: 'English', percentage: 0.05 },
            { name: 'Logical Reasoning', percentage: 0.05 },
        ];

        let allMCQs: MCQ[] = [];
        let fetchedSubjectData: SubjectData[] = [];
        let subjectIdToNameMap: { [key: string]: string } = {};

        try {
            const { data: subjects, error: subjectsError } = await supabase
                .from('subjects')
                .select('id, name');

            if (subjectsError) throw subjectsError;
            subjects.forEach(sub => {
                subjectIdToNameMap[sub.id] = sub.name;
            });

            const { data: chaptersData, error: chaptersError } = await supabase
                .from('chapters')
                .select('id, name, subject_id');

            if (chaptersError) throw chaptersError;

            subjectDistribution.forEach(subject => {
                const subjectChapters = chaptersData.filter(c => subjectIdToNameMap[c.subject_id] === subject.name);
                fetchedSubjectData.push({ ...subject, chapters: subjectChapters });
            });

            for (const subject of fetchedSubjectData) {
                const chapterIds = subject.chapters.map(c => c.id);
                if (chapterIds.length > 0) {
                    const { data: mcqsData, error: mcqsError } = await supabase
                        .from('mcqs')
                        .select('*')
                        .in('chapter_id', chapterIds);

                    if (mcqsError) throw mcqsError;
                    // Ensure 'subject' property is added here for filtering later
                    allMCQs = allMCQs.concat(mcqsData.map(mcq => ({ ...mcq, subject: subject.name })));
                }
            }

            let finalMCQs: MCQ[] = [];
            let remainingCount = selectedMcqCount;
            let availableMCQsBySubject: { [key: string]: MCQ[] } = {};

            subjectDistribution.forEach(sub => {
                availableMCQsBySubject[sub.name] = shuffleArray(allMCQs.filter(mcq => mcq.subject === sub.name));
            });

            subjectDistribution.forEach(sub => {
                const desiredCount = Math.floor(selectedMcqCount * sub.percentage);
                const actualCount = Math.min(desiredCount, availableMCQsBySubject[sub.name].length);

                finalMCQs = finalMCQs.concat(availableMCQsBySubject[sub.name].slice(0, actualCount));
                availableMCQsBySubject[sub.name] = availableMCQsBySubject[sub.name].slice(actualCount);
                remainingCount -= actualCount;
            });

            let allRemainingMCQs: MCQ[] = [];
            for (const subName in availableMCQsBySubject) {
                allRemainingMCQs = allRemainingMCQs.concat(availableMCQsBySubject[subName]);
            }
            allRemainingMCQs = shuffleArray(allRemainingMCQs);

            finalMCQs = finalMCQs.concat(allRemainingMCQs.slice(0, remainingCount));

            if (finalMCQs.length < selectedMcqCount) {
                toast({
                    title: 'Not Enough Questions',
                    description: `Could only find ${finalMCQs.length} MCQs. Please try a smaller test size.`,
                    variant: 'warning',
                });
                setIsFetchingMcqs(false);
                return;
            } else if (finalMCQs.length > selectedMcqCount) {
                finalMCQs = finalMCQs.slice(0, selectedMcqCount);
            }

            setFetchedMcqs(shuffleArray(finalMCQs));
            setShowQuiz(true);

        } catch (error: any) {
            console.error('Error fetching MCQs for FLP:', error);
            toast({
                title: 'Error',
                description: `Failed to prepare test: ${error.message || 'Unknown error'}`,
                variant: 'destructive',
            });
        } finally {
            setIsFetchingMcqs(false);
        }
    };

    const shuffleArray = <T,>(array: T[]): T[] => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    const handleUpgradeClick = () => {
        setShowUpgradeModal(false);
        navigate('/pricing');
    };

    const handleFLPQuizFinish = (score: number, totalQuestions: number) => {
        setShowQuiz(false);
        toast({
            title: "FLP Quiz Finished!",
            description: `You scored ${score} out of ${totalQuestions}.`,
            duration: 5000,
        });
    };

    if (showQuiz && fetchedMcqs.length > 0) {
        return (
            <FLPQuiz
                mcqs={fetchedMcqs}
                onFinish={handleFLPQuizFinish}
                timePerQuestion={60}
            />
        );
    }

    const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes > 0 ? `and ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}` : ''}`;
        }
        return `${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
    };

    // --- Loading State for Profile ---
    if (isAuthLoading || isLoadingProfile) {
          return (
    <div className="min-h-screen flex items-center justify-center">
      <img
        src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
        alt="Loading Medistics"
        className="w-32 h-32 object-contain"
      />
    </div>
  );
}

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center relative"> {/* Added relative for positioning */}
            {/* Top Right Button for Previous Attempts */}

            <Card className="w-full max-w-2xl bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm shadow-xl">
                <CardHeader className="text-center pb-6">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Full-Length Paper (FLP)
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300">
                        Test your knowledge across all subjects with a timed exam.
                    </p>
                </CardHeader>
                <CardContent className="space-y-6">
                    {userPlan === 'premium' ? (
                        <>
                            <div className="text-center">
                                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                                    Select Number of MCQs
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {[50, 100, 200].map((count) => (
                                        <button
                                            key={count}
                                            onClick={() => setSelectedMcqCount(count)}
                                            className={`
                                                flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all duration-300
                                                ${selectedMcqCount === count
                                                    ? 'border-purple-600 bg-gradient-to-br from-purple-100 to-pink-50 dark:from-purple-900/50 dark:to-pink-900/20 shadow-md transform scale-105'
                                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-sm'
                                                }
                                            `}
                                        >
                                            <span className={`text-3xl font-bold ${selectedMcqCount === count ? 'text-purple-700 dark:text-purple-300' : 'text-gray-800 dark:text-gray-200'}`}>
                                                {count}
                                            </span>
                                            <span className={`text-sm mt-1 ${selectedMcqCount === count ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                                MCQs
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                {selectedMcqCount && (
                                    <p className="mt-6 text-md text-gray-700 dark:text-gray-300 font-medium">
                                        You will have approximately <span className="font-bold text-purple-600 dark:text-pink-400">{formatTime(selectedMcqCount)}</span> to complete this test. (1 MCQ = 1 Minute)
                                    </p>
                                )}
                            </div>

                            <div className="text-center pt-4">
                                <Button
                                    onClick={handleStartTest}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 text-lg"
                                    disabled={isFetchingMcqs || selectedMcqCount === null}
                                >
                                    {isFetchingMcqs ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Preparing Test...
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="mr-2 h-5 w-5" />
                                            Start Test
                                        </>
                                    )}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8">
                            <Crown className="w-16 h-16 mx-auto text-yellow-500 dark:text-yellow-400 mb-6 animate-pulse" />
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                Unlock Full-Length Papers!
                            </h3>
                            <p className="text-gray-700 dark:text-gray-300 mb-6 max-w-sm mx-auto">
                                Full-Length Papers are an exclusive feature for our Premium users. Upgrade your plan to get unlimited access and boost your preparation!
                            </p>
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <Button
                                    onClick={() => navigate('/pricing')}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 text-lg"
                                >
                                    <Crown className="mr-2 h-5 w-5" /> Upgrade Now
                                </Button>
                                <Button
                                    onClick={() => navigate('/dashboard')}
                                    variant="outline"
                                    className="border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-gray-800 dark:text-gray-200 font-bold py-3 px-8 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 text-lg"
                                >
                                    Go to Dashboard
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <UpgradeAccountModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                onUpgradeClick={handleUpgradeClick}
            />
        </div>
    );
};

export default FLP;