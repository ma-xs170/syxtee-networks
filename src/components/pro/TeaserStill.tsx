import { SceneG } from "@/components/fonctionnement/kit";
import StoryStage from "@/components/story/StoryStage";

// Image fixe du teaser (plan 5) : silhouette filaire du SYXTEE PRO de profil, en contre-jour.
// Repli sans WebGL et en prefers-reduced-motion. Repère 600 × 600, contour seul : on devine la forme sans la voir.

export default function TeaserStill() {
  return (
    <StoryStage>
      <SceneG>
        {/* Contour discret : corps, bretelle dans le dos, poignée, poche avant */}
        <g opacity={0.3}>
          <rect x={238} y={124} width={124} height={352} rx={46} fill="#000" />
          <path d="M246 160C196 214 188 330 230 452" />
          <path d="M272 124C276 92 316 92 322 124" />
          <path d="M362 262C374 300 374 420 356 458" />
        </g>
        {/* Ligne de lumière arrêtée sur l'avant du sac */}
        <path d="M322 124C352 128 362 150 362 190V262C374 300 374 420 356 458" strokeWidth={1.75} />
        <path d="M322 124C316 96 290 92 280 104" opacity={0.7} />
      </SceneG>
    </StoryStage>
  );
}
