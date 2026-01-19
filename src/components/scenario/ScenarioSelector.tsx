import type { ScenarioPreset } from '../../lib/types';
import { getScenarioList } from '../../lib/scenarios';

interface ScenarioSelectorProps {
  onSelect: (scenario: ScenarioPreset) => void;
  onBack: () => void;
}

const scenarios = getScenarioList();

export function ScenarioSelector({ onSelect, onBack }: ScenarioSelectorProps) {
  return (
    <div className="min-h-screen bg-linear-to-br from-[#0F0F0F] via-[#1a1a1a] to-[#2A2A2A] text-[#F5F5F5]">
      {/* Header */}
      <header className="border-b border-[#2A2A2A] bg-[#0F0F0F]/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#9CA3AF] hover:text-[#F5F5F5] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-linear-to-br from-[#3B82F6] to-[#2563EB] rounded-lg" />
            <span className="text-xl font-bold">InterviewAI</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Choose Your Interview Type</h1>
          <p className="text-xl text-[#9CA3AF]">
            Select the type of interview you want to practice
          </p>
        </div>

        {/* Scenario Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => onSelect(scenario)}
              className="group bg-[#1a1a1a] border border-[#2A2A2A] rounded-xl p-6 text-left transition-all hover:border-[#3B82F6] hover:scale-105 hover:shadow-xl hover:shadow-[#3B82F6]/10"
            >
              <div className={`w-14 h-14 bg-linear-to-br ${scenario.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <span className="text-3xl">{scenario.icon}</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{scenario.name}</h3>
              <p className="text-[#9CA3AF] text-sm leading-relaxed mb-3">
                {scenario.description}
              </p>
              <div className="flex items-center gap-3 text-xs">
                <span className={`px-2 py-1 rounded-full ${
                  scenario.defaultDifficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                  scenario.defaultDifficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {scenario.defaultDifficulty.charAt(0).toUpperCase() + scenario.defaultDifficulty.slice(1)}
                </span>
                <span className="text-[#6B7280]">{scenario.defaultDuration} min</span>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
