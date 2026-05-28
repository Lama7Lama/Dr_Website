import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import MedicalText from '../../components/MedicalText';
import ProtectedImage from '../../components/ProtectedImage';
import ReviewedIndicator from '../../components/ReviewedIndicator';
import { PatientRecord } from '../../types';

interface PatientHistoryViewProps {
  records: PatientRecord[];
  onOpenReport?: (reportId: string) => void;
}

const PatientHistoryView: React.FC<PatientHistoryViewProps> = ({ records, onOpenReport }) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return records
      .filter((record) =>
        record.notes.toLowerCase().includes(search.toLowerCase()) || record.doctorName.toLowerCase().includes(search.toLowerCase())
      )
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  }, [records, search]);

  return (
    <div className="space-y-6">
      <section className="premium-card surface-glow rounded-[32px] px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="premium-kicker">{t('patient.historyTitle')}</p>
            <h3 className="premium-title mt-3 text-4xl md:text-5xl">{t('patient.historyTitle')}</h3>
            <p className="premium-subtitle mt-3 max-w-2xl text-sm md:text-base">{t('landing.featureReports')}</p>
          </div>

          <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <span className="premium-badge shrink-0">{filtered.length}</span>
            <input
              type="text"
              placeholder={t('common.search')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="premium-input w-full py-3 text-sm"
            />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map((record) => (
          <article key={record.id} className="premium-card rounded-[30px] p-5 md:p-6">
            <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
              {record.imageUrl ? (
                <div className="premium-card-soft rounded-[24px] p-4">
                  <div className="mx-auto flex h-[300px] w-[300px] max-w-full items-center justify-center">
                    <ProtectedImage
                      source={record.imageUrl}
                      alt="retina"
                      className="h-[300px] w-[300px] max-w-full rounded-[22px] border border-white/70 object-contain"
                      fallback={(
                        <div className="flex h-[300px] w-[300px] max-w-full items-center justify-center rounded-[22px] border border-dashed border-[rgba(7,25,82,0.14)] bg-white/50 text-sm text-[rgba(8,6,22,0.42)]">
                          No image
                        </div>
                      )}
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="premium-badge">{record.date}</span>
                  <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${severityBadgeClass(severityKey(record.severity))}`}>
                    {translatePatientSeverity(severityKey(record.severity), t)}
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <InfoTile label={t('roles.DOCTOR')} value={record.doctorName} />
                  <InfoTile label={t('common.date')} value={record.date} />
                </div>

                <ReviewedIndicator doctorName={record.doctorName} compact />

                <div className="premium-card-soft rounded-[22px] px-4 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgba(8,6,22,0.42)]">{t('analysis.patientAdvice')}</p>
                  <MedicalText
                    value={record.notes}
                    className="mt-3 block text-sm leading-8 text-[rgba(8,6,22,0.74)]"
                  />
                </div>

                {record.recommendations && record.recommendations.length > 0 && (
                  <div className="premium-card-soft rounded-[22px] px-4 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgba(8,6,22,0.42)]">{t('layout.followUpPlan')}</p>
                    <ul className="mt-3 space-y-2 ps-5 text-sm leading-7 text-[rgba(8,6,22,0.72)]">
                      {record.recommendations.map((recommendation, index) => (
                        <li key={`${recommendation}-${index}`}>{recommendation}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {record.reportId && (
                  <div>
                    <button onClick={() => onOpenReport?.(record.reportId!)} className="premium-button-primary px-4 py-3 text-xs">
                      {t('common.view')}
                    </button>
                  </div>
                )}
              </div>
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

const InfoTile: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="premium-card-soft rounded-[20px] px-4 py-4">
    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgba(8,6,22,0.42)]">{label}</p>
    <p className="mt-2 text-sm font-semibold text-[#071952]">{value}</p>
  </div>
);

function severityKey(value: number): 'No DR' | 'Mild' | 'Moderate' | 'Severe' | 'Proliferative' {
  if (value === 0) return 'No DR';
  if (value === 1) return 'Mild';
  if (value === 2) return 'Moderate';
  if (value === 3) return 'Severe';
  return 'Proliferative';
}

function translatePatientSeverity(
  severity: 'No DR' | 'Mild' | 'Moderate' | 'Severe' | 'Proliferative',
  t: (key: string) => string
): string {
  if (severity === 'No DR') return t('patientSeverity.No DR');
  if (severity === 'Mild') return t('patientSeverity.Mild');
  if (severity === 'Moderate') return t('patientSeverity.Moderate');
  if (severity === 'Severe') return t('patientSeverity.Severe');
  return t('patientSeverity.Proliferative');
}

function severityBadgeClass(severity: 'No DR' | 'Mild' | 'Moderate' | 'Severe' | 'Proliferative') {
  if (severity === 'No DR') return 'bg-emerald-100 text-emerald-700';
  if (severity === 'Mild') return 'bg-amber-100 text-amber-700';
  if (severity === 'Moderate') return 'bg-orange-100 text-orange-700';
  if (severity === 'Severe') return 'bg-rose-100 text-rose-700';
  return 'bg-[#071952] text-white';
}

export default PatientHistoryView;
