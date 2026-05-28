import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ICONS } from '../constants';

interface LandingViewProps {
  onSignIn: () => void;
  onRegister: () => void;
}

interface PortalCard {
  id: 'doctor' | 'patient' | 'admin';
  title: string;
  description: string;
  icon: (props: any) => React.JSX.Element;
  accent: string;
  darkText?: boolean;
}

const LandingView: React.FC<LandingViewProps> = ({ onSignIn, onRegister }) => {
  const { t, i18n } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const portalCards: PortalCard[] = [
    {
      id: 'doctor',
      title: t('login.doctorPortal'),
      description: t('landing.doctorPortalText'),
      icon: ICONS.Upload,
      accent: 'from-[#176B87] via-[#0F5C77] to-[#071952]'
    },
    {
      id: 'patient',
      title: t('login.patientPortal'),
      description: t('landing.patientPortalText'),
      icon: ICONS.Users,
      accent: 'from-[#D2E0FB] via-[#8CB8D8] to-[#176B87]',
      darkText: true
    },
    {
      id: 'admin',
      title: t('login.adminAccess'),
      description: t('landing.adminPortalText'),
      icon: ICONS.Chart,
      accent: 'from-[#071952] via-[#0A2D6E] to-[#176B87]'
    }
  ];

  return (
    <div className="premium-shell flex min-h-screen flex-col overflow-x-hidden px-5 pb-8 pt-5 md:px-8 md:pb-10">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col">
        <header className={`sticky top-4 z-30 transition-all duration-300 ${isScrolled ? 'premium-card px-4 py-4 md:px-6' : 'px-2 py-4'}`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="premium-kicker">{t('layout.portal')}</p>
              <h1 className="premium-title mt-2 text-2xl md:text-3xl">{t('landing.brand')}</h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
                className="premium-button-secondary px-4 py-3 text-xs"
              >
                {i18n.language === 'ar' ? `${t('common.en')} | ${t('common.ar')}` : `${t('common.ar')} | ${t('common.en')}`}
              </button>
              <button type="button" onClick={onSignIn} className="premium-button-secondary px-5 py-3 text-sm">
                {t('landing.signIn')}
              </button>
              <button type="button" onClick={onRegister} className="premium-button-primary px-5 py-3 text-sm">
                {t('landing.register')}
              </button>
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col justify-center pt-12 md:pt-16">
          <section className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-center">
            <div className="space-y-6">
              <span className="premium-badge">
                <span className="h-2 w-2 rounded-full bg-[#176B87]" />
                {t('landing.badge')}
              </span>

              <div className="space-y-4">
                <h2 className="premium-title max-w-4xl text-balance text-4xl leading-[1.02] md:text-6xl xl:text-7xl">
                  {t('landing.title')}
                </h2>
              </div>
            </div>

            <div className="premium-card-soft rounded-[36px] p-6 md:p-8">
              <div className="grid gap-4">
                {portalCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <article key={card.id} className={`group rounded-[28px] bg-gradient-to-br ${card.accent} p-[1px] shadow-[0_24px_60px_rgba(8,6,22,0.08)]`}>
                      <div className={`rounded-[27px] px-5 py-5 md:px-6 md:py-6 ${card.darkText ? 'bg-[rgba(251,249,241,0.92)] text-[#071952]' : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.03))] text-white'}`}>
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-start gap-4">
                            <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border ${card.darkText ? 'border-[rgba(7,25,82,0.08)] bg-white/70 text-[#071952]' : 'border-white/12 bg-white/10 text-white'}`}>
                              <Icon className="h-6 w-6" />
                            </span>
                            <div className="space-y-2">
                              <h4 className="text-xl font-extrabold">{card.title}</h4>
                              <p className={`max-w-xl text-sm leading-7 ${card.darkText ? 'text-[rgba(8,6,22,0.66)]' : 'text-white/76'}`}>
                                {card.description}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={onSignIn}
                            className={`${card.darkText ? 'premium-button-primary' : 'premium-button-ghost border-white/20'} mt-1 px-5 py-3 text-sm group-hover:-translate-y-0.5`}
                          >
                            {t('landing.portalEnter')}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        </main>

        <footer className="flex justify-center pt-8 md:pt-10">
          <p className="text-center text-[11px] font-medium tracking-[0.08em] text-[#176B87] drop-shadow-[0_0_14px_rgba(23,107,135,0.28)] md:text-xs">
            {t('landing.credit')}
          </p>
        </footer>
      </div>
    </div>
  );
};

export default LandingView;
