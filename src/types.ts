export type ReportCategory =
  | 'foundItem'
  | 'lostProperty'
  | 'delay'
  | 'theft'
  | 'suspiciousActivity'
  | 'harassment'
  | 'medical'
  | 'damage'
  | 'fight'
  | 'aggressivePerson'
  | 'smoke'
  | 'brokenDoor'
  | 'abandonedObject'
  | 'other';

export type Severity = 'low' | 'medium' | 'high';

export type ReportStatus = 'submitted' | 'received' | 'underReview' | 'resolved';

export type LocationMethod = 'current' | 'manual';

export interface ReportDraft {
  category?: ReportCategory;
  locationMethod?: LocationMethod;
  station?: string;
  description?: string;
  additionalDetails?: string;
  severity?: Severity;
}

export interface Report {
  id: string;
  category: ReportCategory;
  station: string;
  description: string;
  additionalDetails?: string;
  severity: Severity;
  status: ReportStatus;
  createdAt: string;
}

export interface ReportUpdate {
  id: string;
  reportId: string;
  status: ReportStatus;
  message: string | null;
  createdAt: string;
}

export type SafetyBand = 'green' | 'yellow' | 'red';

export interface SafetyScore {
  score: number;
  band: SafetyBand;
}

export interface StationExit {
  ref: string;
  streets: string[];
  lat: number;
  lon: number;
  nearPolice: boolean;
}

export interface NaviUser {
  id: string;
  name: string;
  email: string;
}

export type Screen =
  | 'welcome'
  | 'signup'
  | 'login'
  | 'home'
  | 'feed'
  | 'reportCategory'
  | 'location'
  | 'reportDetails'
  | 'severity'
  | 'highSeverityWarning'
  | 'reportReview'
  | 'submissionSuccess'
  | 'getHelp'
  | 'radar'
  | 'myReports'
  | 'reportDetail'
  | 'profile'
  | 'forgotPassword'
  | 'resetPassword'
  | 'contacts'
  | 'companionSetup'
  | 'companionActive';

export interface TrustedContact {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export type CompanionStatus = 'active' | 'checked_in' | 'alerted' | 'cancelled';

export interface CompanionSession {
  id: string;
  destinationLabel: string | null;
  startedAt: string;
  expiresAt: string;
  status: CompanionStatus;
  lastLat: number | null;
  lastLon: number | null;
  lastLocationAt: string | null;
}
