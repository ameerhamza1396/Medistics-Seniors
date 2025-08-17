import React, { useState } from "react";
import { ExternalLink } from "lucide-react";

export default function App() {
  const [status, setStatus] = useState("idle"); // idle | loading | success | error

  return (
    <div className="min-h-screen w-full bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="bg-blue-600 dark:bg-blue-800 shadow-md py-4">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold text-white">
            📄 PDF Flashcard Generator
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8 animate-fade-in">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Generate Flashcards from Your PDFs
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Upload a PDF, extract the key points, and download them as an Excel
            flashcard deck — styled for easy studying.
          </p>
        </div>

        {/* Upload Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 p-6">
          <label className="block text-gray-700 dark:text-gray-200 font-medium mb-2">
            Select PDF File
          </label>
          <input
            type="file"
            accept="application/pdf"
            className="block w-full text-sm text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 p-2"
            onChange={() => setStatus("loading")}
          />

          <div className="mt-6">
            {status === "idle" && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ready to start. Upload a PDF to begin.
              </p>
            )}
            {status === "loading" && (
              <div className="flex items-center space-x-2 text-blue-500">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"
                  ></path>
                </svg>
                <span>Processing your PDF...</span>
              </div>
            )}
            {status === "success" && (
              <p className="text-green-600 dark:text-green-400 font-medium">
                ✅ Flashcards generated successfully!
              </p>
            )}
            {status === "error" && (
              <p className="text-red-600 dark:text-red-400 font-medium">
                ❌ Something went wrong. Please try again.
              </p>
            )}
          </div>

          {status === "success" && (
            <a
              href="/output.xlsx"
              className="mt-6 inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow transition-colors duration-200"
            >
              Download Excel <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-gray-800 py-4 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Built with ❤️ using React, Tailwind, and Vite.
        </div>
      </footer>
    </div>
  );
}
