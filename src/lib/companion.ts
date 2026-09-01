import {
  apiCheckInCompanionSession,
  apiExtendCompanionSession,
  apiFetchActiveCompanionSession,
  apiSendCompanionHeartbeat,
  apiStartCompanionSession,
  apiTriggerCompanionSOS,
} from './api';

export async function fetchActiveSession() {
  return apiFetchActiveCompanionSession();
}

export async function startSession(input: { destinationLabel?: string; durationMinutes: number }) {
  return apiStartCompanionSession(input);
}

export async function checkIn(id: string) {
  return apiCheckInCompanionSession(id);
}

export async function extend(id: string, additionalMinutes = 10) {
  return apiExtendCompanionSession(id, additionalMinutes);
}

export async function sendHeartbeat(id: string, coords: { lat: number; lon: number }) {
  return apiSendCompanionHeartbeat(id, coords);
}

export async function triggerSOS(id: string, coords: { lat: number; lon: number } | null) {
  return apiTriggerCompanionSOS(id, coords);
}
