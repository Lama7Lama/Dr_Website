import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';

import {
  Appointment,
  AuditLogEntry,
  FirestoreAppointment,
  FirestoreReport,
  NotificationItem,
  User,
  UserRole
} from '../types';
import { decryptMedicalText, encryptMedicalText } from './crypto';
import { db, isFirebaseConfigured } from './firebase';

export interface UserScope {
  uid: string;
  role: UserRole;
  assignedDoctorId?: string;
}

export async function upsertUserProfile(user: {
  uid: string;
  name: string;
  email: string;
  role: 'doctor' | 'patient' | 'admin';
  consentAccepted?: boolean;
  assignedDoctorId?: string;
}) {
  if (!db || !isFirebaseConfigured) return;

  await setDoc(
    doc(db, 'users', user.uid),
    {
      firebaseUid: user.uid,
      name: user.name,
      email: user.email,
      role: user.role,
      status: 'Active',
      assignedDoctorId: user.assignedDoctorId || null,
      consentAccepted: Boolean(user.consentAccepted),
      createdAt: new Date().toISOString(),
      registrationDate: new Date().toISOString().slice(0, 10)
    },
    { merge: true }
  );
}

export async function getUserByUid(uid: string): Promise<User | null> {
  if (!db || !isFirebaseConfigured || !uid) return null;
  const snapshot = await getDoc(doc(db, 'users', uid));
  if (!snapshot.exists()) return null;
  return mapUser(snapshot.id, snapshot.data() as Record<string, unknown>);
}

export function subscribeUserProfile(uid: string, onData: (user: User) => void) {
  if (!db || !isFirebaseConfigured || !uid) return () => undefined;
  return onSnapshot(doc(db, 'users', uid), (snapshot) => {
    if (!snapshot.exists()) return;
    onData(mapUser(snapshot.id, snapshot.data() as Record<string, unknown>));
  });
}

export function subscribeUsers(scope: UserScope | null, onData: (users: User[]) => void) {
  if (!db || !isFirebaseConfigured || !scope) return () => undefined;

  const source =
    scope.role === UserRole.ADMIN
      ? collection(db, 'users')
      : scope.role === UserRole.DOCTOR
        ? query(collection(db, 'users'), where('assignedDoctorId', '==', scope.uid))
        : query(collection(db, 'users'), where('firebaseUid', '==', scope.assignedDoctorId || '__unassigned__'));

  return onSnapshot(source, (snapshot) => {
    const mapped = snapshot.docs.map((d) => mapUser(d.id, d.data() as Record<string, unknown>));
    if (scope.role === UserRole.DOCTOR) {
      onData(mapped.filter((item) => item.role === UserRole.PATIENT));
      return;
    }
    if (scope.role === UserRole.PATIENT) {
      onData(mapped.filter((item) => item.role === UserRole.DOCTOR));
      return;
    }
    onData(mapped);
  });
}

export function subscribeAppointments(scope: UserScope | null, onData: (appointments: Appointment[]) => void) {
  if (!db || !isFirebaseConfigured || !scope) return () => undefined;

  const source =
    scope.role === UserRole.DOCTOR
      ? query(collection(db, 'appointments'), where('doctorId', '==', scope.uid))
      : scope.role === UserRole.PATIENT
        ? query(collection(db, 'appointments'), where('patientId', '==', scope.uid))
        : collection(db, 'appointments');
  return onSnapshot(source, async (snapshot) => {
    const appointments = await Promise.all(
      snapshot.docs.map(async (d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          patientId: String(data.patientId || ''),
          patientName: String(data.patientName || 'Unknown'),
          doctorName: String(data.doctorName || 'Doctor'),
          date: String(data.date || ''),
          time: String(data.time || ''),
          type: (String(data.type || 'Checkup') as Appointment['type']),
          status: (String(data.status || 'Upcoming') as Appointment['status']),
          notes: await decryptMedicalText(String(data.notes || ''))
        };
      })
    );
    onData(sortAppointmentsDescending(appointments));
  });
}

export function subscribeReports(scope: UserScope | null, onData: (reports: FirestoreReport[]) => void) {
  if (!db || !isFirebaseConfigured || !scope) return () => undefined;

  const source =
    scope.role === UserRole.DOCTOR
      ? query(collection(db, 'reports'), where('doctorId', '==', scope.uid))
      : scope.role === UserRole.PATIENT
        ? query(collection(db, 'reports'), where('patientId', '==', scope.uid))
        : collection(db, 'reports');
  return onSnapshot(source, async (snapshot) => {
    const reports = await Promise.all(
      snapshot.docs.map(async (d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          reportId: String(data.reportId || d.id),
          patientId: String(data.patientId || ''),
          doctorId: String(data.doctorId || ''),
          severity: String(data.severity || 'No DR') as FirestoreReport['severity'],
          confidence: Number(data.confidence || 0),
          medicalReport: await decryptMedicalText(String(data.medicalReport || '')),
          clinicalNotes: await decryptMedicalText(String(data.clinicalNotes || '')),
          recommendations: Array.isArray(data.recommendations)
            ? data.recommendations.map((item) => String(item))
            : [],
          imageUrl: String(data.imageUrl || ''),
          gradcamUrl: String(data.gradcamUrl || ''),
          date: String(data.date || normalizeDate(data.createdAt)),
          findings: Array.isArray(data.findings) ? data.findings.map((x) => String(x)) : [],
          createdAt: normalizeDateTime(data.createdAt),
          status: String(data.status || 'published') as FirestoreReport['status'],
          updatedAt: data.updatedAt ? normalizeDateTime(data.updatedAt) : undefined,
          publishedAt: data.publishedAt ? normalizeDateTime(data.publishedAt) : undefined
        };
      })
    );
    const visibleReports = scope.role === UserRole.PATIENT
      ? reports.filter((item) => item.status === 'published')
      : reports;
    onData(sortReportsDescending(visibleReports));
  });
}

export function subscribeNotifications(scope: UserScope | null, onData: (items: NotificationItem[]) => void) {
  if (!db || !isFirebaseConfigured || !scope) return () => undefined;

  const source =
    scope.role === UserRole.ADMIN
      ? collection(db, 'notifications')
      : query(collection(db, 'notifications'), where('userId', '==', scope.uid));
  return onSnapshot(source, (snapshot) => {
    const items: NotificationItem[] = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        userId: String(data.userId || ''),
        title: String(data.title || ''),
        body: String(data.body || ''),
        isRead: Boolean(data.isRead),
        createdAt: normalizeDateTime(data.createdAt),
        type: String(data.type || 'info'),
        senderId: data.senderId ? String(data.senderId) : undefined,
        senderName: data.senderName ? String(data.senderName) : undefined,
        receiverId: data.receiverId ? String(data.receiverId) : undefined,
        messageGroupId: data.messageGroupId ? String(data.messageGroupId) : undefined,
        relatedPatientId: data.relatedPatientId ? String(data.relatedPatientId) : undefined
      };
    });
    onData(sortNotificationsDescending(items));
  });
}

export function subscribeAuditLogs(onData: (items: AuditLogEntry[]) => void) {
  if (!db || !isFirebaseConfigured) return () => undefined;
  return onSnapshot(collection(db, 'audit_logs'), (snapshot) => {
    const items: AuditLogEntry[] = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        userId: String(data.userId || ''),
        action: String(data.action || ''),
        details: String(data.details || ''),
        timestamp: normalizeDateTime(data.timestamp),
        recordId: data.recordId ? String(data.recordId) : undefined,
        ip: data.ip ? String(data.ip) : undefined,
        userAgent: data.userAgent ? String(data.userAgent) : undefined
      };
    });
    onData(items.sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()));
  });
}

export async function addUserToFirestore(user: {
  uid: string;
  name: string;
  email: string;
  role: 'doctor' | 'patient' | 'admin';
  consentAccepted?: boolean;
  assignedDoctorId?: string;
}) {
  await upsertUserProfile(user);
}

export async function updateUserAssignedDoctor(userId: string, assignedDoctorId: string | null) {
  if (!db || !isFirebaseConfigured) return;
  await updateDoc(doc(db, 'users', userId), { assignedDoctorId: assignedDoctorId || null });
}

export async function updateUserStatus(userId: string, status: 'Active' | 'Disabled') {
  if (!db || !isFirebaseConfigured) return;
  await updateDoc(doc(db, 'users', userId), { status });
}

export async function removeUser(userId: string) {
  if (!db || !isFirebaseConfigured) return;
  await deleteDoc(doc(db, 'users', userId));
}

export async function addAppointment(appointment: FirestoreAppointment & { patientName?: string; doctorName?: string }) {
  if (!db || !isFirebaseConfigured) return;
  await setDoc(doc(db, 'appointments', appointment.appointmentId), {
    ...appointment,
    notes: await encryptMedicalText(appointment.notes || ''),
    patientName: appointment.patientName || appointment.patientId,
    doctorName: appointment.doctorName || appointment.doctorId
  });
}

export async function updateAppointmentStatus(appointmentId: string, status: Appointment['status']) {
  if (!db || !isFirebaseConfigured) return;
  await updateDoc(doc(db, 'appointments', appointmentId), { status });
}

export async function removeAppointment(appointmentId: string) {
  if (!db || !isFirebaseConfigured) return;
  await deleteDoc(doc(db, 'appointments', appointmentId));
}

export async function addReport(report: FirestoreReport) {
  if (!db || !isFirebaseConfigured) return;
  await setDoc(
    doc(db, 'reports', report.reportId),
    {
      ...report,
      medicalReport: await encryptMedicalText(report.medicalReport),
      clinicalNotes: await encryptMedicalText(report.clinicalNotes || ''),
      status: report.status || 'draft',
      updatedAt: report.updatedAt || new Date().toISOString()
    },
    { merge: true }
  );
}

export async function updateReport(
  reportId: string,
  patch: Partial<Pick<FirestoreReport, 'severity' | 'medicalReport' | 'clinicalNotes' | 'recommendations' | 'status' | 'updatedAt' | 'publishedAt'>>
) {
  if (!db || !isFirebaseConfigured) return;

  const payload: Record<string, unknown> = {
    ...patch,
    updatedAt: patch.updatedAt || new Date().toISOString()
  };

  if (typeof patch.medicalReport === 'string') {
    payload.medicalReport = await encryptMedicalText(patch.medicalReport);
  }
  if (typeof patch.clinicalNotes === 'string') {
    payload.clinicalNotes = await encryptMedicalText(patch.clinicalNotes);
  }

  await updateDoc(doc(db, 'reports', reportId), payload);
}

export async function removeReport(reportId: string) {
  if (!db || !isFirebaseConfigured) return;
  await deleteDoc(doc(db, 'reports', reportId));
}

export async function pushNotification(notification: Omit<NotificationItem, 'id'>) {
  if (!db || !isFirebaseConfigured) return;
  await addDoc(collection(db, 'notifications'), notification);
}

export async function markNotificationRead(notificationId: string) {
  if (!db || !isFirebaseConfigured) return;
  await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
}

export async function removeNotification(notificationId: string) {
  if (!db || !isFirebaseConfigured) return;
  await deleteDoc(doc(db, 'notifications', notificationId));
}

export async function removeNotificationsByMessageGroup(messageGroupId: string) {
  if (!db || !isFirebaseConfigured || !messageGroupId) return;

  const snapshot = await getDocs(query(collection(db, 'notifications'), where('messageGroupId', '==', messageGroupId)));
  await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref)));
}

export async function logAuditAction(input: {
  userId: string;
  action: string;
  details: string;
  recordId?: string;
}) {
  if (!db || !isFirebaseConfigured) return;
  await addDoc(collection(db, 'audit_logs'), {
    userId: input.userId,
    action: input.action,
    details: input.details,
    recordId: input.recordId || null,
    timestamp: new Date().toISOString(),
    ip: 'client',
    userAgent: navigator.userAgent
  });
}

function mapUser(id: string, data: Record<string, unknown>): User {
  const roleRaw = String(data.role || 'patient').toUpperCase() as keyof typeof UserRole;
  const role = UserRole[roleRaw] || UserRole.PATIENT;
  return {
    id,
    firebaseUid: String(data.firebaseUid || id),
    name: String(data.name || 'User'),
    email: String(data.email || ''),
    role,
    status: String(data.status || 'Active') === 'Disabled' ? 'Disabled' : 'Active',
    registrationDate: String(data.registrationDate || normalizeDate(data.createdAt)),
    consentAccepted: Boolean(data.consentAccepted),
    assignedDoctorId: data.assignedDoctorId ? String(data.assignedDoctorId) : undefined
  };
}

function normalizeDate(value: unknown): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (typeof value === 'string') return value.slice(0, 10);
  if (typeof (value as { toDate?: () => Date })?.toDate === 'function') return (value as { toDate: () => Date }).toDate().toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function normalizeDateTime(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (typeof (value as { toDate?: () => Date })?.toDate === 'function') return (value as { toDate: () => Date }).toDate().toISOString();
  return new Date().toISOString();
}

function sortAppointmentsDescending(items: Appointment[]): Appointment[] {
  return items.sort((left, right) => {
    const leftDate = new Date(`${left.date}T${left.time}`).getTime();
    const rightDate = new Date(`${right.date}T${right.time}`).getTime();
    return rightDate - leftDate;
  });
}

function sortReportsDescending(items: FirestoreReport[]): FirestoreReport[] {
  return items.sort((left, right) => {
    const leftDate = new Date(left.createdAt || `${left.date}T00:00:00`).getTime();
    const rightDate = new Date(right.createdAt || `${right.date}T00:00:00`).getTime();
    return rightDate - leftDate;
  });
}

function sortNotificationsDescending(items: NotificationItem[]): NotificationItem[] {
  return items.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}
