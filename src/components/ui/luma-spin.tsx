import "./luma-spin.css";

// Uses `currentColor` so the spinner adapts to whatever background it sits on.
export const Component = () => {
  return (
    <div className="relative w-[65px] aspect-square">
      <span className="absolute rounded-[50px] animate-loaderAnim shadow-[inset_0_0_0_3px_currentColor]" />
      <span className="absolute rounded-[50px] animate-loaderAnim animation-delay shadow-[inset_0_0_0_3px_currentColor]" />
    </div>
  );
};
