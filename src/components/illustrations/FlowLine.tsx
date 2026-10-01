// Ligne de flux HTML (.flow-line) qui part d'un point et file vers la droite, hors de l'écran.
// À placer dans un conteneur positionné ; left et top en % ou en px.
export default function FlowLine({ left, top }: { left: string; top: string }) {
  return (
    <>
      <div className="absolute h-px w-[100vw] bg-accent/20" style={{ left, top }} />
      <div className="flow-line absolute h-px w-[100vw]" style={{ left, top }} />
    </>
  );
}
