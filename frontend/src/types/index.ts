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
  end_month?: number | null;
  end_day?: number | null;
  desc: string;
}

export interface Olympiad {
  id: string;
  name: string;
  short_name: string;
  organizer?: string | null;
  source?: string | null;
  subjects: string[];
  tags: string[];
  grades: number[];
  level?: number | null;
  type: string;
  stages: OlympiadStage[];
  difficulty?: string | null;
  preparation_time_months?: number | null;
  regions: string[];
  online?: boolean | null;
  prize?: string | null;
  url: string;
  description?: string | null;
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
  end_month?: number | null;
  end_day?: number | null;
  end_year?: number | null;
  end_date_str?: string | null;
  desc: string;
  priority: 'high' | 'medium' | 'low';
  recommendation_score: number;
  type: string;
  level?: number | null;
  subjects?: string[];
}

export interface FilterBadge {
  label: string;
  icon: string;
  reason?: string;
}

export interface AppliedFilters {
  grade: number;
  subjects: string[];
  allowed_types: string[] | null;
  prefer_online: boolean;
  goal: string;
  badges: FilterBadge[];
}

export interface RecommendResponse {
  profile: StudentProfile;
  recommendations: Olympiad[];
  calendar: CalendarEvent[];
  total_found: number;
  applied_filters?: AppliedFilters;
}

export interface MetaData {
  subjects: string[];
  regions: string[];
  preparation_levels: string[];
  grades: number[];
}
