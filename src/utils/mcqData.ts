import { supabase } from '@/integrations/supabase/client';

export interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  year: string; // Corrected interface property
}

export interface Chapter {
  id: string;
  name: string;
  description: string;
  chapter_number: number;
  subject_id: string;
}

export interface MCQ {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  subject: string;
  chapter_id: string;
}

export const fetchSubjects = async (): Promise<Subject[]> => {
  try {
    // 1. Get the current user's session
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return [];
    }

    // 2. Fetch the user's profile to get their 'year'
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('year')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError);
      return [];
    }

    const userYear = profile.year;

    // 3. Fetch subjects filtered by the user's 'year'
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('year', userYear) // Corrected from 'ye' to 'year'
      .order('name');

    if (error) {
      console.error('Error fetching subjects:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return [];
  }
};

export const fetchChaptersBySubject = async (subjectId: string): Promise<Chapter[]> => {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('subject_id', subjectId)
      .order('chapter_number');

    if (error) {
      console.error('Error fetching chapters:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return [];
  }
};

export const fetchMCQsByChapter = async (chapterId: string): Promise<MCQ[]> => {
  try {
    const { data, error } = await supabase
      .from('mcqs')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('created_at');

    if (error) {
      console.error('Error fetching MCQs:', error);
      return [];
    }

    // Transform the data to match our MCQ interface
    const transformedData = data?.map(mcq => ({
      ...mcq,
      options: Array.isArray(mcq.options) ? mcq.options :
        typeof mcq.options === 'string' ? JSON.parse(mcq.options) : []
    })) || [];

    return transformedData;
  } catch (error) {
    console.error('Error fetching MCQs:', error);
    return [];
  }
};

export const getUserStats = async (userId: string) => {
  try {
    // Fetch user answers
    const { data: answers, error: answersError } = await supabase
      .from('user_answers')
      .select('*')
      .eq('user_id', userId);

    if (answersError) {
      console.error('Error fetching user answers:', answersError);
      return {
        totalQuestions: 0,
        correctAnswers: 0,
        accuracy: 0,
        averageTime: 0,
        bestStreak: 0
      };
    }

    const totalQuestions = answers?.length || 0;
    const correctAnswers = answers?.filter(a => a.is_correct).length || 0;
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const averageTime = answers?.length > 0 ?
      Math.round(answers.reduce((sum, a) => sum + (a.time_taken || 0), 0) / answers.length) : 0;

    // Calculate best streak
    let currentStreak = 0;
    let bestStreak = 0;
    answers?.forEach(answer => {
      if (answer.is_correct) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    return {
      totalQuestions,
      correctAnswers,
      accuracy,
      averageTime,
      bestStreak
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return {
      totalQuestions: 0,
      correctAnswers: 0,
      accuracy: 0,
      averageTime: 0,
      bestStreak: 0
    };
  }
};