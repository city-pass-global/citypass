'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ScanLine } from 'lucide-react';
import { Button } from './ui/button';
type Detector = { detect: (video: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
export function QrCamera({
  onScan,
  successMessage,
}: {
  onScan: (value: string) => boolean;
  successMessage?: string;
}) {
  const t = useTranslations();
  const [message, setMessage] = useState('');
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  function stop(updateUi = true) {
    generation.current++;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (timer.current) clearTimeout(timer.current);
    if (video.current) video.current.srcObject = null;
    if (updateUi) {
      setRunning(false);
      setStarting(false);
    }
  }
  useEffect(() => () => stop(false), []);
  async function scan() {
    stop();
    setMessage('');
    const attempt = generation.current;
    const DetectorClass = (
      window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => Detector }
    ).BarcodeDetector;
    if (!DetectorClass) {
      setMessage(t('cameraFallback'));
      return;
    }
    setStarting(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (attempt !== generation.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      if (!video.current) {
        stop();
        return;
      }
      video.current.srcObject = media;
      await video.current.play();
      if (attempt !== generation.current) return;
      setStarting(false);
      setRunning(true);
      const detector = new DetectorClass({ formats: ['qr_code'] });
      const tick = async () => {
        if (!stream.current || attempt !== generation.current || !video.current) return;
        try {
          const results = await detector.detect(video.current);
          if (attempt !== generation.current) return;
          if (results.some((result) => onScan(result.rawValue))) {
            stop();
            if (successMessage) setMessage(successMessage);
            return;
          }
          timer.current = setTimeout(() => void tick(), 250);
        } catch {
          if (attempt !== generation.current) return;
          stop();
          setMessage(t('cameraFallback'));
        }
      };
      void tick();
    } catch {
      if (attempt === generation.current) {
        stop();
        setMessage(t('cameraFallback'));
      }
    }
  }
  return (
    <div>
      <div className="scanner" data-active={running}>
        {!running ? <ScanLine size={64} aria-hidden="true" /> : null}
        <video ref={video} muted playsInline hidden={!running} aria-label={t('scan')} />
        <p>
          {t(starting ? 'appUi.cameraStarting' : running ? 'appUi.cameraLive' : 'appUi.cameraHint')}
        </p>
      </div>
      <div className="inline-actions">
        <Button type="button" variant="outline" disabled={starting} onClick={() => void scan()}>
          {t(starting ? 'appUi.cameraStarting' : 'camera')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={!running && !starting}
          onClick={() => stop()}
        >
          {t('stopCamera')}
        </Button>
      </div>
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
