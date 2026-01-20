import { ArrowRight, FileText, MessageSquareText, Mic } from "lucide-react";
import { Button } from "../ui/Button";
import { Card, CardContent, CardDescription, CardTitle } from "../ui/Card";

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-linear-to-br from-zinc-950 via-zinc-950 to-zinc-900 text-zinc-50">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/icon.png" className="w-7 h-7 rounded-xl bg-black" />
            <span className="text-xl font-semibold tracking-tight">InterviewAI</span>
          </div>
          <Button onClick={onGetStarted} variant="secondary" size="sm">
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center space-y-6">
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight">
            Practice interviews that feel real.
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto">
            Run an interview simulation, get coaching insights as you speak, and receive a
            polished report at the end.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={onGetStarted} size="lg">
              Start practicing
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <Card>
            <CardContent className="space-y-3">
              <div className="h-10 w-10 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                <Mic className="h-5 w-5 text-zinc-200" />
              </div>
              <CardTitle>Voice-first practice</CardTitle>
              <CardDescription>
                Talk naturally and get an interviewer that responds like a real conversation.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3">
              <div className="h-10 w-10 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                <MessageSquareText className="h-5 w-5 text-zinc-200" />
              </div>
              <CardTitle>Live coaching</CardTitle>
              <CardDescription>
                Receive structured feedback during the interview to help you course-correct.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3">
              <div className="h-10 w-10 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                <FileText className="h-5 w-5 text-zinc-200" />
              </div>
              <CardTitle>Clean reports</CardTitle>
              <CardDescription>
                A structured summary with strengths, improvements, and actionable next steps.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
