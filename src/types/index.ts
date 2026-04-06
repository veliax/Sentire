export type RiskLevel = 'low' | 'medium' | 'high';

export interface TimelineEvent {
  timestamp: Date;
  riskLevel: RiskLevel;
  description: string;
  imageUrl?: string;
}

export interface VideoEvent {
  id: string;
  title: string;
  location: string;
  riskLevel: RiskLevel;
  timestamp: Date;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  reviewed: boolean;
  timeline?: TimelineEvent[];
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'admin' | 'user';
  joinedDate: Date;
}

export interface Report {
  eventId: string;
  location: string;
  riskLevel: RiskLevel;
  date: Date;
  description: string;
}
