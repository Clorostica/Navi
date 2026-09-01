import { apiFetchStationSafety } from './api';
import type { SafetyScore } from '../types';

export async function fetchStationSafety(): Promise<Record<string, SafetyScore>> {
  return apiFetchStationSafety();
}
