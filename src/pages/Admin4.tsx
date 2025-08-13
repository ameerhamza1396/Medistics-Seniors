'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Search as SearchIcon, AlertTriangle, XCircle } from 'lucide-react'; // Removed redundant imports handled by AdminHeader/AdminLockout
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

// Import the new components
import AdminLockout from '@/components/admin/AdminLockout';
import AdminHeader from '@/components/admin/AdminHeader';

interface MCQ {
  id: number;
  question: string;
  options: string[];
  correct_answer: string | null;
  chapter_id: number;
  explanation?: string;
  difficulty?: string;
  text?: string;
}

interface Chapter {
  id: number;
  name: string;
  subject_id: number;
}

interface Subject {
  id: number;
  name: string;
}

export default function Admin4() {
  const { user } = useAuth(); // User is needed to pass email to AdminHeader
  const [loadingContent, setLoadingContent] = useState(true); // Separate loading for content
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [expandedSubject, setExpandedSubject] = useState<number | null>(null);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<{ [key: number]: boolean }>({});
  const [fixing, setFixing] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<MCQ[]>([]);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const FETCH_LIMIT = 50000;

  useEffect(() => {
    // This part of useEffect is no longer needed here as theme is handled by AdminHeader
    // and initial data fetching is now conditionally handled after AdminLockout grants access.
    // The `isAdmin` check within `fetchAll` effectively makes it run only when ready.
  }, []); // Empty dependency array, but the fetchAll below will have dependencies.

  useEffect(() => {
    const fetchAll = async () => {
      setLoadingContent(true);
      const [{ data: mcqData, error: mcqError }, { data: chapterData, error: chapterError }, { data: subjectData, error: subjectError }] = await Promise.all([
        supabase.from('mcqs').select('*').limit(FETCH_LIMIT),
        supabase.from('chapters').select('*'),
        supabase.from('subjects').select('*')
      ]);

      if (mcqError) console.error("Error fetching MCQs:", mcqError);
      if (chapterError) console.error("Error fetching chapters:", chapterError);
      if (subjectError) console.error("Error fetching subjects:", subjectError);

      setMcqs(mcqData || []);
      setChapters(chapterData || []);
      setSubjects(subjectData || []);
      setLoadingContent(false);
    };

    fetchAll(); // Call fetchAll directly, as AdminLockout ensures authentication before rendering this component
  }, []); // Run once on component mount for initial data fetch

  const isABCDCorrectAnswer = (mcq: MCQ) => {
    if (!mcq.correct_answer) return false;
    const normalizedCorrectAnswer = mcq.correct_answer.trim().toUpperCase();
    return ['A', 'B', 'C', 'D'].includes(normalizedCorrectAnswer);
  };

  const getFixableByABCDMapping = (mcq: MCQ) => {
    if (!mcq.correct_answer) return false;

    const normalizedCorrectAnswer = mcq.correct_answer.trim().toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(normalizedCorrectAnswer)) {
      return false;
    }

    const optionIndex = normalizedCorrectAnswer.charCodeAt(0) - 'A'.charCodeAt(0);
    return mcq.options && mcq.options.length > optionIndex && mcq.options[optionIndex] !== mcq.correct_answer;
  };

  const getOtherProblematic = (mcq: MCQ) => {
    if (!mcq.correct_answer) return true;

    const normalizedCorrectAnswer = mcq.correct_answer.trim().toUpperCase();
    const isABCDBased = ['A', 'B', 'C', 'D'].includes(normalizedCorrectAnswer);

    if (isABCDBased && getFixableByABCDMapping(mcq)) {
      return false;
    }

    return !mcq.options?.includes(mcq.correct_answer);
  };

  const getProblematic = (mcq: MCQ) => {
    return getFixableByABCDMapping(mcq) || getOtherProblematic(mcq);
  };

  const totalFixableByABCD = mcqs.filter(getFixableByABCDMapping).length;
  const totalOtherProblematic = mcqs.filter(getOtherProblematic).length;
  const totalProblematic = totalFixableByABCD + totalOtherProblematic;

  const toggleQuestion = (id: number) => {
    setExpandedQuestions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const subjectCardColors = [
    'from-fuchsia-500 to-indigo-600',
    'from-green-400 to-blue-500',
    'from-yellow-400 to-red-500',
    'from-purple-400 to-pink-500',
  ];

  const updateMCQ = async (mcqId: number, newCorrectAnswer: string) => {
    const { data, error } = await supabase
      .from('mcqs')
      .update({ correct_answer: newCorrectAnswer })
      .eq('id', mcqId);

    if (error) {
      console.error(`Error updating MCQ ${mcqId}:`, error);
      return false;
    }
    return true;
  };

  const handleFixABCDProblematic = async () => {
    setFixing(true);
    const fixableMCQs = mcqs.filter(getFixableByABCDMapping);
    let fixedCount = 0;
    let failedCount = 0;

    for (const mcq of fixableMCQs) {
      const normalizedCorrectAnswer = mcq.correct_answer!.trim().toUpperCase();
      const optionIndex = normalizedCorrectAnswer.charCodeAt(0) - 'A'.charCodeAt(0);
      const newCorrectAnswer = mcq.options[optionIndex];

      if (newCorrectAnswer) {
        const success = await updateMCQ(mcq.id, newCorrectAnswer);
        if (success) {
          fixedCount++;
          setMcqs(prevMcqs => prevMcqs.map(m =>
            m.id === mcq.id ? { ...m, correct_answer: newCorrectAnswer } : m
          ));
        } else {
          failedCount++;
        }
      } else {
        failedCount++;
      }
    }
    setFixing(false);
    alert(`Successfully fixed ${fixedCount} MCQs. Failed to fix ${failedCount} MCQs.`);

    // Re-fetch all MCQs to ensure the UI is fully updated with latest data from DB
    setLoadingContent(true);
    const { data: updatedMcqData, error: updatedMcqError } = await supabase.from('mcqs').select('*').limit(FETCH_LIMIT);
    if (updatedMcqError) console.error("Error re-fetching MCQs after fix:", updatedMcqError);
    setMcqs(updatedMcqData || []);
    setLoadingContent(false);
  };

  const handleSearch = async () => {
    setSearchPerformed(true);
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setLoadingContent(true);
    const { data, error } = await supabase
      .from('mcqs')
      .select('*, chapters(name, subjects(name))')
      .ilike('question', `%${searchTerm.trim()}%`)
      .limit(FETCH_LIMIT);

    if (error) {
      console.error("Error searching MCQs:", error);
      setSearchResults([]);
    } else {
      setSearchResults(data || []);
    }
    setLoadingContent(false);
  };

  const getChapterName = (chapterId: number) => {
    const chapter = chapters.find(ch => ch.id === chapterId);
    return chapter ? chapter.name : 'Unknown Chapter';
  };

  const getSubjectName = (chapterId: number) => {
    const chapter = chapters.find(ch => ch.id === chapterId);
    if (chapter) {
      const subject = subjects.find(sub => sub.id === chapter.subject_id);
      return subject ? subject.name : 'Unknown Subject';
    }
    return 'Unknown Subject';
  };

  // --- Main Component Render (only if authorized and data loaded) ---
  return (
    <AdminLockout>
      <div className="min-h-screen w-full bg-white dark:bg-gray-900">
        {/* Use the shared AdminHeader component for consistency across admin pages */}
        <AdminHeader userEmail={user?.email} />

        <div className="container mx-auto px-4 lg:px-8 py-8 max-w-7xl">
          {/* Hero Section */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              🔍 MCQs Scrutiny Panel
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Review and fix problematic Multiple Choice Questions.
            </p>
          </div>

          {/* Search Bar Section */}
          <div className="flex items-center space-x-2 mb-6">
            <input
              type="text"
              placeholder="Search question..."
              className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
            <button
              onClick={handleSearch}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md flex items-center space-x-2"
            >
              <SearchIcon size={20} />
              <span>Search</span>
            </button>
          </div>

          {searchPerformed && searchResults.length > 0 && (
            <div className="space-y-4 border border-gray-200 dark:border-gray-700 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Search Results ({searchResults.length})</h3>
              {searchResults.map((mcq) => (
                <Card key={mcq.id} className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-md font-semibold">Question: {mcq.question}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300"><strong>ID:</strong> {mcq.id}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Chapter:</strong> {getChapterName(mcq.chapter_id)}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Subject:</strong> {getSubjectName(mcq.chapter_id)}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Correct Answer:</strong> {mcq.correct_answer ?? 'N/A'}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Options:</strong></p>
                    <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 ml-4">
                      {mcq.options.map((opt, idx) => (
                        <li key={idx}>{String.fromCharCode(65 + idx)}. {opt}</li>
                      ))}
                    </ul>
                    {mcq.explanation && (
                      <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Explanation:</strong> {mcq.explanation}</p>
                    )}
                    {mcq.difficulty && (
                      <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Difficulty:</strong> {mcq.difficulty}</p>
                    )}
                    {mcq.text && (
                      <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Text:</strong> {mcq.text}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {searchPerformed && searchResults.length === 0 && searchTerm.trim() && (
            <div className="text-center text-gray-600 dark:text-gray-400 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-yellow-50 dark:bg-yellow-950">
              No questions found matching "{searchTerm}".
            </div>
          )}

          <h2 className="text-xl font-bold mt-6">Problematic MCQs Overview</h2>
          <p className="text-gray-900 dark:text-gray-100">
            Found <strong>{totalProblematic}</strong> total problematic questions. (
            <span className="text-yellow-600 dark:text-yellow-400 font-semibold">
              <AlertTriangle className="inline-block h-4 w-4 mr-1 mb-0.5" /> {totalFixableByABCD} ABCD-fixable
            </span>,{' '}
            <span className="text-red-600 dark:text-red-400 font-semibold">
              <XCircle className="inline-block h-4 w-4 mr-1 mb-0.5" /> {totalOtherProblematic} Other issues
            </span>)
          </p>

          {totalFixableByABCD > 0 && (
            <button
              onClick={handleFixABCDProblematic}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              disabled={fixing}
            >
              {fixing ? 'Fixing...' : `Fix A/B/C/D Correct Answers (${totalFixableByABCD})`}
            </button>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mt-4">
            {subjects.map((subject, index) => {
              const subjectChapters = chapters.filter((ch) => ch.subject_id === subject.id);
              const subjectMCQs = mcqs.filter((m) =>
                subjectChapters.map((c) => c.id).includes(m.chapter_id)
              );
              const subjectFixableByABCD = subjectMCQs.filter(getFixableByABCDMapping).length;
              const subjectOtherProblematic = subjectMCQs.filter(getOtherProblematic).length;

              const colorClass = subjectCardColors[index % subjectCardColors.length];

              return (
                <Card
                  key={subject.id}
                  className={`cursor-pointer border border-blue-400 dark:border-blue-700 bg-gradient-to-r ${colorClass} text-white dark:text-gray-100`}
                  onClick={() => setExpandedSubject(subject.id === expandedSubject ? null : subject.id)}
                >
                  <CardContent className="py-4">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold">{subject.name}</p>
                      <span className="flex items-center space-x-2">
                        {subjectFixableByABCD > 0 && (
                          <span className="flex items-center text-yellow-300 dark:text-yellow-200">
                            <AlertTriangle className="h-4 w-4 mr-1" /> {subjectFixableByABCD}
                          </span>
                        )}
                        {subjectOtherProblematic > 0 && (
                          <span className="flex items-center text-red-300 dark:text-red-200">
                            <XCircle className="h-4 w-4 mr-1" /> {subjectOtherProblematic}
                          </span>
                        )}
                        {(subjectFixableByABCD === 0 && subjectOtherProblematic === 0) && (
                          <span className="text-green-300 dark:text-green-200">
                            All Good
                          </span>
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {expandedSubject !== null && (
            <div className="space-y-3 mt-4">
              {chapters
                .filter((ch) => ch.subject_id === expandedSubject)
                .map((chapter) => {
                  const chapterMCQs = mcqs.filter((m) => m.chapter_id === chapter.id);
                  const chapterFixableByABCD = chapterMCQs.filter(getFixableByABCDMapping).length;
                  const chapterOtherProblematic = chapterMCQs.filter(getOtherProblematic).length;

                  return (
                    <Card
                      key={chapter.id}
                      className="cursor-pointer border border-purple-400 dark:border-purple-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      onClick={() =>
                        setExpandedChapter(
                          chapter.id === expandedChapter ? null : chapter.id
                        )
                      }
                    >
                      <CardContent className="py-4">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-semibold">{chapter.name}</p>
                          <span className="flex items-center space-x-2">
                            {chapterFixableByABCD > 0 && (
                              <span className="flex items-center text-yellow-600 dark:text-yellow-400">
                                <AlertTriangle className="h-4 w-4 mr-1" /> {chapterFixableByABCD}
                              </span>
                            )}
                            {chapterOtherProblematic > 0 && (
                              <span className="flex items-center text-red-600 dark:text-red-400">
                                <XCircle className="h-4 w-4 mr-1" /> {chapterOtherProblematic}
                              </span>
                            )}
                            {(chapterFixableByABCD === 0 && chapterOtherProblematic === 0) && (
                              <span className="text-green-600 dark:text-green-400">
                                All Good
                              </span>
                            )}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}

          {expandedChapter !== null && (
            <div className="space-y-3 mt-4">
              {mcqs
                .filter((m) => m.chapter_id === expandedChapter && getProblematic(m))
                .map((mcq) => (
                  <Card
                    key={mcq.id}
                    className={`border ${getFixableByABCDMapping(mcq) ? 'border-orange-500 dark:border-orange-700' : 'border-red-400 dark:border-red-700'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
                    onClick={() => toggleQuestion(mcq.id)}
                  >
                    <CardContent className="space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold">{mcq.question}</p>
                        {expandedQuestions[mcq.id] ? <ChevronUp /> : <ChevronDown />}
                      </div>
                      {/* START: Changed display for problematic correct_answer */}
                      {mcq.correct_answer === null || !mcq.options?.includes(mcq.correct_answer) || getFixableByABCDMapping(mcq) ? (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          ❗ Correct answer is invalid or missing: <strong className="font-bold">{mcq.correct_answer ?? 'NULL'}</strong>
                        </p>
                      ) : (
                        // This case should ideally not be problematic based on current logic,
                        // but it's good to keep this for robustness if a question isn't expanded.
                        // For truly non-problematic questions, this section might be hidden.
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Correct Answer:</strong> {mcq.correct_answer}
                        </p>
                      )}
                      {/* END: Changed display for problematic correct_answer */}

                      {getFixableByABCDMapping(mcq) && (
                        <p className="text-sm text-orange-700 dark:text-orange-400">
                          💡 This can be fixed automatically (A/B/C/D mapping).
                        </p>
                      )}
                      {expandedQuestions[mcq.id] && (
                        <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                          {mcq.options.map((opt, idx) => (
                            <li key={idx} className={mcq.correct_answer && mcq.correct_answer === opt ? 'font-bold text-green-700 dark:text-green-400' : ''}>
                              {String.fromCharCode(65 + idx)}. {opt}
                              {mcq.correct_answer && isABCDCorrectAnswer(mcq) && String.fromCharCode(65 + idx) === mcq.correct_answer.toUpperCase() && (
                                <span className="ml-2 text-orange-500 dark:text-orange-300">(Current A/B/C/D mapping)</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>
      </div>
    </AdminLockout>
  );
}
