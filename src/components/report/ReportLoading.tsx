import { useState, useEffect } from 'react';

const LOADING_MESSAGES = [
  'Ending interview session...',
  'Analyzing transcript...',
  'Evaluating communication skills...',
  'Assessing STAR framework usage...',
  'Generating personalized feedback...',
  'Preparing your report...',
];

export function ReportLoading() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#F5F5F5] flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md px-4">
        {/* Animated spinner */}
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 border-4 border-[#2A2A2A] rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-[#3B82F6] rounded-full animate-spin" />
          <div className="absolute inset-2 border-4 border-transparent border-t-[#60A5FA] rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />
        </div>

        {/* Title */}
        <div>
          <h2 className="text-2xl font-bold mb-2">Generating Your Report</h2>
          <p className="text-[#9CA3AF] transition-opacity duration-300">
            {LOADING_MESSAGES[messageIndex]}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {LOADING_MESSAGES.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                idx <= messageIndex ? 'bg-[#3B82F6]' : 'bg-[#2A2A2A]'
              }`}
            />
          ))}
        </div>

        <p className="text-[#6B7280] text-sm">
          This may take a few seconds...
        </p>
      </div>
    </div>
  );
}
