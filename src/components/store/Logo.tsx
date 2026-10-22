import { Link } from "@tanstack/react-router";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="Tanjiro Puffs — início">
      <span className="relative grid size-9 place-items-center overflow-hidden rounded-md border border-primary/60 bg-card">
        <span className="absolute inset-0 pattern-ichimatsu opacity-80" />
        <span className="relative font-display text-lg font-bold text-primary-foreground">炭</span>
      </span>
      {!compact && (
        <span className="font-display text-lg font-bold leading-none tracking-wide">
          TANJIRO <span className="text-ember">PUFFS</span>
        </span>
      )}
    </Link>
  );
}
