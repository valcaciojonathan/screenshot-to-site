import { Link } from "@tanstack/react-router";

const SIZES = {
  sm: "size-14", // cabeçalho
  md: "size-24", // login e painel admin
  lg: "size-40", // rodapé
} as const;

export function Logo({ size = "sm" }: { size?: keyof typeof SIZES }) {
  return (
    <Link to="/" className="group inline-flex shrink-0" aria-label="Tanjiro Puffs — início">
      <img
        src="/logo.png"
        alt="Tanjiro Puffs"
        width={640}
        height={640}
        decoding="async"
        className={`${SIZES[size]} object-contain drop-shadow-[0_4px_18px_color-mix(in_oklab,var(--primary)_35%,transparent)] transition-transform duration-300 group-hover:scale-105`}
      />
    </Link>
  );
}
