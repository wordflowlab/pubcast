export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient
          id="bg-gradient"
          x1="0"
          y1="0"
          x2="512"
          y2="512"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <filter
          id="drop-shadow"
          x="-20"
          y="-20"
          width="560"
          height="560"
          filterUnits="userSpaceOnUse"
        >
          <feDropShadow
            dx="0"
            dy="8"
            stdDeviation="12"
            floodColor="#000000"
            floodOpacity="0.2"
          />
        </filter>
      </defs>

      <rect
        x="32"
        y="32"
        width="448"
        height="448"
        rx="112"
        fill="url(#bg-gradient)"
      />

      <path
        d="M140 360 C140 360 200 420 372 248"
        stroke="white"
        strokeOpacity="0.1"
        strokeWidth="32"
        strokeLinecap="round"
      />
      <path
        d="M100 320 C100 320 160 380 332 208"
        stroke="white"
        strokeOpacity="0.05"
        strokeWidth="32"
        strokeLinecap="round"
      />

      <g filter="url(#drop-shadow)">
        <path d="M160 280 L380 140 L240 360 L220 280 L160 280 Z" fill="white" />
        <path d="M220 280 L380 140" stroke="#2563EB" strokeWidth="4" />
        <path d="M220 280 L240 360 L380 140" fill="#E0F2FE" />
      </g>
    </svg>
  );
}
