
export enum CourseStatus {
  PUBLISHED = 'Published',
  DRAFT = 'Draft',
  ARCHIVED = 'Archived'
}

export interface Course {
  id: string;
  title: string;
  description: string;
  modules: number;
  status: CourseStatus;
  imageUrl: string;
}

export type FilterType = 'All' | CourseStatus;
