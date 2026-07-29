export function AvanzaLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 260" className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avanza Care">
      <defs>
        <linearGradient id="avanza-swash" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#a15a72" />
          <stop offset="100%" stopColor="#cdb2a4" />
        </linearGradient>
      </defs>

      <text x="210" y="150" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="150" fontWeight="500" fill="#1c1917">
        A
      </text>
      <circle cx="222" cy="112" r="9" fill="#c2a68e" />
      <path d="M96,152 C155,116 250,190 324,144" stroke="url(#avanza-swash)" strokeWidth="19" strokeLinecap="round" fill="none" />

      <text x="210" y="200" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="34" letterSpacing="10" fill="#1c1917">
        AVANZA CARE
      </text>

      <line x1="195" y1="217" x2="225" y2="217" stroke="#a15a72" strokeWidth="2" />

      <text x="210" y="237" textAnchor="middle" fontFamily="Georgia, serif" fontSize="12" letterSpacing="4" fill="#a8917f">
        COORDINATED CARE, COVERED
      </text>
    </svg>
  );
}
