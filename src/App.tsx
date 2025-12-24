import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Dashboard from '@/pages/Dashboard';
import MCQs from '@/pages/MCQs';
import Battle from '@/pages/Battle';
import AI from '@/pages/AI';
// import StudyMaterials from '@/pages/StudyMaterials';
import AITestGeneratorPage from '@/pages/AITestGenerator';
import AIChatbotPage from '@/pages/AIChatbot';
import Leaderboard from '@/pages/Leaderboard';
import Admin from '@/pages/Admin';
import Admin1 from '@/pages/Admin1';
import Admin2 from '@/pages/Admin2';
import Admin3 from '@/pages/Admin3';
import Admin4 from '@/pages/Admin4';
import Admin5 from '@/pages/Admin5';
import Admin6 from '@/pages/Admin6';
import Admin7 from '@/pages/Admin7';
import Admin8 from '@/pages/Admin8';
import Admin9 from '@/pages/Admin9';
import Admin10 from '@/pages/Admin10';
import Admin11 from '@/pages/Admin11';
import {Admin12} from '@/pages/Admin12';
import Admin13 from '@/pages/Admin13';
import Admin14 from '@/pages/Admin14';
import Profile from '@/pages/Profile';
import Pricing from '@/pages/Pricing';
import TermsAndConditions from '@/pages/TermsAndConditions';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import RefundPolicy from '@/pages/RefundPolicy';
import Checkout from '@/pages/Checkout';
import NotFound from '@/pages/NotFound';
import ChangePassword from '@/pages/ChangePassword';
import MockTest from '@/pages/MockTest';
import TestCompletionPage from '@/pages/TestCompletion';
import Classroom from '@/pages/Classroom';
// import ClassroomChat from "./pages/ClassroomChat";
import VerifyEmail from '@/pages/VerifyEmail';
import UsernamePage from '@/pages/UsernamePage';
import WelcomeNewUserPage from './pages/WelcomeNewUserPage';
import AllSetPage from '@/pages/AllSetPage';
import MockTestResults from '@/pages/MockTestResults';
import TestCompletion from '@/pages/TestResults';
import Career from '@/pages/Career';
import TeachingAmbassadors from '@/pages/TeachingAmbassadors';
import InternshipApplication from '@/pages/InternshipApplication';
import SavedMCQsPage from '@/pages/SavedMCQsPage';
import Announcements from '@/pages/Announcements';
import ContactUsPage from '@/pages/ContactUsPage';
import FLP from '@/pages/FLP';
import FLPResults from '@/pages/FLPResults';
import FLPResultDetail from '@/components/FLPResultDetail'; // Adjust path if needed
import ForgotPassword from '@/pages/ForgotPassword';
import UpdatePassword from '@/pages/UpdatePassword'; // Add this import
import SelectYear from '@/pages/SelectYear'; // Add this import
import Teams from '@/pages/Team';
import InstallApp from '@/pages/InstallApp';
import Practicals from '@/pages/Practicals';
import PracticalNotesDetails from "@/components/PracticalNotes/PracticalNotesDetails";
import RedeemCode from "@/pages/RedeemCode";

// Import the VideoCallProvider
import { VideoCallProvider } from '@/video-sdk/VideoCallProvider'; // Adjust path if necessary

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        themes={['light', 'dark']}
        forcedTheme={undefined}
      >
        <Router>
          <div className="App min-h-screen w-full bg-background text-foreground">
            {/* Wrap Routes with VideoCallProvider */}
            <VideoCallProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/mcqs" element={<MCQs />} />
                <Route path="/battle" element={<Battle />} />
                <Route path="/ai" element={<AI />} />
                <Route path="/ai/test-generator" element={<AITestGeneratorPage />} />
                <Route path="/ai/chatbot" element={<AIChatbotPage />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin1" element={<Admin1 />} />
                <Route path="/admin2" element={<Admin2 />} />
                <Route path="/admin3" element={<Admin3 />} />
                <Route path="/admin4" element={<Admin4 />} />
                <Route path="/admin5" element={<Admin5 />} />
                <Route path="/admin6" element={<Admin6 />} />
                <Route path="/admin7" element={<Admin7 />} />
                <Route path="/admin8" element={<Admin8 />} />
                <Route path="/admin9" element={<Admin9 />} />
                <Route path="/admin10" element={<Admin10 />} />
                <Route path="/admin11" element={<Admin11 />} />
                <Route path="/admin12" element={<Admin12 />} />
                <Route path="/admin13" element={<Admin13 />} />
                <Route path="/admin14" element={<Admin14 />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/password" element={<ChangePassword />} />
                <Route path="/profile/upgrade" element={<Profile />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/privacypolicy" element={<PrivacyPolicy />} />
                {/* <Route path="/study-materials" element={<StudyMaterials />} /> */}
                <Route path="/mock-test" element={<MockTest />} />
                <Route path="/test-completed" element={<TestCompletionPage />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/terms" element={<TermsAndConditions />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/classroom" element={<Classroom />} />
                {/* <Route path="/classroom/:id" element={<ClassroomChat />} /> */}
                <Route path="/welcome-new-user" element={<WelcomeNewUserPage />} />
                <Route path="/all-set" element={<AllSetPage />} />
                <Route path="/settings/username" element={<UsernamePage />} />
                <Route path="/results" element={<MockTestResults />} />
                <Route path="/test-summary" element={<TestCompletion />} />
                <Route path="/join" element={<Career />} />
                <Route path="/teaching-career" element={<TeachingAmbassadors />} />
                <Route path="/collaborate" element={<InternshipApplication />} />
                <Route path="/saved-mcqs" element={<SavedMCQsPage />} />
                <Route path="/announcements" element={<Announcements />} />
                <Route path="/contact-us" element={<ContactUsPage />} />
                <Route path="/flp" element={<FLP />} />
                <Route path="/flp-result" element={<FLPResults />} />
                <Route path="/results/flp/:id" element={<FLPResultDetail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/update-password" element={<UpdatePassword />} /> {/* This is the new route */}
                <Route path="/select-year" element={<SelectYear />} /> {/* This is the new route */}
                <Route path="/teams" element={<Teams />} /> {/* This is the new route */}
                <Route path="/install-app" element={<InstallApp />} /> {/* This is the new route */}
                <Route path="/practicals" element={<Practicals />} /> {/* This is the new route */}
                <Route path="/practical-notes" element={<Practicals />} />
                <Route path="/practical-notes/subject/:id" element={<PracticalNotesDetails />}/>
                <Route path="/redeem" element={<RedeemCode />}/>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </VideoCallProvider>
            <Toaster />
          </div>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;