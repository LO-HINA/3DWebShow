interface IconProps {
  size?: number;
  className?: string;
}

export function GridIcon({ size = 16, className }: IconProps): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="1.5" y="1.5" width="5" height="5" stroke="currentColor" />
      <rect x="9.5" y="1.5" width="5" height="5" stroke="currentColor" />
      <rect x="1.5" y="9.5" width="5" height="5" stroke="currentColor" />
      <rect x="9.5" y="9.5" width="5" height="5" stroke="currentColor" />
    </svg>
  );
}

export function SlidersIcon({ size = 16, className }: IconProps): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M2 4.5h12M2 11.5h12" stroke="currentColor" />
      <circle cx="5.5" cy="4.5" r="1.8" fill="var(--bg-panel)" stroke="currentColor" />
      <circle cx="10.5" cy="11.5" r="1.8" fill="var(--bg-panel)" stroke="currentColor" />
    </svg>
  );
}

export function CloseIcon({ size = 16, className }: IconProps): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function ArrowIcon({ size = 16, className }: IconProps): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M3 13L13 3M6 3h7v7" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

export function LockIcon({ size = 14, className }: IconProps): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" stroke="currentColor" />
      <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" />
    </svg>
  );
}

export function ResetIcon({ size = 16, className }: IconProps): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M3 6.5A5.5 5.5 0 111.8 9" stroke="currentColor" />
      <path d="M1.2 2.5v4.4h4.4" stroke="currentColor" />
    </svg>
  );
}

export function CompassIcon({ size = 18, className }: IconProps): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className} aria-hidden="true">
      <circle cx="9" cy="9" r="7.2" stroke="currentColor" strokeOpacity="0.5" />
      <path d="M11.8 6.2L10.1 10l-3.9 1.8L7.9 8l3.9-1.8z" fill="currentColor" />
    </svg>
  );
}
