export type ReportCategory =
  | 'foundItem'
  | 'lostProperty'
  | 'delay'
  | 'theft'
  | 'suspiciousActivity'
  | 'harassment'
  | 'medical'
  | 'damage'
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
  | 'reportCategory'
  | 'location'
  | 'reportDetails'
  | 'severity'
  | 'highSeverityWarning'
  | 'reportReview'
  | 'submissionSuccess'
  | 'getHelp'
  | 'myReports'
  | 'profile';
