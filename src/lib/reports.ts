import {
  apiCreateReport,
  apiFetchFeed,
  apiFetchMyReports,
  apiFetchRecentReports,
  apiFetchReport,
  apiFetchReportUpdates,
  apiFetchStationReports,
} from './api';
import type { Report, ReportCategory, ReportUpdate, Severity } from '../types';

export async function insertReport(input: {
  category: ReportCategory;
  station: string;
  description: string;
  additionalDetails?: string;
  severity: Severity;
}): Promise<{ report: Report | null; error: string | null }> {
  return apiCreateReport(input);
}

export async function fetchReportsForStation(station: string): Promise<Report[]> {
  return apiFetchStationReports(station);
}

export async function fetchMyReports(): Promise<Report[]> {
  return apiFetchMyReports();
}

export async function fetchReport(id: string): Promise<Report | null> {
  return apiFetchReport(id);
}

export async function fetchReportUpdates(id: string): Promise<ReportUpdate[]> {
  return apiFetchReportUpdates(id);
}

export async function fetchRecentReports(sinceIso: string): Promise<Report[]> {
  return apiFetchRecentReports(sinceIso);
}

export async function fetchFeed(params: { limit?: number; before?: string } = {}): Promise<Report[]> {
  return apiFetchFeed(params);
}
