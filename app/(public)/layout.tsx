/**
 * Guest marketing / entry surfaces own their chrome (atmosphere + CTAs).
 * Authenticated decks use route-group layouts under /cases, /fictional, etc.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
