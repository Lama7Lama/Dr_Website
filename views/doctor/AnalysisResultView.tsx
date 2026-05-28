import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ImageComparisonViewer from '../../components/ImageComparisonViewer';
import { DoctorAnalysisSession, SeverityLabel } from '../../types';
import { useProtectedMediaUrl } from '../../services/useProtectedMediaUrl';

interface AnalysisResultViewProps {
  session: DoctorAnalysisSession;
  onSaveDraft?: (payload: { reportId: string; severity: SeverityLabel; medicalReport: string; clinicalNotes: string }) => void | Promise<void>;
  onPublish?: (payload: { reportId: string; severity: SeverityLabel; medicalReport: string; clinicalNotes: string }) => void | Promise<void>;
}

const severityOptions: SeverityLabel[] = ['No DR', 'Mild', 'Moderate', 'Severe', 'Proliferative'];

const AnalysisResultView: React.FC<AnalysisResultViewProps> = ({ session, onSaveDraft, onPublish }) => {
  const { t } = useTranslation();
  const { response } = session;
  const [doctorSeverity, setDoctorSeverity] = useState<SeverityLabel>(response.ai_analysis.severity);
  const [internalClinicalNotes, setInternalClinicalNotes] = useState(session.clinicalNotes || '');
  const [patientAdvice, setPatientAdvice] = useState(session.medicalReport || '');
  const [reviewState, setReviewState] = useState<'idle' | 'saved' | 'published'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const confidencePercent = (response.ai_analysis.confidence * 100).toFixed(1);
  const confidenceBreakdown = (Object.entries(response.ai_analysis.confidence_breakdown) as Array<[string, number]>)
    .sort((a, b) => Number(b[1]) - Number(a[1]));
  const { url: originalImageUrl } = useProtectedMediaUrl(
    response.preprocessing.original_image_signed_url || response.preprocessing.original_image_url
  );
  const { url: heatmapImageUrl } = useProtectedMediaUrl(
    response.ai_analysis.heatmap_signed_url
      || response.ai_analysis.heatmap_url
      || response.preprocessing.preprocessed_image_signed_url
      || response.preprocessing.preprocessed_image_url
  );
  const findings = useMemo(() => buildFindings(confidenceBreakdown), [confidenceBreakdown]);

  const handleDownload = () => {
    const payload = {
      report_id: response.report_id,
      patient_id: response.patient_id,
      severity: doctorSeverity,
      confidence: response.ai_analysis.confidence,
      clinical_notes: internalClinicalNotes,
      patient_advice: patientAdvice,
      generated_at: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${response.report_id}_analysis.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const persistReview = async (mode: 'saved' | 'published') => {
    const handler = mode === 'saved' ? onSaveDraft : onPublish;
    if (!handler) {
      setReviewState(mode);
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError('');
      await handler({
        reportId: response.report_id,
        severity: doctorSeverity,
        medicalReport: patientAdvice,
        clinicalNotes: internalClinicalNotes
      });
      setReviewState(mode);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t('errors.reportUpdateFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="premium-card surface-glow rounded-[32px] px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="premium-kicker">{t('analysis.title')}</p>
            <h2 className="premium-title mt-3 text-4xl md:text-5xl">{t('analysis.title')}</h2>
            <p className="premium-subtitle mt-3 text-sm md:text-base">
              {t('analysis.model')}: {response.ai_analysis.model_name}
            </p>
          </div>
          <button onClick={handleDownload} className="premium-button-secondary px-5 py-3 text-sm">
            {t('analysis.download')}
          </button>
        </div>
      </section>

      {originalImageUrl && heatmapImageUrl ? (
        <div className="premium-card rounded-[30px] p-5 md:p-6">
          <ImageComparisonViewer originalUrl={originalImageUrl} heatmapUrl={heatmapImageUrl} />
        </div>
      ) : (
        <div className="premium-card rounded-[30px] p-6 text-sm text-[rgba(8,6,22,0.5)]">
          Loading protected medical images...
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.94fr_1.06fr]">
        <div className="premium-card rounded-[30px] p-6">
          <div className="space-y-5">
            <div>
              <p className="premium-kicker">{t('analysis.severity')}</p>
              <p className="mt-3 text-2xl font-extrabold text-[#071952]">{t(`severity.${response.ai_analysis.severity}`)}</p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="premium-kicker">{t('analysis.confidence')}</p>
                <span className="text-xl font-extrabold text-[#071952]">{confidencePercent}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[rgba(210,224,251,0.42)]">
                <div className="h-full rounded-full bg-[linear-gradient(135deg,#176B87,#071952)]" style={{ width: `${confidencePercent}%` }} />
              </div>
            </div>

            <div className="premium-divider pt-4">
              <p className="premium-kicker">{t('analysis.classProbabilities')}</p>
              <div className="mt-4 space-y-3">
                {confidenceBreakdown.map(([label, score]) => (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-semibold text-[#071952]">{t(`severity.${label}`)}</span>
                      <span className="text-[rgba(8,6,22,0.6)]">{(Number(score) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[rgba(210,224,251,0.38)]">
                      <div className="h-full rounded-full bg-[#176B87]" style={{ width: `${Number(score) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="premium-divider pt-4">
              <p className="premium-kicker">{t('analysis.findings')}</p>
              <ul className="mt-4 space-y-2 ps-5 text-sm leading-7 text-[rgba(8,6,22,0.72)]">
                {findings.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
              </ul>
            </div>
          </div>
        </div>

        <div className="premium-card rounded-[30px] p-6">
          <div className="mb-5">
            <p className="premium-kicker">{t('analysis.doctorReview')}</p>
            <h3 className="premium-title mt-2 text-3xl">{t('analysis.doctorReview')}</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="premium-kicker">{t('analysis.overrideSeverity')}</label>
              <select
                value={doctorSeverity}
                onChange={(e) => setDoctorSeverity(e.target.value as SeverityLabel)}
                className="premium-select mt-3"
              >
                {severityOptions.map((item) => (
                  <option key={item} value={item}>{t(`severity.${item}`)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="premium-kicker">{t('analysis.clinicalNotesInternal')}</label>
              <textarea
                className="premium-textarea mt-3 h-44"
                value={internalClinicalNotes}
                onChange={(e) => setInternalClinicalNotes(e.target.value)}
              />
            </div>

            <div>
              <label className="premium-kicker">{t('analysis.patientAdvice')}</label>
              <textarea
                className="premium-textarea mt-3 h-44"
                value={patientAdvice}
                onChange={(e) => setPatientAdvice(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                onClick={() => void persistReview('saved')}
                disabled={isSubmitting}
                className="premium-button-secondary px-4 py-4 text-sm disabled:translate-y-0 disabled:opacity-60"
              >
                {t('analysis.saveDraft')}
              </button>
              <button
                onClick={() => void persistReview('published')}
                disabled={isSubmitting}
                className="premium-button-primary px-4 py-4 text-sm disabled:translate-y-0 disabled:opacity-60"
              >
                {t('analysis.publish')}
              </button>
            </div>

            <div className="rounded-[24px] border border-[rgba(7,25,82,0.08)] bg-[rgba(210,224,251,0.22)] px-4 py-4 text-sm leading-7 text-[rgba(8,6,22,0.66)]">
              {t('analysis.reviewNote')} {t(`severity.${doctorSeverity}`)}.
            </div>

            {submitError && <p className="text-sm font-semibold text-red-700">{submitError}</p>}
            {reviewState !== 'idle' && (
              <p className="text-sm font-semibold text-green-700">
                {reviewState === 'saved' ? t('analysis.savedState') : t('analysis.publishedState')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function buildFindings(confidenceBreakdown: Array<[string, number]>): string[] {
  if (confidenceBreakdown.length === 0) return ['No findings generated'];
  return confidenceBreakdown.slice(0, 3).map(([label, score], index) => {
    if (index === 0) return `${label}: dominant signal in retinal regions (${(score * 100).toFixed(1)}%).`;
    if (index === 1) return `${label}: secondary probability requiring clinical review (${(score * 100).toFixed(1)}%).`;
    return `${label}: low-probability differential (${(score * 100).toFixed(1)}%).`;
  });
}

export default AnalysisResultView;
