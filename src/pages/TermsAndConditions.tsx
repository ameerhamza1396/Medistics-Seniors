import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

const TermsAndConditions = () => {
  const { theme, setTheme } = useTheme();

  const termsAndConditionsContent = `...`; // Keep your full Markdown content here

  return (
    <div className="min-h-screen w-full bg-white dark:bg-gray-900">
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
          
          <div>
            <Link
              to="/"
              className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
          </div>

          <div className="flex items-center space-x-3">
            <img
              src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
              alt="Medistics Logo"
              className="w-8 h-8 object-contain"
            />
            <span className="text-xl font-bold text-gray-900 dark:text-white">MedisticsApp</span>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 lg:px-8 py-8 max-w-4xl">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            Terms and Conditions
          </h1>
          <div className="text-gray-700 dark:text-gray-300 leading-relaxed space-y-4">
            <pre className="whitespace-pre-wrap text-sm">{termsAndConditionsContent}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
