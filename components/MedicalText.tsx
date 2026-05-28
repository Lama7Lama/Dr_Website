import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { decryptMedicalText, isEncrypted } from '../services/crypto';

interface MedicalTextProps {
  value?: string | null;
  className?: string;
  emptyFallback?: string;
}

const MedicalText: React.FC<MedicalTextProps> = ({ value, className = '', emptyFallback = '-' }) => {
  const { t } = useTranslation();
  const [displayValue, setDisplayValue] = useState<string>(emptyFallback);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const resolveText = async () => {
      const trimmed = value?.trim();

      if (!trimmed) {
        setDisplayValue(emptyFallback);
        setIsLoading(false);
        return;
      }

      if (!isEncrypted(trimmed) && !looksLikeEncodedPayload(trimmed)) {
        setDisplayValue(trimmed);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const decrypted = await decryptMedicalText(trimmed);
        if (cancelled) return;

        const normalized = decrypted?.trim();
        if (!normalized || isEncrypted(normalized) || looksLikeEncodedPayload(normalized)) {
          setDisplayValue(t('analysis.noteUnavailable'));
        } else {
          setDisplayValue(normalized);
        }
      } catch {
        if (!cancelled) {
          setDisplayValue(t('analysis.noteUnavailable'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void resolveText();

    return () => {
      cancelled = true;
    };
  }, [emptyFallback, t, value]);

  if (isLoading) {
    return <span className={className}>{t('common.loading')}</span>;
  }

  return <span className={className}>{displayValue}</span>;
};

function looksLikeEncodedPayload(value: string) {
  return value.length > 72 && !/\s/.test(value) && /^[A-Za-z0-9+/=_:-]+$/.test(value);
}

export default MedicalText;
