'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bookmark, Check } from 'lucide-react';
export function SaveRoute({ routeId }: { routeId: string }) {
  const t = useTranslations('routeGuide');
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    try {
      setSaved(localStorage.getItem(`iguazu:route:${routeId}`) === 'saved');
    } catch {
      setError(true);
    }
    setReady(true);
  }, [routeId]);
  function toggle() {
    try {
      if (saved) localStorage.removeItem(`iguazu:route:${routeId}`);
      else localStorage.setItem(`iguazu:route:${routeId}`, 'saved');
      setSaved(!saved);
      setError(false);
    } catch {
      setError(true);
    }
  }
  return (
    <div className="route-save">
      <button type="button" disabled={!ready} aria-pressed={saved} onClick={toggle}>
        {saved ? <Check size={18} /> : <Bookmark size={18} />}
        {t(saved ? 'remove' : 'save')}
      </button>
      <p role="status">{t(error ? 'storageError' : saved ? 'saved' : 'localNote')}</p>
    </div>
  );
}
