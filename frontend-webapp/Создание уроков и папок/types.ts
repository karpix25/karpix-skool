
export type LessonType = 'FREE' | 'LVL2' | 'DRIP' | 'LVL5' | 'STANDARD';

export interface Lesson {
  id: string;
  title: string;
  type: LessonType;
  icon: string;
  isGhost?: boolean;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
  isActive?: boolean;
}

export enum NavigationTab {
  STATS = 'stats',
  STUDENTS = 'students',
  ADD = 'add',
  COURSES = 'courses',
  SETTINGS = 'settings'
}
