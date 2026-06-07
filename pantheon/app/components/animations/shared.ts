export const C = {
  gold: "#FDE68A",
  goldDeep: "#F59E0B",
  crimson: "#7F1D1D",
  crimsonBright: "#991B1B",
  silver: "#F1F5F9",
  parchment: "#D4C5A9",
  bg: "#0d0a07",
} as const;

export const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
  zIndex: 9999,
};
