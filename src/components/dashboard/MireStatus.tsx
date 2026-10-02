// Mire de coupure : native, plus un choix. Les relais passent tous par la régie du serveur : si la caméra ou le téléphone coupe,
// la mire SYXTEE prend le relais dans le flux lu par OBS en 1,5 s, puis le direct revient tout seul.
export default function MireStatus({ available }: { available: boolean }) {
  return available ? (
    <div role="status">
      <p className="flex items-center gap-2 text-sm font-medium">
        <span className="live-dot" aria-hidden="true" />
        Mire de coupure active
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Si ton téléphone ou ta caméra coupe, la mire SYXTEE prend le relais en 1,5 s dans OBS, puis le direct revient tout seul. Utilise toujours l&apos;URL OBS affichée sur la fiche du relais.
      </p>
    </div>
  ) : (
    <p className="text-sm leading-relaxed text-muted">La mire de coupure n&apos;est pas encore activée sur ce serveur. Elle s&apos;appliquera à tous tes relais dès qu&apos;elle le sera.</p>
  );
}
