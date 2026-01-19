interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0F0F] via-[#1a1a1a] to-[#2A2A2A] text-[#F5F5F5]">
      {/* Header */}
      <header className="border-b border-[#2A2A2A] bg-[#0F0F0F]/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#3B82F6] to-[#2563EB] rounded-lg" />
            <span className="text-xl font-bold">InterviewAI</span>
          </div>
          <button
            onClick={onGetStarted}
            className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg font-medium transition-colors"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center space-y-8">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-[#F5F5F5] to-[#9CA3AF] bg-clip-text text-transparent">
            Master Your Interview Skills
          </h1>
          <p className="text-xl text-[#9CA3AF] max-w-2xl mx-auto">
            Practice with AI-powered interviewers. Get real-time feedback. Land your dream job.
          </p>
          <button
            onClick={onGetStarted}
            className="px-8 py-4 bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg text-lg font-semibold transition-all hover:scale-105 shadow-lg shadow-[#3B82F6]/20"
          >
            Start Practicing Now
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="bg-[#1a1a1a] border border-[#2A2A2A] rounded-xl p-6 space-y-4">
            <div className="w-12 h-12 bg-[#3B82F6]/10 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold">AI-Powered Interviews</h3>
            <p className="text-[#9CA3AF]">
              Practice with realistic AI interviewers that adapt to your responses and skill level.
            </p>
          </div>

          <div className="bg-[#1a1a1a] border border-[#2A2A2A] rounded-xl p-6 space-y-4">
            <div className="w-12 h-12 bg-[#10B981]/10 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold">Real-Time Feedback</h3>
            <p className="text-[#9CA3AF]">
              Get instant insights on your performance, communication style, and technical accuracy.
            </p>
          </div>

          <div className="bg-[#1a1a1a] border border-[#2A2A2A] rounded-xl p-6 space-y-4">
            <div className="w-12 h-12 bg-[#F59E0B]/10 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold">Detailed Reports</h3>
            <p className="text-[#9CA3AF]">
              Receive comprehensive analysis with actionable recommendations for improvement.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
