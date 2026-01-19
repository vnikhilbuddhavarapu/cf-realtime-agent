import { useState } from "react";
import type { SessionState, ScenarioConfig, PersonaConfig } from "../lib/types";

// Simple state management hook for the session
export function useSession() {
  const [session, setSession] = useState<SessionState>({
    sessionId: null,
    roleplayId: null,
    scenario: null,
    persona: null,
    meetingId: null,
    authToken: null,
  });

  const setScenario = (scenario: ScenarioConfig) => {
    setSession((prev) => ({ ...prev, scenario }));
  };

  const setPersona = (persona: PersonaConfig) => {
    setSession((prev) => ({ ...prev, persona }));
  };

  const setMeetingDetails = (
    meetingId: string,
    authToken: string,
    roleplayId: string,
  ) => {
    setSession((prev) => ({ ...prev, meetingId, authToken, roleplayId }));
  };

  const setSessionId = (sessionId: string) => {
    setSession((prev) => ({ ...prev, sessionId }));
  };

  const setRoleplayId = (roleplayId: string) => {
    setSession((prev) => ({ ...prev, roleplayId }));
  };

  const reset = () => {
    setSession({
      sessionId: null,
      roleplayId: null,
      scenario: null,
      persona: null,
      meetingId: null,
      authToken: null,
    });
  };

  return {
    session,
    setScenario,
    setPersona,
    setMeetingDetails,
    setSessionId,
    setRoleplayId,
    reset,
  };
}
