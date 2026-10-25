import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/** Shared editorial hierarchy; page-specific content remains in server components. */
export function PageIntro({
  title,
  body,
  icon: Icon,
  children,
}: {
  title: string;
  body?: string;
  icon?: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading app-page-heading">
      <div>
        {Icon ? (
          <span className="page-symbol" aria-hidden="true">
            <Icon size={27} strokeWidth={1.3} />
          </span>
        ) : null}
        <h1>{title}</h1>
        {body ? <p className="lead">{body}</p> : null}
        {children}
      </div>
    </header>
  );
}

export function EmptyState({
  title,
  body,
  icon: Icon,
  children,
}: {
  title: string;
  body?: string;
  icon: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <div className="app-empty-state">
      <span className="empty-symbol" aria-hidden="true">
        <Icon size={35} strokeWidth={1.2} />
      </span>
      <h2>{title}</h2>
      {body ? <p>{body}</p> : null}
      {children ? <div className="empty-actions">{children}</div> : null}
    </div>
  );
}
