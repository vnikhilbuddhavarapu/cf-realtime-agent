import type { ScenarioPreset } from '../../lib/types';
import { getScenarioList } from '../../lib/scenarios';
import {
  Briefcase,
  ChevronLeft,
  Cpu,
  Phone,
  Target,
  Trophy,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Card, CardContent, CardDescription, CardTitle } from "../ui/Card";
import { Badge } from "../ui/Badge";

interface ScenarioSelectorProps {
  onSelect: (scenario: ScenarioPreset) => void;
  onBack: () => void;
}

const scenarios = getScenarioList();

export function ScenarioSelector({ onSelect, onBack }: ScenarioSelectorProps) {
  const getScenarioIcon = (scenarioId: ScenarioPreset["id"]) => {
    switch (scenarioId) {
      case "phone_screen":
        return Phone;
      case "behavioral":
        return Target;
      case "technical":
        return Cpu;
      case "hiring_manager":
        return Briefcase;
      case "final_round":
        return Trophy;
      default:
        return Target;
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-zinc-950 via-zinc-950 to-zinc-900 text-zinc-50">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button onClick={onBack} variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <img src="/icon.png" className="w-7 h-7 rounded-xl bg-black" />
            <span className="text-xl font-semibold tracking-tight">InterviewAI</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-3">
            Choose your interview
          </h1>
          <p className="text-base md:text-lg text-zinc-400">
            Select the type of interview you want to practice
          </p>
        </div>

        {/* Scenario Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {scenarios.map((scenario) => {
            const Icon = getScenarioIcon(scenario.id);
            return (
              <button
                key={scenario.id}
                onClick={() => onSelect(scenario)}
                className="text-left"
              >
                <Card className="transition-colors hover:border-zinc-700">
                  <CardContent className="space-y-4">
                    <div className="h-11 w-11 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-zinc-200" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{scenario.name}</CardTitle>
                      <CardDescription>{scenario.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          scenario.defaultDifficulty === "easy"
                            ? "success"
                            : scenario.defaultDifficulty === "medium"
                              ? "warning"
                              : "default"
                        }
                      >
                        {scenario.defaultDifficulty.charAt(0).toUpperCase() +
                          scenario.defaultDifficulty.slice(1)}
                      </Badge>
                      <Badge variant="subtle">{scenario.defaultDuration} min</Badge>
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
