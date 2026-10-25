'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, ScanEye, MoveUpRight, Leaf } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Landscape } from '@/components/landscape';
import type { SceneController } from './waterfall-scene';

export function LivingLandscape() {
  const t = useTranslations('experience');
  const root = useRef<HTMLDivElement>(null);
  const controller = useRef<SceneController | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [close, setClose] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    setEnabled(!preference.matches && !connection?.saveData);
    const change = () => {
      if (preference.matches) {
        setEnabled(false);
        setPlaying(false);
      }
    };
    preference.addEventListener('change', change);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: '150px' },
    );
    if (root.current) observer.observe(root.current);
    return () => {
      preference.removeEventListener('change', change);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!enabled || !near || failed || !root.current) return;
    let cancelled = false;
    let scene: SceneController | undefined;
    void import('./waterfall-scene')
      .then(({ createWaterfallScene }) => {
        if (cancelled || !root.current) return;
        scene = createWaterfallScene(root.current, () => setFailed(true));
        controller.current = scene;
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      scene?.dispose();
      controller.current = null;
      setReady(false);
    };
  }, [enabled, near, failed]);

  useEffect(() => {
    controller.current?.setPlaying(playing);
  }, [playing, ready]);
  useEffect(() => {
    controller.current?.setClose(close);
  }, [close, ready]);

  return (
    <div className="living-landscape" data-scene={failed ? 'fallback' : ready ? 'ready' : 'static'}>
      <div className="scene-window" role="img" aria-label={t('sceneDescription')}>
        <div
          className={`scene-fallback ${ready ? 'scene-fallback-hidden' : ''}`}
          aria-hidden="true"
        >
          <Landscape />
        </div>
        <div ref={root} className="scene-canvas" aria-hidden="true" />
        <div className="scene-location">
          <Leaf size={14} />
          <span>{t('sceneLocation')}</span>
        </div>
      </div>
      <div className="scene-toolbar">
        <p>
          <span className={ready && playing ? 'scene-indicator active' : 'scene-indicator'} />
          {t(ready ? 'livingView' : 'illustratedView')}
        </p>
        <div>
          {ready && (
            <button
              type="button"
              onClick={() => setClose((v) => !v)}
              aria-pressed={close}
              className="scene-control"
            >
              <ScanEye size={15} />
              {t(close ? 'wideView' : 'closeView')}
            </button>
          )}
          {!failed && (
            <button
              type="button"
              className="scene-control motion-control"
              aria-label={t(enabled && playing ? 'pause' : 'play')}
              onClick={() => {
                if (!enabled) {
                  setEnabled(true);
                  setPlaying(true);
                } else setPlaying((v) => !v);
              }}
            >
              {enabled && playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
          )}
        </div>
      </div>
      <p className="scene-footnote">
        <MoveUpRight size={13} />
        {t('sceneHint')}
      </p>
    </div>
  );
}
