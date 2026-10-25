'use client';

import { useState, type ReactNode, type CSSProperties } from 'react';
import Link from 'next/link';
import { BookOpen, Compass } from 'lucide-react';

/** An editorial passport spread holds destination stamps, never a traveler’s collected history. */
export function LandingJourney({
  destinations,
  passportHref,
  brand,
  tagline,
  label,
}: {
  destinations: { code: string; name: string; href: string; art: ReactNode }[];
  passportHref: string;
  brand: string;
  tagline: string;
  label: string;
}) {
  const [active, setActive] = useState(0);
  return (
    <div className="journey-composition">
      <div className="journey-stamp-display">
        <div className="journey-open-passport">
          <div className="journey-passport-spread">
            {[0, 1].map((side) => (
              <div className="journey-passport-page" key={side}>
                <div className="journey-page-heading">
                  {side === 0 ? (
                    <Link className="journey-book-title" href={passportHref}>
                      <BookOpen size={18} aria-hidden="true" />
                      <span>{brand}</span>
                    </Link>
                  ) : (
                    <span className="journey-book-tagline">{tagline}</span>
                  )}
                </div>
                <Compass
                  className="journey-page-watermark"
                  size={145}
                  strokeWidth={0.5}
                  aria-hidden="true"
                />
                <div className="journey-page-stamps">
                  {destinations.map((destination, index) =>
                    index % 2 === side ? (
                      <Link
                        key={destination.code}
                        href={destination.href}
                        className={`journey-stamp country-${destination.code}`}
                        data-active={active === index}
                        data-position={index}
                        style={
                          { '--stamp-rotation': `${[-6, 5, 4, -7][index % 4]}deg` } as CSSProperties
                        }
                      >
                        <div className="journey-stamp-paper">
                          <div className="journey-stamp-picture">{destination.art}</div>
                          <span className="journey-stamp-caption">
                            {destination.name}
                            <span aria-hidden="true">{destination.code}</span>
                          </span>
                        </div>
                        <span className="journey-stamp-postmark" aria-hidden="true">
                          <Compass size={22} strokeWidth={1} />
                        </span>
                      </Link>
                    ) : null,
                  )}
                </div>
                <span className="journey-page-footer" aria-hidden="true">
                  <Compass size={14} strokeWidth={1} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="journey-destinations" role="group" aria-label={label}>
        {destinations.map((destination, index) => (
          <button
            key={destination.code}
            type="button"
            aria-pressed={active === index}
            onClick={() => setActive(index)}
          >
            {destination.name}
          </button>
        ))}
      </div>
    </div>
  );
}
