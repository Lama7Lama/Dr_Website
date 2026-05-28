import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import MedicalText from '../components/MedicalText';
import ProtectedImage from '../components/ProtectedImage';
import ReviewedIndicator from '../components/ReviewedIndicator';
import { FirestoreReport, UserRole } from '../types';

interface ReportWithMeta extends FirestoreReport {
  patientName: string;
  doctorName: string;
}

interface ReportDetailsViewProps {
  report: ReportWithMeta | null;
  role: UserRole;
  onBack: () => void;
  onDelete?: (reportId: string) => void | Promise<void>;
}

const ReportDetailsView: React.FC<ReportDetailsViewProps> = ({ report, role, onBack, onDelete }) => {
  const { t } = useTranslation();
  const [deleteError, setDeleteError] = useState('');

  if (!report) {
    return (
      <div className="premium-card rounded-[30px] p-8 text-[rgba(8,6,22,0.56)] space-y-4">
        <p>{t('reports.noSelection')}</p>
        <button onClick={onBack} className="premium-button-primary px-4 py-3 text-sm">
          {t('common.back')}
        </button>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!onDelete) return;
    try {
      setDeleteError('');
      await onDelete(report.reportId);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : t('errors.reportDeleteFailed'));
    }
  };

  return (
    <div className="space-y-6">
      <section className="premium-card surface-glow rounded-[32px] px-6 py-6 md:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="premium-kicker">{t('layout.report_detail')}</p>
            <h3 className="premium-title mt-3 text-4xl md:text-5xl">{t('layout.report_detail')}</h3>
            <p className="mt-3 text-sm text-[rgba(8,6,22,0.52)]">{report.reportId}</p>
          </div>
          <div className="flex items-center gap-2">
            {onDelete && role !== UserRole.PATIENT && (
              <button onClick={() => void handleDelete()} className="rounded-[16px] border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100">
                {t('common.delete')}
              </button>
            )}
            <button onClick={onBack} className="premium-button-secondary px-4 py-3 text-sm">
              {t('common.back')}
            </button>
          </div>
        </div>
      </section>

      {deleteError && <p className="text-sm font-semibold text-red-700">{deleteError}</p>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="premium-card rounded-[30px] p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="premium-card-soft rounded-[26px] p-4">
              <p className="premium-kicker mb-3">{role === UserRole.PATIENT ? t('analysis.retinalImage') : t('analysis.originalImage')}</p>
              <div className="mx-auto flex h-[300px] w-[300px] max-w-full items-center justify-center">
                <ProtectedImage
                  source={report.imageUrl}
                  alt="original retina"
                  className="h-[300px] w-[300px] max-w-full rounded-[20px] border border-white/70 object-contain"
                  fallback={(
                    <div className="flex h-[300px] w-[300px] max-w-full items-center justify-center rounded-[20px] border border-dashed border-[rgba(7,25,82,0.14)] bg-white/50 text-sm text-[rgba(8,6,22,0.42)]">
                      No image available
                    </div>
                  )}
                />
              </div>
            </div>

            <div className="premium-card-soft rounded-[26px] p-4">
              <p className="premium-kicker mb-3">{role === UserRole.PATIENT ? t('analysis.visualEvidence') : t('analysis.processedImage')}</p>
              <div className="mx-auto flex h-[300px] w-[300px] max-w-full items-center justify-center">
                {report.gradcamUrl ? (
                  <ProtectedImage
                    source={report.gradcamUrl}
                    alt="heatmap retina"
                    className="h-[300px] w-[300px] max-w-full rounded-[20px] border border-white/70 object-contain"
                    fallback={(
                      <div className="flex h-[300px] w-[300px] max-w-full items-center justify-center rounded-[20px] border border-dashed border-[rgba(7,25,82,0.14)] bg-white/50 text-sm text-[rgba(8,6,22,0.42)]">
                        No heatmap available
                      </div>
                    )}
                  />
                ) : (
                  <div className="flex h-[300px] w-[300px] max-w-full items-center justify-center rounded-[20px] border border-dashed border-[rgba(7,25,82,0.14)] bg-white/50 text-sm text-[rgba(8,6,22,0.42)]">
                    No heatmap available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="premium-card rounded-[30px] p-6">
          <div className="space-y-5">
            <DetailRow label={t('analysis.severity')} value={translateSeverity(report.severity, t)} className={severityTextClass(report.severity)} />
            <DetailRow label={t('common.date')} value={report.date} />
            <DetailRow label={t('layout.patients')} value={report.patientName} />
            <DetailRow label={t('roles.DOCTOR')} value={report.doctorName} />
            {role !== UserRole.PATIENT && <DetailRow label={t('analysis.confidence')} value={`${(report.confidence * 100).toFixed(1)}%`} />}
            {role === UserRole.PATIENT && <ReviewedIndicator doctorName={report.doctorName} />}

            {role !== UserRole.PATIENT && (
              <div className="premium-divider pt-5">
                <p className="premium-kicker mb-3">{t('analysis.clinicalNotesInternal')}</p>
                <MedicalText
                  value={report.clinicalNotes || ''}
                  className="break-words text-sm leading-8 text-[rgba(8,6,22,0.74)]"
                />
              </div>
            )}

            <div className="premium-divider pt-5">
              <p className="premium-kicker mb-3">{role === UserRole.PATIENT ? t('analysis.patientAdvice') : t('analysis.medicalReportForPatient')}</p>
              <MedicalText
                value={report.medicalReport}
                className="break-words text-sm leading-8 text-[rgba(8,6,22,0.74)]"
              />
            </div>

            {report.recommendations.length > 0 && (
              <div className="premium-divider pt-5">
                <p className="premium-kicker mb-3">{role === UserRole.PATIENT ? t('layout.followUpPlan') : t('analysis.recommendations')}</p>
                <ul className="space-y-2 ps-5 text-sm leading-7 text-[rgba(8,6,22,0.74)]">
                  {report.recommendations.map((item, idx) => (
                    <li key={`${item}-${idx}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: string; className?: string }> = ({ label, value, className = 'text-[#071952]' }) => (
  <div>
    <p className="premium-kicker">{label}</p>
    <p className={`mt-3 text-sm font-semibold ${className}`}>{value}</p>
  </div>
);

function severityTextClass(severity: string): string {
  if (severity === 'No DR') return 'text-green-700';
  if (severity === 'Mild') return 'text-yellow-700';
  if (severity === 'Moderate') return 'text-orange-700';
  if (severity === 'Severe') return 'text-red-700';
  if (severity === 'Proliferative') return 'text-red-900';
  return 'text-gray-700';
}

function translateSeverity(severity: string, t: (key: string) => string): string {
  if (severity === 'No DR') return t('severity.No DR');
  if (severity === 'Mild') return t('severity.Mild');
  if (severity === 'Moderate') return t('severity.Moderate');
  if (severity === 'Severe') return t('severity.Severe');
  if (severity === 'Proliferative') return t('severity.Proliferative');
  return severity;
}

export default ReportDetailsView;
