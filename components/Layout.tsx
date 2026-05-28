import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Sidebar from './Sidebar';
import { User } from '../types';
import { ICONS } from '../constants';

interface LayoutProps {
  user: User;
  activeView: string;
  unreadCount?: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onNavigate: (view: string) => void;
  onLogout: () => void | Promise<void>;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({
  user,
  activeView,
  unreadCount = 0,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onNavigate,
  onLogout,
  children
}) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const currentTitle = resolveTitle(activeView, user.role, t);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="premium-shell min-h-screen overflow-x-clip">
      <Sidebar
        role={user.role}
        activeView={activeView}
        isOpen={isSidebarOpen}
        onNavigate={onNavigate}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={onLogout}
      />

      <main className={`${isArabic ? 'xl:mr-[18.5rem]' : 'xl:ml-[18.5rem]'} min-h-screen px-4 pb-10 pt-4 md:px-6 md:pb-14 md:pt-6 xl:px-8 xl:pt-7`}>
        <div className="max-w-[1600px] mx-auto">
          <header className="relative z-20 mb-8 fade-rise">
            <div className="premium-card surface-glow topbar-motion border border-[rgba(7,25,82,0.08)] bg-[rgba(255,252,247,0.94)] px-4 py-4 md:px-6 md:py-4">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 xl:hidden">
                    <button
                      type="button"
                      onClick={() => setIsSidebarOpen(true)}
                      className="premium-card-soft flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(7,25,82,0.08)]"
                      aria-label={t('layout.openNavigation')}
                    >
                      <ICONS.Menu className="h-5 w-5 text-[#071952]" />
                    </button>
                    <span className="portal-chip">
                      <span className="portal-chip-dot" />
                      {t('layout.portal')}
                    </span>
                  </div>
                  <span className="portal-chip hidden xl:inline-flex">
                    <span className="portal-chip-dot" />
                    {t('layout.portal')}
                  </span>
                  <div className="flex flex-wrap items-end gap-3">
                    <h2 className="premium-title text-2xl md:text-3xl leading-none">{currentTitle}</h2>
                    <span className="premium-badge">
                      <span className="h-2 w-2 rounded-full bg-[#176B87]" />
                      {t(`roles.${user.role}`)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 xl:items-end">
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      onSearchSubmit();
                    }}
                    className="premium-card-soft flex w-full flex-col gap-2 rounded-[22px] border border-[rgba(7,25,82,0.08)] p-2 sm:flex-row sm:items-center xl:w-auto"
                  >
                    <div className="relative min-w-0 flex-1 xl:min-w-[18rem]">
                      <svg className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(8,6,22,0.35)] ${isArabic ? 'right-4' : 'left-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 21l-4.35-4.35m1.1-4.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        value={searchQuery}
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder={t('search.placeholder')}
                        className={`premium-input border-0 bg-transparent py-3 text-sm shadow-none ${isArabic ? 'pr-11 pl-4' : 'pl-11 pr-4'}`}
                      />
                    </div>
                    <button type="submit" className="premium-button-primary px-5 py-3 text-sm">
                      {t('layout.search')}
                    </button>
                  </form>

                  <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                    <button
                      onClick={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
                      className="premium-button-secondary px-4 py-3 text-xs"
                    >
                      {i18n.language === 'ar' ? `${t('common.en')} | ${t('common.ar')}` : `${t('common.ar')} | ${t('common.en')}`}
                    </button>

                    <button
                      onClick={() => onNavigate('notifications')}
                      className="premium-card-soft relative flex h-12 w-12 items-center justify-center rounded-2xl"
                    >
                      {unreadCount > 0 && (
                        <span className={`absolute -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#071952] px-1 text-[10px] font-bold text-white ${isArabic ? '-left-1' : '-right-1'}`}>
                          {unreadCount}
                        </span>
                      )}
                      <svg className="h-5 w-5 text-[#071952]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </button>

                    <div className="premium-card-soft flex items-center gap-3 rounded-[22px] px-4 py-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#176B87,#071952)] text-sm font-extrabold text-white shadow-[0_14px_28px_rgba(7,25,82,0.22)]">
                        {user.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#071952]">{user.name}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="fade-rise stagger-1 pb-8">{children}</div>
        </div>
      </main>
    </div>
  );
};

function resolveTitle(activeView: string, role: User['role'], t: (key: string) => string): string {
  if (activeView === 'dashboard') return t('layout.dashboard');
  if (activeView === 'upload') return t('layout.upload');
  if (activeView === 'analysis_result') return t('layout.analysis_result');
  if (activeView === 'patients') return t('layout.patients');
  if (activeView === 'appointments') return t('layout.appointments');
  if (activeView === 'history' || activeView === 'reports') return t('layout.reports');
  if (activeView === 'users') return t('layout.users');
  if (activeView === 'performance') return t('layout.performance');
  if (activeView === 'notifications') return t('layout.notifications');
  if (activeView === 'search') return t('layout.search');
  if (activeView === 'report_detail') return t('layout.report_detail');
  if (role === 'DOCTOR') return t('layout.followUpPlan');
  if (role === 'PATIENT') return t('layout.followUpPlans');
  return t('layout.messages');
}

export default Layout;
