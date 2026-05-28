import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Appointment } from '../../types';

interface AppointmentsViewProps {
  appointments: Appointment[];
  onAdd: (app: Appointment) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onUpdateStatus: (id: string, status: Appointment['status']) => void | Promise<void>;
  patientOptions?: Array<{ id: string; name: string; contact?: string }>;
  defaultPatientId?: string;
}

const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  appointments,
  onAdd,
  onDelete,
  onUpdateStatus,
  patientOptions = [],
  defaultPatientId
}) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'All' | 'Upcoming' | 'Completed' | 'Cancelled'>('All');
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState<Partial<Appointment>>({
    type: 'Checkup',
    status: 'Upcoming',
    date: new Date().toISOString().slice(0, 10),
    time: '09:00'
  });

  useEffect(() => {
    if (!defaultPatientId) return;
    const selected = patientOptions.find((p) => p.id === defaultPatientId);
    setFormData((prev) => ({
      ...prev,
      patientId: defaultPatientId,
      patientName: selected?.name || prev.patientName || ''
    }));
    setShowForm(true);
  }, [defaultPatientId, patientOptions]);

  const doctorAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const left = `${a.date}T${a.time}`;
      const right = `${b.date}T${b.time}`;
      return new Date(right).getTime() - new Date(left).getTime();
    });
  }, [appointments]);

  const filtered = useMemo(() => {
    if (filter === 'All') return doctorAppointments;
    return doctorAppointments.filter((a) => a.status === filter);
  }, [doctorAppointments, filter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientId || !formData.patientName || !formData.date || !formData.time || !formData.type) return;
    const matchedPatient = patientOptions.find((p) => p.id === formData.patientId);
    if (patientOptions.length > 0 && !matchedPatient) {
      setFormError(t('errors.appointmentSelectRegisteredPatient'));
      return;
    }

    setFormError('');
    await onAdd({
      id: `APP-${Date.now()}`,
      patientId: formData.patientId,
      patientName: formData.patientName,
      doctorName: 'Doctor',
      date: formData.date,
      time: formData.time,
      type: formData.type as Appointment['type'],
      status: 'Upcoming',
      notes: formData.notes || ''
    });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <section className="premium-card surface-glow rounded-[32px] px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="premium-kicker">{t('layout.appointments')}</p>
            <h3 className="premium-title mt-3 text-4xl md:text-5xl">{t('layout.appointments')}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['All', 'Upcoming', 'Completed', 'Cancelled'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`${filter === f ? 'premium-button-primary' : 'premium-button-secondary'} px-4 py-2 text-xs`}
              >
                {f === 'All' ? t('common.all') : f}
              </button>
            ))}
            <button onClick={() => setShowForm(true)} className="premium-button-primary px-5 py-3 text-sm">
              {t('appointments.newAppointment')}
            </button>
          </div>
        </div>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/35 p-4 backdrop-blur-sm md:p-6">
          <div className="flex min-h-full items-center justify-center">
            <form
              onSubmit={handleSubmit}
              className="premium-card max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[34px] p-6 md:p-8"
            >
              <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
                <div className="space-y-5">
                  <div>
                    <p className="premium-kicker">{t('appointments.newAppointment')}</p>
                    <h3 className="premium-title mt-2 text-3xl md:text-4xl">{t('appointments.newAppointment')}</h3>
                    <p className="premium-subtitle mt-3 text-sm md:text-base">
                      {patientOptions.length > 0 ? t('appointments.patientSyncHint') : t('layout.appointments')}
                    </p>
                  </div>

                  <div className="premium-card-soft rounded-[26px] p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgba(8,6,22,0.42)]">{t('common.date')}</p>
                    <p className="mt-3 text-sm font-semibold text-[#071952]">{formData.date || '-'}</p>
                    <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[rgba(8,6,22,0.42)]">{t('common.time')}</p>
                    <p className="mt-3 text-sm font-semibold text-[#071952]">{formData.time || '-'}</p>
                    <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[rgba(8,6,22,0.42)]">{t('common.type')}</p>
                    <p className="mt-3 text-sm font-semibold text-[#071952]">
                      {formData.type ? t(`appointments.types.${formData.type}`) : '-'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-semibold text-[#071952]">{t('appointments.selectPatient')}</span>
                      <select
                        value={formData.patientId || ''}
                        className="premium-select"
                        onChange={(e) => {
                          const selected = patientOptions.find((p) => p.id === e.target.value);
                          setFormData({
                            ...formData,
                            patientId: e.target.value,
                            patientName: selected?.name || formData.patientName || ''
                          });
                        }}
                      >
                        <option value="">{t('appointments.selectPatient')}</option>
                        {patientOptions.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.id})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[#071952]">{t('upload.patientId')}</span>
                      <input
                        required
                        placeholder={t('upload.patientId')}
                        readOnly={patientOptions.length > 0}
                        className={`premium-input ${patientOptions.length > 0 ? 'cursor-not-allowed bg-[rgba(7,25,82,0.04)] text-[rgba(8,6,22,0.55)]' : ''}`}
                        value={formData.patientId || ''}
                        onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[#071952]">{t('admin.fullName')}</span>
                      <input
                        required
                        placeholder={t('admin.fullName')}
                        readOnly={patientOptions.length > 0}
                        className={`premium-input ${patientOptions.length > 0 ? 'cursor-not-allowed bg-[rgba(7,25,82,0.04)] text-[rgba(8,6,22,0.55)]' : ''}`}
                        value={formData.patientName || ''}
                        onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[#071952]">{t('common.date')}</span>
                      <input
                        type="date"
                        className="premium-input"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[#071952]">{t('common.time')}</span>
                      <input
                        type="time"
                        className="premium-input"
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      />
                    </label>

                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-semibold text-[#071952]">{t('common.type')}</span>
                      <select
                        className="premium-select"
                        value={formData.type || 'Checkup'}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as Appointment['type'] })}
                      >
                        <option value="Checkup">{t('appointments.types.Checkup')}</option>
                        <option value="Follow-up">{t('appointments.types.Follow-up')}</option>
                        <option value="Emergency">{t('appointments.types.Emergency')}</option>
                        <option value="Screening">{t('appointments.types.Screening')}</option>
                      </select>
                    </label>
                  </div>

                  {formError && <p className="text-sm font-semibold text-red-700">{formError}</p>}

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                    <button type="button" onClick={() => setShowForm(false)} className="premium-button-secondary flex-1 py-3 text-sm">
                      {t('common.cancel')}
                    </button>
                    <button type="submit" className="premium-button-primary flex-1 py-3 text-sm">
                      {t('common.save')}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((a) => (
          <div key={a.id} className="premium-card rounded-[28px] px-5 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-base font-semibold text-[#071952]">{a.patientName}</p>
                <p className="mt-1 text-[11px] text-[rgba(8,6,22,0.42)]">ID: {a.patientId}</p>
                <p className="mt-2 text-sm text-[rgba(8,6,22,0.6)]">{a.date} {a.time} - {a.type}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="premium-badge">{a.status}</span>
                {a.status !== 'Completed' && (
                  <button onClick={() => onUpdateStatus(a.id, 'Completed')} className="premium-button-secondary px-3 py-2 text-xs">
                    {t('appointments.complete')}
                  </button>
                )}
                {a.status !== 'Cancelled' && (
                  <button onClick={() => onUpdateStatus(a.id, 'Cancelled')} className="premium-button-secondary px-3 py-2 text-xs">
                    {t('appointments.cancelAction')}
                  </button>
                )}
                <button onClick={() => onDelete(a.id)} className="rounded-[16px] border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100">
                  {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="premium-empty rounded-[28px] p-6 text-[rgba(8,6,22,0.42)]">{t('common.noData')}</div>}
      </div>
    </div>
  );
};

export default AppointmentsView;
