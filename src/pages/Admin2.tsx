import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Moon, Sun, Upload, Loader2, Lock, Users, BookOpen, Clock, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const Admin2 = () => {
  const { theme, setTheme } = useTheme();
  const { user, isLoading: isUserLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [file, setFile] = useState(null);
  const [isImportLoading, setIsImportLoading] = useState(false);

  // --- Data Fetching Queries ---

  // Fetch user profile to check role
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch total questions in mock_test_questions
  const { data: totalMockTestQuestions, isLoading: isTotalQuestionsLoading, refetch: refetchTotalQuestions } = useQuery({
    queryKey: ['totalMockTestQuestions'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('mock_test_questions')
        .select('*', { count: 'exact' });

      if (error) {
        console.error('Error fetching total mock test questions:', error);
        return 0;
      }
      return count;
    },
  });

  // Fetch last created question timestamp
  const { data: lastCreatedQuestion, isLoading: isLastCreatedLoading } = useQuery({
    queryKey: ['lastCreatedQuestion'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_test_questions')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching last created question:', error);
        return null;
      }
      return data ? new Date(data.created_at).toLocaleString() : 'N/A';
    },
  });

  // Fetch total students attempted (from user_test_results)
  const { data: studentsAttempted, isLoading: isStudentsAttemptedLoading } = useQuery({
    queryKey: ['studentsAttempted'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('user_test_results')
        .select('*', { count: 'exact' });

      if (error) {
        console.error('Error fetching students attempted:', error);
        return 0;
      }
      return count;
    },
  });

  // Fetch all questions for display
  const { data: allQuestions, isLoading: isAllQuestionsLoading, refetch: refetchAllQuestions } = useQuery({
    queryKey: ['allMockTestQuestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_test_questions')
        .select('id, question, option_a, option_b, option_c, option_d, correct_answer')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all questions:', error);
        return [];
      }
      return data;
    },
  });


  // --- Access Control Logic (Expanded to include new query loading states) ---
  if (isUserLoading || isProfileLoading || isTotalQuestionsLoading || isLastCreatedLoading || isStudentsAttemptedLoading || isAllQuestionsLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
        Loading admin panel...
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';

  if (!user) {
    // Not logged in
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 text-center">
        <Lock className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-lg mb-4">You must be logged in to access this page.</p>
        <Link to="/login" className="text-blue-500 hover:underline">Go to Login</Link>
      </div>
    );
  }

  if (!isAdmin) {
    // Logged in but not an admin
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 text-center">
        <Lock className="w-16 h-16 text-red-500 dark:text-red-400 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-lg mb-4">You do not have administrative privileges to view this page.</p>
        <Link to="/dashboard" className="text-blue-500 hover:underline">Go to Dashboard</Link>
      </div>
    );
  }

  // --- CSV Import Handlers ---
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    } else {
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsImportLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const questionsToInsert = [];
        const errors = [];

        results.data.forEach((row, index) => {
          const cleanedRow = {};
          for (const key in row) {
            cleanedRow[key.toLowerCase().replace(/\s/g, '_')] = row[key];
          }

          const questionData = {
            question: cleanedRow.question,
            option_a: cleanedRow.option_a || cleanedRow.option_1,
            option_b: cleanedRow.option_b || cleanedRow.option_2,
            option_c: cleanedRow.option_c || cleanedRow.option_3,
            option_d: cleanedRow.option_d || cleanedRow.option_4,
            correct_answer: cleanedRow.correct_answer || cleanedRow.answer,
          };

          if (
            !questionData.question ||
            !questionData.option_a ||
            !questionData.option_b ||
            !questionData.option_c ||
            !questionData.option_d ||
            !questionData.correct_answer
          ) {
            errors.push(`Row ${index + 2}: Missing required fields.`);
          } else if (![
              questionData.option_a,
              questionData.option_b,
              questionData.option_c,
              questionData.option_d
            ].includes(questionData.correct_answer)) {
            errors.push(`Row ${index + 2}: Correct answer '${questionData.correct_answer}' not found in options.`);
          } else {
            questionsToInsert.push(questionData);
          }
        });

        if (errors.length > 0) {
          toast({
            title: "CSV Import Warnings/Errors",
            description: (
              <div>
                <p>Some rows had issues and were skipped:</p>
                <ul className="list-disc pl-5 mt-2 max-h-40 overflow-y-auto">
                  {errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            ),
            variant: "destructive",
            duration: 9000,
          });
        }

        if (questionsToInsert.length === 0) {
          toast({
            title: "No valid questions to import",
            description: "Please check your CSV file for correct formatting and data.",
            variant: "destructive",
          });
          setIsImportLoading(false);
          return;
        }

        try {
          const { error: insertError } = await supabase
            .from('mock_test_questions')
            .insert(questionsToInsert);

          if (insertError) {
            console.error('Supabase insert error:', insertError.message);
            toast({
              title: "Import Failed",
              description: `Error inserting questions: ${insertError.message}`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "Import Successful!",
              description: `${questionsToInsert.length} questions imported successfully.`,
              variant: "success",
            });
            setFile(null);
            queryClient.invalidateQueries({ queryKey: ['totalMockTestQuestions'] });
            queryClient.invalidateQueries({ queryKey: ['lastCreatedQuestion'] });
            queryClient.invalidateQueries({ queryKey: ['allMockTestQuestions'] });
          }
        } catch (err) {
          console.error('Unexpected error during Supabase insert:', err.message);
          toast({
            title: "Error",
            description: `An unexpected error occurred: ${err.message}`,
            variant: "destructive",
          });
        } finally {
          setIsImportLoading(false);
        }
      },
      error: (err) => {
        console.error('PapaParse error:', err);
        toast({
          title: "CSV Parsing Error",
          description: `Failed to parse CSV file: ${err.message}`,
          variant: "destructive",
        });
        setIsImportLoading(false);
      }
    });
  };

  // --- Delete All Questions Handler ---
  const handleDeleteAllQuestions = async () => {
    try {
      const { error } = await supabase
        .from('mock_test_questions')
        .delete()
        .neq('id', '0');

      if (error) {
        console.error('Error deleting all questions:', error);
        toast({
          title: "Deletion Failed",
          description: `Error deleting questions: ${error.message}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Deletion Successful!",
          description: "All mock test questions have been deleted.",
          variant: "success",
        });
        queryClient.invalidateQueries({ queryKey: ['totalMockTestQuestions'] });
        queryClient.invalidateQueries({ queryKey: ['lastCreatedQuestion'] });
        queryClient.invalidateQueries({ queryKey: ['allMockTestQuestions'] });
      }
    } catch (err) {
      console.error('Unexpected error during deletion:', err.message);
      toast({
        title: "Error",
        description: `An unexpected error occurred during deletion: ${err.message}`,
        variant: "destructive",
      });
    }
  };


  // --- Main Component Render (only if authorized) ---
  return (
    <div className="min-h-screen w-full bg-white dark:bg-gray-900">
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
          <Link to="/dashboard" className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center space-x-3">
            <img
              src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
              alt="Medistics Logo"
              className="w-8 h-8 object-contain"
            />
            <span className="text-xl font-bold text-gray-900 dark:text-white">Mock Test Importer</span>
          </div>

          <div className="flex items-center space-x-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="hidden sm:inline-flex">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete All MCQs
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete ALL mock test questions from your database.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAllQuestions} className="bg-red-500 hover:bg-red-600">
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

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
            <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700">
              Admin
            </Badge>
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {user?.email?.substring(0, 2).toUpperCase() || 'A'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 lg:px-8 py-8 max-w-7xl">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            📊 Upload & Manage Mock Test Questions
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Use this panel to import, review, and manage mock test questions via CSV.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-8">
          <Card className="text-center bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:scale-105 transition-transform duration-300 animate-fade-in">
            <CardHeader className="pb-2">
              <BookOpen className="h-5 md:h-6 w-5 md:w-6 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-xs md:text-sm text-gray-900 dark:text-white">Total Mock Test Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">
                {totalMockTestQuestions !== null ? totalMockTestQuestions : '...'}
              </div>
            </CardContent>
          </Card>

          <Card className="text-center bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:scale-105 transition-transform duration-300 animate-fade-in">
            <CardHeader className="pb-2">
              <Clock className="h-5 md:h-6 w-5 md:w-6 mx-auto mb-2 text-green-600 dark:text-green-400" />
              <CardTitle className="text-xs md:text-sm text-gray-900 dark:text-white">Last Question Created</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs md:text-sm font-bold text-green-600 dark:text-green-400">
                {lastCreatedQuestion}
              </div>
            </CardContent>
          </Card>

          <Card className="text-center bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 hover:scale-105 transition-transform duration-300 animate-fade-in">
            <CardHeader className="pb-2">
              <Users className="h-5 md:h-6 w-5 md:w-6 mx-auto mb-2 text-orange-600 dark:text-orange-400" />
              <CardTitle className="text-xs md:text-sm text-gray-900 dark:text-white">Students Attempted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-orange-600 dark:text-orange-400">
                {studentsAttempted !== null ? studentsAttempted : '...'}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300 animate-slide-up mb-8">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Upload Mock Test CSV</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Select a CSV file containing your mock test questions to upload them directly to Supabase.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csv-file">Choose CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="dark:file:text-white dark:file:bg-gray-700 dark:bg-gray-800 dark:border-gray-700"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Expected columns: `question`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_answer`.
                  (Variations like `option_1`, `answer` are also supported.)
                </p>
              </div>
              <Button
                onClick={handleUpload}
                className="w-full bg-gradient-to-r from-blue-600 to-teal-600 text-white hover:from-blue-700 hover:to-teal-700 transition-all duration-300"
                disabled={isImportLoading || !file}
              >
                {isImportLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Questions
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Display All Questions Section */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 animate-slide-up">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">All Mock Test Questions</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Review all questions currently stored in the mock test database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allQuestions && allQuestions.length > 0 ? (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {allQuestions.map((q, index) => (
                  <Collapsible key={q.id} className="border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900 p-3 shadow-sm">
                    <CollapsibleTrigger asChild>
                      {/* Only one icon here, positioned to the right */}
                      <div className="flex justify-between items-center cursor-pointer text-left text-gray-800 dark:text-gray-200 font-medium">
                        <span>{index + 1}. {q.question}</span>
                        {/* Only one Chevron icon group, controlled by Collapsible's state */}
                        <div className="ml-auto"> {/* Use ml-auto to push to the right */}
                            <ChevronDown className="h-4 w-4 data-[state=open]:hidden" />
                            <ChevronUp className="h-4 w-4 data-[state=closed]:hidden" />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3 text-sm text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700 pt-3">
                      <ul className="space-y-1">
                        <li><span className="font-semibold">A:</span> {q.option_a}</li>
                        <li><span className="font-semibold">B:</span> {q.option_b}</li>
                        <li><span className="font-semibold">C:</span> {q.option_c}</li>
                        <li><span className="font-semibold">D:</span> {q.option_d}</li>
                        <li className="mt-2 text-green-600 dark:text-green-400 font-bold">
                          <span className="text-gray-900 dark:text-white">Correct Answer:</span> {q.correct_answer}
                        </li>
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">No mock test questions found. Upload some!</p>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Admin2;