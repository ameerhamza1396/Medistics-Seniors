import { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Users, Trophy, Brain, Target, Moon, Sun, Bot, Sword } from 'lucide-react';
import { useTheme } from 'next-themes';
import MobileNav from '@/components/MobileNav';

const Index = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly'); // New state for billing cycle
  const [currency, setCurrency] = useState('PKR'); // New state for currency
  const navigate = useNavigate();

  useEffect(() => {
    setIsVisible(true);
    setMounted(true);
  }, []);

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Learning",
      description: "Personalized MCQs and adaptive testing with GPT integration",
      gradient: "from-purple-500 to-indigo-500"
    },
    {
      icon: Users,
      title: "Battle Arena",
      description: "Compete with peers in real-time 1v1, 2v2, and 4-player battles",
      gradient: "from-pink-500 to-rose-500"
    },
    {
      icon: Trophy,
      title: "Leaderboards",
      description: "Track your progress and compete regionally and globally",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Target,
      title: "Practice MCQs",
      description: "Access comprehensive MCQ database for exam preparation",
      gradient: "from-indigo-500 to-purple-500"
    }
  ];

  // Define pricing plans data with original prices
  const plans = [
    {
      name: 'Free',
      display: 'Free',
      id: 'free',
      monthly: {
        PKR: { price: '0', features: ['Static MCQs', 'Basic Dashboard Access', 'Limited Practice Sessions'] },
        USD: { price: '0', features: ['Static MCQs', 'Basic Dashboard Access', 'Limited Practice Sessions'] }
      },
      yearly: {
        PKR: { price: '0', features: ['Static MCQs', 'Basic Dashboard Access', 'Limited Practice Sessions'] },
        USD: { price: '0', features: ['Static MCQs', 'Basic Dashboard Access', 'Limited Practice Sessions'] }
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
        PKR: { price: '250', originalPrice: '500', features: ['AI Test Generator', 'Unlimited Practice MCQs', 'Battle Arena', 'Basic Analytics', 'Standard Support', 'Exclusive Community Access'] },
        USD: { price: '0.99', originalPrice: '1.98', features: ['AI Test Generator', 'Unlimited Practice MCQs', 'Battle Arena', 'Basic Analytics', 'Standard Support', 'Exclusive Community Access'] }
      },
      yearly: {
        PKR: { price: '2400', originalPrice: '4800', features: ['AI Test Generator', 'Unlimited Practice MCQs', 'Battle Arena', 'Basic Analytics', 'Standard Support', 'Exclusive Community Access', 'Save PKR 600!'] },
        USD: { price: '10.99', originalPrice: '21.98', features: ['AI Test Generator', 'Unlimited Practice MCQs', 'Battle Arena', 'Basic Analytics', 'Standard Support', 'Exclusive Community Access', 'Save $0.89!'] }
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
        PKR: { price: '500', originalPrice: '1000', features: ['AI Chatbot (Dr. Sultan)', 'Voice Input for Chat', 'Unlimited Battle Arena Challenges', 'Advanced Analytics', 'Priority Support (24/7)', 'Weekly Mock Tests (Sundays)', 'Early Access to New Features', 'Personalized Study Plans'] },
        USD: { price: '1.99', originalPrice: '3.98', features: ['AI Chatbot (Dr. Sultan)', 'Voice Input for Chat', 'Unlimited Battle Arena Challenges', 'Advanced Analytics', 'Priority Support (24/7)', 'Weekly Mock Tests (Sundays)', 'Early Access to New Features', 'Personalized Study Plans'] }
      },
      yearly: {
        PKR: { price: '5200', originalPrice: '10400', features: ['AI Chatbot (Dr. Sultan)', 'Voice Input for Chat', 'Unlimited Battle Arena Challenges', 'Advanced Analytics', 'Priority Support (24/7)', 'Weekly Mock Tests (Sundays)', 'Early Access to New Features', 'Personalized Study Plans', 'Save PKR 800!'] },
        USD: { price: '19.99', originalPrice: '39.98', features: ['AI Chatbot (Dr. Sultan)', 'Voice Input for Chat', 'Unlimited Battle Arena Challenges', 'Advanced Analytics', 'Priority Support (24/7)', 'Weekly Mock Tests (Sundays)', 'Early Access to New Features', 'Personalized Study Plans', 'Save $3.89!'] }
      },
      gradient: 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      popular: false
    }
  ];

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
          <Link to="/" className="flex items-center space-x-3 group">
            <img
              src="/lovable-uploads/161d7edb-aa7b-4383-a8e2-75b6685fc44f.png"
              alt="Medistics Logo"
              className="w-8 h-8 object-contain group-hover:scale-110 transition-transform duration-300"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Medistics
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/leaderboard" className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-300 hover:scale-105">
              <Trophy className="w-5 h-5" />
              <span className="hidden lg:inline">Leaderboard</span>
            </Link>
            <Link to="/battle" className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-300 hover:scale-105">
              <Sword className="w-5 h-5" />
              <span className="hidden lg:inline">Battle</span>
            </Link>
            <Link to="/mcqs" className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-300 hover:scale-105">
              <Target className="w-5 h-5" />
              <span className="hidden lg:inline">Practice</span>
            </Link>
            <Link to="/ai" className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-300 hover:scale-105">
              <Bot className="w-5 h-5" />
              <span className="hidden lg:inline">AI Chat</span>
            </Link>
          </nav>

          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="hidden md:flex w-9 h-9 p-0 hover:scale-110 transition-transform duration-200"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <div className="hidden md:flex items-center space-x-3">
              <Link to="/login">
                <Button variant="ghost" className="hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all duration-300 hover:scale-105">
                  Login
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white hover:scale-105 transition-transform duration-200 shadow-lg hover:shadow-xl">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <MobileNav />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className={`container mx-auto px-4 lg:px-8 py-12 lg:py-20 text-center max-w-7xl transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <Badge className="mb-6 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-800 dark:text-purple-200 hover:scale-105 transition-transform duration-300 border-purple-300 dark:border-purple-700 shadow-lg">
          🚀 Pakistan's First AI-Powered Medical Learning Platform
        </Badge>

        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight animate-fade-in">
          Ace the MDCAT with
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 animate-pulse"> AI Intelligence</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Join thousands of MDCAT Aspirants across Pakistan. Practice MCQs, battle peers, and ace your exams with our AI-powered platform.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <Link to="/signup">
            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg px-8 py-3 hover:scale-105 transition-all duration-200 shadow-xl hover:shadow-2xl">
              Start Learning Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button size="lg" variant="outline" className="text-lg px-8 py-3 border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl">
              View Demo
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-2xl mx-auto">
          {[
            { value: "1000+", label: "Students" },
            { value: "5K+", label: "MCQs Solved" },
            { value: "85%", label: "Success Rate" },
            { value: "24/7", label: "AI Support" }
          ].map((stat, index) => (
            <div key={stat.label} className="text-center animate-scale-in" style={{ animationDelay: `${0.6 + index * 0.1}s` }}>
              <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-sm md:text-base text-gray-600 dark:text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 lg:px-8 py-12 lg:py-20 max-w-7xl">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Everything You Need to Excel
          </h2>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            From AI-generated tests to competitive battles, we've got your medical education covered.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="text-center hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:scale-105 bg-gradient-to-br from-white to-purple-50/50 dark:from-gray-800 dark:to-purple-900/20 border-purple-200 dark:border-purple-800 animate-fade-in-up group overflow-hidden relative" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
              <CardHeader className="relative z-10">
                <div className={`w-12 h-12 bg-gradient-to-r ${feature.gradient} rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg md:text-xl text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

       {/* View Pricing CTA */}
      <section className="container mx-auto px-4 lg:px-8 py-12 lg:py-20 max-w-7xl text-center">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">Ready for Unlimited Access?</h2>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">Unlock full access to AI Test Generator, Battle Arena, and unlimited Practice MCQs.</p>
        <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl" onClick={() => navigate('/pricing')}>
          View Pricing Plans <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white py-12 lg:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/90 to-pink-600/90"></div>
        <div className="container mx-auto px-4 lg:px-8 text-center max-w-7xl relative z-10">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 animate-fade-in">
            Ready to Transform Your Medical Studies?
          </h2>
          <p className="text-lg md:text-xl mb-8 opacity-90 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Join thousands of MDCAT Aspirants who are already acing their exams with Medistics.
          </p>
          <Link to="/signup">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3 bg-white text-purple-600 hover:bg-gray-100 hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl animate-scale-in" style={{ animationDelay: '0.4s' }}>
              Start Your Journey Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 to-black text-white py-12">
        <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="animate-fade-in">
              <div className="flex items-center space-x-2 mb-4">
                <img
                  src="/lovable-uploads/161d7edb-aa7b-4383-a8e2-75b6685fc44f.png"
                  alt="Medistics Logo"
                  className="w-8 h-8 object-contain"
                />
                <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Medistics</span>
              </div>
              <p className="text-gray-400">
                Empowering MDCAT across Pakistan with AI-powered learning.
              </p>
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <h3 className="font-semibold mb-4 text-purple-400">Features</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/mcqs" className="hover:text-white transition-colors duration-300 hover:text-purple-300">MCQ Practice</Link></li>
                <li><Link to="/battle" className="hover:text-white transition-colors duration-300 hover:text-purple-300">Battle Arena</Link></li>
                <li><Link to="/ai" className="hover:text-white transition-colors duration-300 hover:text-purple-300">AI Chat</Link></li>
                <li><Link to="/leaderboard" className="hover:text-white transition-colors duration-300 hover:text-purple-300">Leaderboard</Link></li>
              </ul>
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <h3 className="font-semibold mb-4 text-purple-400">Resources</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/dashboard" className="hover:text-white transition-colors duration-300 hover:text-purple-300">Dashboard</Link></li>
                <li><Link to="/leaderboard" className="hover:text-white transition-colors duration-300 hover:text-purple-300">Leaderboard</Link></li>
                <li><Link to="/signup" className="hover:text-white transition-colors duration-300 hover:text-purple-300">Pricing</Link></li>
                <li><Link to="/dashboard" className="hover:text-white transition-colors duration-300 hover:text-purple-300">Profile</Link></li>
              </ul>
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <h3 className="font-semibold mb-4 text-purple-400">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li className="hover:text-purple-300 transition-colors duration-300">help@medistics.com</li>
                <li className="hover:text-purple-300 transition-colors duration-300">+92 300 1234567</li>
                <li className="hover:text-purple-300 transition-colors duration-300">Karachi, Pakistan</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <p>&copy; 2024 Medistics. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
