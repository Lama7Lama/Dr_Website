import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Appointment, FirestoreReport, NotificationItem, User, UserRole } from '../types';

interface ReportWithMeta extends FirestoreReport {
  patientName: string;
  doctorName: string;
}

interface SearchViewProps {
  role: UserRole;
  query: string;
  onQueryChange: (value: string) => void;
  reports: ReportWithMeta[];
  appointments: Appointment[];
  notifications: NotificationItem[];
  users: User[];
  onOpenReport: (reportId: string) => void;
}

const SearchView: React.FC<SearchViewProps> = ({
  role,
  query,
  onQueryChange,
  reports,
  appointments,
  notifications,
  users,
  onOpenReport
}) => {
  const { t } = useTranslation();

  const term = query.toLowerCase().trim();
  const reportMatches = useMemo(() => {
    if (!term) return reports.slice(0, 6);
    return reports.filter((report) => (
      report.reportId.toLowerCase().includes(term)
      || report.patientName.toLowerCase().includes(term)
      || report.doctorName.toLowerCase().includes(term)
      || report.severity.toLowerCase().includes(term)
    )).slice(0, 10);
  }, [reports, term]);

  const appointmentMatches = useMemo(() => {
    if (!term) return appointments.slice(0, 6);
    return appointments.filter((appointment) => (
      appointment.patientName.toLowerCase().includes(term)
      || appointment.doctorName.toLowerCase().includes(term)
      || appointment.type.toLowerCase().includes(term)
      || appointment.status.toLowerCase().includes(term)
    )).slice(0, 10);
  }, [appointments, term]);

  const notificationMatches = useMemo(() => {
    if (!term) return notifications.slice(0, 6);
    return notifications.filter((notification) => (
      notification.title.toLowerCase().includes(term)
      || notification.body.toLowerCase().includes(term)
    )).slice(0, 10);
  }, [notifications, term]);

  const userMatches = useMemo(() => {
    if (role !== UserRole.ADMIN) return [];
    if (!term) return users.slice(0, 6);
    return users.filter((user) => (
      user.name.toLowerCase().includes(term)
      || user.email.toLowerCase().includes(term)
      || user.id.toLowerCase().includes(term)
    )).slice(0, 10);
  }, [users, term, role]);

  return (
    <div className="space-y-6">
      <section className="premium-card surface-glow rounded-[32px] px-6 py-6 md:px-8">
        <p className="premium-kicker">{t('layout.search')}</p>
        <div className="mt-3 space-y-4">
          <h3 className="premium-title text-4xl md:text-5xl">{t('layout.search')}</h3>
          <div className="premium-card-soft rounded-[26px] border border-[rgba(7,25,82,0.08)] p-2">
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={t('search.placeholder')}
              className="premium-input border-0 bg-transparent py-4 text-sm shadow-none"
            />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ResultCard title={t('layout.reports')} count={reportMatches.length}>
          {reportMatches.map((report) => (
            <button key={report.reportId} onClick={() => onOpenReport(report.reportId)} className="premium-card-soft w-full rounded-[20px] px-4 py-4 text-start">
              <p className="text-sm font-semibold text-[#071952]">{report.patientName} • {t(`severity.${report.severity}`)}</p>
              <p className="mt-1 text-[11px] text-[rgba(8,6,22,0.52)]">{report.reportId.slice(0, 12)} • {report.date}</p>
            </button>
          ))}
        </ResultCard>

        <ResultCard title={t('layout.appointments')} count={appointmentMatches.length}>
          {appointmentMatches.map((appointment) => (
            <div key={appointment.id} className="premium-card-soft rounded-[20px] px-4 py-4">
              <p className="text-sm font-semibold text-[#071952]">{appointment.patientName} • {t(`appointments.types.${appointment.type}`)}</p>
              <p className="mt-1 text-[11px] text-[rgba(8,6,22,0.52)]">{appointment.date} {appointment.time} • {appointment.status}</p>
            </div>
          ))}
        </ResultCard>

        <ResultCard title={t('layout.notifications')} count={notificationMatches.length}>
          {notificationMatches.map((notification) => (
            <div key={notification.id} className="premium-card-soft rounded-[20px] px-4 py-4">
              <p className="text-sm font-semibold text-[#071952]">{notification.title}</p>
              <p className="mt-1 line-clamp-2 text-[11px] text-[rgba(8,6,22,0.52)]">{notification.body}</p>
            </div>
          ))}
        </ResultCard>

        {role === UserRole.ADMIN && (
          <ResultCard title={t('layout.users')} count={userMatches.length}>
            {userMatches.map((user) => (
              <div key={user.id} className="premium-card-soft rounded-[20px] px-4 py-4">
                <p className="text-sm font-semibold text-[#071952]">{user.name}</p>
                <p className="mt-1 text-[11px] text-[rgba(8,6,22,0.52)]">{user.email} • {t(`roles.${user.role}`)}</p>
              </div>
            ))}
          </ResultCard>
        )}
      </div>
    </div>
  );
};

const ResultCard: React.FC<{ title: string; count: number; children: React.ReactNode }> = ({ title, count, children }) => (
  <div className="premium-card rounded-[28px] p-4">
    <div className="mb-4 flex items-center justify-between">
      <h4 className="premium-title text-xl">{title}</h4>
      <span className="premium-badge">{count}</span>
    </div>
    <div className="max-h-80 space-y-3 overflow-auto">{children}</div>
  </div>
);

export default SearchView;
