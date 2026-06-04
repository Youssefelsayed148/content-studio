/**
 * Generate a deterministic gradient string from a text input.
 * Returns Tailwind gradient classes.
 */
export function generateGradient(text: string): string {
  const gradients = [
    "from-rose-500/30 to-orange-500/30",
    "from-emerald-500/30 to-teal-500/30",
    "from-blue-500/30 to-indigo-500/30",
    "from-violet-500/30 to-purple-500/30",
    "from-amber-500/30 to-yellow-500/30",
    "from-cyan-500/30 to-sky-500/30",
    "from-fuchsia-500/30 to-pink-500/30",
    "from-lime-500/30 to-green-500/30",
  ];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

/**
 * Get initials from a username or name.
 */
export function getInitials(text: string): string {
  return text
    .split(/[._\s]+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
