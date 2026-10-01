import type { ReactNode } from "react";
import a from "./anim.module.css";
import { BeachScene } from "./BeachView";
import { Illustration } from "./iso";

// Interface type OBS Studio en filaire, simplifiée et sans logo. Tout est piloté par `t` (0 → 1) :
// a) mise en page · b) scènes · c) sources · d) aperçu + overlay, alerte, chat · e) mixeur · f) stats
// g) « Démarrer le streaming » → LIVE · h) signal perdu → bascule auto sur BRB → retour.
// Repère : OBS_W × OBS_H.

export const OBS_W = 560;
export const OBS_H = 436;
const GREEN = "#4ade80"; // barres du mixeur audio

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ramp = (v: number, a0: number, b0: number) => {
  const x = clamp01((v - a0) / (b0 - a0));
  return x * x * (3 - 2 * x);
};

const scenes = ["IRL · LIVE", "BRB · SIGNAL PERDU", "STARTING SOON", "ENDING"];
const sources = ["Relais SYXTEE (SRT)", "Overlay", "Alertes", "Chat", "Webcam off"];
const chat = [
  ["mika_", 58],
  ["lou.tv", 40],
  ["nadia", 66],
  ["k3vin", 34],
  ["sam", 50],
] as const;

// Bruit d'image déterministe (signal perdu)
const noise = Array.from({ length: 70 }, (_, i) => ({
  x: (i * 97) % 530,
  y: (i * 53) % 220,
  w: 6 + ((i * 7) % 18),
  o: 0.15 + ((i * 13) % 10) / 20,
}));

function Txt({ x, y, children, strong = false, anchor = "start", live = false, size = "sm" }: {
  x: number;
  y: number;
  children: ReactNode;
  strong?: boolean;
  anchor?: "start" | "middle" | "end";
  live?: boolean;
  size?: "xs" | "sm" | "lg";
}) {
  const cls = { xs: "text-[11px] lg:text-[7.5px]", sm: "text-[13px] lg:text-[9px]", lg: "text-[18px] lg:text-[14px]" }[size];
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      stroke="none"
      fill={live ? "var(--live)" : strong ? "var(--foreground)" : "var(--muted)"}
      className={`font-mono ${cls}`}
      letterSpacing="0.04em"
    >
      {children}
    </text>
  );
}

export function obsState(t: number) {
  const live = t >= 0.56;
  const lost = t >= 0.66 && t < 0.88; // signal perdu
  const brb = t >= 0.72 && t < 0.88; // bascule auto
  const secs = live ? Math.floor((t - 0.56) * 600) + 1 : 0;
  const clock = [Math.floor(secs / 3600), Math.floor(secs / 60) % 60, secs % 60].map((n) => String(n).padStart(2, "0")).join(":");
  return { live, lost, brb, clock };
}

export function ObsUI({ t }: { t: number }) {
  const { live, lost, brb, clock } = obsState(t);
  const layout = ramp(t, 0, 0.08);
  const PV = { x: 10, y: 26, w: 540, h: 228 };
  const docks = [
    { title: "SCÈNES", x: 10, w: 132 },
    { title: "SOURCES", x: 148, w: 146 },
    { title: "MIXEUR AUDIO", x: 300, w: 120 },
    { title: "COMMANDES", x: 426, w: 124 },
  ];
  const DY = 262;
  const DH = 148;
  const alert = ramp(t, 0.42, 0.47) * (1 - ramp(t, 0.6, 0.64));
  const ripple = ramp(t, 0.53, 0.58);
  const selected = brb ? 1 : 0;

  return (
    <g>
      {/* Fenêtre */}
      <rect x={0} y={0} width={OBS_W} height={OBS_H} rx={8} fill="var(--background)" />
      <rect x={0} y={0} width={OBS_W} height={OBS_H} rx={8} fill="currentColor" fillOpacity={0.03} />
      <path d={`M0 18H${OBS_W}`} strokeWidth={1} opacity={0.5} />
      <Txt x={12} y={13} strong size="xs">
        OBS Studio
      </Txt>
      {[0, 1, 2].map((k) => (
        <circle key={k} cx={OBS_W - 14 - k * 10} cy={9} r={2.5} strokeWidth={1} />
      ))}

      <g opacity={layout}>
        {/* Aperçu */}
        <rect x={PV.x} y={PV.y} width={PV.w} height={PV.h} rx={3} strokeWidth={1} />
        {docks.map((d) => (
          <g key={d.title}>
            <rect x={d.x} y={DY} width={d.w} height={DH} rx={3} strokeWidth={1} />
            <path d={`M${d.x} ${DY + 16}H${d.x + d.w}`} strokeWidth={1} opacity={0.4} />
            <Txt x={d.x + 8} y={DY + 11} size="xs">
              {d.title}
            </Txt>
          </g>
        ))}
      </g>

      {/* d) Aperçu : la plage filmée par le téléphone, l'overlay, l'alerte, le chat */}
      <g opacity={ramp(t, 0.3, 0.38)}>
        <g transform={`translate(${PV.x + 2} ${PV.y + 2})`}>
          {!brb && <BeachScene w={PV.w - 128} h={PV.h - 4} />}
          {brb && (
            <g>
              <rect x={0} y={0} width={PV.w - 128} height={PV.h - 4} fill="currentColor" fillOpacity={0.04} />
              <Txt x={(PV.w - 128) / 2} y={(PV.h - 4) / 2} anchor="middle" strong size="lg">
                On revient vite !
              </Txt>
              <Txt x={(PV.w - 128) / 2} y={(PV.h - 4) / 2 + 22} anchor="middle">
                BRB · SIGNAL PERDU
              </Txt>
            </g>
          )}
          {lost && !brb && (
            <g className={a.noise}>
              {noise.map((n, i) => (
                <rect key={i} x={n.x % (PV.w - 140)} y={n.y} width={n.w} height={2} fill="currentColor" fillOpacity={n.o} stroke="none" />
              ))}
            </g>
          )}
          {/* Overlay : nom de la chaîne, heure, mini-carte */}
          {!brb && (
            <g opacity={ramp(t, 0.36, 0.42)}>
              <rect x={10} y={10} width={112} height={22} rx={3} fill="var(--background)" fillOpacity={0.6} strokeWidth={1} />
              <Txt x={18} y={25} strong>
                TA CHAÎNE · IRL
              </Txt>
              <Txt x={PV.w - 140} y={24} anchor="end" strong>
                21:42
              </Txt>
              <rect x={PV.w - 190} y={PV.h - 62} width={52} height={46} rx={3} fill="var(--background)" fillOpacity={0.6} strokeWidth={1} />
              <path d={`M${PV.w - 184} ${PV.h - 26}q10 -14 18 -8t22 -14`} strokeWidth={1} strokeDasharray="2 2" />
              <circle cx={PV.w - 144} cy={PV.h - 48} r={2.5} fill="var(--live)" stroke="none" />
            </g>
          )}
          {/* Alerte « NOUVEAU FOLLOW » qui glisse */}
          <g transform={`translate(${(PV.w - 128) / 2 - 80} ${-50 + alert * 90})`} opacity={alert}>
            <rect x={0} y={0} width={160} height={38} rx={6} fill="var(--background)" fillOpacity={0.8} strokeWidth={1.25} />
            <Txt x={80} y={16} anchor="middle" strong>
              NOUVEAU FOLLOW
            </Txt>
            <Txt x={80} y={30} anchor="middle">
              @mika_ ♥
            </Txt>
          </g>
        </g>
        {/* Chat à droite de l'aperçu */}
        <g transform={`translate(${PV.x + PV.w - 122} ${PV.y + 6})`}>
          <path d={`M-4 -4V${PV.h - 8}`} strokeWidth={1} opacity={0.4} />
          <Txt x={4} y={8} size="xs">
            CHAT
          </Txt>
          {chat.map(([name, w], i) => (
            <g key={name} opacity={ramp(t, 0.38 + i * 0.02, 0.4 + i * 0.02)}>
              <Txt x={4} y={30 + i * 36} strong size="xs">
                {name}
              </Txt>
              <path d={`M4 ${38 + i * 36}h${w}M4 ${45 + i * 36}h${w * 0.6}`} strokeWidth={1} opacity={0.5} />
            </g>
          ))}
        </g>
      </g>

      {/* b) Scènes */}
      <g>
        {scenes.map((s, i) => {
          const o = ramp(t, 0.1 + i * 0.025, 0.13 + i * 0.025);
          const sel = i === selected;
          return (
            <g key={s} opacity={o}>
              <rect x={16} y={DY + 24 + i * 26} width={120} height={20} rx={2} fill="currentColor" fillOpacity={sel ? 0.16 : 0} strokeWidth={sel ? 1.25 : 0.75} />
              <Txt x={22} y={DY + 38 + i * 26} strong={sel} size="xs">
                {s}
              </Txt>
            </g>
          );
        })}
      </g>

      {/* c) Sources, une par une */}
      <g>
        {sources.map((s, i) => (
          <g key={s} opacity={ramp(t, 0.18 + i * 0.03, 0.21 + i * 0.03)}>
            <rect x={154} y={DY + 24 + i * 23} width={9} height={9} rx={1.5} strokeWidth={1} fill="currentColor" fillOpacity={i === 4 ? 0 : 0.3} />
            <Txt x={169} y={DY + 32 + i * 23} strong={i === 0} size="xs">
              {s}
            </Txt>
          </g>
        ))}
      </g>

      {/* e) Mixeur audio : barres vertes */}
      <g opacity={ramp(t, 0.4, 0.44)}>
        {["Relais", "Micro", "Alertes"].map((l, i) => {
          const x = 312 + i * 38;
          return (
            <g key={l}>
              <rect x={x} y={DY + 26} width={10} height={DH - 52} rx={2} strokeWidth={1} />
              <rect
                x={x + 2}
                y={DY + 30}
                width={6}
                height={DH - 60}
                rx={1}
                fill={GREEN}
                fillOpacity={lost ? 0.15 : 0.8}
                stroke="none"
                className={a.meter}
                style={{ animationDelay: `${i * 0.23}s`, animationDuration: `${0.55 + i * 0.17}s` }}
              />
              <Txt x={x + 5} y={DY + DH - 10} anchor="middle" size="xs">
                {l}
              </Txt>
            </g>
          );
        })}
      </g>

      {/* g) Commandes : démarrer / arrêter le streaming */}
      <g opacity={ramp(t, 0.08, 0.12)}>
        <rect x={434} y={DY + 26} width={108} height={24} rx={4} fill="currentColor" fillOpacity={live ? 0.14 : 0.04} strokeWidth={live ? 1.25 : 1} />
        <Txt x={488} y={DY + 42} anchor="middle" strong size="xs">
          {live ? "Arrêter le streaming" : "Démarrer le streaming"}
        </Txt>
        {ripple > 0 && ripple < 1 && <circle cx={488} cy={DY + 38} r={8 + ripple * 60} strokeWidth={1.5} opacity={1 - ripple} />}
        <rect x={434} y={DY + 58} width={108} height={24} rx={4} strokeWidth={1} opacity={0.6} />
        <Txt x={488} y={DY + 74} anchor="middle" size="xs">
          Enregistrer
        </Txt>
        <rect x={434} y={DY + 90} width={108} height={24} rx={4} strokeWidth={1} opacity={0.6} />
        <Txt x={488} y={DY + 106} anchor="middle" size="xs">
          Paramètres
        </Txt>
      </g>

      {/* Badge LIVE */}
      {live && (
        <g>
          <rect x={OBS_W - 132} y={30} width={116} height={20} rx={10} fill="var(--background)" stroke="var(--live)" strokeWidth={1.25} />
          <circle cx={OBS_W - 120} cy={40} r={3} fill="var(--live)" stroke="none" className="led-blink" />
          <Txt x={OBS_W - 110} y={44} live strong size="xs">
            {`LIVE ${clock}`}
          </Txt>
        </g>
      )}

      {/* h) Bascule automatique */}
      {brb && (
        <g>
          <rect x={16} y={DY - 30} width={176} height={20} rx={3} fill="var(--background)" strokeWidth={1} strokeDasharray="3 3" />
          <Txt x={24} y={DY - 16} strong size="xs">
            BASCULE AUTO (ex. NOALBS)
          </Txt>
        </g>
      )}

      {/* f) Stats */}
      <g opacity={ramp(t, 0.46, 0.5)}>
        <path d={`M0 ${OBS_H - 20}H${OBS_W}`} strokeWidth={1} opacity={0.4} />
        <Txt x={12} y={OBS_H - 7} strong={!lost} size="xs">
          {lost ? "0 kbps · signal perdu · reconnexion…" : "6 024 kbps · 60 FPS · 0 image perdue"}
        </Txt>
      </g>
    </g>
  );
}

export default function ObsInterface({ className, animated = true, t = 0.62 }: { className?: string; animated?: boolean; t?: number }) {
  return (
    <Illustration viewBox={`-4 -4 ${OBS_W + 8} ${OBS_H + 8}`} className={className} animated={animated}>
      <ObsUI t={t} />
    </Illustration>
  );
}
