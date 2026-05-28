import React from 'react';
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

import { Appointment } from '../../types';

interface ReportRow {
  reportId: string;
  patientName: string;
  severity: string;
  confidence: number;
  date: string;
}

interface QuickPatient {
  id: string;
  name: string;
  severity: string;
  lastVisit: string;
}

interface DoctorDashboardProps {
  stats: {
    totalReports: number;
    pendingReports: number;
    totalPatients: number;
    totalAppointments: number;
  };
  severityDistribution: Array<{ name: string; value: number; color: string }>;
  monthlyReports: Array<{ month: string; reports: number }>;
  recentReports: ReportRow[];
  upcomingAppointments: Appointment[];
  quickPatients: QuickPatient[];
  onNewAnalysis: () => void;
  onOpenReport: (reportId: string) => void;
  onOpenPatient: (patientId: string) => void;
  onOpenAppointments: () => void;
}

const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  stats,
  severityDistribution,
  monthlyReports,
  recentReports,
  upcomingAppointments,
  quickPatients,
  onNewAnalysis,
  onOpenReport,
  onOpenPatient,
  onOpenAppointments
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <section className="premium-card surface-glow fade-rise rounded-[32px] px-6 py-6 md:px-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <p className="premium-kicker">{t('doctor.title')}</p>
            <h3 className="premium-title text-4xl md:text-5xl">{t('doctor.title')}</h3>
            <p className="premium-subtitle max-w-3xl text-sm md:text-base">
              {t('landing.featureWorkflow')}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={onOpenAppointments} className="premium-button-secondary px-5 py-3 text-sm">
              {t('layout.appointments')}
            </button>
            <button onClick={onNewAnalysis} className="premium-button-primary px-5 py-3 text-sm">
              {t('doctor.newAnalysis')}
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('doctor.totalReports')} value={stats.totalReports} accent="from-[#071952] to-[#176B87]" />
        <StatCard label={t('doctor.pendingReports')} value={stats.pendingReports} accent="from-[#176B87] to-[#071952]" />
        <StatCard label={t('doctor.totalPatients')} value={stats.totalPatients} accent="from-[#D2E0FB] to-[#176B87]" darkText />
        <StatCard label={t('doctor.totalAppointments')} value={stats.totalAppointments} accent="from-[#071952] to-[#080616]" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="premium-card rounded-[30px] p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="premium-kicker">{t('doctor.drDistribution')}</p>
              <h4 className="premium-title mt-2 text-2xl">{t('doctor.drDistribution')}</h4>
            </div>
            <span className="premium-badge">{severityDistribution.reduce((sum, item) => sum + item.value, 0)}</span>
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
          <div className="mt-4 flex flex-wrap gap-2">
            {severityDistribution.map((item) => (
              <span key={item.name} className="premium-badge text-[11px]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name} ({item.value})
              </span>
            ))}
          </div>
        </div>

        <div className="premium-card rounded-[30px] p-5 md:p-6">
          <div className="mb-5">
            <p className="premium-kicker">{t('doctor.monthlyReports')}</p>
            <h4 className="premium-title mt-2 text-2xl">{t('doctor.monthlyReports')}</h4>
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="premium-card xl:col-span-2 rounded-[30px] p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="premium-kicker">{t('doctor.recentReports')}</p>
              <h4 className="premium-title mt-2 text-2xl">{t('doctor.recentReports')}</h4>
            </div>
            <span className="premium-badge">{recentReports.length}</span>
          </div>

          <div className="overflow-auto">
            <table className="premium-table min-w-full text-left">
              <thead>
                <tr>
                  <th>{t('layout.patients')}</th>
                  <th>{t('analysis.severity')}</th>
                  <th>{t('analysis.confidence')}</th>
                  <th>{t('common.date')}</th>
                  <th className="text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.map((report) => (
                  <tr key={report.reportId}>
                    <td className="text-sm font-semibold text-[#071952]">{report.patientName}</td>
                    <td className="text-sm text-[rgba(8,6,22,0.74)]">{report.severity}</td>
                    <td className="text-sm text-[rgba(8,6,22,0.74)]">{(report.confidence * 100).toFixed(1)}%</td>
                    <td className="text-sm text-[rgba(8,6,22,0.58)]">{report.date}</td>
                    <td className="text-right">
                      <button onClick={() => onOpenReport(report.reportId)} className="premium-button-secondary px-3 py-2 text-xs">
                        {t('common.view')}
                      </button>
                    </td>
                  </tr>
                ))}
                {recentReports.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-[rgba(8,6,22,0.48)]">
                      {t('common.noData')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="premium-card rounded-[30px] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="premium-title text-xl">{t('doctor.upcomingAppointments')}</h4>
              <span className="premium-badge">{upcomingAppointments.length}</span>
            </div>
            <div className="space-y-3">
              {upcomingAppointments.slice(0, 5).map((appointment) => (
                <div key={appointment.id} className="premium-card-soft rounded-[22px] px-4 py-4">
                  <p className="text-sm font-semibold text-[#071952]">{appointment.patientName}</p>
                  <p className="mt-1 text-xs text-[rgba(8,6,22,0.58)]">{appointment.date} {appointment.time}</p>
                </div>
              ))}
              {upcomingAppointments.length === 0 && <p className="text-sm text-[rgba(8,6,22,0.48)]">{t('common.noData')}</p>}
            </div>
          </div>

          <div className="premium-card rounded-[30px] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="premium-title text-xl">{t('doctor.quickPatients')}</h4>
              <span className="premium-badge">{quickPatients.length}</span>
            </div>
            <div className="space-y-3">
              {quickPatients.slice(0, 5).map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => onOpenPatient(patient.id)}
                  className="premium-card-soft flex w-full flex-col items-start rounded-[22px] px-4 py-4 text-start"
                >
                  <p className="text-sm font-semibold text-[#071952]">{patient.name}</p>
                  <p className="mt-1 text-xs text-[rgba(8,6,22,0.58)]">{patient.severity} • {patient.lastVisit}</p>
                </button>
              ))}
              {quickPatients.length === 0 && <p className="text-sm text-[rgba(8,6,22,0.48)]">{t('common.noData')}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; accent: string; darkText?: boolean }> = ({ label, value, accent, darkText = false }) => (
  <div className={`rounded-[28px] bg-gradient-to-br ${accent} p-[1px] shadow-[0_22px_48px_rgba(8,6,22,0.08)]`}>
    <div className={`rounded-[27px] px-5 py-5 ${darkText ? 'bg-[#fbf9f1] text-[#071952]' : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.02))] text-white'}`}>
      <p className={`text-[11px] font-bold uppercase tracking-[0.16em] ${darkText ? 'text-[rgba(8,6,22,0.46)]' : 'text-white/56'}`}>{label}</p>
      <p className="mt-3 text-4xl font-extrabold">{value}</p>
    </div>
  </div>
);

export default DoctorDashboard;
