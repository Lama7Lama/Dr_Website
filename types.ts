
export enum UserRole {
  DOCTOR = 'DOCTOR',
  PATIENT = 'PATIENT',
  ADMIN = 'ADMIN'
}

export enum DRSeverity {
  NONE = 0,
  MILD = 1,
  MODERATE = 2,
  SEVERE = 3,
  PROLIFERATIVE = 4
}

export type EyeSide = 'left' | 'right';
export type SeverityLabel = 'No DR' | 'Mild' | 'Moderate' | 'Severe' | 'Proliferative';
export type ReportStatus = 'draft' | 'published';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  status: 'Active' | 'Disabled';
  registrationDate: string;
  firebaseUid?: string;
  consentAccepted?: boolean;
  assignedDoctorId?: string;
}

export interface PatientRecord {
  id: string;
  date: string;
  doctorName: string;
  severity: DRSeverity;
  notes: string;
  clinicalNotes?: string;
  clinic: string;
  patientId?: string;
  reportId?: string;
  confidence?: number;
  imageUrl?: string;
  gradcamUrl?: string;
  recommendations?: string[];
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  type: 'Checkup' | 'Follow-up' | 'Emergency' | 'Screening';
  status: 'Upcoming' | 'Completed' | 'Cancelled';
  notes?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  subject: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  messageGroupId?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  type?: string;
  senderId?: string;
  senderName?: string;
  receiverId?: string;
  messageGroupId?: string;
  relatedPatientId?: string;
}

export interface AIAnalysisResult {
  severity: DRSeverity;
  confidence: number;
  heatmapUrl: string;
  originalImageUrl: string;
  timestamp: string;
  advice: string;
}

export interface BackendDiagnosisResponse {
  report_id: string;
  patient_id: string;
  eye_side: EyeSide;
  ai_analysis: {
    severity: SeverityLabel;
    confidence: number;
    confidence_breakdown: Record<string, number>;
    model_name: string;
    model_version: string;
    inference_time_ms: number;
    heatmap_url: string | null;
    heatmap_signed_url?: string | null;
  };
  preprocessing: {
    original_width: number;
    original_height: number;
    target_width: number;
    target_height: number;
    mode: 'letterbox' | 'center_crop';
    normalized: '0_1' | 'imagenet';
    original_image_url: string;
    preprocessed_image_url: string;
    original_image_signed_url?: string;
    preprocessed_image_signed_url?: string;
  };
  message: string;
}

export interface DoctorAnalysisSession {
  localPreviewUrl: string;
  response: BackendDiagnosisResponse;
  medicalReport?: string;
  clinicalNotes?: string;
  recommendations?: string[];
  patientName?: string;
  doctorName?: string;
}

export interface GeneratedReportResponse {
  medical_report: string;
  recommendations: string[];
}

export interface FirestoreReport {
  reportId: string;
  patientId: string;
  doctorId: string;
  severity: SeverityLabel;
  confidence: number;
  medicalReport: string;
  clinicalNotes?: string;
  recommendations: string[];
  imageUrl: string;
  gradcamUrl: string;
  date: string;
  createdAt: string;
  status?: ReportStatus;
  updatedAt?: string;
  publishedAt?: string;
  findings?: string[];
}

export interface FirestoreAppointment {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  type: Appointment['type'];
  status: Appointment['status'];
  notes?: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: string;
  recordId?: string;
  ip?: string;
  userAgent?: string;
}
