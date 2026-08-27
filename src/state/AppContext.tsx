import type { User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchMyReports, insertReport } from '../lib/reports';
import { supabase } from '../lib/supabase';
import type { NaviUser, Report, ReportDraft, Screen } from '../types';

interface AuthResult {
  error: string | null;
  status: 'signedIn' | 'checkEmail' | 'error';
}

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
  logOut: () => void;

  draft: ReportDraft;
  updateDraft: (patch: Partial<ReportDraft>) => void;
  resetDraft: () => void;

  reports: Report[];
  submitReport: () => Promise<SubmitResult>;

  lastReportId: string | null;
}

const AppContext = createContext<AppContextValue | null>(null);

function mapSupabaseUser(user: User): NaviUser {
  const fullName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : undefined;
  return {
    id: user.id,
    email: user.email ?? '',
    name: fullName || user.email?.split('@')[0] || 'there',
  };
}

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('already registered') || lower.includes('already exists')) {
    return 'That email’s already registered. Try logging in instead.';
  }
  if (lower.includes('password')) {
    return 'Your password needs at least 8 characters and a number.';
  }
  if (lower.includes('invalid login credentials') || lower.includes('invalid email or password')) {
    return 'Email or password doesn’t match. Try again.';
  }
  return 'Something went wrong on our end. Please try again.';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<Screen[]>(['welcome']);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<NaviUser | null>(null);
  const [draft, setDraft] = useState<ReportDraft>({});
  const [reports, setReports] = useState<Report[]>([]);
  const [lastReportId, setLastReportId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser(mapSupabaseUser(data.session.user));
        setHistory(['home']);
      }
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setDraft({});
        setReports([]);
        setHistory(['welcome']);
      } else if (session?.user) {
        setUser(mapSupabaseUser(session.user));
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchMyReports(user.id).then((fetched) => {
      if (!cancelled) setReports(fetched);
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (error) {
      return { error: mapAuthError(error.message), status: 'error' };
    }

    if (data.session?.user) {
      setUser(mapSupabaseUser(data.session.user));
      setHistory(['home']);
      return { error: null, status: 'signedIn' };
    }

    return { error: null, status: 'checkEmail' };
  };

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { error: mapAuthError(error.message), status: 'error' };
    }

    setUser(mapSupabaseUser(data.user));
    setHistory(['home']);
    return { error: null, status: 'signedIn' };
  };

  const logOut = () => {
    setUser(null);
    setDraft({});
    setReports([]);
    setHistory(['welcome']);
    void supabase.auth.signOut();
  };

  const updateDraft = (patch: Partial<ReportDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const resetDraft = () => setDraft({});

  const submitReport = async (): Promise<SubmitResult> => {
    if (!user) {
      return { report: null, error: 'You need to be logged in to submit a report.' };
    }

    const { report, error } = await insertReport({
      userId: user.id,
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
    setHistory(['home', 'submissionSuccess']);
    return { report, error: null };
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
      logOut,
      draft,
      updateDraft,
      resetDraft,
      reports,
      submitReport,
      lastReportId,
    }),
    [screen, history.length, authLoading, user, draft, reports, lastReportId],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
