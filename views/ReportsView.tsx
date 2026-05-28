import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FirestoreReport, UserRole } from '../types';

interface ReportWithMeta extends FirestoreReport {
  patientName: string;
  doctorName: string;
}

interface ReportsViewProps {
  reports: ReportWithMeta[];
  role: UserRole;
  onOpenReport: (reportId: string) => void;
  onDeleteReport?: (reportId: string) => void | Promise<void>;
}

const ReportsView: React.FC<ReportsViewProps> = ({ reports, role, onOpenReport, onDeleteReport }) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const columnCount = role === UserRole.ADMIN ? 6 : 5;

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return reports;
    return reports.filter((report) => (
      report.reportId.toLowerCase().includes(term)
      || report.patientName.toLowerCase().includes(term)
      || report.doctorName.toLowerCase().includes(term)
      || report.severity.toLowerCase().includes(term)
    ));
  }, [reports, search]);

  const handleDelete = async (reportId: string) => {
    if (!onDeleteReport) return;
    try {
      setDeleteError('');
      await onDeleteReport(reportId);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : t('errors.reportDeleteFailed'));
    }
  };

  return (
    <div className="space-y-6">
      <section className="premium-card surface-glow rounded-[32px] px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="premium-kicker">{t('layout.reports')}</p>
            <h3 className="premium-title mt-3 text-4xl md:text-5xl">{t('layout.reports')}</h3>
            <p className="premium-subtitle mt-3 max-w-3xl text-sm md:text-base">{t('landing.featureReports')}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.search')}
              className="premium-input min-w-[17rem] py-3 text-sm"
            />
            <span className="premium-badge">{filtered.length}</span>
          </div>
        </div>
      </section>

      {deleteError && <p className="text-sm font-semibold text-red-700">{deleteError}</p>}

      <div className="premium-card rounded-[30px] p-3 md:p-4">
        <div className="overflow-auto">
          <table className="premium-table min-w-full text-left">
            <thead>
              <tr>
                <th>Report</th>
                {(role === UserRole.DOCTOR || role === UserRole.ADMIN) && <th>{t('layout.patients')}</th>}
                {(role === UserRole.PATIENT || role === UserRole.ADMIN) && <th>{t('roles.DOCTOR')}</th>}
                <th>{t('analysis.severity')}</th>
                <th>{t('common.date')}</th>
                <th className="text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((report) => (
                <tr key={report.reportId}>
                  <td>
                    <p className="text-sm font-bold text-[#071952]">{report.reportId.slice(0, 10)}</p>
                    {role !== UserRole.PATIENT && (
                      <p className="mt-1 text-[11px] text-[rgba(8,6,22,0.46)]">{(report.confidence * 100).toFixed(1)}% confidence</p>
                    )}
                  </td>
                  {(role === UserRole.DOCTOR || role === UserRole.ADMIN) && (
                    <td className="text-sm text-[rgba(8,6,22,0.7)]">{report.patientName}</td>
                  )}
                  {(role === UserRole.PATIENT || role === UserRole.ADMIN) && (
                    <td className="text-sm text-[rgba(8,6,22,0.7)]">{report.doctorName}</td>
                  )}
                  <td>
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${severityBadgeClass(report.severity)}`}>
                      {report.severity}
                    </span>
                  </td>
                  <td className="text-sm text-[rgba(8,6,22,0.56)]">{report.date}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => onOpenReport(report.reportId)} className="premium-button-primary px-3 py-2 text-xs">
                        {t('common.view')}
                      </button>
                      {onDeleteReport && role !== UserRole.PATIENT && (
                        <button
                          onClick={() => void handleDelete(report.reportId)}
                          className="rounded-[16px] border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                        >
                          {t('common.delete')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={columnCount} className="py-10 text-center text-sm text-[rgba(8,6,22,0.46)]">{t('common.noData')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function severityBadgeClass(severity: string): string {
  if (severity === 'No DR') return 'bg-green-100 text-green-700';
  if (severity === 'Mild') return 'bg-yellow-100 text-yellow-700';
  if (severity === 'Moderate') return 'bg-orange-100 text-orange-700';
  if (severity === 'Severe') return 'bg-red-100 text-red-700';
  if (severity === 'Proliferative') return 'bg-red-900 text-white';
  return 'bg-gray-100 text-gray-600';
}

export default ReportsView;
