import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { NotificationItem } from '../types';

interface NotificationsViewProps {
  notifications: NotificationItem[];
  onMarkRead: (notificationId: string) => void | Promise<void>;
  onDelete?: (notification: NotificationItem) => void | Promise<void>;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ notifications, onMarkRead, onDelete }) => {
  const { t } = useTranslation();
  const [deleteError, setDeleteError] = useState('');

  const handleDelete = async (notification: NotificationItem) => {
    if (!onDelete) return;
    try {
      setDeleteError('');
      await onDelete(notification);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : t('errors.notificationDeleteFailed'));
    }
  };

  return (
    <div className="space-y-6">
      <section className="premium-card surface-glow rounded-[32px] px-6 py-6 md:px-8">
        <p className="premium-kicker">{t('notifications.title')}</p>
        <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h3 className="premium-title text-4xl md:text-5xl">{t('notifications.title')}</h3>
            <p className="premium-subtitle mt-3 max-w-3xl text-sm md:text-base">{t('landing.featureWorkflow')}</p>
          </div>
          <span className="premium-badge">{notifications.length}</span>
        </div>
      </section>

      {deleteError && <p className="text-sm font-semibold text-red-700">{deleteError}</p>}

      <div className="grid grid-cols-1 gap-4">
        {notifications.length === 0 && (
          <div className="premium-empty rounded-[28px] p-8 text-center text-[rgba(8,6,22,0.42)]">
            {t('notifications.empty')}
          </div>
        )}

        {notifications.map((item) => (
          <div key={item.id} className="premium-card rounded-[28px] px-5 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h4 className="text-base font-bold text-[#071952]">{item.title}</h4>
                  {!item.isRead && <span className="premium-badge">New</span>}
                </div>
                <p className="mt-3 text-sm leading-7 text-[rgba(8,6,22,0.68)]">{item.body}</p>
                <p className="mt-4 text-[11px] text-[rgba(8,6,22,0.38)]">{new Date(item.createdAt).toLocaleString()}</p>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                {!item.isRead && (
                  <button onClick={() => onMarkRead(item.id)} className="premium-button-secondary px-4 py-2 text-xs">
                    {t('notifications.markRead')}
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => void handleDelete(item)}
                    className="rounded-[16px] border border-red-100 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                  >
                    {t('common.delete')}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsView;
