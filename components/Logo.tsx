/* StokvelBook's logo: a green savings book with a gold coin */
export default function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="3" y="3" width="26" height="26" rx="8" fill="#17603f" />
      <path d="M10 9h9a3 3 0 0 1 3 3v11H13a3 3 0 0 1-3-3V9Z" fill="#fff" />
      <path d="M13 13h6M13 16.5h6M13 20h4" stroke="#17603f" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="23" cy="22" r="4.2" fill="#f2c46b" stroke="#17603f" strokeWidth="1.4" />
      <path d="M23 20v4" stroke="#17603f" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
