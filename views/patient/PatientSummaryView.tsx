import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import MedicalText from '../../components/MedicalText';
import ProtectedImage from '../../components/ProtectedImage';
import ReviewedIndicator from '../../components/ReviewedIndicator';
import { decodeFollowUpPlan } from '../../services/followUpPlan';
import { Appointment, Message, NotificationItem, PatientRecord } from '../../types';

interface LatestReport {
  reportId: string;
  severity: string;
  confidence: number;
  imageUrl?: string;
  gradcamUrl?: string;
  medicalReport: string;
  date: string;
}

interface PatientSummaryViewProps {
  stats: {
    reportsCount: number;
    appointmentsCount: number;
    notificationsCount: number;
    lastSeverity: string;
  };
  latestReport: LatestReport | null;
  upcomingAppointments: Appointment[];
  recentNotifications: NotificationItem[];
  recentRecords: PatientRecord[];
  assignedDoctorName?: string;
  recentMessagesCount: number;
  latestMessage: Message | null;
  onOpenReport: (reportId: string) => void;
  onOpenMessages: () => void;
}

const PatientSummaryView: React.FC<PatientSummaryViewProps> = ({
  stats,
  latestReport,
  upcomingAppointments,
  recentNotifications,
  recentRecords,
  assignedDoctorName,
  recentMessagesCount,
  latestMessage,
  onOpenReport,
  onOpenMessages
}) => {
  const { t } = useTranslation();

  const trendData = useMemo(() => {
    return recentRecords
      .slice()
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
      .map((record) => ({
        date: record.date.slice(5),
        severity: severityToLevel(record.severity)
      }));
  }, [recentRecords]);

  const nextAppointment = useMemo(() => {
    return upcomingAppointments
      .slice()
      .sort((left, right) => new Date(`${left.date}T${left.time}`).getTime() - new Date(`${right.date}T${right.time}`).getTime())[0] || null;
  }, [upcomingAppointments]);

  const latestPlan = useMemo(() => {
    if (!latestMessage) return null;
    const plan = decodeFollowUpPlan(latestMessage.content);
    if (!plan) return null;

    return {
      title: latestMessage.subject,
      sentAt: latestMessage.timestamp,
      ...plan
    };
  }, [latestMessage]);

  return (
    <div className="space-y-6">
      <section className="premium-card surface-glow rounded-[34px] px-6 py-6 md:px-8 md:py-8">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
          <div>
            <p className="premium-kicker">{t('patient.summary')}</p>
            <h3 className="premium-title mt-3 text-4xl md:text-5xl">{t('patient.summary')}</h3>
            <p className="premium-subtitle mt-4 max-w-3xl text-sm md:text-base">{t('landing.featureReports')}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {latestReport ? (
                <button onClick={() => onOpenReport(latestReport.reportId)} className="premium-button-primary px-5 py-3 text-sm">
                  {t('common.view')}
                </button>
              ) : null}
              <button onClick={onOpenMessages} className="premium-button-secondary px-5 py-3 text-sm" disabled={!assignedDoctorName}>
                {t('patient.messageDoctor')}
              </button>
              <span className="premium-badge">{translatePatientSeverity(stats.lastSeverity, t) || '-'}</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <InfoPanel label={t('patient.assignedDoctor')} value={assignedDoctorName || t('patient.notAssigned')} />
            <InfoPanel
              label={t('patient.nextAppointment')}
              value={nextAppointment ? `${nextAppointment.date} • ${nextAppointment.time}` : t('patient.notScheduled')}
            />
            <InfoPanel label={t('patient.messagesCount')} value={String(recentMessagesCount)} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('patient.totalReports')} value={stats.reportsCount} accent="from-[#071952] to-[#176B87]" />
        <StatCard label={t('patient.totalAppointments')} value={stats.appointmentsCount} accent="from-[#176B87] to-[#071952]" />
        <StatCard label={t('patient.totalNotifications')} value={stats.notificationsCount} accent="from-[#D2E0FB] to-[#176B87]" darkText />
        <StatCard label={t('patient.lastStatus')} value={translatePatientSeverity(stats.lastSeverity, t) || '-'} accent="from-[#071952] to-[#080616]" />
      </div>

      {latestReport && (
        <div className="premium-card rounded-[30px] p-6">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="premium-kicker">{t('patient.latestReport')}</p>
              <h4 className="premium-title mt-2 text-2xl">{t('patient.latestReport')}</h4>
              <p className="mt-2 text-xs text-[rgba(8,6,22,0.44)]">{latestReport.date}</p>
            </div>
            <button onClick={() => onOpenReport(latestReport.reportId)} className="premium-button-primary px-4 py-3 text-xs">
              {t('common.view')}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="premium-card-soft rounded-[24px] p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="premium-badge">{translatePatientSeverity(latestReport.severity, t)}</span>
              </div>
              {assignedDoctorName && <div className="mt-4"><ReviewedIndicator doctorName={assignedDoctorName} compact /></div>}
              <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-[rgba(8,6,22,0.42)]">{t('analysis.patientAdvice')}</p>
              <MedicalText
                value={latestReport.medicalReport}
                className="mt-3 block text-sm leading-8 text-[rgba(8,6,22,0.74)]"
              />
            </div>

            <div className="premium-card-soft rounded-[24px] p-4">
              <div className="mx-auto flex h-[300px] w-[300px] max-w-full items-center justify-center">
                {latestReport.imageUrl ? (
                  <ProtectedImage
                    source={latestReport.imageUrl}
                    alt="retina original"
                    className="h-[300px] w-[300px] max-w-full rounded-[22px] border border-white/70 object-contain"
                    fallback={(
                      <div className="flex h-[300px] w-[300px] max-w-full items-center justify-center rounded-[22px] border border-dashed border-[rgba(7,25,82,0.14)] bg-white/50 text-sm text-[rgba(8,6,22,0.42)]">
                        No image
                      </div>
                    )}
                  />
                ) : (
                  <div className="flex h-[300px] w-[300px] max-w-full items-center justify-center rounded-[22px] border border-dashed border-[rgba(7,25,82,0.14)] bg-white/50 text-sm text-[rgba(8,6,22,0.42)]">
                    No image
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="premium-card rounded-[30px] p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="premium-kicker">{t('patient.severityTrend')}</p>
              <h4 className="premium-title mt-2 text-2xl">{t('patient.severityTrend')}</h4>
            </div>
            <span className="premium-badge">{trendData.length}</span>
          </div>

          <div className="h-72">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(7,25,82,0.08)" />
                  <XAxis dataKey="date" stroke="#071952" tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 4]} allowDecimals={false} stroke="#071952" tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="severity" stroke="#176B87" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="premium-empty flex h-full items-center justify-center rounded-[24px] text-sm text-[rgba(8,6,22,0.42)]">
                {t('common.noData')}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="premium-card rounded-[30px] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="premium-kicker">{t('layout.followUpPlans')}</p>
                <h4 className="premium-title mt-2 text-xl">{t('patient.messageDoctor')}</h4>
              </div>
              <span className="premium-badge">{recentMessagesCount}</span>
            </div>

            <div className="premium-card-soft rounded-[22px] px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgba(8,6,22,0.42)]">{t('patient.assignedDoctor')}</p>
              <p className="mt-2 text-sm font-semibold text-[#071952]">{assignedDoctorName || t('patient.notAssigned')}</p>
              <p className="mt-2 text-xs leading-6 text-[rgba(8,6,22,0.54)]">{t('patient.messageHint')}</p>
            </div>

            <div className="mt-4 premium-card-soft rounded-[22px] px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgba(8,6,22,0.42)]">{t('patient.latestMessage')}</p>
              {latestPlan ? (
                <>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[#071952]">{latestPlan.title}</p>
                    <span className={followUpStatusBadgeClass(latestPlan.status)}>
                      {t(`messages.planStatuses.${latestPlan.status}`)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[rgba(8,6,22,0.5)]">{new Date(latestPlan.sentAt).toLocaleString()}</p>
                  <p className="mt-2 text-xs font-semibold text-[#176B87]">
                    {t('messages.nextFollowUpDate')}: {formatFollowUpDate(latestPlan.nextFollowUpDate)}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[rgba(8,6,22,0.68)]">{latestPlan.description}</p>
                </>
              ) : (
                <p className="mt-2 text-sm leading-7 text-[rgba(8,6,22,0.52)]">{t('patient.noRecentMessages')}</p>
              )}
            </div>

            <button
              onClick={onOpenMessages}
              className="premium-button-primary mt-4 w-full px-5 py-3 text-sm"
              disabled={!assignedDoctorName}
            >
              {t('patient.messageDoctor')}
            </button>
          </div>

          <div className="premium-card rounded-[30px] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="premium-title text-xl">{t('doctor.upcomingAppointments')}</h4>
              <span className="premium-badge">{upcomingAppointments.length}</span>
            </div>
            <div className="space-y-3">
              {upcomingAppointments.slice(0, 4).map((appointment) => (
                <div key={appointment.id} className="premium-card-soft rounded-[22px] px-4 py-4">
                  <p className="text-sm font-semibold text-[#071952]">{appointment.doctorName}</p>
                  <p className="mt-1 text-[11px] text-[rgba(8,6,22,0.52)]">
                    {appointment.date} {appointment.time} • {t(`appointments.types.${appointment.type}`)}
                  </p>
                </div>
              ))}
              {upcomingAppointments.length === 0 && <p className="text-sm text-[rgba(8,6,22,0.42)]">{t('common.noData')}</p>}
            </div>
          </div>

          <div className="premium-card rounded-[30px] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="premium-title text-xl">{t('layout.notifications')}</h4>
              <span className="premium-badge">{recentNotifications.length}</span>
            </div>
            <div className="space-y-3">
              {recentNotifications.slice(0, 4).map((notification) => (
                <div key={notification.id} className="premium-card-soft rounded-[22px] px-4 py-4">
                  <p className="text-sm font-semibold text-[#071952]">{notification.title}</p>
                  <p className="mt-1 text-[11px] leading-6 text-[rgba(8,6,22,0.52)]">{notification.body}</p>
                </div>
              ))}
              {recentNotifications.length === 0 && <p className="text-sm text-[rgba(8,6,22,0.42)]">{t('common.noData')}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number | string; accent: string; darkText?: boolean }> = ({ label, value, accent, darkText = false }) => (
  <div className={`rounded-[28px] bg-gradient-to-br ${accent} p-[1px] shadow-[0_22px_48px_rgba(8,6,22,0.08)]`}>
    <div className={`rounded-[27px] px-5 py-5 ${darkText ? 'bg-[#fbf9f1] text-[#071952]' : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.02))] text-white'}`}>
      <p className={`text-[11px] font-bold uppercase tracking-[0.16em] ${darkText ? 'text-[rgba(8,6,22,0.46)]' : 'text-white/56'}`}>{label}</p>
      <p className="mt-3 text-3xl font-extrabold">{value}</p>
    </div>
  </div>
);

const InfoPanel: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="premium-card-soft rounded-[24px] px-4 py-4">
    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgba(8,6,22,0.42)]">{label}</p>
    <p className="mt-3 text-sm font-semibold text-[#071952]">{value}</p>
  </div>
);

function severityToLevel(severity: string | number) {
  if (typeof severity === 'number') return severity;
  if (severity === 'No DR') return 0;
  if (severity === 'Mild') return 1;
  if (severity === 'Moderate') return 2;
  if (severity === 'Severe') return 3;
  if (severity === 'Proliferative') return 4;
  return 0;
}

function translatePatientSeverity(severity: string, t: (key: string) => string): string {
  if (severity === 'No DR') return t('patientSeverity.No DR');
  if (severity === 'Mild') return t('patientSeverity.Mild');
  if (severity === 'Moderate') return t('patientSeverity.Moderate');
  if (severity === 'Severe') return t('patientSeverity.Severe');
  if (severity === 'Proliferative') return t('patientSeverity.Proliferative');
  return severity || '-';
}

function followUpStatusBadgeClass(status: string) {
  if (status === 'urgent') return 'rounded-full bg-[rgba(239,68,68,0.12)] px-3 py-1 text-[11px] font-semibold text-[#b42318]';
  if (status === 'completed') return 'rounded-full bg-[rgba(22,163,74,0.12)] px-3 py-1 text-[11px] font-semibold text-[#166534]';
  if (status === 'monitoring') return 'rounded-full bg-[rgba(23,107,135,0.12)] px-3 py-1 text-[11px] font-semibold text-[#176B87]';
  return 'rounded-full bg-[rgba(210,224,251,0.82)] px-3 py-1 text-[11px] font-semibold text-[#071952]';
}

function formatFollowUpDate(value: string) {
  if (!value) return '-';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export default PatientSummaryView;
