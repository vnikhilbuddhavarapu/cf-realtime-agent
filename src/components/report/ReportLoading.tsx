import { useState, useEffect } from 'react';
import { Loader2 } from "lucide-react";

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
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md px-6">
        <div className="mx-auto h-16 w-16 rounded-2xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-200" />
        </div>

        <div>
          <h2 className="text-2xl font-semibold tracking-tight mb-2">
            Generating your report
          </h2>
          <p className="text-zinc-400 transition-opacity duration-300">
            {LOADING_MESSAGES[messageIndex]}
          </p>
        </div>

        <div className="flex justify-center gap-2">
          {LOADING_MESSAGES.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                idx <= messageIndex ? 'bg-zinc-200' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>

        <p className="text-zinc-500 text-sm">This may take a few seconds...</p>
      </div>
    </div>
  );
}
