import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Layout from './components/Layout';
import {
  Appointment,
  AuditLogEntry,
  DoctorAnalysisSession,
  FirestoreAppointment,
  FirestoreReport,
  Message,
  NotificationItem,
  PatientRecord,
  User,
  UserRole
} from './types';
import LandingView from './views/LandingView';
import LoginView from './views/LoginView';
import DoctorDashboard from './views/doctor/DoctorDashboard';
import UploadView from './views/doctor/UploadView';
import AnalysisResultView from './views/doctor/AnalysisResultView';
import AppointmentsView from './views/doctor/AppointmentsView';
import PatientsView from './views/doctor/PatientsView';
import PatientSummaryView from './views/patient/PatientSummaryView';
import PatientHistoryView from './views/patient/PatientHistoryView';
import PatientAppointmentsView from './views/patient/PatientAppointmentsView';
import AdminDashboard from './views/admin/AdminDashboard';
import UserManagementView from './views/admin/UserManagementView';
import MessagesView from './views/MessagesView';
import NotificationsView from './views/NotificationsView';
import ReportsView from './views/ReportsView';
import SearchView from './views/SearchView';
import ReportDetailsView from './views/ReportDetailsView';
import {
  addAppointment,
  addReport,
  addUserToFirestore,
  getUserByUid,
  logAuditAction,
  markNotificationRead,
  pushNotification,
  removeAppointment,
  removeNotification,
  removeNotificationsByMessageGroup,
  removeReport,
  removeUser,
  subscribeAuditLogs,
  subscribeAppointments,
  subscribeNotifications,
  subscribeUserProfile,
  subscribeReports,
  subscribeUsers,
  updateAppointmentStatus,
  updateUserAssignedDoctor,
  updateReport,
  updateUserStatus
} from './services/firestoreData';
import { generateMedicalReport } from './services/diagnosisApi';
import {
  isFirebaseConfigured,
  loginWithEmailPassword,
  logoutFirebaseUser,
  onFirebaseAuthChanged,
  registerWithEmailPassword
} from './services/firebase';
import { isFollowUpPlanMessage } from './services/followUpPlan';

type AuthMode = 'login' | 'register';

interface ReportWithMeta extends FirestoreReport {
  patientName: string;
  doctorName: string;
}

const severityColorMap: Record<string, string> = {
  'No DR': '#4caf50',
  Mild: '#ffeb3b',
  Moderate: '#ff9800',
  Severe: '#f44336',
  Proliferative: '#b71c1c'
};

const App: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);
  const [authScreen, setAuthScreen] = useState<'landing' | 'login'>('landing');
  const [loginMode, setLoginMode] = useState<AuthMode>('login');
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [analysisSession, setAnalysisSession] = useState<DoctorAnalysisSession | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reports, setReports] = useState<FirestoreReport[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [authBootstrapError, setAuthBootstrapError] = useState<string>('');
  const [messageRecipientId, setMessageRecipientId] = useState<string>('');
  const [appointmentPatientId, setAppointmentPatientId] = useState<string>('');
  const [uploadPatientId, setUploadPatientId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string>('');

  const safeAuditLog = async (payload: {
    userId: string;
    action: string;
    details: string;
    recordId?: string;
  }) => {
    try {
      await logAuditAction(payload);
    } catch (error) {
      console.error(`Audit log failed for ${payload.action}.`, error);
    }
  };

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  useEffect(() => {
    if (!isFirebaseConfigured) return () => undefined;
    let isMounted = true;
    const fallbackTimer = window.setTimeout(() => {
      if (!isMounted) return;
      setAuthReady(true);
      setAuthBootstrapError(t('errors.authBootstrapTimeout'));
      setAuthScreen('login');
    }, 2500);

    const unsubscribe = onFirebaseAuthChanged(
      async (firebaseUser) => {
        if (!isMounted) return;
        window.clearTimeout(fallbackTimer);
        setAuthBootstrapError('');

        if (!firebaseUser) {
          setUser(null);
          setAuthReady(true);
          return;
        }

        try {
          const profile = await getUserByUid(firebaseUser.uid);
          if (!isMounted) return;
          if (profile) {
            setUser(profile);
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error('Failed to resolve user profile during auth bootstrap.', error);
          setUser(null);
          setAuthBootstrapError(t('errors.profileLoadFailed'));
          setAuthScreen('login');
        } finally {
          if (isMounted) setAuthReady(true);
        }
      },
      (error) => {
        if (!isMounted) return;
        window.clearTimeout(fallbackTimer);
        console.error('Firebase auth initialization failed.', error);
        setUser(null);
        setAuthReady(true);
        setAuthBootstrapError(t('errors.authInitFailed'));
        setAuthScreen('login');
      }
    );

    return () => {
      isMounted = false;
      window.clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setUsers([]);
      setAppointments([]);
      setReports([]);
      setNotifications([]);
      setAuditLogs([]);
      return () => undefined;
    }

    const scope = { uid: user.id, role: user.role, assignedDoctorId: user.assignedDoctorId };
    const unsubUsers = subscribeUsers(scope, setUsers);
    const unsubAppointments = subscribeAppointments(scope, setAppointments);
    const unsubReports = subscribeReports(scope, setReports);
    const unsubNotifications = subscribeNotifications(scope, setNotifications);
    const unsubAudit = user.role === UserRole.ADMIN ? subscribeAuditLogs(setAuditLogs) : () => undefined;

    return () => {
      unsubUsers();
      unsubAppointments();
      unsubReports();
      unsubNotifications();
      unsubAudit();
    };
  }, [user]);

  useEffect(() => {
    if (!user || !isFirebaseConfigured) return () => undefined;

    return subscribeUserProfile(user.id, (nextProfile) => {
      setUser((prev) => {
        if (!prev) return nextProfile;
        return isSameUserProfile(prev, nextProfile) ? prev : nextProfile;
      });
    });
  }, [user?.id]);

  useEffect(() => {
    if (isFirebaseConfigured) return;
    setUsers((prev) => {
      if (prev.length > 0) return prev;
      const today = new Date().toISOString().slice(0, 10);
      return [
        { id: 'D-001', name: 'Doctor', email: 'doctor@local', role: UserRole.DOCTOR, status: 'Active', registrationDate: today },
        { id: 'P-001', name: 'Patient', email: 'patient@local', role: UserRole.PATIENT, status: 'Active', registrationDate: today, assignedDoctorId: 'D-001' },
        { id: 'A-001', name: 'Admin', email: 'admin@local', role: UserRole.ADMIN, status: 'Active', registrationDate: today }
      ];
    });
  }, []);

  useEffect(() => {
    if (activeView !== 'messages' && messageRecipientId) {
      setMessageRecipientId('');
    }
  }, [activeView, messageRecipientId]);

  const handleLogin = async (payload: {
    mode: AuthMode;
    name: string;
    email: string;
    password: string;
    role: UserRole;
    consentAccepted: boolean;
  }) => {
    setAuthBootstrapError('');

    if (!isFirebaseConfigured) {
      const fallback: User = {
        id: `local-${payload.role.toLowerCase()}`,
        name: payload.name || payload.role,
        email: payload.email,
        role: payload.role,
        status: 'Active',
        registrationDate: new Date().toISOString().slice(0, 10),
        consentAccepted: payload.consentAccepted
      };
      setUser(fallback);
      setActiveView('dashboard');
      return;
    }

    if (payload.mode === 'register') {
      if (!payload.consentAccepted) {
        throw new Error(t('login.consentRequired'));
      }

      const credential = await registerWithEmailPassword(payload.email, payload.password);
      await addUserToFirestore({
        uid: credential.user.uid,
        name: payload.name,
        email: payload.email,
        role: payload.role.toLowerCase() as 'doctor' | 'patient' | 'admin',
        consentAccepted: payload.consentAccepted
      });
      const profile = await getUserByUid(credential.user.uid);
      if (profile) setUser(profile);
      await safeAuditLog({
        userId: credential.user.uid,
        action: 'auth.register',
        details: `New ${payload.role} account created`
      });
    } else {
      const credential = await loginWithEmailPassword(payload.email, payload.password);
      const profile = await getUserByUid(credential.user.uid);
      if (!profile) {
        await logoutFirebaseUser();
        throw new Error(t('errors.userProfileMissing'));
      }
      if (profile.status === 'Disabled') throw new Error(t('errors.accountDisabled'));
      setUser(profile);
      await safeAuditLog({
        userId: credential.user.uid,
        action: 'auth.login',
        details: 'User logged in'
      });
    }

    setActiveView('dashboard');
  };

  const handleLogout = async () => {
    try {
      if (user) {
        await safeAuditLog({
          userId: user.id,
          action: 'auth.logout',
          details: 'User logged out'
        });
      }
    } finally {
      try {
        await logoutFirebaseUser();
      } catch (error) {
        console.error('Firebase sign out failed.', error);
      }
      setUser(null);
      setAnalysisSession(null);
      setSelectedReportId('');
      setSearchQuery('');
      setActiveView('dashboard');
      setMessageRecipientId('');
      setAppointmentPatientId('');
      setUploadPatientId('');
      setAuthScreen('landing');
      setAuthBootstrapError('');
    }
  };

  const handleStartAnalysis = async (session: DoctorAnalysisSession) => {
    if (!user) return;

    const patientUser = users.find((item) => item.role === UserRole.PATIENT && item.id === session.response.patient_id);
    if (!patientUser) {
      throw new Error(t('errors.patientMissingForReport'));
    }

    const reportResponse = await generateMedicalReport({
      severity: session.response.ai_analysis.severity,
      patient_name: session.patientName || patientUser?.name || session.response.patient_id,
      confidence: session.response.ai_analysis.confidence
    });

    const fullSession: DoctorAnalysisSession = {
      ...session,
      medicalReport: reportResponse.medical_report,
      clinicalNotes: '',
      recommendations: reportResponse.recommendations,
      patientName: session.patientName || patientUser?.name,
      doctorName: user.name
    };

    setAnalysisSession(fullSession);
    setActiveView('analysis_result');

    const reportPayload: FirestoreReport = {
      reportId: session.response.report_id,
      patientId: session.response.patient_id,
      doctorId: user.id,
      severity: session.response.ai_analysis.severity,
      confidence: session.response.ai_analysis.confidence,
      medicalReport: reportResponse.medical_report,
      clinicalNotes: '',
      recommendations: reportResponse.recommendations,
      imageUrl: session.response.preprocessing.original_image_url,
      gradcamUrl: session.response.ai_analysis.heatmap_url || session.response.preprocessing.preprocessed_image_url,
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      status: 'draft',
      findings: createFindingsFromAI(session.response.ai_analysis.confidence_breakdown)
    };

    await addReport(reportPayload);
    setReports((prev) => [reportPayload, ...prev.filter((item) => item.reportId !== reportPayload.reportId)]);
    setSelectedReportId(reportPayload.reportId);
    await safeAuditLog({
      userId: user.id,
      action: 'report.create',
      details: `Created draft report for patient ${session.response.patient_id}`,
      recordId: session.response.report_id
    });
  };

  const syncAnalysisSession = (
    reportId: string,
    severity: FirestoreReport['severity'],
    medicalReport: string,
    clinicalNotes: string
  ) => {
    setAnalysisSession((prev) => {
      if (!prev || prev.response.report_id !== reportId) return prev;
      return {
        ...prev,
        medicalReport,
        clinicalNotes,
        response: {
          ...prev.response,
          ai_analysis: {
            ...prev.response.ai_analysis,
            severity
          }
        }
      };
    });
  };

  const syncReportState = (reportId: string, patch: Partial<FirestoreReport>) => {
    setReports((prev) => prev.map((item) => (
      item.reportId === reportId
        ? { ...item, ...patch }
        : item
    )));
  };

  const handleSaveAnalysisDraft = async (payload: {
    reportId: string;
    severity: FirestoreReport['severity'];
    medicalReport: string;
    clinicalNotes: string;
  }) => {
    if (!user) return;

    const now = new Date().toISOString();
    await updateReport(payload.reportId, {
      severity: payload.severity,
      medicalReport: payload.medicalReport,
      clinicalNotes: payload.clinicalNotes,
      status: 'draft',
      updatedAt: now
    });

    syncAnalysisSession(payload.reportId, payload.severity, payload.medicalReport, payload.clinicalNotes);
    syncReportState(payload.reportId, {
      severity: payload.severity,
      medicalReport: payload.medicalReport,
      clinicalNotes: payload.clinicalNotes,
      status: 'draft',
      updatedAt: now
    });

    await safeAuditLog({
      userId: user.id,
      action: 'report.save_draft',
      details: `Saved draft report ${payload.reportId}`,
      recordId: payload.reportId
    });
  };

  const handlePublishAnalysisReport = async (payload: {
    reportId: string;
    severity: FirestoreReport['severity'];
    medicalReport: string;
    clinicalNotes: string;
  }) => {
    if (!user) return;

    const targetReport = reports.find((item) => item.reportId === payload.reportId);
    const patientId = targetReport?.patientId || analysisSession?.response.patient_id || '';
    const patientUser = users.find((item) => item.role === UserRole.PATIENT && item.id === patientId);

    if (!patientUser) {
      throw new Error(t('errors.patientMissingForPublish'));
    }

    const now = new Date().toISOString();
    await updateReport(payload.reportId, {
      severity: payload.severity,
      medicalReport: payload.medicalReport,
      clinicalNotes: payload.clinicalNotes,
      status: 'published',
      updatedAt: now,
      publishedAt: now
    });

    syncAnalysisSession(payload.reportId, payload.severity, payload.medicalReport, payload.clinicalNotes);
    syncReportState(payload.reportId, {
      severity: payload.severity,
      medicalReport: payload.medicalReport,
      clinicalNotes: payload.clinicalNotes,
      status: 'published',
      updatedAt: now,
      publishedAt: now
    });

    await safeAuditLog({
      userId: user.id,
      action: 'report.publish',
      details: `Published report ${payload.reportId} for patient ${patientUser.id}`,
      recordId: payload.reportId
    });

    await pushNotification({
      userId: patientUser.id,
      title: t('notifications.title'),
      body: `${t('analysis.title')}: ${payload.severity}`,
      isRead: false,
      createdAt: now,
      type: 'diagnosis',
      senderId: user.id,
      senderName: user.name,
      receiverId: patientUser.id,
      relatedPatientId: patientUser.id
    });
  };

  const handleAddAppointment = async (appointment: Appointment) => {
    if (!user) return;
    const patientUser = users.find((item) => item.role === UserRole.PATIENT && item.id === appointment.patientId);
    if (!patientUser) {
      throw new Error(t('errors.patientMissingForAppointment'));
    }
    const payload: FirestoreAppointment & { patientName: string; doctorName: string } = {
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      doctorId: user.id,
      date: appointment.date,
      time: appointment.time,
      type: appointment.type,
      status: appointment.status,
      notes: appointment.notes,
      patientName: patientUser.name,
      doctorName: user.name
    };
    await addAppointment(payload);
    setAppointments((prev) => [
      { ...appointment, patientName: patientUser.name, doctorName: user.name },
      ...prev.filter((item) => item.id !== appointment.id)
    ]);
    await safeAuditLog({
      userId: user.id,
      action: 'appointment.create',
      details: `Scheduled ${appointment.type} for ${appointment.patientId}`,
      recordId: appointment.id
    });
    await pushNotification({
      userId: appointment.patientId,
      title: t('layout.appointments'),
      body: `${appointment.date} ${appointment.time}`,
      isRead: false,
      createdAt: new Date().toISOString(),
      type: 'appointment',
      senderId: user.id,
      senderName: user.name,
      receiverId: appointment.patientId,
      relatedPatientId: appointment.patientId
    });
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    await removeAppointment(appointmentId);
    setAppointments((prev) => prev.filter((item) => item.id !== appointmentId));
    if (user) {
      await safeAuditLog({
        userId: user.id,
        action: 'appointment.delete',
        details: `Deleted appointment ${appointmentId}`,
        recordId: appointmentId
      });
    }
  };

  const handleUpdateAppointmentStatus = async (appointmentId: string, status: Appointment['status']) => {
    await updateAppointmentStatus(appointmentId, status);
    setAppointments((prev) => prev.map((item) => (item.id === appointmentId ? { ...item, status } : item)));
    if (user) {
      await safeAuditLog({
        userId: user.id,
        action: 'appointment.update_status',
        details: `Appointment ${appointmentId} marked as ${status}`,
        recordId: appointmentId
      });
    }
  };

  const handleAddUser = async (newUser: User) => {
    await addUserToFirestore({
      uid: newUser.firebaseUid || newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role.toLowerCase() as 'doctor' | 'patient' | 'admin',
      assignedDoctorId: newUser.assignedDoctorId
    });
  };

  const handleAssignPatientDoctor = async (patientId: string, doctorId: string | null) => {
    await updateUserAssignedDoctor(patientId, doctorId);
    if (user) {
      await safeAuditLog({
        userId: user.id,
        action: 'user.assign_doctor',
        details: doctorId
          ? `Assigned patient ${patientId} to doctor ${doctorId}`
          : `Cleared assigned doctor for patient ${patientId}`,
        recordId: patientId
      });
    }
  };

  const handleDeleteUser = async (id: string) => {
    await removeUser(id);
  };

  const handleToggleUserStatus = async (id: string) => {
    const target = users.find((item) => item.id === id);
    if (!target) return;
    const nextStatus = target.status === 'Active' ? 'Disabled' : 'Active';
    await updateUserStatus(id, nextStatus);
  };

  const handleSendMessage = async (receiverId: string, subject: string, content: string) => {
    if (!user) return;
    const targetUser = users.find((item) => item.id === receiverId);
    if (!targetUser) {
      throw new Error(t('errors.recipientMissing'));
    }

    const createdAt = new Date().toISOString();
    const messageGroupId = `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await pushNotification({
      userId: receiverId,
      title: subject,
      body: content,
      isRead: false,
      createdAt,
      type: 'message',
      senderId: user.id,
      senderName: user.name,
      receiverId,
      messageGroupId,
      relatedPatientId: user.role === UserRole.DOCTOR ? receiverId : user.id
    });

    await pushNotification({
      userId: user.id,
      title: subject,
      body: content,
      isRead: true,
      createdAt,
      type: 'message',
      senderId: user.id,
      senderName: user.name,
      receiverId,
      messageGroupId,
      relatedPatientId: user.role === UserRole.DOCTOR ? receiverId : user.id
    });

    await safeAuditLog({
      userId: user.id,
      action: 'message.send',
      details: `Sent message to ${receiverId}`,
      recordId: receiverId
    });
  };

  const handleMarkAsRead = async (messageId: string) => {
    await markNotificationRead(messageId);
  };

  const handleSearchSubmit = () => {
    setActiveView('search');
  };

  const handleOpenReport = (reportId: string) => {
    setSelectedReportId(reportId);
    setActiveView('report_detail');
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!user) return;
    if (!window.confirm(t('reports.deleteConfirm'))) return;

    const targetReport = reports.find((item) => item.reportId === reportId);
    await removeReport(reportId);
    setReports((prev) => prev.filter((item) => item.reportId !== reportId));

    if (selectedReportId === reportId) {
      setSelectedReportId('');
      if (activeView === 'report_detail') {
        setActiveView('reports');
      }
    }

    if (analysisSession?.response.report_id === reportId) {
      setAnalysisSession(null);
    }

    await safeAuditLog({
      userId: user.id,
      action: 'report.delete',
      details: `Deleted report ${reportId}${targetReport ? ` for patient ${targetReport.patientId}` : ''}`,
      recordId: reportId
    });
  };

  const handleDeleteMessage = async (message: Message) => {
    if (!user) return;
    if (!window.confirm(t('messages.deleteConfirm'))) return;

    const canDeleteConversation = Boolean(message.messageGroupId && (user.role === UserRole.ADMIN || message.senderId === user.id));

    if (canDeleteConversation && message.messageGroupId) {
      await removeNotificationsByMessageGroup(message.messageGroupId);
      setNotifications((prev) => prev.filter((item) => item.messageGroupId !== message.messageGroupId));
    } else {
      await removeNotification(message.id);
      setNotifications((prev) => prev.filter((item) => item.id !== message.id));
    }

    await safeAuditLog({
      userId: user.id,
      action: 'message.delete',
      details: `Deleted message ${message.id}`,
      recordId: message.id
    });
  };

  const handleDeleteNotification = async (notification: NotificationItem) => {
    if (!user) return;
    if (!window.confirm(t('notifications.deleteConfirm'))) return;

    const shouldDeleteGroup = notification.type === 'message' && notification.messageGroupId;

    if (shouldDeleteGroup && notification.messageGroupId) {
      await removeNotificationsByMessageGroup(notification.messageGroupId);
      setNotifications((prev) => prev.filter((item) => item.messageGroupId !== notification.messageGroupId));
    } else {
      await removeNotification(notification.id);
      setNotifications((prev) => prev.filter((item) => item.id !== notification.id));
    }

    await safeAuditLog({
      userId: user.id,
      action: 'notification.delete',
      details: `Deleted notification ${notification.id}`,
      recordId: notification.id
    });
  };

  const userNameById = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((item) => map.set(item.id, item.name));
    if (user) {
      map.set(user.id, user.name);
    }
    return map;
  }, [users, user]);

  const reportsWithMeta = useMemo<ReportWithMeta[]>(() => {
    return reports.map((report) => ({
      ...report,
      patientName: userNameById.get(report.patientId) || report.patientId,
      doctorName: userNameById.get(report.doctorId) || 'Doctor'
    }));
  }, [reports, userNameById]);

  const selectedReport = useMemo(() => {
    if (!selectedReportId) return reportsWithMeta[0] || null;
    return reportsWithMeta.find((item) => item.reportId === selectedReportId) || null;
  }, [reportsWithMeta, selectedReportId]);

  const patientRecords = useMemo<PatientRecord[]>(() => {
    return reportsWithMeta.map((report) => ({
      id: report.reportId,
      reportId: report.reportId,
      patientId: report.patientId,
      date: report.date,
      doctorName: report.doctorName,
      severity: severityLabelToIndex(report.severity),
      notes: report.medicalReport,
      clinicalNotes: report.clinicalNotes,
      clinic: 'AI Clinic',
      confidence: report.confidence,
      imageUrl: report.imageUrl,
      gradcamUrl: report.gradcamUrl,
      recommendations: report.recommendations
    }));
  }, [reportsWithMeta]);

  const messages = useMemo<Message[]>(() => {
    return notifications
      .filter((item) => item.type === 'message')
      .map((item) => ({
        id: item.id,
        senderId: item.senderId || 'system',
        senderName: item.senderName || 'System',
        receiverId: item.receiverId || item.userId,
        subject: item.title,
        content: item.body,
        timestamp: item.createdAt,
        isRead: item.isRead,
        messageGroupId: item.messageGroupId
      }));
  }, [notifications]);

  const unreadCount = useMemo(() => {
    if (!user) return 0;
    return notifications.filter((item) => item.userId === user.id && !item.isRead).length;
  }, [notifications, user]);

  const doctorPatients = useMemo(() => {
    const patients = users.filter((item) => item.role === UserRole.PATIENT);
    return patients.map((patient) => {
      const latest = reportsWithMeta
        .filter((report) => report.patientId === patient.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      return {
        id: patient.id,
        name: patient.name,
        contact: patient.email,
        lastVisit: latest?.date || '-',
        severity: latest?.severity || '-'
      };
    });
  }, [users, reportsWithMeta]);

  const doctorPatientOptions = useMemo(() => {
    return users
      .filter((item) => item.role === UserRole.PATIENT)
      .map((item) => ({ id: item.id, name: item.name, contact: item.email }));
  }, [users]);

  const doctorDashboardData = useMemo(() => {
    const sortedReports = reportsWithMeta
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const pendingReports = sortedReports.filter((item) => item.confidence < 0.6).length;
    const severityDistribution = buildSeverityDistribution(sortedReports);
    const monthlyReports = buildMonthlyTrend(sortedReports);
    const upcomingAppointments = appointments
      .filter((item) => item.status === 'Upcoming')
      .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
    return {
      stats: {
        totalReports: sortedReports.length,
        pendingReports,
        totalPatients: doctorPatients.length,
        totalAppointments: appointments.length
      },
      severityDistribution,
      monthlyReports,
      recentReports: sortedReports.slice(0, 6),
      upcomingAppointments,
      quickPatients: doctorPatients
    };
  }, [reportsWithMeta, appointments, doctorPatients]);

  const adminStats = useMemo(() => {
    const doctors = users.filter((item) => item.role === UserRole.DOCTOR).length;
    const patients = users.filter((item) => item.role === UserRole.PATIENT).length;
    const admins = users.filter((item) => item.role === UserRole.ADMIN).length;
    return {
      totalUsers: users.length,
      doctors,
      patients,
      admins,
      totalReports: reportsWithMeta.length,
      publishedReports: reportsWithMeta.length
    };
  }, [users, reportsWithMeta]);

  const renderContent = () => {
    if (!user) return null;

    const ownAppointments = appointments.filter((item) => item.patientId === user.id);
    const ownReports = patientRecords.filter((item) => item.patientId === user.id);
    const ownReportMeta = reportsWithMeta
      .filter((item) => item.patientId === user.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const ownNotifications = notifications.filter((item) => item.userId === user.id);
    const ownMessages = messages
      .filter((item) => item.receiverId === user.id || item.senderId === user.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const ownFollowUpMessages = ownMessages.filter((item) => isFollowUpPlanMessage(item.content));
    const assignedDoctor =
      user.role === UserRole.PATIENT
        ? users.find((item) => item.role === UserRole.DOCTOR && item.id === user.assignedDoctorId) || null
        : null;

    if (user.role === UserRole.DOCTOR) {
      switch (activeView) {
        case 'dashboard':
          return (
            <DoctorDashboard
              stats={doctorDashboardData.stats}
              severityDistribution={doctorDashboardData.severityDistribution}
              monthlyReports={doctorDashboardData.monthlyReports}
              recentReports={doctorDashboardData.recentReports}
              upcomingAppointments={doctorDashboardData.upcomingAppointments}
              quickPatients={doctorDashboardData.quickPatients}
              onNewAnalysis={() => setActiveView('upload')}
              onOpenReport={handleOpenReport}
              onOpenPatient={(patientId) => {
                setUploadPatientId(patientId);
                setActiveView('patients');
              }}
              onOpenAppointments={() => setActiveView('appointments')}
            />
          );
        case 'upload':
          return (
            <UploadView
              onAnalyze={handleStartAnalysis}
              patientOptions={doctorPatientOptions}
              defaultPatientId={uploadPatientId}
            />
          );
        case 'patients':
          return (
            <PatientsView
              patients={doctorPatients}
              onOpenMessages={(patientId) => {
                setMessageRecipientId(patientId);
                setActiveView('messages');
              }}
              onOpenAppointments={(patientId) => {
                setAppointmentPatientId(patientId);
                setActiveView('appointments');
              }}
              onOpenUpload={(patientId) => {
                setUploadPatientId(patientId);
                setActiveView('upload');
              }}
            />
          );
        case 'analysis_result':
          return analysisSession ? (
            <AnalysisResultView
              session={analysisSession}
              onSaveDraft={handleSaveAnalysisDraft}
              onPublish={handlePublishAnalysisReport}
            />
          ) : (
            <UploadView
              onAnalyze={handleStartAnalysis}
              patientOptions={doctorPatientOptions}
              defaultPatientId={uploadPatientId}
            />
          );
        case 'reports':
          return <ReportsView reports={reportsWithMeta} role={user.role} onOpenReport={handleOpenReport} onDeleteReport={handleDeleteReport} />;
        case 'report_detail':
          return <ReportDetailsView report={selectedReport} role={user.role} onBack={() => setActiveView('reports')} onDelete={handleDeleteReport} />;
        case 'appointments':
          return (
            <AppointmentsView
              appointments={appointments}
              onAdd={handleAddAppointment}
              onDelete={handleDeleteAppointment}
              onUpdateStatus={handleUpdateAppointmentStatus}
              patientOptions={doctorPatientOptions}
              defaultPatientId={appointmentPatientId}
            />
          );
        case 'search':
          return (
            <SearchView
              role={user.role}
              query={searchQuery}
              onQueryChange={setSearchQuery}
              reports={reportsWithMeta}
              appointments={appointments}
              notifications={notifications}
              users={users}
              onOpenReport={handleOpenReport}
            />
          );
        case 'messages':
          return (
            <MessagesView
              currentUser={user}
              messages={messages}
              users={users}
              defaultRecipientId={messageRecipientId}
              onSendMessage={handleSendMessage}
              onMarkAsRead={handleMarkAsRead}
              onDeleteMessage={handleDeleteMessage}
            />
          );
        case 'notifications':
          return (
            <NotificationsView notifications={ownNotifications} onMarkRead={handleMarkAsRead} onDelete={handleDeleteNotification} />
          );
        default:
          return (
            <DoctorDashboard
              stats={doctorDashboardData.stats}
              severityDistribution={doctorDashboardData.severityDistribution}
              monthlyReports={doctorDashboardData.monthlyReports}
              recentReports={doctorDashboardData.recentReports}
              upcomingAppointments={doctorDashboardData.upcomingAppointments}
              quickPatients={doctorDashboardData.quickPatients}
              onNewAnalysis={() => setActiveView('upload')}
              onOpenReport={handleOpenReport}
              onOpenPatient={(patientId) => {
                setUploadPatientId(patientId);
                setActiveView('patients');
              }}
              onOpenAppointments={() => setActiveView('appointments')}
            />
          );
      }
    }

    if (user.role === UserRole.PATIENT) {
      switch (activeView) {
        case 'dashboard':
          return (
            <PatientSummaryView
              stats={{
                reportsCount: ownReportMeta.length,
                appointmentsCount: ownAppointments.length,
                notificationsCount: ownNotifications.length,
                lastSeverity: ownReportMeta[0]?.severity || '-'
              }}
              latestReport={ownReportMeta[0] ? {
                reportId: ownReportMeta[0].reportId,
                severity: ownReportMeta[0].severity,
                confidence: ownReportMeta[0].confidence,
                imageUrl: ownReportMeta[0].imageUrl,
                gradcamUrl: ownReportMeta[0].gradcamUrl,
                medicalReport: ownReportMeta[0].medicalReport,
                date: ownReportMeta[0].date
              } : null}
              upcomingAppointments={ownAppointments.filter((item) => item.status === 'Upcoming')}
              recentNotifications={ownNotifications}
              recentRecords={ownReports}
              assignedDoctorName={assignedDoctor?.name}
              recentMessagesCount={ownFollowUpMessages.length}
              latestMessage={ownFollowUpMessages[0] || null}
              onOpenReport={handleOpenReport}
              onOpenMessages={() => {
                setMessageRecipientId(user.assignedDoctorId || '');
                setActiveView('messages');
              }}
            />
          );
        case 'reports':
          return <PatientHistoryView records={ownReports} onOpenReport={handleOpenReport} />;
        case 'report_detail':
          return <ReportDetailsView report={selectedReport} role={user.role} onBack={() => setActiveView('reports')} />;
        case 'appointments':
          return (
            <PatientAppointmentsView
              appointments={ownAppointments}
              assignedDoctorName={assignedDoctor?.name}
              onOpenMessages={() => {
                setMessageRecipientId(user.assignedDoctorId || '');
                setActiveView('messages');
              }}
            />
          );
        case 'search':
          return (
            <SearchView
              role={user.role}
              query={searchQuery}
              onQueryChange={setSearchQuery}
              reports={ownReportMeta}
              appointments={ownAppointments}
              notifications={ownNotifications}
              users={users}
              onOpenReport={handleOpenReport}
            />
          );
        case 'messages':
          return (
            <MessagesView
              currentUser={user}
              messages={messages}
              users={users}
              defaultRecipientId={messageRecipientId}
              onSendMessage={handleSendMessage}
              onMarkAsRead={handleMarkAsRead}
            />
          );
        case 'notifications':
          return (
            <NotificationsView notifications={ownNotifications} onMarkRead={handleMarkAsRead} />
          );
        default:
          return (
            <PatientSummaryView
              stats={{
                reportsCount: ownReportMeta.length,
                appointmentsCount: ownAppointments.length,
                notificationsCount: ownNotifications.length,
                lastSeverity: ownReportMeta[0]?.severity || '-'
              }}
              latestReport={ownReportMeta[0] ? {
                reportId: ownReportMeta[0].reportId,
                severity: ownReportMeta[0].severity,
                confidence: ownReportMeta[0].confidence,
                imageUrl: ownReportMeta[0].imageUrl,
                gradcamUrl: ownReportMeta[0].gradcamUrl,
                medicalReport: ownReportMeta[0].medicalReport,
                date: ownReportMeta[0].date
              } : null}
              upcomingAppointments={ownAppointments.filter((item) => item.status === 'Upcoming')}
              recentNotifications={ownNotifications}
              recentRecords={ownReports}
              assignedDoctorName={assignedDoctor?.name}
              recentMessagesCount={ownFollowUpMessages.length}
              latestMessage={ownFollowUpMessages[0] || null}
              onOpenReport={handleOpenReport}
              onOpenMessages={() => {
                setMessageRecipientId(user.assignedDoctorId || '');
                setActiveView('messages');
              }}
            />
          );
      }
    }

    if (user.role === UserRole.ADMIN) {
      switch (activeView) {
        case 'dashboard':
          return (
            <AdminDashboard
              view="overview"
              stats={adminStats}
              severityDistribution={buildSeverityDistribution(reportsWithMeta)}
              monthlyReports={buildMonthlyTrend(reportsWithMeta)}
              recentUsers={users.slice().sort((a, b) => b.registrationDate.localeCompare(a.registrationDate)).slice(0, 8)}
              auditLogs={auditLogs}
              onToggleStatus={handleToggleUserStatus}
            />
          );
        case 'performance':
          return (
            <AdminDashboard
              view="performance"
              stats={adminStats}
              severityDistribution={buildSeverityDistribution(reportsWithMeta)}
              monthlyReports={buildMonthlyTrend(reportsWithMeta)}
              recentUsers={users.slice().sort((a, b) => b.registrationDate.localeCompare(a.registrationDate)).slice(0, 8)}
              auditLogs={auditLogs}
              onToggleStatus={handleToggleUserStatus}
            />
          );
        case 'reports':
          return <ReportsView reports={reportsWithMeta} role={user.role} onOpenReport={handleOpenReport} onDeleteReport={handleDeleteReport} />;
        case 'report_detail':
          return <ReportDetailsView report={selectedReport} role={user.role} onBack={() => setActiveView('reports')} onDelete={handleDeleteReport} />;
        case 'users':
          return (
            <UserManagementView
              users={users}
              doctors={users.filter((item) => item.role === UserRole.DOCTOR)}
              onAdd={handleAddUser}
              onAssignDoctor={handleAssignPatientDoctor}
              onDelete={handleDeleteUser}
              onToggleStatus={handleToggleUserStatus}
            />
          );
        case 'search':
          return (
            <SearchView
              role={user.role}
              query={searchQuery}
              onQueryChange={setSearchQuery}
              reports={reportsWithMeta}
              appointments={appointments}
              notifications={notifications}
              users={users}
              onOpenReport={handleOpenReport}
            />
          );
        case 'notifications':
          return (
            <NotificationsView notifications={notifications} onMarkRead={handleMarkAsRead} onDelete={handleDeleteNotification} />
          );
        default:
          return (
            <AdminDashboard
              view="overview"
              stats={adminStats}
              severityDistribution={buildSeverityDistribution(reportsWithMeta)}
              monthlyReports={buildMonthlyTrend(reportsWithMeta)}
              recentUsers={users.slice().sort((a, b) => b.registrationDate.localeCompare(a.registrationDate)).slice(0, 8)}
              auditLogs={auditLogs}
              onToggleStatus={handleToggleUserStatus}
            />
          );
      }
    }

    return null;
  };

  if (!authReady) {
    return (
      <div className="premium-shell flex min-h-screen items-center justify-center px-6">
        <div className="premium-card rounded-[30px] px-8 py-7 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-[18px] bg-[linear-gradient(135deg,#176B87,#071952)] shadow-[0_20px_40px_rgba(7,25,82,0.18)]" />
          <p className="premium-kicker">{t('layout.portal')}</p>
          <p className="mt-3 text-base font-semibold text-[#071952]">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (authScreen === 'landing') {
      return (
        <LandingView
          onSignIn={() => {
            setLoginMode('login');
            setAuthScreen('login');
          }}
          onRegister={() => {
            setLoginMode('register');
            setAuthScreen('login');
          }}
        />
      );
    }

    return (
      <LoginView
        onLogin={handleLogin}
        defaultMode={loginMode}
        notice={authBootstrapError}
        onBack={() => setAuthScreen('landing')}
      />
    );
  }

  return (
    <Layout
      user={user}
      activeView={activeView}
      unreadCount={unreadCount}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onSearchSubmit={handleSearchSubmit}
      onNavigate={setActiveView}
      onLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;

function createFindingsFromAI(confidenceBreakdown: Record<string, number>): string[] {
  const ranked = Object.entries(confidenceBreakdown)
    .sort((left, right) => Number(right[1]) - Number(left[1]))
    .slice(0, 3);
  return ranked.map(([label, probability], index) => {
    if (index === 0) return `Primary pattern suggests ${label} retinopathy (${(probability * 100).toFixed(1)}%).`;
    if (index === 1) return `Secondary indicator observed for ${label} (${(probability * 100).toFixed(1)}%).`;
    return `Low-probability differential: ${label} (${(probability * 100).toFixed(1)}%).`;
  });
}

function severityLabelToIndex(value: string): 0 | 1 | 2 | 3 | 4 {
  if (value === 'No DR') return 0;
  if (value === 'Mild') return 1;
  if (value === 'Moderate') return 2;
  if (value === 'Severe') return 3;
  return 4;
}

function buildSeverityDistribution(reports: ReportWithMeta[]): Array<{ name: string; value: number; color: string }> {
  const labels = ['No DR', 'Mild', 'Moderate', 'Severe', 'Proliferative'];
  return labels.map((label) => ({
    name: label,
    value: reports.filter((report) => report.severity === label).length,
    color: severityColorMap[label]
  }));
}

function buildMonthlyTrend(reports: ReportWithMeta[]): Array<{ month: string; reports: number }> {
  const now = new Date();
  const months: Array<{ month: string; reports: number }> = [];
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleString('en', { month: 'short' });
    months.push({
      month: monthLabel,
      reports: reports.filter((report) => report.date.startsWith(monthKey)).length
    });
  }
  return months;
}

function isSameUserProfile(left: User, right: User) {
  return (
    left.id === right.id &&
    left.name === right.name &&
    left.email === right.email &&
    left.role === right.role &&
    left.status === right.status &&
    left.registrationDate === right.registrationDate &&
    left.firebaseUid === right.firebaseUid &&
    left.consentAccepted === right.consentAccepted &&
    left.assignedDoctorId === right.assignedDoctorId
  );
}
