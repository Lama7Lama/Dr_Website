import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Appointment } from '../../types';

interface PatientAppointmentsViewProps {
  appointments: Appointment[];
  assignedDoctorName?: string;
  onOpenMessages?: () => void;
}

const PatientAppointmentsView: React.FC<PatientAppointmentsViewProps> = ({
  appointments,
  assignedDoctorName,
  onOpenMessages
}) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'All' | 'Upcoming' | 'Completed' | 'Cancelled'>('All');

  const filtered = useMemo(() => {
    const items = filter === 'All' ? appointments : appointments.filter((appointment) => appointment.status === filter);
    return items
      .slice()
      .sort((left, right) => new Date(`${left.date}T${left.time}`).getTime() - new Date(`${right.date}T${right.time}`).getTime());
  }, [appointments, filter]);

  const stats = useMemo(() => {
    return {
      total: appointments.length,
      upcoming: appointments.filter((appointment) => appointment.status === 'Upcoming').length,
      completed: appointments.filter((appointment) => appointment.status === 'Completed').length,
      cancelled: appointments.filter((appointment) => appointment.status === 'Cancelled').length
    };
  }, [appointments]);

  return (
    <div className="space-y-6">
      <section className="premium-card surface-glow rounded-[32px] px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="premium-kicker">{t('patient.appointmentsTitle')}</p>
            <h3 className="premium-title mt-3 text-4xl md:text-5xl">{t('patient.appointmentsTitle')}</h3>
            <p className="premium-subtitle mt-3 max-w-2xl text-sm md:text-base">
              {assignedDoctorName ? `${t('patient.assignedDoctor')}: ${assignedDoctorName}` : t('patient.notScheduled')}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['All', 'Upcoming', 'Completed', 'Cancelled'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`${filter === value ? 'premium-button-primary' : 'premium-button-secondary'} px-4 py-2 text-xs`}
              >
                {value === 'All' ? t('common.all') : t(`appointments.statuses.${value}`)}
              </button>
            ))}
          </div>
        </div>

        {onOpenMessages && (
          <button
            type="button"
            onClick={onOpenMessages}
            className="premium-button-secondary mt-5 px-5 py-3 text-sm"
            disabled={!assignedDoctorName}
          >
            {t('patient.messageDoctor')}
          </button>
        )}
      </section>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile label={t('common.all')} value={stats.total} />
        <StatTile label={t('appointments.statuses.Upcoming')} value={stats.upcoming} />
        <StatTile label={t('appointments.statuses.Completed')} value={stats.completed} />
        <StatTile label={t('appointments.statuses.Cancelled')} value={stats.cancelled} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map((appointment) => (
          <article key={appointment.id} className="premium-card rounded-[28px] p-5 md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="premium-badge">{appointment.date}</span>
                  <span className="premium-badge">{appointment.time}</span>
                  <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${statusBadgeClass(appointment.status)}`}>
                    {t(`appointments.statuses.${appointment.status}`)}
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <AppointmentInfo label={t('roles.DOCTOR')} value={appointment.doctorName} />
                  <AppointmentInfo label={t('common.type')} value={t(`appointments.types.${appointment.type}`)} />
                  <AppointmentInfo label={t('common.status')} value={t(`appointments.statuses.${appointment.status}`)} />
                </div>
              </div>

              {appointment.notes ? (
                <div className="premium-card-soft max-w-xl rounded-[22px] px-4 py-4 lg:w-[22rem]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgba(8,6,22,0.42)]">{t('analysis.clinicalNotes')}</p>
                  <p className="mt-3 text-sm leading-7 text-[rgba(8,6,22,0.7)]">{appointment.notes}</p>
                </div>
              ) : null}
            </div>
          </article>
        ))}

        {filtered.length === 0 && (
          <div className="premium-empty rounded-[28px] p-8 text-center text-[rgba(8,6,22,0.42)]">{t('common.noData')}</div>
        )}
      </div>
    </div>
  );
};

const StatTile: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="premium-card-soft rounded-[24px] px-4 py-5">
    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgba(8,6,22,0.42)]">{label}</p>
    <p className="mt-3 text-3xl font-extrabold text-[#071952]">{value}</p>
  </div>
);

const AppointmentInfo: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="premium-card-soft rounded-[20px] px-4 py-4">
    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgba(8,6,22,0.42)]">{label}</p>
    <p className="mt-2 text-sm font-semibold text-[#071952]">{value}</p>
  </div>
);

function statusBadgeClass(status: Appointment['status']) {
  if (status === 'Upcoming') return 'bg-[#D2E0FB] text-[#071952]';
  if (status === 'Completed') return 'bg-emerald-100 text-emerald-700';
  return 'bg-rose-100 text-rose-700';
}

export default PatientAppointmentsView;
