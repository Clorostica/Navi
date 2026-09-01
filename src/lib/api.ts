import type { MapBounds } from '../data/mapProjection';
import type { CompanionSession, NaviUser, Report, ReportCategory, ReportUpdate, SafetyScore, Severity, StationExit, TrustedContact } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('Missing VITE_API_URL in .env');
}

const SESSION_KEY = 'navi.session';

interface Session {
  accessToken: string;
  refreshToken: string;
  user: NaviUser;
}

export interface AuthResult {
  error: string | null;
  status: 'signedIn' | 'checkEmail' | 'error';
  pendingAuthenticationToken?: string;
}

export function loadSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function saveSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

interface AuthResponseBody {
  status: 'signedIn' | 'checkEmail' | 'error';
  error: string | null;
  accessToken?: string;
  refreshToken?: string;
  user?: NaviUser;
  pendingAuthenticationToken?: string;
}

function toAuthResult(body: AuthResponseBody): AuthResult {
  if (body.status === 'signedIn' && body.accessToken && body.refreshToken && body.user) {
    saveSession({ accessToken: body.accessToken, refreshToken: body.refreshToken, user: body.user });
  }
  return { status: body.status, error: body.error, pendingAuthenticationToken: body.pendingAuthenticationToken };
}

export async function apiSignUp(name: string, email: string, password: string): Promise<AuthResult> {
  const response = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  return toAuthResult(await response.json());
}

export async function apiSignIn(email: string, password: string): Promise<AuthResult> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return toAuthResult(await response.json());
}

export function googleLoginUrl(): string {
  return `${API_URL}/auth/google`;
}

export async function apiSignInWithGoogleCode(code: string): Promise<AuthResult> {
  const response = await fetch(`${API_URL}/auth/oauth/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  return toAuthResult(await response.json());
}

export async function apiVerifyEmail(pendingAuthenticationToken: string, code: string): Promise<AuthResult> {
  const response = await fetch(`${API_URL}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pendingAuthenticationToken, code }),
  });
  return toAuthResult(await response.json());
}

export interface SimpleResult {
  status: 'checkEmail' | 'reset' | 'error';
  error: string | null;
}

export async function apiForgotPassword(email: string): Promise<SimpleResult> {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return (await response.json()) as SimpleResult;
}

export async function apiResetPassword(token: string, newPassword: string): Promise<SimpleResult> {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
  return (await response.json()) as SimpleResult;
}

export async function restoreSession(): Promise<NaviUser | null> {
  const session = loadSession();
  if (!session) return null;

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  const body = (await response.json()) as { user: NaviUser | null; accessToken?: string; refreshToken?: string };

  if (!body.user || !body.accessToken || !body.refreshToken) {
    clearSession();
    return null;
  }

  saveSession({ accessToken: body.accessToken, refreshToken: body.refreshToken, user: body.user });
  return body.user;
}

async function authorizedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const session = loadSession();
  if (!session) throw new Error('Not signed in');

  const withAuth = (token: string): RequestInit => ({
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  });

  let response = await fetch(`${API_URL}${path}`, withAuth(session.accessToken));

  if (response.status === 401) {
    const user = await restoreSession();
    const refreshed = loadSession();
    if (!user || !refreshed) return response;
    response = await fetch(`${API_URL}${path}`, withAuth(refreshed.accessToken));
  }

  return response;
}

export async function apiFetchMyReports(): Promise<Report[]> {
  try {
    const response = await authorizedFetch('/reports/mine');
    if (!response.ok) return [];
    const body = (await response.json()) as { reports: Report[] };
    return body.reports;
  } catch {
    return [];
  }
}

export async function apiFetchStationReports(station: string): Promise<Report[]> {
  try {
    const response = await authorizedFetch(`/reports/station/${encodeURIComponent(station)}`);
    if (!response.ok) return [];
    const body = (await response.json()) as { reports: Report[] };
    return body.reports;
  } catch {
    return [];
  }
}

export async function apiFetchStationSafety(): Promise<Record<string, SafetyScore>> {
  try {
    const response = await authorizedFetch('/stations/safety');
    if (!response.ok) return {};
    const body = (await response.json()) as { scores: Record<string, SafetyScore> };
    return body.scores;
  } catch {
    return {};
  }
}

export async function apiFetchStationExits(lat: number, lon: number): Promise<StationExit[]> {
  try {
    const query = new URLSearchParams({ lat: String(lat), lon: String(lon) });
    const response = await authorizedFetch(`/stations/exits?${query}`);
    if (!response.ok) return [];
    const body = (await response.json()) as { exits: StationExit[] };
    return body.exits;
  } catch {
    return [];
  }
}

export async function apiFetchReport(id: string): Promise<Report | null> {
  try {
    const response = await authorizedFetch(`/reports/${encodeURIComponent(id)}`);
    if (!response.ok) return null;
    const body = (await response.json()) as { report: Report };
    return body.report;
  } catch {
    return null;
  }
}

export async function apiFetchReportUpdates(id: string): Promise<ReportUpdate[]> {
  try {
    const response = await authorizedFetch(`/reports/${encodeURIComponent(id)}/updates`);
    if (!response.ok) return [];
    const body = (await response.json()) as { updates: ReportUpdate[] };
    return body.updates;
  } catch {
    return [];
  }
}

export async function apiFetchRecentReports(sinceIso: string): Promise<Report[]> {
  try {
    const query = new URLSearchParams({ since: sinceIso });
    const response = await authorizedFetch(`/reports/recent?${query}`);
    if (!response.ok) return [];
    const body = (await response.json()) as { reports: Report[] };
    return body.reports;
  } catch {
    return [];
  }
}

export async function apiFetchFeed(params: { limit?: number; before?: string }): Promise<Report[]> {
  try {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', String(params.limit));
    if (params.before) query.set('before', params.before);
    const response = await authorizedFetch(`/reports/feed?${query}`);
    if (!response.ok) return [];
    const body = (await response.json()) as { reports: Report[] };
    return body.reports;
  } catch {
    return [];
  }
}

export interface LiveTrain {
  id: string;
  line: string;
  product: 'suburban' | 'subway';
  lat: number;
  lon: number;
  direction: string | null;
}

export async function apiFetchLiveTrains(bounds: MapBounds): Promise<LiveTrain[]> {
  try {
    const query = new URLSearchParams({
      north: String(bounds.north),
      west: String(bounds.west),
      south: String(bounds.south),
      east: String(bounds.east),
    });
    const response = await fetch(`${API_URL}/trains/live?${query}`);
    if (!response.ok) return [];
    const body = (await response.json()) as { trains: LiveTrain[] };
    return body.trains;
  } catch {
    return [];
  }
}

export async function apiCreateReport(input: {
  category: ReportCategory;
  station: string;
  description: string;
  additionalDetails?: string;
  severity: Severity;
}): Promise<{ report: Report | null; error: string | null }> {
  try {
    const response = await authorizedFetch('/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const body = (await response.json()) as { report: Report | null; error: string | null };
    if (!response.ok || !body.report) {
      return { report: null, error: body.error ?? 'Something went wrong. Please try again.' };
    }
    return { report: body.report, error: null };
  } catch {
    return { report: null, error: 'Something went wrong. Please try again.' };
  }
}

export async function apiFetchContacts(): Promise<TrustedContact[]> {
  try {
    const response = await authorizedFetch('/contacts');
    if (!response.ok) return [];
    const body = (await response.json()) as { contacts: TrustedContact[] };
    return body.contacts;
  } catch {
    return [];
  }
}

export async function apiAddContact(input: { name: string; email: string }): Promise<{ contact: TrustedContact | null; error: string | null }> {
  try {
    const response = await authorizedFetch('/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const body = (await response.json()) as { contact: TrustedContact | null; error?: string };
    if (!response.ok || !body.contact) {
      return { contact: null, error: body.error ?? 'Something went wrong. Please try again.' };
    }
    return { contact: body.contact, error: null };
  } catch {
    return { contact: null, error: 'Something went wrong. Please try again.' };
  }
}

export async function apiDeleteContact(id: string): Promise<boolean> {
  try {
    const response = await authorizedFetch(`/contacts/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return response.ok;
  } catch {
    return false;
  }
}

export async function apiFetchActiveCompanionSession(): Promise<CompanionSession | null> {
  try {
    const response = await authorizedFetch('/companion/active');
    if (!response.ok) return null;
    const body = (await response.json()) as { session: CompanionSession | null };
    return body.session;
  } catch {
    return null;
  }
}

export async function apiStartCompanionSession(input: {
  destinationLabel?: string;
  durationMinutes: number;
}): Promise<{ session: CompanionSession | null; error: string | null }> {
  try {
    const response = await authorizedFetch('/companion/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const body = (await response.json()) as { session: CompanionSession | null; error?: string };
    if (!response.ok || !body.session) {
      return { session: null, error: body.error ?? 'Something went wrong. Please try again.' };
    }
    return { session: body.session, error: null };
  } catch {
    return { session: null, error: 'Something went wrong. Please try again.' };
  }
}

export async function apiCheckInCompanionSession(id: string): Promise<CompanionSession | null> {
  try {
    const response = await authorizedFetch(`/companion/sessions/${encodeURIComponent(id)}/checkin`, { method: 'POST' });
    if (!response.ok) return null;
    const body = (await response.json()) as { session: CompanionSession };
    return body.session;
  } catch {
    return null;
  }
}

export async function apiExtendCompanionSession(id: string, additionalMinutes: number): Promise<CompanionSession | null> {
  try {
    const response = await authorizedFetch(`/companion/sessions/${encodeURIComponent(id)}/extend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ additionalMinutes }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { session: CompanionSession };
    return body.session;
  } catch {
    return null;
  }
}

export async function apiSendCompanionHeartbeat(id: string, coords: { lat: number; lon: number }): Promise<void> {
  try {
    await authorizedFetch(`/companion/sessions/${encodeURIComponent(id)}/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(coords),
    });
  } catch {
    // Best-effort — a missed heartbeat just means a slightly stale last-known location.
  }
}

export async function apiTriggerCompanionSOS(id: string, coords: { lat: number; lon: number } | null): Promise<boolean> {
  try {
    const response = await authorizedFetch(`/companion/sessions/${encodeURIComponent(id)}/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(coords ?? { lat: null, lon: null }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
