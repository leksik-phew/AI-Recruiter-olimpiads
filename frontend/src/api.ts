import axios from 'axios';
import type { StudentProfile, RecommendResponse, MetaData } from './types';

const BASE = import.meta.env.VITE_API_URL ?? '';
const api = axios.create({ baseURL: `${BASE}/api` });

export const getMeta = (): Promise<MetaData> =>
  api.get('/meta').then(r => r.data);

export const getRecommendations = (profile: StudentProfile): Promise<RecommendResponse> =>
  api.post('/recommend', profile).then(r => r.data);

export const getJustification = (profile: StudentProfile, olympiad_id: string): Promise<string> =>
  api.post('/justify', { profile, olympiad_id }).then(r => r.data.justification);
