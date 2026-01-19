import { useState } from 'react';
import { LandingPage } from './components/landing/LandingPage';
import { ScenarioSelector } from './components/scenario/ScenarioSelector';
import { PersonaCustomizer } from './components/persona/PersonaCustomizer';
import { DocumentUpload } from './components/preparation/DocumentUpload';
import { MeetingRoom } from './components/meeting/MeetingRoom';
import { useSession } from './hooks/useSession';
import { createSession, createRoleplay } from './lib/api';
import type { ScenarioPreset, ScenarioConfig, PersonaConfig } from './lib/types';

type AppStep = 'landing' | 'scenario' | 'persona' | 'preparation' | 'meeting';

function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>('landing');
  const [selectedPreset, setSelectedPreset] = useState<ScenarioPreset | null>(null);
  const [isCreatingRoleplay, setIsCreatingRoleplay] = useState(false);
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

  const handleEndMeeting = () => {
    reset();
    setSelectedPreset(null);
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
          <div className="min-h-screen bg-[#0F0F0F] text-[#F5F5F5] flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-[#9CA3AF]">Setting up your interview...</p>
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
    </div>
  );
}

export default App;
