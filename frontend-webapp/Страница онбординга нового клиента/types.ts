
export interface SchoolData {
  name: string;
  teachingGoal: string;
}

export interface RoadmapStep {
  title: string;
  description: string;
  tasks: string[];
}

export interface AIResponse {
  curriculum: RoadmapStep[];
  successMessage: string;
}

export enum AppState {
  FORM = 'FORM',
  LOADING = 'LOADING',
  RESULT = 'RESULT'
}
