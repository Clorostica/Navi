import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  apiForgotPassword,
  apiResetPassword,
  apiSignIn,
  apiSignInWithGoogleCode,
  apiSignUp,
  apiVerifyEmail,
  clearSession,
  googleLoginUrl,
  loadSession,
  restoreSession,
  type AuthResult,
  type SimpleResult,
} from '../lib/api';
import { checkIn, extend, fetchActiveSession, startSession, triggerSOS } from '../lib/companion';
import { fetchMyReports, insertReport } from '../lib/reports';
import type { CompanionSession, NaviUser, Report, ReportDraft, Screen } from '../types';

interface SubmitResult {
  report: Report | null;
  error: string | null;
}

interface AppContextValue {
  screen: Screen;
  navigate: (screen: Screen) => void;
  goBack: () => void;
  canGoBack: boolean;

  authLoading: boolean;
  user: NaviUser | null;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => void;
  googleAuthError: string | null;
  verifyEmailCode: (code: string) => Promise<AuthResult>;
  logOut: () => void;

  forgotPassword: (email: string) => Promise<SimpleResult>;
  resetPasswordWithToken: (newPassword: string) => Promise<SimpleResult>;

  draft: ReportDraft;
  updateDraft: (patch: Partial<ReportDraft>) => void;
  resetDraft: () => void;

  reports: Report[];
  submitReport: () => Promise<SubmitResult>;

  lastReportId: string | null;

  selectedReport: Report | null;
  viewReport: (report: Report) => void;

  companionSession: CompanionSession | null;
  startCompanion: (input: { destinationLabel?: string; durationMinutes: number }) => Promise<{ error: string | null }>;
  checkInSafely: () => Promise<void>;
  extendCompanion: () => Promise<void>;
  triggerCompanionSOS: (coords: { lat: number; lon: number } | null) => Promise<boolean>;
}

const AppContext = createContext<AppContextValue | null>(null);

function getResetTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('token');
}

function hasOAuthParamsInUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.has('code') || params.has('error');
}

function getOAuthErrorFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const hasError = new URLSearchParams(window.location.search).has('error');
  return hasError ? 'Google sign-in was cancelled or didn’t go through. Please try again.' : null;
}

function consumeOAuthParamsFromUrl(): { code: string | null; error: string | null } {
  if (typeof window === 'undefined') return { code: null, error: null };
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const error = params.get('error');
  if (code || error) {
    params.delete('code');
    params.delete('error');
    params.delete('error_description');
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }
  return { code, error };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [resetToken] = useState<string | null>(getResetTokenFromUrl);
  const [history, setHistory] = useState<Screen[]>(() => {
    if (getResetTokenFromUrl()) return ['resetPassword'];
    if (hasOAuthParamsInUrl()) return ['login'];
    return ['welcome'];
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<NaviUser | null>(null);
  const [draft, setDraft] = useState<ReportDraft>({});
  const [reports, setReports] = useState<Report[]>([]);
  const [lastReportId, setLastReportId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [companionSession, setCompanionSession] = useState<CompanionSession | null>(null);
  const [pendingAuthToken, setPendingAuthToken] = useState<string | null>(null);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(getOAuthErrorFromUrl);

  useEffect(() => {
    const { code } = consumeOAuthParamsFromUrl();

    if (code) {
      apiSignInWithGoogleCode(code).then((result) => {
        if (result.status === 'signedIn') {
          const session = loadSession();
          if (session) {
            setUser(session.user);
            setHistory(['feed']);
          }
        } else if (result.status === 'error') {
          setGoogleAuthError(result.error);
        }
        setAuthLoading(false);
      });
      return;
    }

    if (!loadSession()) {
      setAuthLoading(false);
      return;
    }

    restoreSession().then((restoredUser) => {
      if (restoredUser) {
        setUser(restoredUser);
        setHistory(['feed']);
      }
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchMyReports().then((fetched) => {
      if (!cancelled) setReports(fetched);
    });
    fetchActiveSession().then((session) => {
      if (!cancelled) setCompanionSession(session);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const screen = history[history.length - 1];

  const navigate = (next: Screen) => {
    setHistory((prev) => [...prev, next]);
  };

  const goBack = () => {
    setHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  };

  const signUp = async (name: string, email: string, password: string): Promise<AuthResult> => {
    const result = await apiSignUp(name, email, password);

    if (result.status === 'signedIn') {
      const session = loadSession();
      if (session) {
        setUser(session.user);
        setHistory(['feed']);
      }
    } else if (result.status === 'checkEmail' && result.pendingAuthenticationToken) {
      setPendingAuthToken(result.pendingAuthenticationToken);
    }

    return result;
  };

  const verifyEmailCode = async (code: string): Promise<AuthResult> => {
    if (!pendingAuthToken) {
      return { status: 'error', error: 'Something went wrong on our end. Please try again.' };
    }

    const result = await apiVerifyEmail(pendingAuthToken, code);

    if (result.status === 'signedIn') {
      const session = loadSession();
      if (session) {
        setPendingAuthToken(null);
        setUser(session.user);
        setHistory(['feed']);
      }
    }

    return result;
  };

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    const result = await apiSignIn(email, password);

    if (result.status === 'signedIn') {
      const session = loadSession();
      if (session) {
        setUser(session.user);
        setHistory(['feed']);
      }
    }

    return result;
  };

  const signInWithGoogle = () => {
    window.location.href = googleLoginUrl();
  };

  const forgotPassword = async (email: string): Promise<SimpleResult> => {
    return apiForgotPassword(email);
  };

  const resetPasswordWithToken = async (newPassword: string): Promise<SimpleResult> => {
    if (!resetToken) {
      return { status: 'error', error: 'Something went wrong on our end. Please try again.' };
    }
    return apiResetPassword(resetToken, newPassword);
  };

  const logOut = () => {
    setUser(null);
    setDraft({});
    setReports([]);
    setCompanionSession(null);
    setHistory(['welcome']);
    clearSession();
  };

  const updateDraft = (patch: Partial<ReportDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const resetDraft = () => setDraft({});

  const viewReport = (report: Report) => {
    setSelectedReport(report);
    navigate('reportDetail');
  };

  const submitReport = async (): Promise<SubmitResult> => {
    if (!user) {
      return { report: null, error: 'You need to be logged in to submit a report.' };
    }

    const { report, error } = await insertReport({
      category: draft.category ?? 'other',
      station: draft.station ?? 'Unknown station',
      description: draft.description ?? '',
      additionalDetails: draft.additionalDetails,
      severity: draft.severity ?? 'low',
    });

    if (error || !report) {
      return { report: null, error: error ?? 'Something went wrong. Please try again.' };
    }

    setReports((prev) => [report, ...prev]);
    setLastReportId(report.id);
    resetDraft();
    setHistory(['feed', 'submissionSuccess']);
    return { report, error: null };
  };

  const startCompanion = async (input: { destinationLabel?: string; durationMinutes: number }): Promise<{ error: string | null }> => {
    const { session, error } = await startSession(input);
    if (error || !session) {
      return { error: error ?? 'Something went wrong. Please try again.' };
    }
    setCompanionSession(session);
    navigate('companionActive');
    return { error: null };
  };

  const checkInSafely = async (): Promise<void> => {
    if (!companionSession) return;
    await checkIn(companionSession.id);
    setCompanionSession(null);
    setHistory(['home']);
  };

  const extendCompanion = async (): Promise<void> => {
    if (!companionSession) return;
    const updated = await extend(companionSession.id, 10);
    if (updated) setCompanionSession(updated);
  };

  const triggerCompanionSOS = async (coords: { lat: number; lon: number } | null): Promise<boolean> => {
    if (!companionSession) return false;
    return triggerSOS(companionSession.id, coords);
  };

  const value = useMemo<AppContextValue>(
    () => ({
      screen,
      navigate,
      goBack,
      canGoBack: history.length > 1,
      authLoading,
      user,
      signUp,
      signIn,
      signInWithGoogle,
      googleAuthError,
      verifyEmailCode,
      logOut,
      forgotPassword,
      resetPasswordWithToken,
      draft,
      updateDraft,
      resetDraft,
      reports,
      submitReport,
      lastReportId,
      selectedReport,
      viewReport,
      companionSession,
      startCompanion,
      checkInSafely,
      extendCompanion,
      triggerCompanionSOS,
    }),
    [screen, history.length, authLoading, user, draft, reports, lastReportId, selectedReport, pendingAuthToken, googleAuthError, companionSession],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
