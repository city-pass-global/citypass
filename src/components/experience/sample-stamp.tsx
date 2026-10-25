'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Stamp, RotateCcw } from 'lucide-react';
import { Landscape } from '@/components/landscape';
import { StampDetail } from './stamp-detail';

export function SampleStamp() {
  const t = useTranslations('experience');
  const [stamped, setStamped] = useState(false);
  const [pressing, setPressing] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cleanup.current?.();
    };
  }, []);
  async function press() {
    if (pressing) return;
    if (stamped) {
      setStamped(false);
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStamped(true);
      return;
    }
    setPressing(true);
    try {
      const { pressStamp } = await import('./stamp-scene');
      if (!mounted.current || !host.current) return;
      cleanup.current = pressStamp(
        host.current,
        () => setStamped(true),
        () => setPressing(false),
      );
    } catch {
      if (mounted.current) {
        setStamped(true);
        setPressing(false);
      }
    }
  }
  return (
    <div className="stamp-preview">
      <div className="stamp-paper">
        <span className="paper-caption">{t('sampleLabel')}</span>
        {stamped && (
          <StampDetail sample className="sample-seal waterfall-seal is-stamped">
            <span className="seal-landscape" aria-hidden="true">
              <Landscape />
            </span>
            <strong>{t('waterfallStamp')}</strong>
            <small>{t('viewStamp')}</small>
          </StampDetail>
        )}
        {!stamped && (
          <div className="stamp-outline" aria-hidden="true">
            <Stamp size={35} />
            <span>{t('stampWaiting')}</span>
          </div>
        )}
        <span className="paper-rule" />
        <div ref={host} className="stamp-action-canvas" aria-hidden="true" />
      </div>
      <button className="stamp-preview-button" type="button" disabled={pressing} onClick={press}>
        {stamped ? <RotateCcw size={16} /> : <Stamp size={18} />}
        {t(pressing ? 'pressingStamp' : stamped ? 'resetStamp' : 'tryStamp')}
      </button>
      <p className="sample-status" role="status">
        {t(stamped ? 'sampleOnly' : 'sampleInvite')}
      </p>
    </div>
  );
}
