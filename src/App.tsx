import { useEffect, useRef, useState } from 'react';
import BottomNav from './components/BottomNav';
import CompanionBanner from './components/CompanionBanner';
import PhoneFrame from './components/PhoneFrame';
import PixelSwap from './components/PixelSwap';
import { copy } from './content/copy';
import CompanionActiveScreen from './screens/CompanionActiveScreen';
import CompanionSetupScreen from './screens/CompanionSetupScreen';
import ContactsScreen from './screens/ContactsScreen';
import FeedScreen from './screens/FeedScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import GetHelpScreen from './screens/GetHelpScreen';
import HighSeverityWarningScreen from './screens/HighSeverityWarningScreen';
import HomeScreen from './screens/HomeScreen';
import LocationScreen from './screens/LocationScreen';
import LoginScreen from './screens/LoginScreen';
import MyReportsScreen from './screens/MyReportsScreen';
import ProfileScreen from './screens/ProfileScreen';
import RadarScreen from './screens/RadarScreen';
import ReportCategoryScreen from './screens/ReportCategoryScreen';
import ReportDetailScreen from './screens/ReportDetailScreen';
import ReportDetailsScreen from './screens/ReportDetailsScreen';
import ReportReviewScreen from './screens/ReportReviewScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import SeverityScreen from './screens/SeverityScreen';
import SignUpScreen from './screens/SignUpScreen';
import SubmissionSuccessScreen from './screens/SubmissionSuccessScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import { AppProvider, useApp } from './state/AppContext';
import { ThemeProvider } from './state/ThemeContext';
import type { Screen } from './types';
import './App.css';

const TAB_SCREENS = new Set<Screen>(['feed', 'home', 'myReports', 'profile']);

const screens: Record<Screen, () => React.ReactElement> = {
  welcome: WelcomeScreen,
  signup: SignUpScreen,
  login: LoginScreen,
  home: HomeScreen,
  feed: FeedScreen,
  reportCategory: ReportCategoryScreen,
  location: LocationScreen,
  reportDetails: ReportDetailsScreen,
  severity: SeverityScreen,
  highSeverityWarning: HighSeverityWarningScreen,
  reportReview: ReportReviewScreen,
  submissionSuccess: SubmissionSuccessScreen,
  getHelp: GetHelpScreen,
  radar: RadarScreen,
  myReports: MyReportsScreen,
  reportDetail: ReportDetailScreen,
  profile: ProfileScreen,
  forgotPassword: ForgotPasswordScreen,
  resetPassword: ResetPasswordScreen,
  contacts: ContactsScreen,
  companionSetup: CompanionSetupScreen,
  companionActive: CompanionActiveScreen,
};

function LoadingScreen() {
  return (
    <div className="screen">
      <div className="screen-body loading-body">
        <p className="subtext">{copy.microcopy.loading}</p>
      </div>
    </div>
  );
}

function CurrentScreen() {
  const { screen, authLoading } = useApp();
  const readyRef = useRef(false);
  const prevScreenRef = useRef<Screen>(screen);
  const [pair, setPair] = useState<{ from: Screen; to: Screen } | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!readyRef.current) {
      readyRef.current = true;
      prevScreenRef.current = screen;
      return;
    }

    if (prevScreenRef.current !== screen) {
      // The pixel-dissolve effect is a nice touch for the welcome moment, but
      // distracting when it fires on every step of a multi-screen flow (report
      // wizard, settings, etc.) — so it's reserved for screens that involve
      // 'welcome' specifically.
      const involvesWelcome = prevScreenRef.current === 'welcome' || screen === 'welcome';
      if (involvesWelcome) {
        setPair({ from: prevScreenRef.current, to: screen });
        setActive(false);
      }
      prevScreenRef.current = screen;
    }
  }, [screen, authLoading]);

  useEffect(() => {
    if (!pair) return;
    const raf = requestAnimationFrame(() => setActive(true));
    return () => cancelAnimationFrame(raf);
  }, [pair]);

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (pair) {
    const FromComponent = screens[pair.from];
    const ToComponent = screens[pair.to];
    return (
      <PixelSwap
        key={`${pair.from}->${pair.to}`}
        firstContent={<FromComponent />}
        secondContent={<ToComponent />}
        trigger="manual"
        active={active}
        pixelSize={30}
        gap={2}
        pixelRadius={0}
        pixelScale={0.4}
        pattern="random"
        duration={600}
        pixelDuration={220}
        aspectRatio="auto"
        className="screen-pixel-swap"
        style={{ height: '100%' }}
        onComplete={() => setPair(null)}
      />
    );
  }

  const ScreenComponent = screens[screen];
  return <ScreenComponent />;
}

function AppShell() {
  const { screen, companionSession, navigate } = useApp();
  return (
    <div className="app-shell">
      <div className="app-shell-body">
        <CurrentScreen />
      </div>
      {companionSession && screen !== 'companionActive' && (
        <CompanionBanner session={companionSession} onOpen={() => navigate('companionActive')} />
      )}
      {TAB_SCREENS.has(screen) && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <PhoneFrame>
          <AppShell />
        </PhoneFrame>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
