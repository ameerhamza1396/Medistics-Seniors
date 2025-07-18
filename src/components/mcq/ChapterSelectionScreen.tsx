// src/components/mcq/ChapterSelectionScreen.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Loader2 } from 'lucide-react'; // Removed Lock icon as it's no longer needed for locked chapters
import { fetchChaptersBySubject, fetchMCQsByChapter, Chapter, Subject } from '@/utils/mcqData';
import { useAuth } from '@/hooks/useAuth';
// import { getAccessibleChapters } from '@/utils/accesscontrol'; // Removed this import
import { useNavigate } from 'react-router-dom';

interface ChapterSelectionScreenProps {
  subject: Subject;
  onChapterSelect: (chapter: Chapter) => void;
  onBack: () => void;
  userProfile: { plan: 'free' | 'premium' | 'iconic' } | null | undefined;
}

// Skeleton Card Component for loading state
const ChapterCardSkeleton = () => (
  <Card className="border-2 h-full animate-pulse overflow-hidden relative
                   border-gray-200 dark:border-gray-800
                   bg-gray-100 dark:bg-gray-900">
    {/* Shimmer Effect */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-300/30 to-transparent dark:via-gray-700/30
                    animate-shimmer"
          style={{ animationDuration: '1.5s', animationIterationCount: 'infinite', animationTimingFunction: 'linear' }}></div>

    <CardHeader className="px-4 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-200 dark:bg-gray-700">
            {/* Placeholder for icon */}
          </div>
          <div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-10"></div>
      </div>
    </CardHeader>
    <CardContent className="px-4 pb-4">
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1"></div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
    </CardContent>
  </Card>
);


export const ChapterSelectionScreen = ({
  subject,
  onChapterSelect,
  onBack,
  userProfile
}: ChapterSelectionScreenProps) => {
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  // const [accessibleChapters, setAccessibleChapters] = useState<Chapter[]>([]); // Removed this state
  const [loading, setLoading] = useState(true);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadChapters = async () => {
      setLoading(true);
      const fetched = await fetchChaptersBySubject(subject.id);
      
      // Removed access control logic, all chapters are now considered accessible
      // const userPlan: 'free' | 'premium' | 'iconic' =
      //   userProfile?.plan === 'premium' || userProfile?.plan === 'iconic' ? userProfile.plan : 'free';
      // const accessible = getAccessibleChapters(fetched, userPlan);
      
      setAllChapters(fetched);
      // setAccessibleChapters(accessible); // Removed this
      
      const counts: Record<string, number> = {};
      for (const ch of fetched) {
        const mcqs = await fetchMCQsByChapter(ch.id);
        counts[ch.id] = mcqs.length;
      }
      setQuestionCounts(counts);
      setLoading(false);
    };
    loadChapters();
  }, [subject, userProfile]);

  const handleChapterClick = (chapter: Chapter) => {
    // const isAccessible = accessibleChapters.some((c) => c.id === chapter.id); // Removed this check
    // if (isAccessible) { // Removed conditional logic
      onChapterSelect(chapter);
    // } else {
    //   navigate('/pricing'); // Removed navigation to pricing page
    // }
  };

  // Define a number of skeleton cards to display while loading
  const numberOfSkeletons = 6; // Display 6 placeholder cards while loading

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4">
      <Button onClick={onBack} variant="outline" className="mb-4 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-300">
        <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
        <span>Back to Subjects</span>
      </Button>

      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">Select Chapter – {subject.name}</h1>
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          All chapters are now unlocked for all users. Free users have a daily submission limit.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {loading ? (
          // Render skeleton loaders if loading
          Array.from({ length: numberOfSkeletons }).map((_, index) => (
            <ChapterCardSkeleton key={index} />
          ))
        ) : (
          // Render actual chapters once loaded
          allChapters.map((ch, idx) => {
            // const isAccessible = accessibleChapters.some((c) => c.id === ch.id); // No longer needed
            const isSelected = false; // Not used for this component's visual selection state

            return (
              <motion.div
                key={ch.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full cursor-pointer`} // Removed opacity-50 and conditional class
                onClick={() => handleChapterClick(ch)}
              >
                <Card
                  className={`border-2 h-full transition duration-300 ease-in-out
                    ${isSelected ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30' : 'border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700'}
                    bg-gradient-to-br from-green-50/70 via-blue-50/50 to-indigo-50/30 dark:from-green-900/30 dark:via-blue-900/20 dark:to-indigo-900/10 backdrop-blur-sm` // Simplified background to always be "unlocked" style
                  }
                >
                  <CardHeader className="px-4 py-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center
                            bg-gradient-to-r from-green-200 to-blue-200 dark:from-green-800 dark:to-blue-800` // Always show "unlocked" icon style
                            }>
                            <BookOpen className="w-5 h-5 text-green-600 dark:text-green-400" /> {/* Always show BookOpen */}
                        </div>
                        <div>
                          <CardTitle className="text-lg text-gray-900 dark:text-white">Chapter {ch.chapter_number}</CardTitle>
                          <CardDescription className="text-sm text-gray-500 dark:text-gray-400">{ch.name}</CardDescription>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{questionCounts[ch.id] || 0} Qs</span>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{ch.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
