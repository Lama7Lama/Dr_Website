import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { AuditLogEntry, User } from '../../types';

interface AdminDashboardProps {
  view: 'overview' | 'performance';
  stats: {
    totalUsers: number;
    doctors: number;
    patients: number;
    admins: number;
    totalReports: number;
    publishedReports: number;
  };
  severityDistribution: Array<{ name: string; value: number; color: string }>;
  monthlyReports: Array<{ month: string; reports: number }>;
  recentUsers: User[];
  auditLogs: AuditLogEntry[];
  onToggleStatus: (userId: string) => void | Promise<void>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  view,
  stats,
  severityDistribution,
  monthlyReports,
  recentUsers,
  auditLogs,
  onToggleStatus
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filteredLogs = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return auditLogs;
    return auditLogs.filter((log) => (
      log.action.toLowerCase().includes(term)
      || log.userId.toLowerCase().includes(term)
      || log.details.toLowerCase().includes(term)
    ));
  }, [auditLogs, search]);

  const overviewCards = [
    { label: t('admin.totalUsers'), value: stats.totalUsers, accent: 'from-[#071952] to-[#176B87]' },
    { label: t('admin.doctors'), value: stats.doctors, accent: 'from-[#176B87] to-[#071952]' },
    { label: t('admin.patients'), value: stats.patients, accent: 'from-[#D2E0FB] to-[#176B87]', darkText: true },
    { label: t('admin.totalReports'), value: stats.totalReports, accent: 'from-[#071952] to-[#080616]' },
    { label: t('admin.publishedReports'), value: stats.publishedReports, accent: 'from-[#176B87] to-[#080616]' }
  ];

  return (
    <div className="space-y-6">
      <section className="premium-card surface-glow rounded-[32px] px-6 py-6 md:px-8">
        <p className="premium-kicker">{view === 'performance' ? t('admin.performance') : t('admin.overview')}</p>
        <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h3 className="premium-title text-4xl md:text-5xl">
              {view === 'performance' ? t('admin.performance') : t('admin.overview')}
            </h3>
            <p className="premium-subtitle mt-3 max-w-3xl text-sm md:text-base">
              {t('landing.featureSecure')}
            </p>
          </div>
          <span className="premium-badge">{recentUsers.length} {t('admin.recentUsers')}</span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {overviewCards.map((card) => (
          <StatCard key={card.label} title={card.label} value={card.value} accent={card.accent} darkText={card.darkText} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="premium-card rounded-[30px] p-5 md:p-6">
          <div className="mb-5">
            <p className="premium-kicker">{t('doctor.drDistribution')}</p>
            <h4 className="premium-title mt-2 text-2xl">{t('doctor.drDistribution')}</h4>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severityDistribution} dataKey="value" nameKey="name" innerRadius={65} outerRadius={98}>
                  {severityDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="premium-card rounded-[30px] p-5 md:p-6">
          <div className="mb-5">
            <p className="premium-kicker">{t('admin.monthlyTrend')}</p>
            <h4 className="premium-title mt-2 text-2xl">{t('admin.monthlyTrend')}</h4>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyReports}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(7,25,82,0.08)" />
                <XAxis dataKey="month" stroke="#071952" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} stroke="#071952" tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="reports" fill="#176B87" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="premium-card rounded-[30px] p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="premium-kicker">{t('admin.recentUsers')}</p>
            <h4 className="premium-title mt-2 text-2xl">{t('admin.recentUsers')}</h4>
          </div>
          <span className="premium-badge">{recentUsers.length}</span>
        </div>

        <div className="overflow-auto">
          <table className="premium-table min-w-full text-left">
            <thead>
              <tr>
                <th>{t('admin.fullName')}</th>
                <th>{t('admin.role')}</th>
                <th>{t('common.status')}</th>
                <th className="text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <p className="text-sm font-semibold text-[#071952]">{user.name}</p>
                    <p className="mt-1 text-xs text-[rgba(8,6,22,0.5)]">{user.email}</p>
                  </td>
                  <td className="text-sm text-[rgba(8,6,22,0.7)]">{t(`roles.${user.role}`)}</td>
                  <td className="text-sm text-[rgba(8,6,22,0.7)]">{user.status}</td>
                  <td className="text-right">
                    <button onClick={() => onToggleStatus(user.id)} className="premium-button-secondary px-3 py-2 text-xs">
                      {user.status === 'Active' ? t('admin.disable') : t('admin.activate')}
                    </button>
                  </td>
                </tr>
              ))}
              {recentUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm text-[rgba(8,6,22,0.48)]">{t('common.noData')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="premium-card rounded-[30px] p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="premium-kicker">{t('admin.auditLogs')}</p>
            <h4 className="premium-title mt-2 text-2xl">{t('admin.auditLogs')}</h4>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.search')}
              className="premium-input min-w-[16rem] py-3 text-sm"
            />
            <button onClick={() => exportLogsToCsv(filteredLogs)} className="premium-button-primary px-4 py-3 text-sm">
              {t('admin.exportCsv')}
            </button>
          </div>
        </div>

        <div className="max-h-[340px] overflow-auto">
          <table className="premium-table min-w-full text-left">
            <thead className="sticky top-0">
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Record</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap text-sm text-[rgba(8,6,22,0.7)]">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="text-sm text-[rgba(8,6,22,0.7)]">{log.userId}</td>
                  <td className="text-sm text-[rgba(8,6,22,0.7)]">{log.action}</td>
                  <td className="text-sm text-[rgba(8,6,22,0.7)]">{log.recordId || '-'}</td>
                  <td className="text-sm text-[rgba(8,6,22,0.7)]">{log.details}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-[rgba(8,6,22,0.48)]">{t('common.noData')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: number | string; accent: string; darkText?: boolean }> = ({
  title,
  value,
  accent,
  darkText = false
}) => (
  <div className={`rounded-[28px] bg-gradient-to-br ${accent} p-[1px] shadow-[0_22px_48px_rgba(8,6,22,0.08)]`}>
    <div className={`rounded-[27px] px-5 py-5 ${darkText ? 'bg-[#fbf9f1] text-[#071952]' : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.02))] text-white'}`}>
      <p className={`text-[11px] font-bold uppercase tracking-[0.16em] ${darkText ? 'text-[rgba(8,6,22,0.46)]' : 'text-white/56'}`}>{title}</p>
      <h4 className="mt-3 text-4xl font-extrabold">{value}</h4>
    </div>
  </div>
);

function exportLogsToCsv(logs: AuditLogEntry[]) {
  const header = ['timestamp', 'userId', 'action', 'recordId', 'details', 'ip', 'userAgent'];
  const rows = logs.map((log) => [
    escapeCsv(log.timestamp),
    escapeCsv(log.userId),
    escapeCsv(log.action),
    escapeCsv(log.recordId || ''),
    escapeCsv(log.details),
    escapeCsv(log.ip || ''),
    escapeCsv(log.userAgent || '')
  ]);
  const csv = [header.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function escapeCsv(value: string): string {
  const normalized = value.replace(/"/g, '""');
  return `"${normalized}"`;
}

export default AdminDashboard;
