export interface StudentProfile {
  name: string;
  grade: number;
  subjects: string[];
  region: string;
  preparation_level: string;
  prefer_online: boolean;
  goals: string;
}

export interface OlympiadStage {
  name: string;
  month: number;
  day: number;
  desc: string;
}

export interface Olympiad {
  id: string;
  name: string;
  short_name: string;
  organizer: string;
  source: string;
  subjects: string[];
  tags: string[];
  grades: number[];
  level: number;
  type: string;
  stages: OlympiadStage[];
  difficulty: string;
  preparation_time_months: number;
  regions: string[];
  online: boolean;
  prize: string;
  url: string;
  description: string;
  recommendation_score?: number;
  match_reasons?: string[];
}

export interface CalendarEvent {
  olympiad_id: string;
  olympiad_name: string;
  stage_name: string;
  month: number;
  day: number;
  year: number;
  date_str: string;
  desc: string;
  priority: 'high' | 'medium' | 'low';
  recommendation_score: number;
  type: string;
}

export interface RecommendResponse {
  profile: StudentProfile;
  recommendations: Olympiad[];
  calendar: CalendarEvent[];
  total_found: number;
}

export interface MetaData {
  subjects: string[];
  regions: string[];
  preparation_levels: string[];
  grades: number[];
}
