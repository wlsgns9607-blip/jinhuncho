export interface UserProfile {
  uid: string;
  email?: string;
  displayName: string;
  role: 'student' | 'teacher';
  className?: string; // For students
  studentNumber?: string; // For students
  badges: string[];
  createdAt: any;
}

export interface ObservationLog {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  studentNumber: string;
  title: string;
  content: string;
  imageUrl?: string;
  aiFeedback?: string;
  createdAt: any;
}

export interface ClassSettings {
  className: string;
  teacherId: string;
  enabledBadges: string[];
}

export type AppTab = 'logs' | 'encyclopedia' | 'badges' | 'dashboard';
