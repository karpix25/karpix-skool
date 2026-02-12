
export enum UnlockType {
  OPEN = 'Open',
  LEVEL = 'Level',
  PAID = 'Paid',
  TIME = 'Time'
}

export interface CourseData {
  title: string;
  description: string;
  thumbnail: string | null;
  unlockType: UnlockType;
  unlockValue: string;
  isPublished: boolean;
}
