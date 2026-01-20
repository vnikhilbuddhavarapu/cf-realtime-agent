import { Logger } from "./logger";

const logger = new Logger("RealtimeKit");

interface CreateMeetingResponse {
  success: boolean;
  data?: {
    id: string;
    title: string;
    created_at: string;
  };
  errors?: Array<{ message: string }>;
}

interface AddParticipantResponse {
  success: boolean;
  data?: {
    id: string;
    token: string;
    custom_participant_id: string;
    preset_name?: string;
    created_at: string;
    updated_at: string;
    name?: string;
    picture?: string;
  };
  errors?: Array<{ message: string }>;
}

export async function createRealtimeKitMeeting(
  accountId: string,
  appId: string,
  apiToken: string,
  title: string,
  presetId?: string,
  presetName?: string,
): Promise<{ meetingId: string; authToken: string }> {
  logger.info("Creating RealtimeKit meeting", { title, presetId, presetName });

  // Step 1: Create the meeting
  const createMeetingUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/realtime/kit/${appId}/meetings`;

  const requestBody: { title: string; preset_id?: string } = { title };
  if (presetId) {
    requestBody.preset_id = presetId;
  }

  const createResponse = await fetch(createMeetingUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const createData = (await createResponse.json()) as CreateMeetingResponse;

  logger.info("Create meeting API response", {
    success: createData.success,
    status: createResponse.status,
    errors: createData.errors,
    data: createData.data,
  });

  if (!createData.success || !createData.data) {
    const errorMsg =
      createData.errors?.[0]?.message || "Failed to create meeting";
    logger.error("Failed to create meeting", new Error(errorMsg), {
      fullResponse: createData,
      status: createResponse.status,
    });
    throw new Error(`Failed to create RealtimeKit meeting: ${errorMsg}`);
  }

  const meetingId = createData.data.id;
  logger.info("Meeting created", { meetingId });

  // Step 2: Add a participant (the AI agent) to get an auth token
  const addParticipantUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/realtime/kit/${appId}/meetings/${meetingId}/participants`;

  const participantBody: {
    name: string;
    preset_name?: string;
    custom_participant_id?: string;
  } = {
    name: "AI Interview Agent",
    custom_participant_id: `agent-${meetingId}`,
  };

  if (presetName) {
    participantBody.preset_name = presetName;
  }

  const participantResponse = await fetch(addParticipantUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(participantBody),
  });

  const participantData =
    (await participantResponse.json()) as AddParticipantResponse;

  logger.info("Add participant API response", {
    success: participantData.success,
    status: participantResponse.status,
    errors: participantData.errors,
    data: participantData.data,
  });

  if (!participantData.success || !participantData.data) {
    const errorMsg =
      participantData.errors?.[0]?.message || "Failed to add participant";
    logger.error("Failed to add participant", new Error(errorMsg), {
      fullResponse: participantData,
      status: participantResponse.status,
    });
    throw new Error(`Failed to add participant: ${errorMsg}`);
  }

  const authToken = participantData.data.token;
  logger.info("Participant added", {
    meetingId,
    participantId: participantData.data.id,
    customParticipantId: participantData.data.custom_participant_id,
  });

  return { meetingId, authToken };
}
