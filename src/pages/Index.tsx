// Update this page (the content is just a fallback if you fail to update the page)

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Users, Trophy, Brain, Target, Moon, Sun, Bot, Sword, ChevronDown } from 'lucide-react';
import { useTheme } from 'next-themes';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaWhatsapp } from 'react-icons/fa';
import MobileNav from '@/components/MobileNav';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// IMPORTANT: You need to replace this with the actual path to your AuthHook
import { useAuth } from '@/hooks/useAuth';

// --- FEATURES ARRAY DEFINITION (Remains the same as it's static data) ---
const features = [
  {
    icon: Brain,
    title: "AI Powered Quizzes",
    description: "Generate personalized quizzes on any topic with instant feedback and explanations.",
    gradient: "from-blue-400 to-cyan-400",
  },
  {
    icon: Sword,
    title: "Battle Arena",
    description: "Challenge friends or AI opponents in real-time MCQ battles to test your knowledge.",
    gradient: "from-red-400 to-pink-400",
  },
  {
    icon: Trophy,
    title: "Gamified Learning",
    description: "Earn points, climb leaderboards, and unlock achievements as you master concepts.",
    gradient: "from-yellow-400 to-orange-400",
  },
  {
    icon: Target,
    title: "Progress Tracking",
    description: "Monitor your strengths and weaknesses with detailed analytics and performance reports.",
    gradient: "from-green-400 to-teal-400",
  },
  {
    icon: Users,
    title: "Community Forum",
    description: "Connect with fellow aspirants, share insights, and get answers to your toughest questions.",
    gradient: "from-purple-400 to-indigo-400",
  },
  {
    icon: Bot,
    title: "AI Chat Assistant",
    description: "Get instant explanations and clarify doubts on complex medical topics, 24/7.",
    gradient: "from-gray-400 to-blue-gray-400",
  },
  {
    icon: Target,
    title: "Mock Tests & Past Papers",
    description: "Practice with full-length mock tests and previous year's papers for realistic exam simulation.",
    gradient: "from-orange-400 to-yellow-400",
  },
  {
    icon: Brain,
    title: "Concept Library",
    description: "Access a comprehensive library of medical concepts, definitions, and study notes.",
    gradient: "from-emerald-400 to-lime-400",
  },
];

// Animation hook for intersection observer
const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [options]);

  return [ref, isIntersecting] as const;
};

// Animated counter component
const AnimatedCounter = ({ end, duration = 2000, suffix = "" }: { end: number; duration?: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const [ref, isVisible] = useIntersectionObserver();

  useEffect(() => {
    if (isVisible) {
      let startTime: number;
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        setCount(Math.floor(progress * end));
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }
  }, [isVisible, end, duration]);

  return (
    <div ref={ref} className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
      {count}{suffix}
    </div>
  );
};

const Index = () => {
  // Keeping mounted and imagesLoaded states for the initial loading spinner
  const [mounted, setMounted] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { user, loading: isLoadingAuth } = useAuth();

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Effect to set mounted state and preload images
  useEffect(() => {
    setMounted(true);

    const loadImage = (src: string) => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve();
        img.onerror = () => {
          console.error(`Failed to load image: ${src}`);
          resolve(); // Resolve even on error to not block the page indefinitely
        };
      });
    };

    const loadAllImages = async () => {
      try {
        await Promise.all([
          loadImage('/images/landing-light.png'),
          loadImage('/images/landing-dark.png')
        ]);
        setImagesLoaded(true);
      } catch (error) {
        console.error('Error during image preloading:', error);
        // Fallback: If images fail to load, set imagesLoaded to true after a short delay
        setTimeout(() => setImagesLoaded(true), 1000);
      }
    };

    loadAllImages();
  }, []);

  // Auth redirection logic: only redirect if authentication is *not* loading AND a user *is* present
  useEffect(() => {
    if (mounted && user && isLoadingAuth === false) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoadingAuth, navigate, mounted]);

  // Function to scroll to sections (optional, but kept if header links use it)
  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const teamMembers = [
  {
    name: "Aima Khan",
    title: "Co-Founder",
    image: "/team/founders/aima.png",
    instagram: "https://www.instagram.com/educational_spot/" // <<< IMPORTANT: REPLACE WITH ACTUAL INSTAGRAM URL
  },
  {
    name: "Dr. Muhammad Ameer Hamza",
    title: "Co-Founder",
    image: "/team/founders/hamza.png",
    instagram: "https://www.instagram.com/ameerhamza.exe/" // <<< IMPORTANT: REPLACE WITH ACTUAL INSTAGRAM URL
  },
  {
    name: "Hafiz Abdul Ahad",
    title: "Co-Founder",
    image: "/team/founders/ahad.png",
    instagram: "https://www.instagram.com/hafiz.a.ahad/" // <<< IMPORTANT: REPLACE WITH ACTUAL INSTAGRAM URL
  },
];


const testimonials = [
  {
    avatar: "/images/user.png",
    name: "Haseeb Ashiq",
    title: "PUNJAB (UHS) MDCAT: 166",
    quote: "MDCAT TOPPERS PREPARATION",
  },
  {
    avatar: "/images/user.png",
    name: "Zonain asad",
    title: "PUNJAB (UHS) MDCAT: 179",
    quote: "Educational Spot",
  },
  {
    avatar: "/images/user.png",
    name: "Muhammad Irfan",
    title: "PUNJAB (UHS) MDCAT: 170",
    quote: "MASHALLAH good",
  },
  {
    avatar: "/images/user.png",
    name: "Shehzaf farooq",
    title: "PUNJAB (SZAMBU) MDCAT: 177",
    quote: "Proved to be very helpful and informative.",
  },
  {
    avatar: "/images/user.png",
    name: "Rabia gull",
    title: "PUNJAB (SZAMBU) MDCAT: 188",
    quote: "Educational Spot",
  },
  {
    avatar: "/images/user.png",
    name: "Kalsoom Shahadat",
    title: "PUNJAB (UHS) MDCAT: 170",
    quote: "Everything was good and top notch",
  },
  {
    avatar: "/images/user.png",
    name: "Medical phsyco",
    title: "KPK MDCAT: 157",
    quote: "Educational Spot",
  },
  {
    avatar: "/images/user.png",
    name: "Iqra",
    title: "SINDH MDCAT: 144",
    quote: "No complain?",
  },
  {
    avatar: "/images/user.png",
    name: "Muhammad Ali Abbas",
    title: "PUNJAB (UHS) MDCAT: 175",
    quote: "Excellent",
  },
  {
    avatar: "/images/user.png",
    name: "Afsheen zulfiqar",
    title: "PUNJAB (UHS) MDCAT: 161",
    quote: "No",
  },
  {
    avatar: "/images/user.png",
    name: "M. Imran",
    title: "PUNJAB (UHS) MDCAT: 178",
    quote: "No",
  },
  {
    avatar: "/images/user.png",
    name: "Tayyaba",
    title: "PUNJAB (UHS) MDCAT: 114",
    quote: "I'm satisfied from this group...",
  },
  {
    avatar: "/images/user.png",
    name: "Touqeer zia",
    title: "KPK MDCAT: 130+",
    quote: "very well",
  },
  {
    avatar: "/images/user.png",
    name: "Hassaan Mustafa",
    title: "PUNJAB (UHS) MDCAT: 179",
    quote: "Everything good just carry on...",
  },
  {
    avatar: "/images/user.png",
    name: "Danish Ahmad",
    title: "KPK MDCAT: 148",
    quote: "Nothing",
  },
  {
    avatar: "/images/user.png",
    name: "Muhammad Jamal",
    title: "PUNJAB (UHS) MDCAT: 175",
    quote: "This group proved was very beneficial...",
  },
  {
    avatar: "/images/user.png",
    name: "Dr Neuro",
    title: "KPK MDCAT: 125",
    quote: "No",
  },
  {
    avatar: "/images/user.png",
    name: "Bluetoothologist",
    title: "KPK MDCAT: 199",
    quote: "Thanks",
  },
  {
    avatar: "/images/user.png",
    name: "Hafsa Liaqat",
    title: "PUNJAB (UHS) MDCAT: 175",
    quote: "Alhamdullillah....all was good🤝🏻",
  },
  {
    avatar: "/images/user.png",
    name: "Nimra Latif",
    title: "PUNJAB (UHS) MDCAT: 160",
    quote: "Helped a lot during mdcat preparations",
  },
  {
    avatar: "/images/user.png",
    name: "Suleman Arshad",
    title: "PUNJAB (UHS) MDCAT: 180",
    quote: "This group helped me a lot throughout the whole journey of MDCAT.",
  },
  {
    avatar: "/images/user.png",
    name: "Kamran Ashraf",
    title: "PUNJAB (UHS) MDCAT: 172",
    quote: "Good platform for mdcat preparation.",
  },
  {
    avatar: "/images/user.png",
    name: "zamar tufail",
    title: "PUNJAB (UHS) MDCAT: 150",
    quote: "help us to secure our future",
  },
  {
    avatar: "/images/user.png",
    name: "Muhammad Abdul Daym",
    title: "PUNJAB (UHS) MDCAT: 169",
    quote: "All good 💯",
  },
  {
    avatar: "/images/user.png",
    name: "Saleha khalid",
    title: "PUNJAB (UHS) MDCAT: 131",
    quote: "Plz help us to secure our future",
  },
  {
    avatar: "/images/user.png",
    name: "Saman Aslam",
    title: "PUNJAB (UHS) MDCAT: 105",
    quote: "No",
  },
  {
    avatar: "/images/user.png",
    name: "Muhammad Hasnain",
    title: "PUNJAB (UHS) MDCAT: 165",
    quote: "Best platform",
  },
  {
    avatar: "/images/user.png",
    name: "Muhammad Younas",
    title: "PUNJAB (SZAMBU) MDCAT: 169",
    quote: "I am admin of educational spot 😁",
  },
  {
    avatar: "/images/user.png",
    name: "Shehryar Khan",
    title: "PUNJAB (UHS) MDCAT: 183",
    quote: "None",
  },
  {
    avatar: "/images/user.png",
    name: "Kiran Fatima",
    title: "PUNJAB (UHS) MDCAT: 138",
    quote: "Educational spot is a good source for mcat preparation...",
  },
  {
    avatar: "/images/user.png",
    name: "Esha Umair",
    title: "PUNJAB (UHS) MDCAT: 141",
    quote: "No",
  },
  {
    avatar: "/images/user.png",
    name: "Bareera Saeed",
    title: "PUNJAB (UHS) MDCAT: 142",
    quote: "It's going good",
  },
  {
    avatar: "/images/user.png",
    name: "Zara Gull",
    title: "PUNJAB (UHS) MDCAT: 168",
    quote: "Thank you for being so supportive...",
  },
  {
    avatar: "/images/user.png",
    name: "Khizra Tayyab",
    title: "PUNJAB (UHS) MDCAT: 148",
    quote: "No",
  },
  {
    avatar: "/images/user.png",
    name: "Ume Romman",
    title: "PUNJAB (UHS) MDCAT: 173",
    quote: "Good",
  },
  {
    avatar: "/images/user.png",
    name: "No name",
    title: "SINDH MDCAT: 161",
    quote: "Hum pa bhra Zulum hua test k. Agli Raat...", // Quote is very long and cut off
  },
  {
    avatar: "/images/user.png",
    name: "Muhammad Waqas Saeed",
    title: "PUNJAB (UHS) MDCAT: 166",
    quote: "Stay blessed ❤️ and keep on working",
  },
  {
    avatar: "/images/user.png",
    name: "Shameen zahra",
    title: "PUNJAB (UHS) MDCAT: 172",
    quote: "Good",
  },
  {
    avatar: "/images/user.png",
    name: "Bisma",
    title: "PUNJAB (UHS) MDCAT: 131",
    quote: "Thanks to all admins*",
  },
  {
    avatar: "/images/user.png",
    name: "Sharjeel Mustafa",
    title: "PUNJAB (UHS) MDCAT: 150",
    quote: "MTP is very good educational spot",
  },
  {
    avatar: "/images/user.png",
    name: "Sadaf sheikh",
    title: "SINDH MDCAT: 135",
    quote: "No any complains",
  },
  {
    avatar: "/images/user.png",
    name: "Muhammad Arham",
    title: "PUNJAB (SZAMBU) MDCAT: 178",
    quote: "Helpful group",
  },
  {
    avatar: "/images/user.png",
    name: "Abdul Majid",
    title: "PUNJAB (UHS) MDCAT: 170",
    quote: "There should be AI in this group which would repsone our queries within seconds",
  },
  {
    avatar: "/images/user.png",
    name: "Fizza",
    title: "PUNJAB (UHS) MDCAT: 153",
    quote: "No",
  },
  {
    avatar: "/images/user.png",
    name: "Saman Aslam",
    title: "PUNJAB (UHS) MDCAT: 105",
    quote: "helpfull",
  },
  {
    avatar: "/images/user.png",
    name: "Noor Fatima",
    title: "PUNJAB (UHS) MDCAT: 166",
    quote: "Helped a lot",
  },
  {
    avatar: "/images/user.png",
    name: "Asad khan",
    title: "KPK MDCAT: 140",
    quote: "Thanks admins.",
  },
  {
    avatar: "/images/user.png",
    name: "Muhammad salman khan",
    title: "KPK MDCAT: 183",
    quote: "Educational Spot cleared all my doubt and was there throughout my journey as a senior",
  },
  {
    avatar: "/images/user.png",
    name: "mahnoor nadeem",
    title: "KPK MDCAT: 124",
    quote: "😊",
  },
  {
    avatar: "/images/user.png",
    name: "Samreen Imtiaz",
    title: "SINDH MDCAT: 129",
    quote: "No",
  },
  {
    avatar: "/images/user.png",
    name: "Muhammad Ismail",
    title: "KPK MDCAT: 145",
    quote: "ok",
  },
  {
    avatar: "/images/user.png",
    name: "Sana ullah",
    title: "PUNJAB (UHS) MDCAT: 153",
    quote: "Nope",
  },
  {
    avatar: "/images/user.png",
    name: "Aqsa Siddique",
    title: "PUNJAB (UHS) MDCAT: 159",
    quote: "Buhut Alaa tha\nAima appi uh are great\nItne tests kips step stars k fb pr ni mille jitne yhn mille\nDil SE duain",
  },
  {
    avatar: "/images/user.png",
    name: "muhammad umer qasim",
    title: "KPK MDCAT: 166",
    quote: "informative group",
  },
  {
    avatar: "/images/user.png",
    name: "Abdul Wahab Lakho",
    title: "SINDH MDCAT: 120",
    quote: "Very nice group for preparation",
  },
  {
    avatar: "/images/user.png",
    name: "Saqib ullah",
    title: "KPK MDCAT: 168",
    quote: "Your doing well 😊..keep it up MTP",
  },
  {
    avatar: "/images/user.png",
    name: "Ubaid",
    title: "KPK MDCAT: 158",
    quote: "Nil",
  },
  {
    avatar: "/images/user.png",
    name: "M Mursleen",
    title: "PUNJAB (UHS) MDCAT: 189",
    quote: "Follow the syllabus",
  },
  {
    avatar: "/images/user.png",
    name: "Naeemullah",
    title: "SINDH MDCAT: 178",
    quote: "you guys literally helped us at every stage, Thank you",
  },
  {
    avatar: "/images/user.png",
    name: "Shahzad tufail",
    title: "KPK MDCAT: 171",
    quote: "great job",
  },
  {
    avatar: "/images/user.png",
    name: "Arooba Arshad",
    title: "KPK MDCAT: 171",
    quote: "Thank you for being so supportive",
  },
  {
    avatar: "/images/user.png",
    name: "Sikandar Zaman",
    title: "KPK MDCAT: 170",
    quote: "perfect",
  },
  {
    avatar: "/images/user.png",
    name: "Saif-UR-Rehman",
    title: "SINDH MDCAT: 100",
    quote: "Best group ever regarding MDCAT",
  },
  {
    avatar: "/images/user.png",
    name: "Zoya",
    title: "SINDH MDCAT: No",
    quote: "Educational Spot cleared all my doubt and was there throughout my journey as a senior",
  },
  {
    avatar: "/images/user.png",
    name: "ali ahmed khan",
    title: "SINDH MDCAT: 108",
    quote: "doing a great job",
  },
  {
    avatar: "/images/user.png",
    name: "Zamzam Ayesha",
    title: "SINDH MDCAT: 159",
    quote: "A good platform to solve your queries and interact with other students and getting help",
  },
  {
    avatar: "/images/user.png",
    name: "Syeda safia",
    title: "SINDH MDCAT: 163",
    quote: "best",
  },
  {
    avatar: "/images/user.png",
    name: "Aman",
    title: "KPK MDCAT: 171",
    quote: "Very best",
  },
  {
    avatar: "/images/user.png",
    name: "Bisma Lodhi",
    title: "SINDH MDCAT: 159",
    quote: "it was super amazing to have ES Team as our mentor",
  },
  {
    avatar: "/images/user.png",
    name: "Aimen aslam",
    title: "SINDH MDCAT: 140",
    quote: "They are reallly amazing... Share a lot of matter help us in our difficult time...May Allah blessed u all",
  },
  {
    avatar: "/images/user.png",
    name: "Iqra",
    title: "SINDH MDCAT: 122",
    quote: "It's really very helpful , you get the answer and also reason of any query.",
  },
  {
    avatar: "/images/user.png",
    name: "Muhammad Faiez",
    title: "PUNJAB (UHS) MDCAT: 185",
    quote: "No",
  },
  {
    avatar: "/images/user.png",
    name: "Sundas fiza",
    title: "PUNJAB (UHS) MDCAT: 128",
    quote: "It's a very good platform helping students providing them material.. I'm also trying to get benefit from it",
  },
  {
    avatar: "/images/user.png",
    name: "Tania",
    title: "SINDH MDCAT: 170",
    quote: "Educational spot group was such a fantastic group and I'm thankful to ma'am Aima and other admins for sharing amazing notes PDF's that help me so much during my preparation and their tests were also very useful to me thanks a lot",
  },
];

  // Simplified loading state check: only wait for base mounting and images.
      // Simplified loading state check: only wait for base mounting and images.
  if (!mounted || !imagesLoaded) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
        <img
          src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
          alt="Loading Medistics"
          className="w-32 h-32 object-contain" // Removed animate-bounce
        />
        {/* Removed the loading circle and bouncing dots */}
      </div>
    );
  }



  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
      <header className="bg-transparent backdrop-blur-md border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50 animate-fade-in">
        <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
          <Link to="/" className="flex items-center space-x-3 group">
            <img
              src="/lovable-uploads/161d7edb-aa7b-4383-a8e2-75b6685fc44f.png"
              alt="Medistics Logo"
              className="w-8 h-8 object-contain group-hover:scale-110 transition-all duration-300 group-hover:rotate-12"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Medistics.App
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">

            <button
              onClick={() => scrollToSection('milestones')}
              className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-300 hover:scale-105 bg-transparent border-none cursor-pointer p-0 h-auto relative group"
            >
              <span className="hidden lg:inline">Our Journey</span>
              <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-600 group-hover:w-full transition-all duration-300"></div>
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-300 hover:scale-105 bg-transparent border-none cursor-pointer p-0 h-auto relative group"
            >
              <span className="hidden lg:inline">Pricing</span>
              <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-600 group-hover:w-full transition-all duration-300"></div>
            </button>
            <button
              onClick={() => navigate('/teams')}
              className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-300 hover:scale-105 bg-transparent border-none cursor-pointer p-0 h-auto relative group"
            >
              <span className="hidden lg:inline">Our Team</span>
              <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-600 group-hover:w-full transition-all duration-300"></div>
            </button>
            <button
              onClick={() => scrollToSection('ambassador')}
              className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-300 hover:scale-105 bg-transparent border-none cursor-pointer p-0 h-auto relative group"
            >
              <span className="hidden lg:inline">Join Us</span>
              <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-600 group-hover:w-full transition-all duration-300"></div>
            </button>
          </nav>

          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="hidden md:flex w-9 h-9 p-0 hover:scale-110 transition-all duration-300"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-300" />
              ) : (
                <Moon className="h-4 w-4 rotate-0 scale-100 transition-all duration-300" />
              )}
            </Button>
            <div className="hidden md:flex items-center space-x-3">
              <Link to="/login">
                <Button variant="ghost" className="hover:scale-105 transition-all duration-300">
                  Login
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:scale-105 transition-all duration-300 hover:shadow-lg">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </Link>
            </div>
            <MobileNav />
          </div>
        </div>
      </header>

      {/* Section 1: Hero Section */}
      <section
        id="hero"
        className={`min-h-screen flex items-center justify-center relative bg-cover bg-center text-white overflow-hidden`}
        style={{
          backgroundImage: `url("/images/${theme === 'dark' ? 'landing-dark.png' : 'landing-light.png'}")`, // Retaining original background image logic
          transform: `translateY(${scrollY * 0.5}px)`,
        }}
      >
        <div className="absolute inset-0 bg-black opacity-50"></div>

        {/* Floating particles (now more vibrant and dynamic) */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(30)].map((_, i) => ( // Increased number of particles
            <div
              key={i}
              className="absolute w-2 h-2 bg-gradient-to-r from-teal-300 to-blue-400 opacity-50 rounded-full animate-sparkle" // Teal gradient for particles
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`, // Varied animation delays
                animationDuration: `${3 + Math.random() * 3}s`, // Varied animation durations
                filter: `blur(${Math.random() * 1}px)`, // Subtle blur for depth
              }}
            />
          ))}
          {/* Add some larger, slower-moving "orbs" for more life */}
          {[...Array(5)].map((_, i) => (
            <div
              key={`orb-${i}`}
              className="absolute w-8 h-8 bg-gradient-to-br from-teal-400 to-blue-500 opacity-30 rounded-full animate-float-slow" // Larger orbs
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${10 + Math.random() * 10}s`,
                filter: `blur(2px)`,
              }}
            />
          ))}
        </div>

        <div className="container mx-auto px-4 lg:px-8 py-12 lg:py-20 max-w-7xl relative z-10">
          <div className="animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight max-w-2xl">
              Achieve Your MBBS Dream with
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500 inline-block animate-pulse"> AI Intelligence</span> {/* Teal gradient for "AI Intelligence" */}
            </h1>
          </div>

          <div className="animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
            <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-3xl">
              Medistics.app is Pakistan's most advanced AI-powered MBBS preparation platform, designed to help you master medical concepts, practice MCQs, and achieve your dream score with personalized learning experiences.
            </p>
          </div>

          <div className="animate-fade-in" style={{ animationDelay: '0.6s', animationFillMode: 'both' }}>
            <div className="flex flex-col sm:flex-row gap-4 justify-start mb-12">
              <Link to="/signup">
                <Button size="lg" className="bg-gradient-to-r from-teal-500 to-blue-600 text-white text-lg px-8 py-3 hover:scale-105 transition-all duration-300 hover:shadow-2xl group"> {/* Teal gradient for button */}
                  Start Learning Free
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform duration-300" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Add new keyframe animations to your CSS or a style block */}
      <style jsx>{`
        @keyframes sparkle {
          0% { transform: scale(0.5) translateY(0); opacity: 0; }
          20% { opacity: 0.8; }
          40% { transform: scale(1) translateY(-10px); opacity: 1; }
          60% { transform: scale(0.8) translateY(-5px); opacity: 0.7; }
          100% { transform: scale(0.5) translateY(0); opacity: 0; }
        }

        @keyframes float-slow {
          0% { transform: translateY(0) translateX(0) scale(1); }
          25% { transform: translateY(-15px) translateX(10px) scale(1.05); }
          50% { transform: translateY(0) translateX(0) scale(1); }
          75% { transform: translateY(15px) translateX(-10px) scale(0.95); }
          100% { transform: translateY(0) translateX(0) scale(1); }
        }

        .animate-sparkle {
          animation: sparkle var(--animation-duration, 3s) ease-in-out infinite var(--animation-delay, 0s);
        }

        .animate-float-slow {
          animation: float-slow var(--animation-duration, 15s) ease-in-out infinite var(--animation-delay, 0s);
        }
      `}</style>
      {/* Section 2: Stats Section */}
      <section id="stats" className="min-h-screen flex items-center justify-center container mx-auto px-4 lg:px-8 py-12 lg:py-20 max-w-7xl relative overflow-hidden">
        {/* Moving gradient background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full animate-bounce opacity-30" 
               style={{ animationDuration: '6s', animationDelay: '0s' }}></div>
          <div className="absolute top-1/2 right-20 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full animate-bounce opacity-30" 
               style={{ animationDuration: '8s', animationDelay: '2s' }}></div>
          <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-gradient-to-br from-green-400/20 to-teal-400/20 rounded-full animate-bounce opacity-30" 
               style={{ animationDuration: '7s', animationDelay: '1s' }}></div>
          <div className="absolute top-1/4 left-1/2 w-64 h-64 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full animate-bounce opacity-30" 
               style={{ animationDuration: '9s', animationDelay: '3s' }}></div>
          
          {/* Floating gradient orbs */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-16 h-16 rounded-full opacity-10 animate-pulse"
              style={{
                background: `linear-gradient(45deg, hsl(${Math.random() * 360}, 70%, 60%), hsl(${Math.random() * 360}, 70%, 80%))`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 4}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            />
          ))}
          
          {/* Moving gradient lines */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-purple-400/30 to-transparent animate-pulse"
                 style={{ animationDuration: '4s' }}></div>
            <div className="absolute bottom-0 right-0 w-full h-2 bg-gradient-to-l from-transparent via-pink-400/30 to-transparent animate-pulse"
                 style={{ animationDuration: '5s', animationDelay: '2s' }}></div>
          </div>
        </div>
        
        <div className="text-center w-full relative z-10">
          <div className="animate-fade-in mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-8">
              Our Impact, Your Success
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
              See the numbers behind Medistics' growing community and proven results.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-3xl mx-auto">
            <div className="text-center group hover:scale-110 transition-all duration-300">
              <AnimatedCounter end={1000} suffix="+" />
              <div className="text-base md:text-lg text-gray-700 dark:text-gray-300 group-hover:text-purple-600 transition-colors duration-300">Students</div>
            </div>
            <div className="text-center group hover:scale-110 transition-all duration-300" style={{ animationDelay: '0.1s' }}>
              <AnimatedCounter end={5000} suffix="+" />
              <div className="text-base md:text-lg text-gray-700 dark:text-gray-300 group-hover:text-purple-600 transition-colors duration-300">MCQs Solved</div>
            </div>
            <div className="text-center group hover:scale-110 transition-all duration-300" style={{ animationDelay: '0.2s' }}>
              <AnimatedCounter end={85} suffix="%" />
              <div className="text-base md:text-lg text-gray-700 dark:text-gray-300 group-hover:text-purple-600 transition-colors duration-300">Success Rate</div>
            </div>
            <div className="text-center group hover:scale-110 transition-all duration-300" style={{ animationDelay: '0.3s' }}>
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                24/7
              </div>
              <div className="text-base md:text-lg text-gray-700 dark:text-gray-300 group-hover:text-purple-600 transition-colors duration-300">AI Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Features Section */}
      <section id="features" className="min-h-screen flex items-center container mx-auto px-4 lg:px-8 py-12 lg:py-20 max-w-7xl">
        <div>
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
              <Card 
                key={index} 
                className="text-center hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-white to-purple-50/50 dark:from-gray-800 dark:to-purple-900/20 border-purple-200 dark:border-purple-800 group overflow-hidden relative hover:scale-105 hover:-translate-y-2 animate-fade-in"
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                  animationFillMode: 'both'
                }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                <CardHeader className="relative z-10">
                  <div className={`w-12 h-12 bg-gradient-to-r ${feature.gradient} rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all duration-300`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg md:text-xl text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <CardDescription className="text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* New Section: Dr. Sultan AI Companion */}
<section id="dr-sultan" className="min-h-screen flex flex-col items-center justify-center py-16 px-4 lg:px-8 
                                    bg-gradient-to-br from-purple-50 via-white to-pink-50
                                    dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 text-gray-900 dark:text-white">
  <div className="container mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-center gap-12 lg:gap-20">
    {/* Dr. Sultan Image */}
    <div className="flex-shrink-0 w-full md:w-1/2 lg:w-2/5 flex justify-center animate-fade-in-left">
      <img
        src="/images/dr-sultan.png"
        alt="Dr. Sultan, AI Companion"
        className="w-full max-w-sm md:max-w-md lg:max-w-lg h-auto rounded-xl shadow-2xl 
                   transform hover:scale-105 transition-transform duration-500 ease-in-out
                   border-4 border-purple-300 dark:border-purple-700"
      />
    </div>

    {/* Text Content for Dr. Sultan */}
    <div className="text-center md:text-left w-full md:w-1/2 lg:w-3/5 animate-fade-in-right">
      <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight 
                     bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
        Meet Dr. Ahroid
      </h2>
      <h3 className="text-2xl md:text-3xl font-semibold text-gray-700 dark:text-gray-300 mb-6">
        Your Dedicated AI Companion for Medical Studies
      </h3>
      <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-6 max-w-2xl md:max-w-none mx-auto md:mx-0">
        Dr. Ahroid is not just an AI; he's your personalized study partner, always available to clarify complex medical concepts, provide detailed explanations, and help you master every topic. With Dr. Sultan by your side, learning becomes intuitive, engaging, and highly effective.
      </p>
      <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl md:max-w-none mx-auto md:mx-0">
        Leveraging cutting-edge artificial intelligence, Dr. Ahroid delivers instant answers, personalized feedback, and adaptive learning paths, ensuring you're fully prepared for any challenge in your medical journey.
      </p>
    </div>
  </div>
</section>

      {/* New Section: Founding Team & Contributors */}
      <section id="founding-team" className="min-h-screen flex flex-col items-center justify-center py-16 px-4 lg:px-8
             bg-gradient-to-br from-white via-teal-50/30 to-blue-50/30
             dark:from-gray-900 dark:via-teal-900/10 dark:to-blue-900/10 text-gray-900 dark:text-white">
        <div className="container mx-auto max-w-7xl text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-12 animate-fade-in-up bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-blue-600">
            Meet Our Founder & Contributors
          </h2>

          {/* Founding Member */}
          <div className="relative w-full max-w-sm mx-auto mb-16">
            <a
              href="https://www.instagram.com/ameerhamza.exe"
              target="_blank"
              rel="noopener noreferrer"
              className="block group bg-white dark:bg-gray-800 rounded-lg shadow-xl hover:shadow-2xl
                     transform hover:-translate-y-2 transition-all duration-500 overflow-hidden
                     border border-teal-200 dark:border-teal-800 hover:border-teal-500 dark:hover:border-blue-500"
            >
              <div className="relative w-full h-72 overflow-hidden">
                <img
                  src="team/founders/hamza.png"
                  alt="Dr. Muhammad Ameer Hamza"
                  className="absolute inset-0 w-full h-full object-cover filter grayscale group-hover:grayscale-0
                          transition-all duration-700 ease-in-out transform group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
              <div className="p-6">
                <h3 className="text-xl md:text-2xl font-bold mb-2 group-hover:text-teal-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  Dr. Muhammad Ameer Hamza
                </h3>
                <p className="text-md md:text-lg text-gray-600 dark:text-gray-400 group-hover:text-teal-500 dark:group-hover:text-blue-300 transition-colors duration-300">
                  Batch of 2025, SMBBMC
                </p>
              </div>
            </a>
          </div>

          {/* Contributors Section */}
          <div className="w-full text-center">
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-extrabold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-blue-600">
              Our Valued Contributors
            </h3>
            <div className="flex justify-center">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                {/* Individual Contributor Cards */}
                <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-transparent hover:border-teal-400 dark:hover:border-blue-400">
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">Muhammad Irfan</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Batch 11</p>
                </div>
                <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-transparent hover:border-teal-400 dark:hover:border-blue-400">
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">Abdul Hadi Ansari</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Batch 12</p>
                </div>
                <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-transparent hover:border-teal-400 dark:hover:border-blue-400">
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">Manhil Mushtaq</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Batch 13</p>
                </div>
                <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-transparent hover:border-teal-400 dark:hover:border-blue-400">
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">Asad Ali</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Batch 14</p>
                </div>
                <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-transparent hover:border-teal-400 dark:hover:border-blue-400">
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">Tanis Ratani</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Batch 15</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Section 4: Value Proposition / How It Works */}
      <section id="value-prop" className="min-h-screen flex items-center justify-center container mx-auto px-4 lg:px-8 py-12 lg:py-20 max-w-7xl text-center">
        <div className="animate-fade-in">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Transform Your Study Routine, Guaranteed.
          </h2>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Say goodbye to generic study methods. Medistics leverages advanced AI to provide a truly personalized and engaging learning experience, designed to help you not just pass, but excel.
          </p>
          <div className="flex justify-center gap-8 mb-12">
            <div className="text-center group hover:scale-110 transition-all duration-300">
              <Brain className="w-12 h-12 text-purple-600 mx-auto mb-2 group-hover:animate-bounce" />
              <p className="font-semibold text-lg dark:text-white group-hover:text-purple-600 transition-colors duration-300">Adaptive Learning Paths</p>
            </div>
            <div className="text-center group hover:scale-110 transition-all duration-300" style={{ animationDelay: '0.1s' }}>
              <Sword className="w-12 h-12 text-pink-600 mx-auto mb-2 group-hover:animate-bounce" />
              <p className="font-semibold text-lg dark:text-white group-hover:text-pink-600 transition-colors duration-300">Gamified Competition</p>
            </div>
            <div className="text-center group hover:scale-110 transition-all duration-300" style={{ animationDelay: '0.2s' }}>
              <Trophy className="w-12 h-12 text-blue-600 mx-auto mb-2 group-hover:animate-bounce" />
              <p className="font-semibold text-lg dark:text-white group-hover:text-blue-600 transition-colors duration-300">Real-Time Progress Tracking</p>
            </div>
          </div>
          <Link to="/signup">
            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 hover:scale-105 transition-all duration-300 hover:shadow-2xl group">
              Learn How Medistics Works 
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform duration-300" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Section 5: Pricing Call to Action */}
      <section id="pricing" className="min-h-screen flex items-center justify-center container mx-auto px-4 lg:px-8 py-12 lg:py-20 max-w-7xl text-center">
        <div className="animate-fade-in">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Explore Our Pricing?
          </h2>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Discover the perfect plan to boost your MDCAT preparation. We offer flexible options to fit every student's needs.
          </p>
          <Link to="/pricing">
            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 hover:scale-105 transition-all duration-300 hover:shadow-2xl group">
              View All Pricing Plans
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform duration-300" />
            </Button>
          </Link>
        </div>
      </section>



{/* New Section: Milestones */}
<section id="milestones" className="min-h-screen flex flex-col items-center justify-center py-16 px-4 lg:px-8 
                                   bg-gradient-to-tl from-purple-50 via-white to-pink-50
                                   dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-900 dark:text-white overflow-hidden">
  <div className="container mx-auto max-w-7xl text-center mb-12">
    <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 animate-fade-in-down">
      Our Journey So Far
    </h2>
    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8 animate-fade-in">
      A look at the significant steps we've taken on our path to redefine medical education.
    </p>

    <div className="relative mx-auto w-full max-w-4xl pt-8 pb-16">
      {/* Timeline Line */}
      <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-purple-300 dark:bg-purple-700 rounded-full z-0"></div>

      {/* Milestones Grid */}
      <div className="flex flex-col space-y-12">
        {/* Milestone 1: Proposed */}
        <div className="flex items-center w-full justify-start md:justify-end pr-8 md:pr-0 relative">
          <div className="w-1/2 md:w-full flex justify-end md:justify-start">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm text-left animate-fade-in-left border border-purple-200 dark:border-purple-800">
              <h3 className="text-xl font-bold text-purple-700 dark:text-pink-400 mb-2">3 March 2025</h3>
              <p className="text-gray-700 dark:text-gray-300">Medistics.App was officially <strong className="font-bold">Proposed</strong>.</p>
            </div>
          </div>
          <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-purple-600 dark:bg-pink-500 rounded-full shadow-md z-10"></div>
        </div>

        {/* Milestone 2: MOU Between HMACS Studios and Educational Spot */}
        <div className="flex items-center w-full justify-end md:justify-end pl-8 md:pl-0 relative">
          <div className="w-1/2 md:w-full flex justify-start md:justify-end">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm text-left animate-fade-in-right border border-purple-200 dark:border-purple-800">
              <h3 className="text-xl font-bold text-purple-700 dark:text-pink-400 mb-2">19 May 2025</h3>
              <p className="text-gray-700 dark:text-gray-300">Signed an <strong className="font-bold">MOU between HMACS Studios and Educational Spot</strong>, solidifying our partnership.</p>
            </div>
          </div>
          <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-purple-600 dark:bg-pink-500 rounded-full shadow-md z-10"></div>
        </div>

        {/* Milestone 3: MedisticsApp was announced */}
        <div className="flex items-center w-full justify-start md:justify-end pr-8 md:pr-0 relative">
          <div className="w-1/2 md:w-full flex justify-end md:justify-start">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm text-left animate-fade-in-left border border-purple-200 dark:border-purple-800">
              <h3 className="text-xl font-bold text-purple-700 dark:text-pink-400 mb-2">12 June 2025</h3>
              <p className="text-gray-700 dark:text-gray-300"><strong className="font-bold">Medistics.App was officially announced</strong> to the world!</p>
            </div>
          </div>
          <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-purple-600 dark:bg-pink-500 rounded-full shadow-md z-10"></div>
        </div>

        {/* Milestone 4: Website went live, First Mock Test */}
        <div className="flex items-center w-full justify-end md:justify-end pl-8 md:pl-0 relative">
          <div className="w-1/2 md:w-full flex justify-start md:justify-end">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm text-left animate-fade-in-right border border-purple-200 dark:border-purple-800">
              <h3 className="text-xl font-bold text-purple-700 dark:text-pink-400 mb-2">15 June 2025</h3>
              <p className="text-gray-700 dark:text-gray-300">Our <strong className="font-bold">Website went live</strong> and we conducted our <strong className="font-bold">First Mock Test</strong>.</p>
            </div>
          </div>
          <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-purple-600 dark:bg-pink-500 rounded-full shadow-md z-10"></div>
        </div>

        {/* Milestone 5: AI Features debut */}
        <div className="flex items-center w-full justify-start md:justify-end pr-8 md:pr-0 relative">
          <div className="w-1/2 md:w-full flex justify-end md:justify-start">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm text-left animate-fade-in-left border border-purple-200 dark:border-purple-800">
              <h3 className="text-xl font-bold text-purple-700 dark:text-pink-400 mb-2">17 June 2025</h3>
              <p className="text-gray-700 dark:text-gray-300">Our innovative <strong className="font-bold">AI Features made their debut</strong>, empowering smarter learning.</p>
            </div>
          </div>
          <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-purple-600 dark:bg-pink-500 rounded-full shadow-md z-10"></div>
        </div>

        {/* Milestone 6: 100 Members Completed (Today) */}
        <div className="flex items-center w-full justify-end md:justify-end pl-8 md:pl-0 relative">
          <div className="w-1/2 md:w-full flex justify-start md:justify-end">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm text-left animate-fade-in-right border border-purple-200 dark:border-purple-800">
              <h3 className="text-xl font-bold text-purple-700 dark:text-pink-400 mb-2">23 June 2025</h3>
              <p className="text-gray-700 dark:text-gray-300">Achieved our first major community goal: <strong className="font-bold">100 Members Completed!</strong></p>
            </div>
          </div>
          <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-purple-600 dark:bg-pink-500 rounded-full shadow-md z-10"></div>
        </div>

      </div>
    </div>
  </div>
</section>

{/* Section 6: Generic Call to Action */}
<section id="cta-generic" className="min-h-screen flex items-center justify-center container mx-auto px-4 lg:px-8 py-12 lg:py-20 max-w-7xl text-center">
  <div className="animate-fade-in">
    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">Ready to Unlock Your MD CAT Success?</h2>
    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
      Join the Medistics community and gain access to cutting-edge AI tools, competitive challenges, and a wealth of practice material. Don't just study, master your exams!
    </p>
    <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 hover:scale-105 transition-all duration-300 hover:shadow-2xl group" onClick={() => navigate('/signup')}>
      Sign Up Now and Start Learning 
      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform duration-300" />
    </Button>
  </div>
</section>

{/* Section 7: Ambassador Programme */}
<section
  id="ambassador"
  className="relative overflow-hidden min-h-screen flex items-center justify-center px-4 lg:px-8 py-12 lg:py-20 text-center"
>
  {/* Fullscreen animated gradient background */}
  <div className="absolute inset-0 w-screen h-full z-0">
    <div className="w-full h-full animate-gradient-wave bg-[radial-gradient(circle_at_20%_20%,rgba(236,72,153,0.2),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.2),transparent_40%)] blur-3xl"></div>
  </div>

  {/* Content inside container */}
  <div className="relative z-10 container mx-auto max-w-7xl animate-fade-in">
    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
      Become a Medistics Ambassador!
    </h2>
    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
      Passionate about education and eager to make an impact? Join our exclusive Ambassador Programme and help shape the future of learning while earning valuable certificates and exciting bonuses!
    </p>
    <div className="flex flex-col sm:flex-row justify-center gap-4">
      <Button
        size="lg"
        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 hover:scale-105 transition-all duration-300 hover:shadow-2xl group"
        onClick={() => navigate('/career')}
      >
        Student Ambassadors: Learn More
        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform duration-300" />
      </Button>
      <Button
        size="lg"
        className="px-8 py-4 hover:scale-105 transition-all duration-300 hover:shadow-2xl group bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white"
        onClick={() => navigate('/teaching-career')}
      >
        Teaching Intership: Explore Opportunities
        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform duration-300" />
      </Button>
    </div>
  </div>
</section>



      {/* New Section: Contact Us */}
<section id="contact-us" className="min-h-screen flex flex-col items-center justify-center py-16 px-4 lg:px-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
  <div className="container mx-auto max-w-5xl text-center">
    <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 animate-fade-in-down">
      Contact Us
    </h2>
    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-12 animate-fade-in">
      We'd love to hear from you! Reach out to us through any of the following channels.
    </p>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12 animate-fade-in">
      {/* Social Media Links */}
      <div className="flex flex-col items-center justify-center">
        <h3 className="text-xl font-semibold mb-4">Connect with us:</h3>
        <div className="flex space-x-6">
          <a
            href="https://facebook.com/medisticsapp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 dark:text-pink-400 hover:text-purple-800 dark:hover:text-pink-600 transition-colors duration-300"
            aria-label="Facebook"
          >
            <FaFacebookF className="w-8 h-8" /> {/* Correct Facebook Icon */}
          </a>
          <a
            href="https://instagram.com/medistics.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 dark:text-pink-400 hover:text-purple-800 dark:hover:text-pink-600 transition-colors duration-300"
            aria-label="Instagram"
          >
            <FaInstagram className="w-8 h-8" /> {/* Correct Instagram Icon */}
          </a>
          <a
            href="https://linkedin.com/in/medisticsapp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 dark:text-pink-400 hover:text-purple-800 dark:hover:text-pink-600 transition-colors duration-300"
            aria-label="LinkedIn"
          >
            <FaLinkedinIn className="w-8 h-8" /> {/* Correct LinkedIn Icon */}
          </a>
        </div>
      </div>

      {/* WhatsApp Contact */}
      <div className="flex flex-col items-center justify-center">
        <h3 className="text-xl font-semibold mb-4">WhatsApp/Contact:</h3>
        <a
          href="https://wa.me/03392456162"
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 dark:text-pink-400 hover:text-purple-800 dark:hover:text-pink-600 transition-colors duration-300"
          aria-label="WhatsApp"
        >
          <div className="flex items-center space-x-2">
            <FaWhatsapp className="w-8 h-8" /> {/* Correct WhatsApp Icon */}
            <span>0339-2456162</span>
          </div>
        </a>
      </div>

      {/* Email Address */}
      <div className="flex flex-col items-center justify-center">
        <h3 className="text-xl font-semibold mb-4">Email:</h3>
        <a
          href="mailto:contact@medistics.com"
          className="text-purple-600 dark:text-pink-400 hover:text-purple-800 dark:hover:text-pink-600 transition-colors duration-300"
          aria-label="Email"
        >
          contact@medistics.com
        </a>
      </div>
    </div>
  </div>
</section>



      {/* Section 7: Final CTA & Footer */}
      <section id="final-cta-footer" className="min-h-screen flex flex-col justify-between bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/90 to-pink-600/90"></div>
        
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute w-4 h-4 bg-white opacity-10 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        <div className="container mx-auto px-4 lg:px-8 text-center max-w-7xl relative z-10 flex-grow flex items-center justify-center">
          <div className="animate-fade-in">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
              So what are you waiting for?
            </h2>
            <p className="text-lg md:text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Join the most advanced MDCAT learning platform of the country.
            </p>
            <Link to="/signup">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-3 bg-white text-purple-600 hover:bg-gray-100 hover:scale-105 transition-all duration-300 hover:shadow-2xl group">
                Start Your Journey Today
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform duration-300" />
              </Button>
            </Link>
          </div>
        </div>

        <footer className="bg-gray-900 bg-opacity-70 text-white py-12 relative z-10 animate-fade-in">
          <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center space-x-2 mb-4 group">
                  <img
                    src="/lovable-uploads/161d7edb-aa7b-4383-a8e2-75b6685fc44f.png"
                    alt="Medistics Logo"
                    className="w-8 h-8 object-contain group-hover:scale-110 group-hover:rotate-12 transition-all duration-300"
                  />
                  <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Medistics</span>
                </div>
                <p className="text-gray-400">
                  Empowering MDCAT across Pakistan with AI-powered learning.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-4 text-purple-400">Features</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><Link to="/mcqs" className="hover:text-white hover:text-purple-300 transition-all duration-300 hover:translate-x-1">MCQ Practice</Link></li>
                  <li><Link to="/battle" className="hover:text-white hover:text-purple-300 transition-all duration-300 hover:translate-x-1">Battle Arena</Link></li>
                  <li><Link to="/ai" className="hover:text-white hover:text-purple-300 transition-all duration-300 hover:translate-x-1">AI Chat</Link></li>
                  <li><Link to="/leaderboard" className="hover:text-white hover:text-purple-300 transition-all duration-300 hover:translate-x-1">Leaderboard</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-4 text-purple-400">Resources</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><Link to="/dashboard" className="hover:text-white hover:text-purple-300 transition-all duration-300 hover:translate-x-1">Dashboard</Link></li>
                  <li><Link to="/leaderboard" className="hover:text-white hover:text-purple-300 transition-all duration-300 hover:translate-x-1">Leaderboard</Link></li>
                  <li><Link to="/pricing" className="hover:text-white hover:text-purple-300 transition-all duration-300 hover:translate-x-1">Pricing</Link></li>
                  <li><Link to="/dashboard" className="hover:text-white hover:text-purple-300 transition-all duration-300 hover:translate-x-1">Profile</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-4 text-purple-400">Support & Legal</h3>
                <ul className="space-y-2 text-gray-400">
                  <li className="hover:text-purple-300 transition-colors duration-300">medistics@dr.com</li>
                  <li className="hover:text-purple-300 transition-colors duration-300">Pakistan</li>
                  <li><Link to="/privacypolicy" className="hover:text-white hover:text-purple-300 transition-all duration-300 hover:translate-x-1">Privacy Policy</Link></li>
                  <li><Link to="/terms" className="hover:text-white hover:text-purple-300 transition-all duration-300 hover:translate-x-1">Terms and Conditions</Link></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2025 Medistics. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
};

export default Index;
