import { supabase } from './supabase';
import type { Report, ReportCategory, Severity, ReportStatus } from '../types';

interface ReportRow {
  ref: string;
  created_at: string;
  category: string;
  station_name: string;
  description: string;
  additional_details: string | null;
  severity: string;
  status: string;
}

function generateRef(): string {
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `NV-${random}`;
}

function rowToReport(row: ReportRow): Report {
  return {
    id: row.ref,
    category: row.category as ReportCategory,
    station: row.station_name,
    description: row.description,
    additionalDetails: row.additional_details ?? undefined,
    severity: row.severity as Severity,
    status: row.status as ReportStatus,
    createdAt: row.created_at,
  };
}

export async function insertReport(input: {
  userId: string;
  category: ReportCategory;
  station: string;
  description: string;
  additionalDetails?: string;
  severity: Severity;
}): Promise<{ report: Report | null; error: string | null }> {
  const { data, error } = await supabase
    .from('reports')
    .insert({
      ref: generateRef(),
      user_id: input.userId,
      category: input.category,
      station_name: input.station,
      description: input.description,
      additional_details: input.additionalDetails ?? null,
      severity: input.severity,
    })
    .select()
    .single();

  if (error || !data) {
    return { report: null, error: error?.message ?? 'Something went wrong. Please try again.' };
  }
  return { report: rowToReport(data as ReportRow), error: null };
}

export async function fetchReportsForStation(station: string): Promise<Report[]> {
  // No limit here: the station cloud needs an accurate total count and a
  // real per-category breakdown, not just a preview of the most recent few.
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('station_name', station)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as ReportRow[]).map(rowToReport);
}

export async function fetchMyReports(userId: string): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as ReportRow[]).map(rowToReport);
}
