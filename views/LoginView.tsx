import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { UserRole } from '../types';
import { UNIVERSITY_INFO } from '../constants';

interface AuthPayload {
  mode: 'login' | 'register';
  name: string;
  email: string;
  password: string;
  role: UserRole;
  consentAccepted: boolean;
}

interface LoginViewProps {
  onLogin: (payload: AuthPayload) => void | Promise<void>;
  defaultMode?: 'login' | 'register';
  onBack?: () => void;
  notice?: string;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, defaultMode = 'login', onBack, notice }) => {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.DOCTOR);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    if (!email.trim() || !password.trim()) return false;
    if (mode === 'register' && (!name.trim() || !consentAccepted)) return false;
    return true;
  }, [email, password, mode, name, consentAccepted]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      setLoading(true);
      setError('');
      await onLogin({
        mode,
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        consentAccepted
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.authFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="premium-shell flex min-h-screen items-center justify-center overflow-hidden px-5 py-8 md:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="premium-card-dark surface-glow fade-rise rounded-[34px] p-7 md:p-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="premium-kicker text-[#D2E0FB]">{t('layout.portal')}</p>
              <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white md:text-5xl">
                {t('login.title')}
              </h1>
            </div>
            <button
              onClick={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
              className="premium-button-ghost px-4 py-3 text-xs"
            >
              {i18n.language === 'ar' ? `${t('common.en')} | ${t('common.ar')}` : `${t('common.ar')} | ${t('common.en')}`}
            </button>
          </div>

          <p className="mt-6 max-w-xl text-sm leading-8 text-white/72 md:text-base">
            {t('login.subtitle')}
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <InfoBlock title={UNIVERSITY_INFO.name} subtitle={UNIVERSITY_INFO.college} />
            <InfoBlock title={UNIVERSITY_INFO.department} subtitle={UNIVERSITY_INFO.project} />
          </div>

          <div className="premium-divider mt-10 pt-6">
            <div className="grid gap-3">
              <FeatureRow label={t('landing.featureSecure')} />
              <FeatureRow label={t('landing.featureAi')} />
              <FeatureRow label={t('landing.featureWorkflow')} />
            </div>
          </div>
        </section>

        <section className="premium-card fade-rise stagger-1 rounded-[34px] p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <p className="premium-kicker">{mode === 'login' ? t('login.signIn') : t('login.createAccount')}</p>
              <h2 className="premium-title mt-3 text-3xl md:text-4xl">
                {mode === 'login' ? t('landing.enterPortal') : t('landing.startNow')}
              </h2>
            </div>
            {onBack && (
              <button onClick={onBack} className="premium-button-secondary px-4 py-3 text-xs">
                {t('common.back')}
              </button>
            )}
          </div>

          {notice && (
            <div className="mb-5 rounded-[22px] border border-amber-200 bg-amber-50/85 px-4 py-4 text-sm text-amber-900">
              {notice}
            </div>
          )}

          <div className="mb-6 grid grid-cols-2 gap-2 rounded-[22px] bg-[rgba(210,224,251,0.32)] p-1.5">
            <button
              onClick={() => setMode('login')}
              className={`${mode === 'login' ? 'premium-button-primary' : 'premium-button-secondary border-0 bg-transparent shadow-none'} px-4 py-3 text-sm`}
              type="button"
            >
              {t('login.signIn')}
            </button>
            <button
              onClick={() => setMode('register')}
              className={`${mode === 'register' ? 'premium-button-primary' : 'premium-button-secondary border-0 bg-transparent shadow-none'} px-4 py-3 text-sm`}
              type="button"
            >
              {t('login.createAccount')}
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="premium-input"
                placeholder={t('admin.fullName')}
                required
              />
            )}

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="premium-input"
              placeholder={t('admin.email')}
              required
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="premium-input"
              placeholder={t('login.password')}
              minLength={6}
              required
            />

            {mode === 'register' && (
              <>
                <select
                  value={role}
                  className="premium-select"
                  onChange={(e) => setRole(e.target.value as UserRole)}
                >
                  <option value={UserRole.DOCTOR}>{t('roles.DOCTOR')}</option>
                  <option value={UserRole.PATIENT}>{t('roles.PATIENT')}</option>
                  <option value={UserRole.ADMIN}>{t('roles.ADMIN')}</option>
                </select>

                <label className="flex items-start gap-3 rounded-[22px] border border-[rgba(7,25,82,0.08)] bg-white/60 px-4 py-4 text-sm leading-relaxed text-[rgba(8,6,22,0.72)]">
                  <input
                    type="checkbox"
                    checked={consentAccepted}
                    onChange={(e) => setConsentAccepted(e.target.checked)}
                    className="mt-1"
                  />
                  <span>{t('login.consent')}</span>
                </label>
              </>
            )}

            {error && <p className="text-sm font-semibold text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="premium-button-primary w-full px-10 py-4 text-sm disabled:translate-y-0 disabled:opacity-50"
            >
              {loading ? t('upload.ctaLoading') : mode === 'login' ? t('login.signIn') : t('login.createAccount')}
            </button>
          </form>

        </section>
      </div>
    </div>
  );
};

const InfoBlock: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="rounded-[24px] border border-white/10 bg-white/6 p-5">
    <p className="text-sm font-semibold text-white">{title}</p>
    <p className="mt-2 text-xs leading-6 text-white/62">{subtitle}</p>
  </div>
);

const FeatureRow: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-3 rounded-[20px] border border-white/8 bg-white/6 px-4 py-3">
    <span className="h-2.5 w-2.5 rounded-full bg-[#D2E0FB]" />
    <span className="text-sm text-white/78">{label}</span>
  </div>
);

export default LoginView;
