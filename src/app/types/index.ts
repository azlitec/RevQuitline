// app/types/index.ts
export interface User {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  image?: string | null;
  phone?: string | null;
  dateOfBirth?: Date | null;
  gender?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  medicalHistory?: string | null;
  currentMedications?: string | null;
  allergies?: string | null;
  smokingStatus?: string | null;
  smokingHistory?: string | null;
  quitAttempts?: number | null;
  quitDate?: Date | null;
  isAdmin: boolean;
  isProvider: boolean;
  isClerk: boolean;
  licenseNumber?: string | null;
  specialty?: string | null;
  yearsOfExperience?: number | null;
  availability?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Appointment {
  id: string;
  title: string;
  description?: string | null;
  date: Date;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  type: 'consultation' | 'follow-up' | 'emergency';
  meetingLink?: string | null;
  notes?: string | null;
  providerId: string;
  patientId: string;
  provider?: User;
  patient?: User;
  createdAt?: Date;
  updatedAt?: Date;
}

// Simple dashboard stats for admin/provider
export interface DashboardStats {
  userCount: number;
  appointmentCount: number;
  upcomingAppointments: number;
  completedAppointments: number;
  revenue?: number;
}