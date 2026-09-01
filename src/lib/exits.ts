import { apiFetchStationExits } from './api';
import type { StationExit } from '../types';

export async function fetchStationExits(lat: number, lon: number): Promise<StationExit[]> {
  return apiFetchStationExits(lat, lon);
}
