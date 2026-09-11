const COLORS = ["#0C5FA8", "#D89B5B", "#2FA88A", "#E4574C", "#F2C94C"];

// Deterministic piece layout (no Math.random at render time) so the burst
// looks identical every time and never causes a hydration mismatch.
const PIECES = Array.from({ length: 24 }, (_, index) => ({
  left: (index * 37) % 100,
  delay: (index % 8) * 0.12,
  duration: 1.6 + (index % 5) * 0.25,
  color: COLORS[index % COLORS.length],
  rotate: (index * 53) % 360,
}));

export function ConfettiBurst() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {PIECES.map((piece, index) => (
        <span
          key={index}
          className="confetti-piece"
          style={{
            left: `${piece.left}%`,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            transform: `rotate(${piece.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
