import Link from "next/link";

export function Mark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden="true">
      <path d="M18 46.5c0-7.2 5.2-13.2 12.2-14.2C32.2 25.2 38.6 20 46.4 20c8.6 0 15.6 6.2 16.8 14.2 6.4.8 11.3 6.2 11.3 12.6 0 6.8-5.5 12.2-12.3 12.2H24.2C17.6 59 18 53.2 18 46.5Z" stroke="currentColor" strokeWidth="4.2" fill="none" />
      <path d="M24.5 58.8h31.2c1.6 0 2.6 1.5 2.1 3l-1.2 3.2c-.4 1-1.3 1.6-2.4 1.6H26c-1.1 0-2-.6-2.4-1.6l-1.2-3.2c-.5-1.5.5-3 2.1-3Z" fill="currentColor" />
      <circle cx="31" cy="69.2" r="3.1" fill="currentColor" />
      <circle cx="50.5" cy="69.2" r="3.1" fill="currentColor" />
      <rect x="30" y="40" width="5.2" height="11" rx="1.3" fill="#34D399" />
      <rect x="37.2" y="34.5" width="5.2" height="16.5" rx="1.3" fill="#10B981" />
      <rect x="44.4" y="28.5" width="5.2" height="22.5" rx="1.3" fill="#059669" />
      <path d="M28.5 44.5c6.2 4.2 12.8 4.6 20.2-.4" stroke="#10B981" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M45.6 39.2 51.4 43.4 44.8 45" fill="#10B981" />
    </svg>
  );
}

export function Wordmark({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className={`wordmark ${light ? "light" : ""}`}>
      <Mark />
      <span>
        <strong>تاجر</strong>
        <small>Tajer</small>
      </span>
    </Link>
  );
}
