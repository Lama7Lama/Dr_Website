import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PatientRow {
  id: string;
  name: string;
  contact: string;
  lastVisit: string;
  severity: string;
}

interface PatientsViewProps {
  patients: PatientRow[];
  onOpenMessages?: (patientId: string) => void;
  onOpenAppointments?: (patientId: string) => void;
  onOpenUpload?: (patientId: string) => void;
}

const PatientsView: React.FC<PatientsViewProps> = ({
  patients,
  onOpenMessages,
  onOpenAppointments,
  onOpenUpload
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return patients.filter(
      (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())
    );
  }, [patients, search]);

  return (
    <div className="space-y-6">
      <section className="premium-card surface-glow rounded-[32px] px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="premium-kicker">{t('layout.patients')}</p>
            <h3 className="premium-title mt-3 text-4xl md:text-5xl">{t('layout.patients')}</h3>
          </div>
          <input
            type="text"
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="premium-input w-full max-w-sm py-3 text-sm"
          />
        </div>
      </section>

      <div className="premium-card rounded-[30px] p-3 md:p-4">
        <div className="overflow-auto">
          <table className="premium-table min-w-full text-left">
            <thead>
              <tr>
                <th>{t('layout.patients')}</th>
                <th>{t('common.date')}</th>
                <th>{t('analysis.severity')}</th>
                <th className="text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <p className="text-sm font-bold text-[#071952]">{p.name}</p>
                    <p className="mt-1 text-[11px] text-[rgba(8,6,22,0.42)]">{p.id} - {p.contact}</p>
                  </td>
                  <td className="text-sm text-[rgba(8,6,22,0.56)]">{p.lastVisit || '-'}</td>
                  <td>
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${severityBadgeClass(p.severity)}`}>
                      {p.severity || '-'}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="inline-flex items-center gap-2">
                      <button onClick={() => onOpenUpload?.(p.id)} className="premium-button-secondary px-3 py-2 text-[11px]">
                        {t('layout.upload')}
                      </button>
                      <button onClick={() => onOpenAppointments?.(p.id)} className="premium-button-secondary px-3 py-2 text-[11px]">
                        {t('layout.appointments')}
                      </button>
                      <button onClick={() => onOpenMessages?.(p.id)} className="premium-button-primary px-3 py-2 text-[11px]">
                        {t('common.messages')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-[rgba(8,6,22,0.42)]">{t('common.noData')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PatientsView;

function severityBadgeClass(severity: string): string {
  if (severity === 'No DR') return 'bg-green-100 text-green-700';
  if (severity === 'Mild') return 'bg-yellow-100 text-yellow-700';
  if (severity === 'Moderate') return 'bg-orange-100 text-orange-700';
  if (severity === 'Severe') return 'bg-red-100 text-red-700';
  if (severity === 'Proliferative') return 'bg-red-900 text-white';
  return 'bg-gray-100 text-gray-600';
}
