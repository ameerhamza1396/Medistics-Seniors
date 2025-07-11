// components/AdSenseInfeedAd.tsx
import Script from 'next/script';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

interface AdSenseInfeedAdProps {
  onSkip: () => void;
  // This is the data-ad-slot ID from your AdSense account for this specific ad unit
  adSlotId: string;
  // This is your data-ad-client ID from your AdSense account (ca-pub-...)
  adClient: string;
}

export const AdSenseInfeedAd = ({ onSkip, adSlotId, adClient }: AdSenseInfeedAdProps) => {
  // useEffect to push ad on mount/when ad becomes visible
  // We'll run this after the component mounts to ensure the ad unit is in the DOM
  // and the global 'adsbygoogle' array is available.
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only attempt to load ad if the adRef is currently in the DOM
    if (adRef.current) {
      try {
        // Check if the adsbygoogle array exists globally
        if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
          (window as any).adsbygoogle.push({});
        } else {
          // If not present, it might be due to script loading strategy or ad blocker
          console.warn('AdSense script (adsbygoogle) not yet loaded or blocked.');
        }
      } catch (error) {
        console.error('Error pushing AdSense ad:', error);
      }
    }
  }, [adSlotId]); // Re-run if adSlotId changes, though it likely won't for a fixed unit

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.5 }}
      className="relative p-4 sm:p-6 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg shadow-xl text-center flex flex-col items-center justify-center min-h-[200px]"
    >
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">A quick break...</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Content provided by our partners to keep the app free!</p>

      {/* The actual AdSense ad container */}
      <div className="w-full max-w-md bg-white dark:bg-gray-900 p-2 rounded-md border border-gray-200 dark:border-gray-700 flex justify-center items-center overflow-hidden min-h-[150px]" ref={adRef}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block', minHeight: '150px' }} // min-height is important to prevent CLS
          data-ad-client={adClient}
          data-ad-slot={adSlotId}
          data-full-width-responsive="true" // Optional: make it responsive
        ></ins>
      </div>

      <Button
        onClick={onSkip}
        className="absolute top-2 right-2 rounded-full w-8 h-8 p-0 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
        aria-label="Skip Ad"
      >
        <X className="w-4 h-4" />
      </Button>
    </motion.div>
  );
};