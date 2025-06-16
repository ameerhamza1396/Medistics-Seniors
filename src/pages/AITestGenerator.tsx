// src/pages/AITestGenerator.tsx

import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import { Moon, Sun, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import {
  Card, CardHeader, CardContent, CardFooter, CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ProfileDropdown } from '@/components/ProfileDropdown';

interface Question {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

const AITestGenerator: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const API = window.location.origin;

  // Fetch user plan using object-style v5 signature
  const { data: profile, isLoading: planLoading } = useQuery({
    queryKey: ['plan', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
    retry: false
  });

  const plan = profile?.plan?.toLowerCase() || 'free';
  const hasAccess = ['premium','iconic'].includes(plan);

  // form state
  const [topic, setTopic] = useState('');
  const [totalQ, setTotalQ] = useState(10);
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadTime, setLoadTime] = useState(0);

  // test state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number,string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const timerRef = useRef<NodeJS.Timeout|null>(null);

  // Fetch all questions at once
  const fetchAll = async () => {
    setError(null);
    setLoading(true);
    setLoadTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setLoadTime(t => t+1), 1000);

    try {
      const res = await fetch(`https://medistics-ai-bot.vercel.app/generate-ai-test`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          topic,
          difficulty: 'medium',
          count: totalQ,
          prompt: `Strictly adhere to the MDCAT syllabus. ${custom}`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Status ${res.status}`);
      setQuestions(data.questions);
      setIdx(0);
      setAnswers({});
      setSubmitted(false);
    } catch (e:any) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // answer & navigation
  const select = (i:number, a:string) => !answers[i] && setAnswers(s => ({...s,[i]:a}));
  const next = () => idx < questions.length - 1 && setIdx(idx + 1);
  const prev = () => idx > 0 && setIdx(idx - 1);
  const submit = () => setSubmitted(true);
  const score = questions.reduce((acc,q,i)=> answers[i]===q.answer?acc+1:acc,0);

  if (authLoading || planLoading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading…</p></div>;
  }
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Link to="/login"><Button>Sign In</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="sticky top-0 bg-white dark:bg-gray-800 p-4 flex justify-between items-center">
        <Link to="/dashboard"><ArrowLeft className="text-current"/></Link>
        <h2 className="text-lg font-bold">AI Test Generator</h2>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>
            {theme==='dark'?<Sun/>:<Moon/>}
          </Button>
          <Badge>{plan.charAt(0).toUpperCase()+plan.slice(1)} Plan</Badge>
          <ProfileDropdown/>
        </div>
      </header>

      <main className="p-8">
        {!hasAccess && (
          <Card className="max-w-xl mx-auto p-6 text-center">
            <CardHeader><CardTitle>Upgrade Required</CardTitle></CardHeader>
            <CardContent>
              <Button onClick={()=>window.location.href='/pricing'}>Upgrade</Button>
            </CardContent>
          </Card>
        )}

        {hasAccess && questions.length === 0 && (
          <Card className="max-w-3xl mx-auto p-8">
            <h3 className="text-2xl mb-4">Generate Your Test</h3>
            <div className="space-y-4">
              <input
                className="w-full p-2 border rounded"
                placeholder="Topic"
                value={topic}
                onChange={e=>setTopic(e.target.value)}
              />
              <input
                type="number"
                className="w-full p-2 border rounded"
                placeholder="Total Questions"
                value={totalQ}
                onChange={e=>setTotalQ(+e.target.value)}
              />
              <textarea
                className="w-full p-2 border rounded"
                rows={3}
                placeholder="Custom Prompt (optional)"
                value={custom}
                onChange={e=>setCustom(e.target.value)}
              />
              <Button onClick={fetchAll} disabled={loading}>
                {loading ? `Generating (${loadTime}s)…` : 'Generate Test'}
              </Button>
              {error && <p className="text-red-600">{error}</p>}
            </div>
          </Card>
        )}

        {questions.length > 0 && (
          <Card className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden">
  {/* Header */}
  <CardHeader className="bg-white dark:bg-gray-900 p-6 text-center">
    <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
      Question {idx + 1} of {questions.length}
    </CardTitle>
    <Progress
      value={((idx + 1) / questions.length) * 100}
      className="h-3 mt-4 bg-gray-200 dark:bg-gray-700 rounded-full"
    />
  </CardHeader>

  {/* Question */}
  <CardContent className="p-8 space-y-8">
    <p className="text-lg leading-relaxed text-gray-800 dark:text-gray-200">
      {questions[idx].question}
    </p>

    {/* Options Grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {questions[idx].options.map((opt, i) => {
        const isSelected      = answers[idx] === opt;
        const isCorrectOption = opt === questions[idx].answer;
        const answered        = typeof answers[idx] === 'string';

        let base = "flex items-center p-4 rounded-lg border transition ";
        if (!answered) {
          base += "border-gray-300 hover:shadow-lg hover:border-purple-500 ";
        } else if (isCorrectOption) {
          base += "border-green-500 bg-green-50 dark:bg-green-900 ";
        } else if (isSelected && !isCorrectOption) {
          base += "border-red-500 bg-red-50 dark:bg-red-900 ";
        } else {
          base += "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700 ";
        }

        return (
          <label key={i} className={base}>
            <input
              type="radio"
              name={`q${idx}`}
              disabled={answered}
              checked={isSelected}
              onChange={() => select(idx, opt)}
              className="h-5 w-5 text-purple-600"
            />
            <span className="ml-4 text-gray-900 dark:text-gray-100">{opt}</span>
          </label>
        );
      })}
    </div>
  </CardContent>

  {/* Explanation */}
  {answers[idx] && (
    <CardFooter className="bg-green-100 dark:bg-green-700 p-6 border-t border-gray-200 dark:border-gray-600">
      <p className="text-lg font-semibold text-green-700 dark:text-green-300 mb-4">
        {answers[idx] === questions[idx].answer ? 'Correct!' : 'Incorrect!'}
      </p>
      <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
        {questions[idx].explanation}
      </p>
    </CardFooter>
  )}

  {/* Navigation */}
  <div className="flex justify-between items-center p-6 bg-white dark:bg-gray-900">
    <Button onClick={prev} disabled={idx === 0} variant="outline">
      Previous
    </Button>

    {idx < questions.length - 1 ? (
      <Button onClick={next} disabled={!answers[idx]}>
        Next
      </Button>
    ) : (
      <div className="space-x-4">
        {!submitted && (
          <Button onClick={submit} className="bg-purple-600 hover:bg-purple-700">
            Submit
          </Button>
        )}
        <Button onClick={() => setQuestions([])} variant="outline">
          New Test
        </Button>
      </div>
    )}
  </div>

  {/* Score */}
  {submitted && (
    <div className="p-6 bg-gray-50 dark:bg-gray-800 text-center">
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Your Score: {score} / {questions.length}
      </p>
    </div>
  )}
</Card>
        )}
      </main>
    </div>
  );
};

export default AITestGenerator;
