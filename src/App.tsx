import { useState } from 'react';
import { LandingPage } from './components/landing/LandingPage';
import { ScenarioSelector } from './components/scenario/ScenarioSelector';
import { PersonaCustomizer } from './components/persona/PersonaCustomizer';
import { DocumentUpload } from './components/preparation/DocumentUpload';
import { MeetingRoom } from './components/meeting/MeetingRoom';
import { InterviewReport } from './components/report/InterviewReport';
import { ReportLoading } from './components/report/ReportLoading';
import { useSession } from './hooks/useSession';
import { createSession, createRoleplay, generateReport } from './lib/api';
import type { ScenarioPreset, ScenarioConfig, PersonaConfig, InterviewReport as ReportType } from './lib/types';

type AppStep = 'landing' | 'scenario' | 'persona' | 'preparation' | 'meeting' | 'generating_report' | 'report';

function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>('landing');
  const [selectedPreset, setSelectedPreset] = useState<ScenarioPreset | null>(null);
  const [isCreatingRoleplay, setIsCreatingRoleplay] = useState(false);
  const [report, setReport] = useState<ReportType | null>(null);
  const sessionHook = useSession();
  const { session, setScenario, setPersona, setRoleplayId, setSessionId, reset } = sessionHook;

  const handleGetStarted = () => {
    setCurrentStep('scenario');
  };

  const handleScenarioSelect = (preset: ScenarioPreset) => {
    setSelectedPreset(preset);
    setCurrentStep('persona');
  };

  const handlePersonaComplete = async (scenario: ScenarioConfig, persona: PersonaConfig) => {
    setScenario(scenario);
    setPersona(persona);
    
    // Create session and roleplay now so we have roleplayId for document upload
    setIsCreatingRoleplay(true);
    try {
      const sessionResponse = await createSession();
      if (!sessionResponse.success || !sessionResponse.data) {
        throw new Error('Failed to create session');
      }
      setSessionId(sessionResponse.data.sessionId);

      const roleplayResponse = await createRoleplay(
        sessionResponse.data.sessionId,
        scenario,
        persona
      );
      if (!roleplayResponse.success || !roleplayResponse.data) {
        throw new Error('Failed to create roleplay');
      }
      setRoleplayId(roleplayResponse.data.roleplayId);
      
      setCurrentStep('preparation');
    } catch (error) {
      console.error('Failed to create roleplay:', error);
      // Still proceed to preparation, but documents won't work
      setCurrentStep('preparation');
    } finally {
      setIsCreatingRoleplay(false);
    }
  };

  const handleDocumentsContinue = () => {
    setCurrentStep('meeting');
  };

  const handleBack = () => {
    if (currentStep === 'scenario') setCurrentStep('landing');
    if (currentStep === 'persona') setCurrentStep('scenario');
    if (currentStep === 'preparation') setCurrentStep('persona');
  };

  const handleEndMeeting = async (roleplayId: string) => {
    // Start report generation
    setCurrentStep('generating_report');
    
    try {
      const reportResponse = await generateReport(roleplayId);
      if (reportResponse.success && reportResponse.data) {
        setReport(reportResponse.data);
        setCurrentStep('report');
      } else {
        console.error('Failed to generate report');
        // Fallback to landing if report fails
        handleStartNewSession();
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      // Fallback to landing if report fails
      handleStartNewSession();
    }
  };

  const handleStartNewSession = () => {
    reset();
    setSelectedPreset(null);
    setReport(null);
    setCurrentStep('landing');
  };

  return (
    <div className="min-h-screen">
      {currentStep === 'landing' && (
        <LandingPage onGetStarted={handleGetStarted} />
      )}
      {currentStep === 'scenario' && (
        <ScenarioSelector onSelect={handleScenarioSelect} onBack={handleBack} />
      )}
      {currentStep === 'persona' && selectedPreset && (
        <PersonaCustomizer 
          scenarioPreset={selectedPreset}
          onContinue={handlePersonaComplete} 
          onBack={handleBack} 
        />
      )}
      {currentStep === 'preparation' && (
        isCreatingRoleplay ? (
          <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-14 h-14 border-2 border-zinc-800 border-t-zinc-200 rounded-full animate-spin mx-auto" />
              <p className="text-zinc-400">Setting up your interview...</p>
            </div>
          </div>
        ) : (
          <DocumentUpload 
            roleplayId={session.roleplayId || ''} 
            onContinue={handleDocumentsContinue}
            onBack={handleBack}
          />
        )
      )}
      {currentStep === 'meeting' && (
        <MeetingRoom session={session} onEnd={handleEndMeeting} />
      )}
      {currentStep === 'generating_report' && (
        <ReportLoading />
      )}
      {currentStep === 'report' && report && (
        <InterviewReport report={report} onStartNewSession={handleStartNewSession} />
      )}
    </div>
  );
}

export default App;
