import React from 'react';
import { useTranslation } from 'react-i18next';

import { UserRole } from '../types';
import { ICONS, UNIVERSITY_INFO } from '../constants';

interface SidebarProps {
  role: UserRole;
  activeView: string;
  isOpen: boolean;
  onNavigate: (view: string) => void;
  onClose: () => void;
  onLogout: () => void | Promise<void>;
}

const Sidebar: React.FC<SidebarProps> = ({ role, activeView, isOpen, onNavigate, onClose, onLogout }) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const doctorItems = [
    { id: 'dashboard', label: t('layout.dashboard'), icon: ICONS.Dashboard },
    { id: 'upload', label: t('layout.upload'), icon: ICONS.Upload },
    { id: 'reports', label: t('layout.reports'), icon: ICONS.Report },
    { id: 'patients', label: t('layout.patients'), icon: ICONS.Users },
    { id: 'appointments', label: t('layout.appointments'), icon: ICONS.Calendar },
    { id: 'messages', label: t('layout.followUpPlan'), icon: ICONS.Message },
    { id: 'notifications', label: t('layout.notifications'), icon: ICONS.Notification },
    { id: 'search', label: t('layout.search'), icon: ICONS.Search }
  ];

  const patientItems = [
    { id: 'dashboard', label: t('layout.dashboard'), icon: ICONS.Dashboard },
    { id: 'reports', label: t('layout.reports'), icon: ICONS.Report },
    { id: 'appointments', label: t('layout.appointments'), icon: ICONS.Calendar },
    { id: 'messages', label: t('layout.followUpPlans'), icon: ICONS.Message },
    { id: 'notifications', label: t('layout.notifications'), icon: ICONS.Notification },
    { id: 'search', label: t('layout.search'), icon: ICONS.Search }
  ];

  const adminItems = [
    { id: 'dashboard', label: t('layout.dashboard'), icon: ICONS.Dashboard },
    { id: 'reports', label: t('layout.reports'), icon: ICONS.Report },
    { id: 'users', label: t('layout.users'), icon: ICONS.Users },
    { id: 'performance', label: t('layout.performance'), icon: ICONS.Chart },
    { id: 'notifications', label: t('layout.notifications'), icon: ICONS.Notification },
    { id: 'search', label: t('layout.search'), icon: ICONS.Search }
  ];

  const items = role === UserRole.DOCTOR ? doctorItems : role === UserRole.PATIENT ? patientItems : adminItems;

  return (
    <>
      {isOpen && <button type="button" aria-hidden="true" onClick={onClose} className="fixed inset-0 z-30 bg-[rgba(8,6,22,0.42)] xl:hidden" />}
      <aside
        className={`fixed top-0 z-40 h-screen w-[18.5rem] p-4 transition-transform duration-300 ${isArabic ? 'right-0' : 'left-0'} ${
          isOpen
            ? 'translate-x-0'
            : isArabic
              ? 'translate-x-full xl:translate-x-0'
              : '-translate-x-full xl:translate-x-0'
        }`}
        aria-label="Application sidebar"
      >
        <div className="premium-card-dark surface-glow flex h-full flex-col rounded-[34px] px-4 py-5">
          <div className="mb-3 flex items-center justify-end xl:hidden">
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/8 text-white/72"
              aria-label={t('common.cancel')}
            >
              <ICONS.Close className="h-5 w-5" />
            </button>
          </div>
          <div className="px-3 pb-5 pt-2">
            <div className="mb-5 flex items-start gap-3">
              <div className="soft-float flex h-14 w-14 items-center justify-center rounded-[22px] border border-white/12 bg-white/8">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D2E0FB]">
                  <div className="h-3.5 w-3.5 rounded-full bg-[#D2E0FB]" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#D2E0FB]/90">{t('layout.portal')}</p>
                <h1 className="mt-2 text-lg font-extrabold leading-tight text-white">{t('landing.brand')}</h1>
                <p className="mt-1 text-[11px] leading-relaxed text-white/54">{UNIVERSITY_INFO.name}</p>
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/46">{t(`roles.${role}`)}</p>
              <p className="mt-2 text-sm font-semibold text-white/92">{UNIVERSITY_INFO.project}</p>
            </div>
          </div>

        <nav className="flex-1 overflow-y-auto px-2 premium-scrollbar">
          <ul className="space-y-2">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      onNavigate(item.id);
                      onClose();
                    }}
                    className={`group relative flex w-full items-center gap-3 rounded-[20px] px-4 py-3.5 text-start ${
                      isActive
                        ? 'bg-[linear-gradient(135deg,rgba(210,224,251,0.22),rgba(23,107,135,0.26))] text-white shadow-[0_18px_34px_rgba(8,6,22,0.22)]'
                        : 'text-white/64 hover:bg-white/8 hover:text-white'
                    }`}
                  >
                    <span className={`absolute inset-y-3 w-[3px] rounded-full bg-[#D2E0FB] ${isArabic ? 'right-0' : 'left-0'} ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`} />
                    <span className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${isActive ? 'border-white/18 bg-white/10' : 'border-transparent bg-white/4 group-hover:border-white/10 group-hover:bg-white/8'}`}>
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="text-sm font-semibold">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-4 border-t border-white/10 px-3 pt-4">
          <div className="mb-3 rounded-[20px] border border-white/10 bg-white/6 px-4 py-3.5">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#D2E0FB]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/56">{t('layout.systemActive')}</span>
            </div>
          </div>

          <button
            onClick={async () => {
              onClose();
              await onLogout();
            }}
            className="flex w-full items-center gap-3 rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] px-4 py-3.5 text-red-200 hover:bg-[rgba(255,95,95,0.12)] hover:text-white"
          >
            <ICONS.Logout className="h-[18px] w-[18px]" />
            <span className="text-sm font-semibold">{t('layout.signOut')}</span>
          </button>
        </div>
      </div>
      </aside>
    </>
  );
};

export default Sidebar;
