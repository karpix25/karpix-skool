
export interface ActivityItem {
  id: string;
  type: 'join' | 'level' | 'payment' | 'completion';
  user: {
    name: string;
    avatar: string;
    role: string;
  };
  details: string;
  timestamp: string;
  isUnread?: boolean;
  value?: string;
}

export interface ChartDataPoint {
  time: string;
  value: number;
}

export enum TimeFilter {
  TODAY = 'Today',
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  ALL = 'All'
}
