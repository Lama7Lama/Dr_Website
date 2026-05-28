import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ICONS } from '../../constants';
import { DoctorAnalysisSession, EyeSide } from '../../types';
import { analyzeFundusImage } from '../../services/diagnosisApi';

interface UploadViewProps {
  onAnalyze: (session: DoctorAnalysisSession) => void | Promise<void>;
  patientOptions?: Array<{ id: string; name: string; contact?: string }>;
  defaultPatientId?: string;
}

const UploadView: React.FC<UploadViewProps> = ({ onAnalyze, patientOptions = [], defaultPatientId }) => {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [targetEye, setTargetEye] = useState<EyeSide>('left');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (defaultPatientId) {
      setPatientId(defaultPatientId);
      const matchedPatient = patientOptions.find((item) => item.id === defaultPatientId);
      if (matchedPatient) setPatientName(matchedPatient.name);
    }
  }, [defaultPatientId, patientOptions]);

  useEffect(() => {
    const matchedPatient = patientOptions.find((item) => item.id === patientId.trim());
    if (matchedPatient) setPatientName(matchedPatient.name);
  }, [patientId, patientOptions]);

  const handleFile = (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      setErrorMessage(t('errors.uploadInvalidFormat'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage(t('errors.uploadMaxSize'));
      return;
    }
    setSelectedFile(file);
    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    const normalizedPatientId = patientId.trim() || `P-${Date.now().toString().slice(-6)}`;
    const normalizedPatientName = patientName.trim();
    const matchedPatient = patientOptions.find((item) => item.id === normalizedPatientId);

    if (patientOptions.length > 0 && !matchedPatient) {
      setErrorMessage(t('errors.uploadSelectRegisteredPatient'));
      return;
    }

    if (!normalizedPatientName) {
      setErrorMessage(t('errors.patientNameRequired'));
      return;
    }

    try {
      setIsAnalyzing(true);
      setErrorMessage(null);
      const response = await analyzeFundusImage(normalizedPatientId, targetEye, selectedFile);
      await onAnalyze({
        localPreviewUrl: preview || '',
        response,
        patientName: normalizedPatientName || undefined
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('errors.analysisFailed');
      setErrorMessage(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="premium-card surface-glow rounded-[32px] px-6 py-6 md:px-8">
        <p className="premium-kicker">{t('upload.title')}</p>
        <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="premium-title text-4xl md:text-5xl">{t('upload.title')}</h2>
            <p className="premium-subtitle mt-3 max-w-3xl text-sm md:text-base">{t('upload.formats')}</p>
          </div>
          <span className="premium-badge">
            <span className="h-2 w-2 rounded-full bg-[#176B87]" />
            PNG / JPG
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="premium-card rounded-[30px] p-6 md:p-7">
          <div className="space-y-5">
            {patientOptions.length > 0 && (
              <div>
                <label className="premium-kicker">{t('upload.selectPatient')}</label>
                <select
                  value={patientId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    const matchedPatient = patientOptions.find((item) => item.id === nextId);
                    setPatientId(nextId);
                    setPatientName(matchedPatient?.name || '');
                  }}
                  className="premium-select mt-3"
                >
                  <option value="">{t('upload.selectPatient')}</option>
                  {patientOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="premium-kicker">{t('upload.patientId')}</label>
                <input
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  readOnly={patientOptions.length > 0}
                  className={`premium-input mt-3 ${patientOptions.length > 0 ? 'cursor-not-allowed bg-[rgba(7,25,82,0.04)] text-[rgba(8,6,22,0.55)]' : ''}`}
                  placeholder={t('upload.patientId')}
                />
              </div>
              <div>
                <label className="premium-kicker">{t('upload.patientName')}</label>
                <input
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  readOnly={patientOptions.length > 0}
                  className={`premium-input mt-3 ${patientOptions.length > 0 ? 'cursor-not-allowed bg-[rgba(7,25,82,0.04)] text-[rgba(8,6,22,0.55)]' : ''}`}
                  placeholder={t('upload.patientName')}
                />
              </div>
            </div>

            {patientOptions.length > 0 && (
              <div className="rounded-[22px] border border-[rgba(7,25,82,0.08)] bg-[rgba(210,224,251,0.24)] px-4 py-4 text-sm leading-7 text-[rgba(8,6,22,0.62)]">
                {t('upload.patientSyncHint')}
              </div>
            )}

            <div>
              <label className="premium-kicker">{t('upload.targetEye')}</label>
              <select
                value={targetEye}
                onChange={(e) => setTargetEye(e.target.value as EyeSide)}
                className="premium-select mt-3"
              >
                <option value="left">{t('upload.leftEye')}</option>
                <option value="right">{t('upload.rightEye')}</option>
              </select>
            </div>

            <div className="rounded-[28px] border border-dashed border-[rgba(7,25,82,0.16)] bg-[linear-gradient(180deg,rgba(210,224,251,0.16),rgba(255,255,255,0.76))] p-4">
              <div className="relative flex min-h-[15rem] flex-col items-center justify-center overflow-hidden rounded-[24px] border border-white/70 bg-white/58 text-center">
                <input
                  type="file"
                  className="absolute inset-0 z-10 cursor-pointer opacity-0"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                {preview ? (
                  <img src={preview} alt="preview" className="h-full max-h-[16rem] w-full rounded-[20px] object-contain" />
                ) : (
                  <div className="space-y-3 text-[rgba(8,6,22,0.46)]">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[rgba(210,224,251,0.38)] text-[#071952]">
                      <ICONS.Upload className="h-7 w-7" />
                    </div>
                    <p className="text-base font-semibold text-[#071952]">{t('upload.hint')}</p>
                    <p className="text-sm text-[rgba(8,6,22,0.5)]">{t('upload.formats')}</p>
                  </div>
                )}
              </div>
            </div>

            <button
              disabled={!preview || isAnalyzing}
              onClick={handleAnalyze}
              className="premium-button-primary w-full px-6 py-4 text-sm disabled:translate-y-0 disabled:opacity-50"
            >
              {isAnalyzing ? t('upload.ctaLoading') : t('upload.cta')}
            </button>

            {errorMessage && <p className="text-sm font-semibold text-red-700">{errorMessage}</p>}
          </div>
        </div>

        <div className="premium-card-dark surface-glow rounded-[30px] p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="premium-kicker text-[#D2E0FB]">{t('analysis.originalImage')}</p>
              <h3 className="mt-2 text-2xl font-extrabold text-white">{t('analysis.originalImage')}</h3>
            </div>
            <span className="premium-button-ghost px-4 py-2 text-xs">Preview</span>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/6 p-4">
            <div className="mx-auto flex h-[300px] w-[300px] max-w-full items-center justify-center overflow-hidden rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.04)]">
              {preview ? (
                <img src={preview} alt="uploaded retina" className="h-[300px] w-[300px] max-w-full rounded-[20px] object-contain" />
              ) : (
                <div className="space-y-3 text-center text-white/58">
                  <ICONS.Upload className="mx-auto h-8 w-8" />
                  <p className="text-sm">{t('upload.hint')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadView;
