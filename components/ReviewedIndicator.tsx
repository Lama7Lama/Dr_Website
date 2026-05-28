import React from 'react';
import { useTranslation } from 'react-i18next';

interface ReviewedIndicatorProps {
  doctorName: string;
  compact?: boolean;
}

const ReviewedIndicator: React.FC<ReviewedIndicatorProps> = ({ doctorName, compact = false }) => {
  const { t } = useTranslation();

  return (
    <div className={`rounded-[22px] border border-[rgba(23,107,135,0.16)] bg-[rgba(210,224,251,0.34)] px-4 py-4 ${compact ? '' : 'shadow-[0_16px_34px_rgba(23,107,135,0.08)]'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/88 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#176B87]">
          <span className="h-2 w-2 rounded-full bg-[#176B87]" />
          {t('reports.reviewedApproved', { name: doctorName })}
        </span>
      </div>
      <p className="mt-3 text-sm leading-7 text-[rgba(8,6,22,0.68)]">
        {t('reports.reviewedReassurance')}
      </p>
    </div>
  );
};

export default ReviewedIndicator;
