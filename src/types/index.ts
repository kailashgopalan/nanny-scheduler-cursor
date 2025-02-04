export type UserRole = 'employer' | 'nanny';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  hourlyRate?: number; // Optional for employers, required for nannies
  linkedNannies: string[];  // Make these non-optional
  linkedEmployers: string[];
  pendingNannies: string[];  // Add these new fields
  pendingEmployers: string[];
  notifications?: Notification[];
}

export interface ScheduleRequest {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: 'pending' | 'approved' | 'rejected';
  employerId: string;
  nannyId: string;
  hourlyRate?: number;
  createdAt: Date;
}

export interface Payment {
  id: string;
  amount: number;
  date: Date;
  status: 'pending' | 'approved' | 'rejected' | 'confirmed';
  employerId: string;
  nannyId: string;
  method: 'cash' | 'bank_transfer';
  note?: string;
  employerName?: string;
  nannyName?: string;
}

export interface Notification {
  id: string;
  type: 'link_request' | 'link_accepted' | 'link_rejected';
  fromUserId: string;
  toUserId: string;
  status: 'unread' | 'read';
  createdAt: Date;
  message: string;
} 