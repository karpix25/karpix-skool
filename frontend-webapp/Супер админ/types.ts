
export enum Tab {
  PULSE = 'pulse',
  SCHOOLS = 'schools',
  CONTENT = 'content',
  ACCESS = 'access',
  NEXUS = 'nexus'
}

export interface KPIStats {
  activeLearners: number;
  lessonsTotal: string;
  botUptime: string;
  authorRequests: number;
}

export interface School {
  id: string;
  name: string;
  initials: string;
  students: number;
  status: 'Admin Active' | 'Not Admin' | 'Initializing';
  botStatus: 'Online' | 'Offline' | 'Pending Sync' | 'Connection Lost';
  color: string;
}

export interface Course {
  id: string;
  title: string;
  author: string;
  status: 'Published' | 'Draft';
  isVerified: boolean;
  isBanned: boolean;
  isShadowBanned: boolean;
}

export interface AuthorRequest {
  id: string;
  name: string;
  handle: string;
  status: 'online' | 'away' | 'offline';
  avatar: string;
}

export interface FeedItem {
  id: string;
  time: string;
  type: 'SUCCESS' | 'MILESTONE' | 'SYSTEM' | 'ALERT';
  message: string;
  meta?: string;
}
