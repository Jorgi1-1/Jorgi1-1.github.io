import "./luma-spin.css";

/** Two rings chasing each other round a square. Draws in `currentColor`. */
export function LumaSpin() {
  return (
    <div className="relative w-[65px] aspect-square">
      <span className="absolute rounded-[50px] animate-loaderAnim shadow-[inset_0_0_0_3px_currentColor]" />
      <span className="absolute rounded-[50px] animate-loaderAnim animation-delay shadow-[inset_0_0_0_3px_currentColor]" />
    </div>
  );
}
