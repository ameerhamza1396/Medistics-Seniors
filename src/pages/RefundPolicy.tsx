import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
// If you are using react-markdown
// import ReactMarkdown from 'react-markdown';
import Seo from '@/components/Seo'; // Import the Seo component

const RefundPolicy = () => {
    const { theme, setTheme } = useTheme();

    // Markdown content for the Refund Policy
    const refundPolicyContent = `
# Refund Policy

**Last updated:** June 12, 2025

Thank you for choosing Medmacs.App. We want to ensure you have a rewarding experience while you explore, evaluate, and purchase our MCAT learning tools.

As with any shopping experience, there are terms and conditions that apply to transactions at Medmacs.App. By placing an order or making a purchase at Medmacs.App, you agree to the terms set forth below along with our Privacy Policy and Terms and Conditions.

---

## Standard Refund Terms

We believe in the quality of our AI-integrated MCAT platform. However, we understand that sometimes a service may not be the right fit for your specific study style.

* **Digital Products:** Since our Service provides digital content and AI-generated insights that are accessible immediately upon purchase, we generally offer a **7-day money-back guarantee** if you have not significantly utilized the premium features.
* **Usage Limits:** If more than 10% of the premium question bank has been accessed or more than 50 AI-generated tutor queries have been made, the service is considered "consumed," and a refund may not be issued.

---

## How to Request a Refund

To request a refund, please contact us within 7 days of your initial purchase.

* **Email:** Send your request to [Medmacs@dr.com](mailto:Medmacs@dr.com).
* **Information Needed:** Please include your account email address and the transaction ID from your receipt.

Once we receive your request, we will inspect your account usage and notify you of the approval or rejection of your refund.

---

## Processing Refunds

If your refund is approved, it will be processed, and a credit will automatically be applied to your original method of payment within 5-10 business days.

* **Late or Missing Refunds:** If you haven’t received a refund yet, first check your bank account again. Then contact your credit card company; it may take some time before your refund is officially posted.
* **Sale Items:** Only regular priced items may be refunded. Unfortunately, sale items or promotional bundles may not be eligible for refunds unless otherwise stated.

---

## Exceptions

The following items are non-refundable:
* Subscription renewals that were not canceled before the billing date (reminder emails are sent 3 days prior).
* Individual tutoring sessions that have already been completed.
* Accounts that have been banned due to a violation of our Terms and Conditions (e.g., sharing accounts or attempting to scrape AI data).

---

## Contact Us

If you have any questions about our Refund Policy, you can contact us:

* By email: [Medmacs@dr.com](mailto:Medmacs@dr.com)

* By visiting this page on our website:
    [instagram.com/Medmacs.App](https://instagram.com/Medmacs.App)
`;

    return (
        <div className="min-h-screen w-full bg-white dark:bg-gray-900">
            <Seo
                title="Refund Policy"
                description="Learn about the refund policy at Medmacs App. Find out about our 7-day money-back guarantee and how to request a refund."
                canonical="https://Medmacs.App/refund-policy"
            />
            {/* Header */}
            <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50">
                <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
                    <Link to="/" className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>

                    <div className="flex items-center space-x-3">
                        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medmacs Logo" className="w-8 h-8 object-contain" />
                        <span className="text-xl font-bold text-gray-900 dark:text-white">MedmacsApp</span>
                    </div>

                    <div className="flex items-center space-x-3">
                        <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200">
                            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 lg:px-8 py-8 max-w-4xl">
                {/* Refund Policy Content */}
                <div className="mb-8 animate-fade-in">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                        Refund Policy
                    </h1>
                    <div className="text-gray-700 dark:text-gray-300 leading-relaxed space-y-4">
                        {/* The raw markdown content is inserted here. For proper rendering, 
              consider using <ReactMarkdown>{refundPolicyContent}</ReactMarkdown>
            */}
                        <pre className="whitespace-pre-wrap text-sm">{refundPolicyContent}</pre>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RefundPolicy;