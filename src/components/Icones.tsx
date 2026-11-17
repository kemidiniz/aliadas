// Ícones próprios em SVG (traço 2px, herdam a cor do texto).
type P = { className?: string };
const base = (className = "h-5 w-5") => ({
  className,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});
export const IconeLinkedin = ({ className }: P) => (
  <svg {...base(className)}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7" />
  </svg>
);
export const IconeWhatsapp = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8L4 20z" />
    <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1a4 4 0 0 1-2-2l1-1-1-2L9 9.5z" />
  </svg>
);
export const IconeEmail = ({ className }: P) => (
  <svg {...base(className)}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);
export const IconeMais = ({ className }: P) => (
  <svg {...base(className)}>
    <circle cx="5" cy="12" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
  </svg>
);
export const IconeInicio = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M4 11 12 4l8 7v9H4z" />
    <path d="M10 20v-5h4v5" />
  </svg>
);
export const IconeConversas = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M4 5h12v9H8l-4 3z" />
    <path d="M16 9h4v9l-3-2h-6v-2" />
  </svg>
);
export const IconePerfil = ({ className }: P) => (
  <svg {...base(className)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);
