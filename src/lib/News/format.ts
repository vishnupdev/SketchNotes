/** "3h ago" / "just now" style relative time for a headline timestamp. */
export function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "";

  const diffSec = Math.round((Date.now() - ts) / 1000);
  if (diffSec < 60) return "just now";

  const mins = Math.round(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
