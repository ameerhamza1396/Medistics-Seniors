import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import drHamzaAvatar from "/images/drhamzaavatar.png";
import logo from "/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png";

const InstallApp: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Redirect if app installed
        window.addEventListener("appinstalled", () => {
            navigate("/"); // go to home page
        });

        // Listen for beforeinstallprompt event
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, [navigate]);

    const handleInstallClick = () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult: any) => {
                if (choiceResult.outcome === "accepted") {
                    navigate("/"); // redirect after install
                }
                setDeferredPrompt(null);
            });
        } else {
            alert(
                "For iOS: Tap 'Share' → 'Add to Home Screen'.\n" +
                "For Desktop: Use the browser's install option."
            );
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-teal-600 to-teal-400">
            {/* Subtle animated light effect */}
            <div className="absolute inset-0 bg-teal-500 opacity-20 animate-light-motion z-0"></div>

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between w-full max-w-6xl p-6 gap-12">
                {/* Left Column: Logo + Text + Button */}
                <div className="flex flex-col items-start text-left space-y-6">
                    {/* Logo */}
                    <img src={logo} alt="Medmace Logo" className="w-32 md:w-40 mb-4" />

                    <h1 className="text-5xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-teal-300 to-teal-100">
                        Install Medmacs
                    </h1>

                    <p className="text-white text-lg md:text-xl">
                        Experience Pakistan’s most advanced AI-powered Medical prep platform as a lightweight, zero-KB application. Install on your device for quick access and offline-friendly performance.
                    </p>

                    <button
                        onClick={handleInstallClick}
                        className="bg-white text-teal-600 font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-teal-300 hover:bg-gray-100 transition-all duration-300"
                    >
                        Install Application
                    </button>
                </div>

                {/* Right Column: Avatar */}
                <div className="flex-shrink-0">
                    <img
                        src={drHamzaAvatar}
                        alt="Dr Hamza Avatar"
                        className="h-[500px] md:h-[600px] object-contain"
                    />
                </div>
            </div>

            {/* Custom Animations */}
            <style>
                {`
          @keyframes light-motion {
            0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.2; }
            50% { transform: translateY(10px) translateX(10px); opacity: 0.25; }
          }
          .animate-light-motion {
            animation: light-motion 10s ease-in-out infinite alternate;
          }
        `}
            </style>
        </div>
    );
};

export default InstallApp;
