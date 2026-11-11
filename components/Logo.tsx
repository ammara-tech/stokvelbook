/* StokvelBook's logo: a green passbook with a gold edge, open on its cream pages, and a gold coin */
export default function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="3" y="3" width="26" height="26" rx="8" fill="#0e3b28" stroke="#e9cf8f" strokeWidth="1.4" />
      <path d="M8 10.5c2.6-.9 5.3-.6 8 1 2.7-1.6 5.4-1.9 8-1v11c-2.6-.9-5.3-.6-8 1-2.7-1.6-5.4-1.9-8-1v-11Z" fill="#f5efe0" />
      <path d="M16 11.5v11" stroke="#0e3b28" strokeWidth="1.2" />
      <path d="M10.3 14.2c1.4-.3 2.7-.1 3.9.5M10.3 17.2c1.4-.3 2.7-.1 3.9.5" stroke="#0e3b28" strokeWidth="1" strokeLinecap="round" opacity=".55" />
      <circle cx="21.3" cy="17.6" r="3.1" fill="#e9cf8f" stroke="#0e3b28" strokeWidth="1.1" />
    </svg>
  );
}
