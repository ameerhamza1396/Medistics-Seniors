import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

const TermsAndConditions = () => {
  const { theme, setTheme } = useTheme();

  // Markdown content for the Terms and Conditions
  const termsAndConditionsContent = `
# Terms and Conditions

**Last updated:** June 17, 2025

Please read these terms and conditions carefully before using Our Service.

---

## Interpretation and Definitions

### Interpretation

The words of which the initial letter is capitalized have meanings defined
under the following conditions. The following definitions shall have the same
meaning regardless of whether they appear in singular or in plural.

### Definitions

For the purposes of these Terms and Conditions:

* **Affiliate** means an entity that controls, is controlled by or is under
  common control with a party, where "control" means ownership of 50% or
  more of the shares, equity interest or other securities entitled to vote
  for election of directors or other managing authority.

* **Company** (referred to as either "the Company", "We", "Us" or "Our" in this
  Agreement) refers to Medistics.app, L13, KDA Flats, Sector 5E Surjani
  Town, Karachi.

* **Country** refers to: Pakistan

* **Device** means any device that can access the Service such as a computer, a
  cellphone or a digital tablet.

* **Service** refers to the Website.

* **Terms and Conditions** (also referred as "Terms") mean these Terms and Conditions
  that form the entire agreement between You and the Company regarding the use of the Service.

* **Third-party Social Media Service** means any services or content (including
  data, information, products or services) provided by a third-party that
  may be displayed, included or made available by the Service.

* **Website** refers to Medistics.app, accessible from
  [medistics.app](https://medistics.app)

* **You** means the individual accessing or using the Service, or the company,
  or other legal entity on behalf of which such individual is accessing or
  using the Service, as applicable.

---

## Acknowledgment

These are the Terms and Conditions governing the use of this Service and the
agreement that operates between You and the Company. These Terms and Conditions
set out the rights and obligations of all users regarding the use of the Service.

Your access to and use of the Service is conditioned on Your acceptance of and
compliance with these Terms and Conditions. These Terms and Conditions apply
to all visitors, users and others who access or use the Service.

By accessing or using the Service You agree to be bound by these Terms and
Conditions. If You disagree with any part of these Terms and Conditions then
You may not access the Service.

You represent that you are over the age of 18. The Company does not permit
those under 18 to use the Service.

Your access to and use of the Service is also conditioned on Your acceptance of
and compliance with the Privacy Policy of the Company. Our Privacy Policy
describes Our policies and procedures on the collection, use and disclosure of
Your personal information when You use the Application or the Website and tells
You about Your privacy rights and how the law protects You. Please read Our
Privacy Policy carefully before using Our Service.

---

## Links to Other Websites

Our Service may contain links to third-party web sites or services that are not
owned or controlled by the Company.

The Company has no control over, and assumes no responsibility for, the content,
privacy policies, or practices of any third party web sites or services. You
further acknowledge and agree that the Company shall not be responsible or liable,
directly or indirectly, for any damage or loss caused or alleged to be caused by
or in connection with the use of or reliance on any such content, goods or
services available on or through any such web sites or services.

We strongly advise You to read the terms and conditions and privacy policies of
any third-party web sites or services that You visit.

---

## Termination

We may terminate or suspend Your access immediately, without prior notice or
liability, for any reason whatsoever, including without limitation if You breach
these Terms and Conditions.

Upon termination, Your right to use the Service will cease immediately.

---

## Limitation of Liability

Notwithstanding any damages that You might incur, the entire liability of the
Company and any of its suppliers under any provision of this Terms and Your
exclusive remedy for all of the foregoing shall be limited to the amount
actually paid by You through the Service or 100 USD if You haven't purchased
anything through the Service.

To the maximum extent permitted by applicable law, in no event shall the Company
or its suppliers be liable for any special, incidental, indirect, or
consequential damages whatsoever (including, but not limited to, damages for
loss of profits, loss of data or other information, for business interruption,
for personal injury, loss of privacy arising out of or in any way related to
the use of or inability to use the Service, third-party software and/or third-party
hardware used with the Service, or otherwise in connection with any provision of
this Terms), even if the Company or any supplier has been advised of the possibility
of such damages and even if the remedy fails of its essential purpose.

Some states do not allow the exclusion of implied warranties or limitation of
liability for incidental or consequential damages, which means that some of the
above limitations may not apply. In these states, each party's liability will be
limited to the greatest extent permitted by law.

---

## "AS IS" and "AS AVAILABLE" Disclaimer

The Service is provided to You "AS IS" and "AS AVAILABLE" and with all faults
and defects without warranty of any kind. To the maximum extent permitted under
applicable law, the Company, on its own behalf and on behalf of its Affiliates
and its and their respective licensors and service providers, expressly disclaims
all warranties, whether express, implied, statutory or otherwise, with respect
to the Service, including all implied warranties of merchantability, fitness
for a particular purpose, title and non-infringement, and warranties that may
arise out of course of dealing, course of performance, usage or trade practice.
Without limitation to the foregoing, the Company provides no warranty or
undertaking, and makes no representation of any kind that the Service will meet
Your requirements, achieve any intended results, be compatible or work with any
other software, applications, systems or services, operate without interruption,
meet any performance or reliability standards or be error free or that any
errors or defects can or will be corrected.

Without limiting the foregoing, neither the Company nor any of the company's
provider makes any representation or warranty of any kind, express or implied:
(i) as to the operation or availability of the Service, or the information,
content, and materials or products included thereon; (ii) that the Service will
be uninterrupted or error-free; (iii) as to the accuracy, reliability, or
currency of any information or content provided through the Service; or (iv)
that the Service, its servers, the content, or e-mails sent from or on behalf
of the Company are free of viruses, scripts, trojan horses, worms, malware,
timebombs or other harmful components.

Some jurisdictions do not allow the exclusion of certain types of warranties or
limitations on applicable statutory rights of a consumer, so some or all of the
above exclusions and limitations may not apply to You. But in such a case the
exclusions and limitations set forth in this section shall be applied to the
greatest extent enforceable under applicable law.

---

## Governing Law

The laws of the Country, excluding its conflicts of law rules, shall govern this
Terms and Your use of the Service. Your use of the Application may also be
subject to other local, state, national, or international laws.

---

## Disputes Resolution

If You have any concern or dispute about the Service, You agree to first try to
resolve the dispute informally by contacting the Company.

---

## For European Union (EU) Users

If You are a European Union consumer, you will benefit from any mandatory
provisions of the law of the country in which you are resident.

---

## United States Legal Compliance

You represent and warrant that (i) You are not located in a country that is
subject to the United States government embargo, or that has been designated by
the United States government as a "terrorist supporting" country, and (ii) You
are not listed on any United States government list of prohibited or restricted
parties.

---

## Severability and Waiver

### Severability

If any provision of these Terms is held to be unenforceable or invalid, such
provision will be changed and interpreted to accomplish the objectives of such
provision to the greatest extent possible under applicable law and the
remaining provisions will continue in full force and effect.

### Waiver

Except as provided herein, the failure to exercise a right or to require
performance of an obligation under these Terms shall not effect a party's
ability to exercise such right or require such performance at any time
thereafter nor shall the waiver of a breach constitute a waiver of any
subsequent breach.

---

## Translation Disclaimer

These Terms and Conditions may have been translated.
You agree that the original English text shall prevail in the case of a dispute.

---

## Changes to These Terms and Conditions

We reserve the right, at Our sole discretion, to modify or replace these Terms
at any time. If a revision is material We will make reasonable efforts to
provide at least 30 days' notice prior to any new terms taking effect. What
constitutes a material change will be determined at Our sole discretion.

By continuing to access or use Our Service after those revisions become effective,
You agree to be bound by the revised terms. If You do not agree to the new terms,
in whole or in part, please stop using the website and the Service.

---

## Contact Us

If you have any questions about these Terms and Conditions, You can contact us:

* By email: medistics@dr.com

* By visiting this page on our website:
  [instagram.com/medistics.app](https://instagram.com/medistics.app)
`;

  return (
    <div className="min-h-screen w-full bg-white dark:bg-gray-900">
      
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
          <Link to="/" className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center space-x-3">
            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medistics Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">MedisticsApp</span>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 lg:px-8 py-8 max-w-4xl">
        {/* Terms and Conditions Content */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            Terms and Conditions
          </h1>
          <div className="text-gray-700 dark:text-gray-300 leading-relaxed space-y-4">
            {/* The raw markdown content is inserted here. You'll likely want to use a markdown renderer. */}
            <pre className="whitespace-pre-wrap text-sm">{termsAndConditionsContent}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
