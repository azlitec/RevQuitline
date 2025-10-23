 // app/types/index.ts
export type ProviderApprovalStatus = 'pending' | 'approved' | 'rejected';
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
  providerApprovalStatus?: ProviderApprovalStatus;
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
// ===== Prescription domain types =====

export enum PrescriptionStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export interface PrescriptionCreateDTO {
  patientId: string;
  appointmentId?: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  refills?: number;
  instructions: string;
  status?: PrescriptionStatus;
  prescribedDate?: string; // ISO datetime
  startDate: string;       // ISO datetime
  endDate?: string;        // ISO datetime
  pharmacy?: string;
  pharmacyPhone?: string;
  notes?: string;
}

export interface PrescriptionUpdateDTO {
  id: string;
  appointmentId?: string;
  medicationName?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity?: number;
  refills?: number;
  instructions?: string;
  status?: PrescriptionStatus;
  startDate?: string; // ISO datetime
  endDate?: string;   // ISO datetime
  pharmacy?: string;
  pharmacyPhone?: string;
  notes?: string;
}

export interface PrescriptionResponseDTO {
  id: string;
  patientId: string;
  providerId: string;
  appointmentId?: string | null;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  refills: number;
  instructions: string;
  status: PrescriptionStatus;
  prescribedDate: string; // ISO datetime
  startDate: string;      // ISO datetime
  endDate?: string | null;
  pharmacy?: string | null;
  pharmacyPhone?: string | null;
  notes?: string | null;
  patient?: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
  provider?: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
  appointment?: Pick<Appointment, 'id' | 'date' | 'title'> | null;
}