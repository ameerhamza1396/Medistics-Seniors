// Admin12.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, PlusCircle, Edit, Trash2 } from 'lucide-react';

// Define interfaces for data types
interface Subject {
  id: string;
  name: string;
}

interface Chapter {
  id: string;
  name: string;
  subject_id: string;
}

interface MCQ {
  id: string;
  chapter_id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  subject: string; // Assuming 'subject' column exists in mcqs table storing subject name
  difficulty: string; // Assuming 'difficulty' is always present
}

// Interface for the state of the Add/Edit form
interface QuestionFormState {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  subject: string; // Stores subject ID from select
  chapter: string; // Stores chapter ID from select
  difficulty: string;
}

export const Admin12: React.FC = () => {
  const { toast } = useToast();

  // State for data fetched from Supabase
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  // Global loading state for all data operations, including initial subject and role fetch
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null); // State to hold the user's role

  // State for filtering and searching questions
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentSearchQuery, setCurrentSearchQuery] = useState<string>(''); // New state for actual search query

  // State for managing the "Add New Question" dialog
  const [isAddingNewQuestion, setIsAddingNewQuestion] = useState(false);
  const [newQuestionForm, setNewQuestionForm] = useState<QuestionFormState>({
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: '',
    explanation: '',
    subject: '', // Stores subject ID from select
    chapter: '', // Stores chapter ID from select
    difficulty: 'medium', // Default difficulty for new questions
  });

  // State for managing the "Edit Question" dialog
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [currentEditingQuestion, setCurrentEditingQuestion] = useState<MCQ | null>(null);
  const [editQuestionForm, setEditQuestionForm] = useState<QuestionFormState>({
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: '',
    explanation: '',
    subject: '', // Stores subject ID for the select input
    chapter: '', // Stores chapter ID for the select input
    difficulty: '',
  });

  // State for managing the "Delete Confirmation" dialog
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [questionToDeleteId, setQuestionToDeleteId] = useState<string | null>(null);

  // --- Data Fetching Logic ---

  // Fetches subjects and checks user role on component mount
  useEffect(() => {
    const initializeAdminPanel = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch subjects
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, name');
        if (subjectsError) throw subjectsError;
        setSubjects(subjectsData || []);

        // Check user authentication and role
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profileError) throw profileError;
          setUserRole(profile?.role || null);
        } else {
          setUserRole(null); // No user logged in
        }
      } catch (err: any) {
        console.error('Initialization error:', err);
        setError('Failed to initialize admin panel: ' + err.message);
        toast({ title: 'Error', description: 'Failed to load data or verify role.', variant: 'destructive' });
        setUserRole(null); // Ensure role is null on error
      } finally {
        setLoading(false);
      }
    };
    initializeAdminPanel();
  }, [toast]);

  // Fetches chapters based on the currently selected subject ID
  useEffect(() => {
    const fetchChaptersForSubject = async () => {
      if (!selectedSubjectId) {
        setChapters([]); // Clear chapters if no subject is selected
        return;
      }
      setError(null);
      try {
        const { data, error } = await supabase
          .from('chapters')
          .select('id, name, subject_id')
          .eq('subject_id', selectedSubjectId);
        if (error) throw error;
        setChapters(data || []);
      } catch (err: any) {
        console.error('Error fetching chapters:', err);
        setError('Failed to load chapters.');
        toast({ title: 'Error', description: 'Failed to load chapters.', variant: 'destructive' });
      }
    };
    fetchChaptersForSubject();
  }, [selectedSubjectId, toast]);

  // Function to fetch MCQs based on current filters and search term
  const fetchMcqsData = async () => {
    setLoading(true); // Set global loading to true when starting MCQ fetch
    setError(null);
    try {
      let query = supabase
        .from('mcqs')
        .select('*');

      // Filter by subject if selected
      if (selectedSubjectId) {
        const subjectName = subjects.find(s => s.id === selectedSubjectId)?.name;
        if (subjectName) {
          query = query.eq('subject', subjectName);
        }
      }
      // Filter by chapter if selected
      if (selectedChapterId) {
        query = query.eq('chapter_id', selectedChapterId);
      }
      // Filter by search term (case-insensitive) in the question text
      if (currentSearchQuery) { // Use currentSearchQuery here
        query = query.ilike('question', `%${currentSearchQuery}%`);
      }

      const { data, error } = await query.order('id', { ascending: false }); // Order by ID descending for newest first
      if (error) throw error;
      setMcqs(data || []);
    } catch (err: any) {
      console.error('Error fetching MCQs:', err);
      setError('Failed to load questions.');
      toast({ title: 'Error', description: 'Failed to load questions.', variant: 'destructive' });
    } finally {
      setLoading(false); // Set global loading to false after MCQ fetch is complete
    }
  };

  // Main effect to trigger MCQ fetch based on explicit filter/search criteria
  useEffect(() => {
    // Fetch MCQs only if (subject AND chapter are selected) OR a search term is active.
    // Also, ensure the user role is determined before fetching, to avoid unnecessary calls.
    if (userRole === 'admin' && ((selectedSubjectId && selectedChapterId) || currentSearchQuery)) {
      fetchMcqsData();
    } else if (userRole === 'admin') {
      // If user is admin but conditions for fetching are not met, clear displayed MCQs
      setMcqs([]);
    }
  }, [selectedSubjectId, selectedChapterId, currentSearchQuery, subjects, userRole, toast]); 

  // Handler for search button click
  const handleSearchButtonClick = () => {
    setCurrentSearchQuery(searchTerm); // Set currentSearchQuery to trigger fetch
  };

  // --- Handlers for Add New Question Dialog ---

  // Handles changes in input and textarea fields for the new question form
  const handleNewQuestionInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewQuestionForm(prev => ({ ...prev, [name]: value }));
  };

  // Handles changes in select (dropdown) fields for the new question form
  const handleNewQuestionSelectChange = (name: keyof QuestionFormState, value: string) => {
    setNewQuestionForm(prev => ({ ...prev, [name]: value }));
    // If subject changes, clear the selected chapter in the form
    if (name === 'subject') {
      setSelectedSubjectId(value);
      setNewQuestionForm(prev => ({ ...prev, chapter: '' }));
    }
  };

  // Handles the submission of a new question
  const handleSubmitNewQuestion = async () => {
    setLoading(true);
    setError(null);

    const { question, optionA, optionB, optionC, optionD, correctAnswer, explanation, subject, chapter, difficulty } = newQuestionForm;

    // Basic validation for required fields
    if (!question || !optionA || !optionB || !correctAnswer || !subject || !chapter) {
      toast({
        title: 'Validation Error',
        description: 'Question, at least two options (A, B), correct answer, subject, and chapter are required.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Find the actual chapter and subject objects based on their IDs selected in the form
    const chapterObj = chapters.find(c => c.id === chapter);
    const subjectObj = subjects.find(s => s.id === subject);

    if (!chapterObj || !subjectObj) {
        toast({ title: 'Error', description: 'Selected chapter or subject is invalid.', variant: 'destructive' });
        setLoading(false);
        return;
    }

    // Create an array of options, filtering out empty ones (C and D are optional)
    const optionsArray = [optionA, optionB];
    if (optionC) optionsArray.push(optionC);
    if (optionD) optionsArray.push(optionD);

    const mcqData = {
      chapter_id: chapterObj.id, // Use the actual chapter ID
      question: question,
      options: optionsArray,
      correct_answer: correctAnswer,
      explanation: explanation,
      subject: subjectObj.name, // Use the subject name for the 'subject' column in the 'mcqs' table
      difficulty: difficulty,
    };

    try {
      // Insert the new MCQ into the 'mcqs' table
      const { error } = await supabase
        .from('mcqs')
        .insert([mcqData]);

      if (error) throw error;

      toast({ title: 'Success', description: 'Question added successfully!' });
      setIsAddingNewQuestion(false); // Close the dialog
      // Reset the form fields to their initial empty state
      setNewQuestionForm({
        question: '', optionA: '', optionB: '', optionC: '', optionD: '',
        correctAnswer: '', explanation: '', subject: '', chapter: '', difficulty: 'medium'
      });
      // Re-fetch MCQs if current filters allow, or just clear if no filters are active
      if ((selectedSubjectId && selectedChapterId) || currentSearchQuery) {
        await fetchMcqsData();
      } else {
        setMcqs([]); // Clear the list if no filters applied and new question added
      }
    } catch (err: any) {
      console.error('Error adding question:', err);
      setError('Failed to add question: ' + err.message);
      toast({ title: 'Error', description: 'Failed to add question.', variant: 'destructive' });
    } finally {
      setLoading(false); // Clear loading state
    }
  };

  // --- Handlers for Edit Question Dialog ---

  // Opens the edit dialog and populates the form with the selected MCQ's data
  const handleEditQuestion = (mcq: MCQ) => {
    // We need to set the subject and chapter in the form using their IDs
    // The MCQ itself stores subject as name and chapter as ID
    const subjectId = subjects.find(s => s.name === mcq.subject)?.id || '';
    const chapterId = mcq.chapter_id;

    setCurrentEditingQuestion(mcq); // Store the original MCQ object
    setEditQuestionForm({
      question: mcq.question,
      optionA: mcq.options[0] || '',
      optionB: mcq.options[1] || '',
      optionC: mcq.options[2] || '',
      optionD: mcq.options[3] || '',
      correctAnswer: mcq.correct_answer,
      explanation: mcq.explanation,
      subject: subjectId, // Set subject ID for the select input
      chapter: chapterId, // Set chapter ID for the select input
      difficulty: mcq.difficulty,
    });
    // Temporarily set selectedSubjectId to fetch chapters for the edit dialog's chapter dropdown
    setSelectedSubjectId(subjectId);
    setIsEditingQuestion(true); // Open the dialog
  };

  // Handles changes in input and textarea fields for the edit question form
  const handleEditQuestionInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditQuestionForm(prev => ({ ...prev, [name]: value }));
  };

  // Handles changes in select (dropdown) fields for the edit question form
  const handleEditQuestionSelectChange = (name: keyof QuestionFormState, value: string) => {
    setEditQuestionForm(prev => ({ ...prev, [name]: value }));
    // If subject changes, clear the selected chapter in the form
    if (name === 'subject') {
      setSelectedSubjectId(value);
      setEditQuestionForm(prev => ({ ...prev, chapter: '' }));
    }
  };

  // Handles the submission of an updated question
  const handleUpdateQuestion = async () => {
    if (!currentEditingQuestion) return; // Ensure an MCQ is being edited

    setLoading(true);
    setError(null);

    const { question, optionA, optionB, optionC, optionD, correctAnswer, explanation, subject, chapter, difficulty } = editQuestionForm;

    // Basic validation for required fields
    if (!question || !optionA || !optionB || !correctAnswer || !subject || !chapter) {
      toast({
        title: 'Validation Error',
        description: 'Question, at least two options (A, B), correct answer, subject, and chapter are required.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Find the actual chapter and subject objects based on their IDs selected in the form
    const chapterObj = chapters.find(c => c.id === chapter);
    const subjectObj = subjects.find(s => s.id === subject);

    if (!chapterObj || !subjectObj) {
        toast({ title: 'Error', description: 'Selected chapter or subject is invalid.', variant: 'destructive' });
        setLoading(false);
        return;
    }

    // Create an array of options, filtering out empty ones
    const optionsArray = [optionA, optionB];
    if (optionC) optionsArray.push(optionC);
    if (optionD) optionsArray.push(optionD);

    const updatedMcqData = {
      chapter_id: chapterObj.id, // Use the actual chapter ID
      question: question,
      options: optionsArray,
      correct_answer: correctAnswer,
      explanation: explanation,
      subject: subjectObj.name, // Use the subject name for the 'subject' column
      difficulty: difficulty,
    };

    try {
      // Update the MCQ in the 'mcqs' table using its ID
      const { error } = await supabase
        .from('mcqs')
        .update(updatedMcqData)
        .eq('id', currentEditingQuestion.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Question updated successfully!' });
      setIsEditingQuestion(false); // Close the dialog
      setCurrentEditingQuestion(null); // Clear the editing question
      // Re-fetch MCQs if current filters allow, or just clear if no filters are active
      if ((selectedSubjectId && selectedChapterId) || currentSearchQuery) {
        await fetchMcqsData();
      } else {
        // If current filters are empty, and a question was updated, it means it's no longer shown
        // so we just clear the list to avoid stale data.
        setMcqs([]);
      }
    } catch (err: any) {
      console.error('Error updating question:', err);
      setError('Failed to update question: ' + err.message);
      toast({ title: 'Error', description: 'Failed to update question.', variant: 'destructive' });
    } finally {
      setLoading(false); // Clear loading state
    }
  };

  // --- Handlers for Delete Question ---

  // Opens the delete confirmation dialog
  const handleDeleteConfirmation = (id: string) => {
    setQuestionToDeleteId(id); // Store the ID of the question to be deleted
    setDeleteConfirmationOpen(true);
  };

  // Executes the delete operation
  const handleDeleteQuestion = async () => {
    if (!questionToDeleteId) return; // Ensure an ID is set for deletion

    setLoading(true);
    setError(null);
    try {
      // Delete the MCQ from the 'mcqs' table
      const { error } = await supabase
        .from('mcqs')
        .delete()
        .eq('id', questionToDeleteId);

      if (error) throw error;

      toast({ title: 'Success', description: 'Question deleted successfully!' });
      setDeleteConfirmationOpen(false); // Close the dialog
      setQuestionToDeleteId(null); // Clear the ID
      // Re-fetch MCQs if current filters allow, or just clear if no filters are active
      if ((selectedSubjectId && selectedChapterId) || currentSearchQuery) {
        await fetchMcqsData();
      } else {
        // If current filters are empty, and a question was deleted, it's no longer there
        // so we just clear the list to avoid showing a deleted item.
        setMcqs([]);
      }
    } catch (err: any) {
      console.error('Error deleting question:', err);
      setError('Failed to delete question: ' + err.message);
      toast({ title: 'Error', description: 'Failed to delete question.', variant: 'destructive' });
    } finally {
      setLoading(false); // Clear loading state
    }
  };

  // Helper function to get chapter name by ID for display in the table
  const getChapterNameById = (chapterId: string) => {
    return chapters.find(c => c.id === chapterId)?.name || 'N/A';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xl text-gray-700 dark:text-gray-300">Loading admin panel...</p>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-3xl font-bold text-red-600 mb-4">Access Denied!</h2>
        <p className="text-lg text-gray-700 dark:text-gray-300">You do not have the necessary permissions to view this page.</p>
        <p className="text-md text-gray-500 dark:text-gray-400 mt-2">Please log in with an administrator account.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
        Admin Panel - Manage Questions
      </h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* Filter and Add Section */}
      <Card className="mb-6 shadow-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg text-gray-900 dark:text-white">
            <Search className="w-5 h-5" />
            <span>Filter Questions</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="subject-filter" className="text-gray-700 dark:text-gray-300">Subject</Label>
            <Select
              value={selectedSubjectId}
              onValueChange={setSelectedSubjectId}
              disabled={loading}
            >
              <SelectTrigger id="subject-filter">
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                {subjects.map(subject => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chapter-filter" className="text-gray-700 dark:text-gray-300">Chapter</Label>
            <Select
              value={selectedChapterId}
              onValueChange={setSelectedChapterId}
              disabled={!selectedSubjectId || loading}
            >
              <SelectTrigger id="chapter-filter">
                <SelectValue placeholder="Select Chapter" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                {chapters.map(chapter => (
                  <SelectItem key={chapter.id} value={chapter.id}>
                        {chapter.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 col-span-1 md:col-span-1 flex items-end"> {/* Adjusted column span and alignment */}
            <div className="flex-grow"> {/* Allows input to take available space */}
              <Label htmlFor="search-term" className="text-gray-700 dark:text-gray-300">Search by Question Text</Label>
              <Input
                id="search-term"
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading}
                className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              />
            </div>
            <Button onClick={handleSearchButtonClick} disabled={loading} className="ml-2 bg-purple-600 hover:bg-purple-700 text-white">
              <Search className="w-4 h-4 mr-2" /> Search
            </Button>
          </div>

          <div className="md:col-span-3 flex justify-end mt-4">
            <Button onClick={() => setIsAddingNewQuestion(true)} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              <PlusCircle className="w-4 h-4 mr-2" /> Add New Question
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Questions Table */}
      <Card className="shadow-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900 dark:text-white">Questions List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="ml-3 text-gray-600 dark:text-gray-400">Loading data...</p> {/* Changed message */}
            </div>
          ) : ((selectedSubjectId && selectedChapterId) || currentSearchQuery) ? ( // Use currentSearchQuery here
            mcqs.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">No questions found matching your criteria.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100 dark:bg-gray-700">
                      <TableHead className="w-[50px] text-gray-700 dark:text-gray-300">ID</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300">Question</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300">Options</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300">Correct Answer</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300">Subject</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300">Chapter</TableHead>
                      <TableHead className="w-[120px] text-right text-gray-700 dark:text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mcqs.map((mcq) => (
                      <TableRow key={mcq.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <TableCell className="font-medium text-xs text-gray-800 dark:text-gray-200">{mcq.id.substring(0, 4)}...</TableCell>
                        <TableCell className="text-sm max-w-xs overflow-hidden text-ellipsis whitespace-nowrap text-gray-800 dark:text-gray-200">{mcq.question}</TableCell>
                        <TableCell className="text-xs text-gray-800 dark:text-gray-200">
                          <ul className="list-disc list-inside pl-4">
                            {mcq.options.map((opt, i) => (
                              <li key={i}>{String.fromCharCode(65 + i)}. {opt}</li>
                            ))}
                          </ul>
                        </TableCell>
                        <TableCell className="text-sm text-gray-800 dark:text-gray-200">{mcq.correct_answer}</TableCell>
                        <TableCell className="text-sm text-gray-800 dark:text-gray-200">{mcq.subject}</TableCell>
                        <TableCell className="text-sm text-gray-800 dark:text-gray-200">{getChapterNameById(mcq.chapter_id)}</TableCell>
                        <TableCell className="text-right flex space-x-2 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => handleEditQuestion(mcq)} className="hover:bg-blue-100 dark:hover:bg-blue-900/20">
                            <Edit className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteConfirmation(mcq.id)} className="hover:bg-red-100 dark:hover:bg-red-900/20">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">Select a subject, chapter, or enter a search term to find questions.</p>
          )}
        </CardContent>
      </Card>

      {/* Add New Question Dialog */}
      <Dialog open={isAddingNewQuestion} onOpenChange={setIsAddingNewQuestion}>
        <DialogContent className="sm:max-w-[600px] p-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add New Question</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-question">Question</Label>
              <Input
                id="new-question"
                name="question"
                value={newQuestionForm.question}
                onChange={handleNewQuestionInputChange}
                className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-optionA">Option A</Label>
                <Input id="new-optionA" name="optionA" value={newQuestionForm.optionA} onChange={handleNewQuestionInputChange} className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-optionB">Option B</Label>
                <Input id="new-optionB" name="optionB" value={newQuestionForm.optionB} onChange={handleNewQuestionInputChange} className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-optionC">Option C (Optional)</Label>
                <Input id="new-optionC" name="optionC" value={newQuestionForm.optionC} onChange={handleNewQuestionInputChange} className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-optionD">Option D (Optional)</Label>
                <Input id="new-optionD" name="optionD" value={newQuestionForm.optionD} onChange={handleNewQuestionInputChange} className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-correctAnswer">Correct Answer (e.g., A, B, C, D)</Label>
              <Input id="new-correctAnswer" name="correctAnswer" value={newQuestionForm.correctAnswer} onChange={handleNewQuestionInputChange} className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-explanation">Explanation</Label>
              <Input id="new-explanation" name="explanation" value={newQuestionForm.explanation} onChange={handleNewQuestionInputChange} className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-subject">Subject</Label>
                <Select value={newQuestionForm.subject} onValueChange={(val) => handleNewQuestionSelectChange('subject', val)}>
                  <SelectTrigger id="new-subject" className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    {subjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-chapter">Chapter</Label>
                <Select value={newQuestionForm.chapter} onValueChange={(val) => handleNewQuestionSelectChange('chapter', val)} disabled={!newQuestionForm.subject}>
                  <SelectTrigger id="new-chapter" className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600">
                    <SelectValue placeholder="Select Chapter" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    {chapters.map(chapter => (
                      <SelectItem key={chapter.id} value={chapter.id}>
                        {chapter.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="new-difficulty">Difficulty</Label>
                <Select value={newQuestionForm.difficulty} onValueChange={(val) => handleNewQuestionSelectChange('difficulty', val)}>
                    <SelectTrigger id="new-difficulty" className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600">
                        <SelectValue placeholder="Select Difficulty" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingNewQuestion(false)}>Cancel</Button>
            <Button onClick={handleSubmitNewQuestion} disabled={loading}>
              {loading ? 'Adding...' : 'Add Question'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Question Dialog */}
      <Dialog open={isEditingQuestion} onOpenChange={setIsEditingQuestion}>
        <DialogContent className="sm:max-w-[600px] p-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Question</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-question">Question</Label>
              <Input
                id="edit-question"
                name="question"
                value={editQuestionForm.question}
                onChange={handleEditQuestionInputChange}
                className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-optionA">Option A</Label>
                <Input id="edit-optionA" name="optionA" value={editQuestionForm.optionA} onChange={handleEditQuestionInputChange} className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-optionB">Option B</Label>
                <Input id="edit-optionB" name="optionB" value={editQuestionForm.optionB} onChange={handleEditQuestionInputChange} className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-optionC">Option C (Optional)</Label>
                <Input id="edit-optionC" name="optionC" value={editQuestionForm.optionC} onChange={handleEditQuestionInputChange} className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-optionD">Option D (Optional)</Label>
                <Input id="edit-optionD" name="optionD" value={editQuestionForm.optionD} onChange={handleEditQuestionInputChange} className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-correctAnswer">Correct Answer (e.g., A, B, C, D)</Label>
              <Input id="edit-correctAnswer" name="correctAnswer" value={editQuestionForm.correctAnswer} onChange={handleEditQuestionInputChange} className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-explanation">Explanation</Label>
              <Input id="edit-explanation" name="explanation" value={editQuestionForm.explanation} onChange={handleEditQuestionInputChange} className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-subject">Subject</Label>
                <Select value={editQuestionForm.subject} onValueChange={(val) => handleEditQuestionSelectChange('subject', val)}>
                  <SelectTrigger id="edit-subject" className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    {subjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-chapter">Chapter</Label>
                <Select value={editQuestionForm.chapter} onValueChange={(val) => handleEditQuestionSelectChange('chapter', val)} disabled={!editQuestionForm.subject}>
                  <SelectTrigger id="edit-chapter" className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600">
                    <SelectValue placeholder="Select Chapter" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    {chapters.map(chapter => (
                      <SelectItem key={chapter.id} value={chapter.id}>
                        {chapter.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="edit-difficulty">Difficulty</Label>
                <Select value={editQuestionForm.difficulty} onValueChange={(val) => handleEditQuestionSelectChange('difficulty', val)}>
                    <SelectTrigger id="edit-difficulty" className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600">
                        <SelectValue placeholder="Select Difficulty" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingQuestion(false)}>Cancel</Button>
            <Button onClick={handleUpdateQuestion} disabled={loading}>
              {loading ? 'Updating...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmationOpen} onOpenChange={setDeleteConfirmationOpen}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your question.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuestion} disabled={loading} className="bg-red-600 hover:bg-red-700">
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
