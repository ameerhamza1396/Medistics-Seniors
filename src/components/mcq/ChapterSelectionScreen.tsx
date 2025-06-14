// src/components/mcq/ChapterSelectionScreen.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, BookOpen, Loader2, Lock } from 'lucide-react';
import { fetchChaptersBySubject, fetchMCQsByChapter, Chapter, Subject } from '@/utils/mcqData';
import { useAuth } from '@/hooks/useAuth';
import { getAccessibleChapters } from '@/utils/accesscontrol';
import { useNavigate } from 'react-router-dom';

interface ChapterSelectionScreenProps {
  subject: Subject;
  onChapterSelect: (chapter: Chapter) => void;
  onBack: () => void;
}

export const ChapterSelectionScreen = ({
  subject,
  onChapterSelect,
  onBack
}: ChapterSelectionScreenProps) => {
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [accessibleChapters, setAccessibleChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadChapters = async () => {
      setLoading(true);
      const fetched = await fetchChaptersBySubject(subject.id);
      const role: 'free' | 'premium' | 'iconic' =
        user?.role === 'premium' || user?.role === 'iconic' ? user.role : 'free';
      const accessible = getAccessibleChapters(fetched, role);
      setAllChapters(fetched);
      setAccessibleChapters(accessible);

      const counts: Record<string, number> = {};
      for (const ch of fetched) {
        const mcqs = await fetchMCQsByChapter(ch.id);
        counts[ch.id] = mcqs.length;
      }
      setQuestionCounts(counts);
      setLoading(false);
    };
    loadChapters();
  }, [subject, user]);

  const handleChapterClick = (chapter: Chapter) => {
    const isAccessible = accessibleChapters.some((c) => c.id === chapter.id);
    if (isAccessible) {
      setSelectedChapter(chapter);
    } else {
      navigate('/pricing');
    }
  };

  const handleContinue = () => {
    if (selectedChapter) onChapterSelect(selectedChapter);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12 sm:py-16">
        <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-purple-600" />
        <span className="ml-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Loading chapters...
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4">
      <Button onClick={onBack} variant="outline" className="mb-4 ...">
        <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
        <span>Back to Subjects</span>
      </Button>

      <div className="text-center mb-6 ...">
        <h1 className="text-2xl ...">Select Chapter – {subject.name}</h1>
        <p className="text-base ...">
          {user?.role === 'free'
            ? 'First 2 chapters are free. Unlock the rest with premium.'
            : 'You have access to all chapters.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {allChapters.map((ch, idx) => {
          const isAccessible = accessibleChapters.some((c) => c.id === ch.id);
          const isSelected = selectedChapter?.id === ch.id;

          return (
            <motion.div
              key={ch.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full ${!isAccessible ? 'opacity-50' : 'cursor-pointer'}`}
              onClick={() => handleChapterClick(ch)}
            >
              <Card className={`border-2 h-full transition ${isSelected ? 'border-purple-500 bg-purple-50' : 'border-purple-200 hover:border-purple-300'} ${!isAccessible ? 'bg-gray-100 dark:bg-gray-900' : ''}`}>
                <CardHeader className="px-4 py-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-200 to-pink-200 rounded-lg flex items-center justify-center">
                        {isAccessible ? (
                          <BookOpen className="w-5 h-5 text-purple-600" />
                        ) : (
                          <Lock className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg text-gray-900 dark:text-white">Chapter {ch.chapter_number}</CardTitle>
                        <CardDescription className="text-sm text-gray-500">{ch.name}</CardDescription>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{questionCounts[ch.id] || 0} Qs</span>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-sm text-gray-600">{ch.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {selectedChapter && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <Button
            onClick={handleContinue}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 hover:scale-105 transition"
            size="lg"
          >
            Continue with {selectedChapter.name}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      )}
    </div>
  );
};
