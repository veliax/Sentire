import { createContext, useContext, useState, ReactNode } from 'react';
import { VideoEvent, User, Report } from '../types';

interface Statistics {
  totalEvents: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  reviewedToday: number;
  pendingReview: number;
}

interface AppContextType {
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
  events: VideoEvent[];
  getEventById: (id: string) => VideoEvent | undefined;
  markReviewed: (eventId: string) => void;
  deleteVideo: (videoId: string) => void;
  users: User[];
  deleteUser: (userId: string) => void;
  reports: Report[];
  statistics: Statistics;
}

const AppContext = createContext<AppContextType | null>(null);

const emptyStatistics: Statistics = {
  totalEvents: 0,
  highRisk: 0,
  mediumRisk: 0,
  lowRisk: 0,
  reviewedToday: 0,
  pendingReview: 0,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [events, setEvents] = useState<VideoEvent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reports] = useState<Report[]>([]);
  const [statistics] = useState<Statistics>(emptyStatistics);

  const login = () => setIsLoggedIn(true);
  const logout = () => setIsLoggedIn(false);

  const getEventById = (id: string) => events.find(e => e.id === id);

  const markReviewed = (eventId: string) => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, reviewed: true } : e));
  };

  const deleteVideo = (videoId: string) => {
    setEvents(prev => prev.filter(e => e.id !== videoId));
  };

  const deleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  return (
    <AppContext.Provider value={{
      isLoggedIn, login, logout,
      events, getEventById, markReviewed, deleteVideo,
      users, deleteUser,
      reports, statistics,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
