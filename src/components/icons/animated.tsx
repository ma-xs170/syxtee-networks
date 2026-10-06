import { forwardRef, type ReactNode } from "react";
import type { IconProps } from "@phosphor-icons/react";

// Icônes animées « à la After Effects » : chaque icône est dessinée en parties (cloche + battant, aiguille + cadran...),
// et chaque partie a son propre mouvement logique (voir la section « Icônes animées » de globals.css).
// Même API que Phosphor (size, color, weight, mirrored) : `@/components/icons` remplace les icônes Phosphor une à une.
// Trait régulier de Phosphor : viewBox 256, trait 16, bouts ronds. `weight="fill"` remplit les formes marquées `data-f`.

const f = { "data-f": "" } as const;
const dot = { fill: "currentColor", stroke: "none" } as const;

function make(name: string, body: ReactNode) {
  const Icon = forwardRef<SVGSVGElement, IconProps>(function AnimatedIcon({ size = "1em", color, weight, mirrored, alt, style, className, children: _children, ...rest }, ref) {
    void _children;
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 256 256"
        fill="none"
        stroke="currentColor"
        strokeWidth={16}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={mirrored ? "scale(-1, 1)" : undefined}
        style={color && color !== "currentColor" ? { color, ...style } : style}
        className={`ai ai-${name}${weight === "fill" ? " ai-fill" : ""}${className ? ` ${className}` : ""}`}
        {...(rest as object)}
      >
        {alt && <title>{alt}</title>}
        {body}
      </svg>
    );
  });
  Icon.displayName = `${name}Icon`;
  return Icon;
}

export const Bell = make("bell", (<>
  <path className="bell-b" d="M56 104a72 72 0 0 1 144 0c0 36 8 56 15 68a8 8 0 0 1-7 12H48a8 8 0 0 1-7-12c7-12 15-32 15-68Z" {...f} />
  <path className="bell-c" d="M96 200a32 32 0 0 0 64 0" />
</>));

export const Gear = make("gear", (<>
  <g className="gear-t">
    <circle cx="128" cy="128" r="76" {...f} />
    <path d="M128 52V28M128 228v-24M52 128H28M228 128h-24M74 74 58 58M198 198l-16-16M182 74l16-16M58 198l16-16" />
  </g>
  <circle className="gear-c" cx="128" cy="128" r="32" />
</>));

export const Eye = make("eye", (<>
  <path className="eye-l" d="M16 128s40-72 112-72 112 72 112 72-40 72-112 72S16 128 16 128Z" />
  <circle className="eye-p" cx="128" cy="128" r="32" {...f} />
</>));

export const Broadcast = make("broadcast", (<>
  <circle className="bc-d" cx="128" cy="128" r="20" {...dot} />
  <path className="bc-1" d="M90 90a54 54 0 0 0 0 76M166 90a54 54 0 0 1 0 76" />
  <path className="bc-2" d="M60 60a96 96 0 0 0 0 136M196 60a96 96 0 0 1 0 136" />
</>));

export const Radio = make("radio", (<>
  <rect x="32" y="88" width="192" height="128" rx="16" {...f} />
  <path className="rad-a" d="M72 88 176 36" />
  <g className="rad-d"><circle cx="92" cy="152" r="24" /><path d="M92 136v16" /></g>
  <path className="rad-s" d="M152 136h40M152 168h40" />
</>));

export const Lock = make("lock", (<>
  <path className="lk-s" d="M80 104V80a48 48 0 0 1 96 0v24" />
  <rect className="lk-b" x="40" y="104" width="176" height="120" rx="16" {...f} />
  <circle className="lk-k" cx="128" cy="160" r="12" {...dot} />
</>));

export const LockKey = make("lockkey", (<>
  <path className="lk-s" d="M80 104V80a48 48 0 0 1 96 0v24" />
  <rect className="lk-b" x="40" y="104" width="176" height="120" rx="16" {...f} />
  <g className="lk-k"><circle cx="128" cy="152" r="12" {...dot} /><path d="M128 156v24" /></g>
</>));

export const LockOpen = make("lockopen", (<>
  <path className="lo-s" d="M80 104V80a48 48 0 0 1 92-19" />
  <rect x="40" y="104" width="176" height="120" rx="16" {...f} />
  <circle className="lk-k" cx="128" cy="160" r="12" {...dot} />
</>));

export const Key = make("key", (<g className="key-g">
  <circle cx="84" cy="172" r="44" />
  <path d="m116 140 104-104M184 72l32 32M156 100l20 20" />
</g>));

export const Microphone = make("mic", (<>
  <rect className="mic-c" x="96" y="24" width="64" height="120" rx="32" {...f} />
  <path className="mic-s" d="M56 120a72 72 0 0 0 144 0M128 192v32M96 224h64" />
</>));

export const Camera = make("cam", (<>
  <path d="M208 208H48a16 16 0 0 1-16-16V88a16 16 0 0 1 16-16h28l12-20h80l12 20h28a16 16 0 0 1 16 16v104a16 16 0 0 1-16 16Z" {...f} />
  <circle cx="128" cy="140" r="44" />
  <circle className="cam-i" cx="128" cy="140" r="16" {...dot} />
  <circle className="cam-f" cx="196" cy="104" r="7" {...dot} />
</>));

export const VideoCamera = make("vcam", (<>
  <rect x="24" y="64" width="152" height="128" rx="16" {...f} />
  <path className="vc-l" d="m176 112 56-32v96l-56-32Z" />
  <circle className="vc-r" cx="56" cy="100" r="9" {...dot} />
</>));

export const Record = make("record", (<>
  <circle cx="128" cy="128" r="96" />
  <circle className="rec-d" cx="128" cy="128" r="44" {...dot} />
</>));

export const Stop = make("stop", <rect className="stp" x="56" y="56" width="144" height="144" rx="16" {...f} />);

export const PaperPlaneTilt = make("plane", (<g className="pp-g">
  <path d="M224 40 32 108l76 40 40 76Z" {...f} />
  <path d="M108 148 224 40" />
</g>));

export const Trash = make("trash", (<>
  <g className="tr-l"><path d="M40 64h176" /><path d="M96 64V40a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v24" /></g>
  <path className="tr-b" d="M56 64v144a8 8 0 0 0 8 8h128a8 8 0 0 0 8-8V64M104 108v64M152 108v64" />
</>));

export const MagnifyingGlass = make("mg", (<g className="mg-g"><circle cx="112" cy="112" r="72" /><path d="m164 164 52 52" /></g>));

export const Globe = make("globe", (<>
  <circle cx="128" cy="128" r="96" />
  <ellipse className="gl-m" cx="128" cy="128" rx="44" ry="96" />
  <path className="gl-l" d="M32 128h192M48 80h160M48 176h160" />
</>));

export const Gauge = make("gauge", (<>
  <path d="M32 184a96 96 0 1 1 192 0" />
  <path className="ga-n" d="m128 184 40-68" />
  <circle cx="128" cy="184" r="12" {...dot} />
</>));

export const SlidersHorizontal = make("sliders", (<>
  <path d="M32 64h192M32 128h192M32 192h192" />
  <circle className="sl-1" cx="88" cy="64" r="20" {...dot} />
  <circle className="sl-2" cx="168" cy="128" r="20" {...dot} />
  <circle className="sl-3" cx="112" cy="192" r="20" {...dot} />
</>));

export const Faders = make("faders", (<>
  <path d="M64 32v192M128 32v192M192 32v192" />
  <circle className="fd-1" cx="64" cy="168" r="20" {...dot} />
  <circle className="fd-2" cx="128" cy="96" r="20" {...dot} />
  <circle className="fd-3" cx="192" cy="144" r="20" {...dot} />
</>));

export const ChartBar = make("cbar", (<>
  <rect className="cb-1" x="36" y="128" width="48" height="88" rx="8" {...f} />
  <rect className="cb-2" x="104" y="56" width="48" height="160" rx="8" {...f} />
  <rect className="cb-3" x="172" y="96" width="48" height="120" rx="8" {...f} />
</>));

export const ChartLineUp = make("cline", (<>
  <path d="M40 40v176h176" />
  <path className="cl-l" pathLength={1} d="m72 160 48-48 32 32 56-64" />
  <path className="cl-a" d="M168 80h32v32" />
</>));

export const WifiLow = make("wifi", (<>
  <circle className="wf-d" cx="128" cy="196" r="14" {...dot} />
  <path className="wf-1" d="M92 158a52 52 0 0 1 72 0" />
  <path className="wf-2" d="M60 124a96 96 0 0 1 136 0" />
</>));

export const Check = make("check", <path className="ck" pathLength={1} d="m40 136 56 56L216 72" />);

export const X = make("x", <g className="x-g"><path d="M200 56 56 200M200 200 56 56" /></g>);

export const CaretDown = make("cdown", <path className="cd-p" d="m48 96 80 80 80-80" />);

export const CaretUpDown = make("cupdown", (<>
  <path className="cu-u" d="m80 100 48-48 48 48" />
  <path className="cu-d" d="m80 156 48 48 48-48" />
</>));

export const ArrowLeft = make("aleft", <g className="al-g"><path d="M216 128H40M112 56l-72 72 72 72" /></g>);

export const List = make("list", (<>
  <path className="li-1" d="M40 64h176" />
  <path className="li-2" d="M40 128h176" />
  <path className="li-3" d="M40 192h176" />
</>));

export const DotsThree = make("dots", (<>
  <circle className="dt-1" cx="56" cy="128" r="14" {...dot} />
  <circle className="dt-2" cx="128" cy="128" r="14" {...dot} />
  <circle className="dt-3" cx="200" cy="128" r="14" {...dot} />
</>));

export const SignOut = make("signout", (<>
  <path d="M96 216H48a8 8 0 0 1-8-8V48a8 8 0 0 1 8-8h48" />
  <g className="so-a"><path d="m168 88 48 40-48 40M216 128H100" /></g>
</>));

export const LinkSimple = make("link", (<>
  <path className="lnk-a" d="M104 88H80a40 40 0 0 0 0 80h24" />
  <path className="lnk-b" d="M152 88h24a40 40 0 0 1 0 80h-24" />
  <path className="lnk-m" d="M96 128h64" />
</>));

export const ShareNetwork = make("share", (<>
  <path className="sh-l" d="m88 114 80-44M88 142l80 44" />
  <circle className="sh-1" cx="64" cy="128" r="28" {...f} />
  <circle className="sh-2" cx="192" cy="56" r="28" {...f} />
  <circle className="sh-3" cx="192" cy="200" r="28" {...f} />
</>));

export const PlugsConnected = make("plugs", (<>
  <g className="pl-a"><path d="M20 128h44" /><rect x="64" y="84" width="40" height="88" rx="10" {...f} /></g>
  <g className="pl-b"><rect x="152" y="84" width="40" height="88" rx="10" {...f} /><path d="M192 112h24M192 144h24" /></g>
</>));

export const UserCircle = make("user", (<>
  <circle cx="128" cy="128" r="96" />
  <circle className="us-h" cx="128" cy="112" r="32" {...f} />
  <path className="us-b" d="M62 200c14-28 40-40 66-40s52 12 66 40" />
</>));

export const Users = make("users", (<>
  <circle className="us-h" cx="92" cy="100" r="32" {...f} />
  <path className="us-b" d="M32 208c10-36 32-52 60-52s50 16 60 52" />
  <circle className="us-h2" cx="176" cy="108" r="24" />
  <path className="us-b2" d="M184 156c24 0 40 14 48 44" />
</>));

export const UsersThree = make("users3", (<>
  <circle className="us-h" cx="128" cy="92" r="32" {...f} />
  <path className="us-b" d="M72 208c8-40 28-56 56-56s48 16 56 56" />
  <circle className="us-h2" cx="40" cy="116" r="22" />
  <circle className="us-h3" cx="216" cy="116" r="22" />
</>));

export const Lifebuoy = make("buoy", (<g className="bu-g">
  <circle cx="128" cy="128" r="96" />
  <circle cx="128" cy="128" r="40" />
  <path d="M60 60l40 40M196 60l-40 40M60 196l40-40M196 196l-40-40" />
</g>));

export const Headphones = make("hp", (<>
  <path className="hp-b" d="M32 168v-40a96 96 0 0 1 192 0v40" />
  <rect className="hp-l" x="32" y="152" width="44" height="68" rx="12" {...f} />
  <rect className="hp-r" x="180" y="152" width="44" height="68" rx="12" {...f} />
</>));

export const SpeakerSimpleHigh = make("spk", (<>
  <path className="sp-c" d="M80 168H32V88h48l64-48v176Z" {...f} />
  <path className="sp-1" d="M176 104a36 36 0 0 1 0 48" />
  <path className="sp-2" d="M204 76a76 76 0 0 1 0 104" />
</>));

export const SpeakerSimpleSlash = make("spkx", (<>
  <path className="sp-c" d="M80 168H32V88h48l64-48v176Z" {...f} />
  <path className="spx-s" pathLength={1} d="M48 32l160 192" />
</>));

export const Flag = make("flag", (<>
  <path d="M56 32v192" />
  <path className="fl-f" d="M56 56c40-24 72 24 120 0v96c-48 24-80-24-120 0Z" {...f} />
</>));

export const FilmSlate = make("slate", (<>
  <path d="M40 104h176v96a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8Z" {...f} />
  <path className="fs-t" d="m36 76 176-24 8 36-176 24Z" />
</>));

export const FilmStrip = make("strip", (<>
  <clipPath id="ai-strip-clip"><rect x="40" y="40" width="176" height="176" rx="12" /></clipPath>
  <rect x="40" y="40" width="176" height="176" rx="12" />
  <path d="M88 40v176M168 40v176" />
  <g clipPath="url(#ai-strip-clip)"><path className="fm-s" d="M64 56h0M64 96h0M64 136h0M64 176h0M64 216h0M192 56h0M192 96h0M192 136h0M192 176h0M192 216h0" strokeWidth="20" /></g>
</>));

export const Robot = make("robot", (<>
  <path d="M128 88V56" />
  <circle className="rb-a" cx="128" cy="40" r="14" {...dot} />
  <rect x="48" y="88" width="160" height="120" rx="24" {...f} />
  <path d="M28 128v40M228 128v40" />
  <circle className="rb-e1" cx="96" cy="148" r="12" {...dot} />
  <circle className="rb-e2" cx="160" cy="148" r="12" {...dot} />
</>));

export const Tag = make("tag", (<g className="tg-g">
  <path d="M32 128V48a16 16 0 0 1 16-16h80l96 96a16 16 0 0 1 0 22l-58 58a16 16 0 0 1-22 0Z" {...f} />
  <circle cx="84" cy="84" r="12" {...dot} />
</g>));

export const ShieldCheck = make("shc", (<>
  <path className="sh-s" d="M40 112V56l88-32 88 32v56c0 56-36 96-88 120-52-24-88-64-88-120Z" {...f} />
  <path className="shc-c" pathLength={1} d="m92 128 28 28 52-56" />
</>));

export const ShieldWarning = make("shw", (<>
  <path className="sh-s" d="M40 112V56l88-32 88 32v56c0 56-36 96-88 120-52-24-88-64-88-120Z" {...f} />
  <path className="shw-e" d="M128 88v44" />
  <circle className="shw-e" cx="128" cy="168" r="10" {...dot} />
</>));

export const Question = make("q", (<>
  <circle cx="128" cy="128" r="96" />
  <path className="q-m" d="M104 104a24 24 0 1 1 36 21c-8 5-12 11-12 19" />
  <circle className="q-d" cx="128" cy="184" r="10" {...dot} />
</>));

export const SquaresFour = make("sq4", (<>
  <rect className="sq-1" x="40" y="40" width="72" height="72" rx="10" {...f} />
  <rect className="sq-2" x="144" y="40" width="72" height="72" rx="10" {...f} />
  <rect className="sq-3" x="40" y="144" width="72" height="72" rx="10" {...f} />
  <rect className="sq-4" x="144" y="144" width="72" height="72" rx="10" {...f} />
</>));

export const MapTrifold = make("map", (<>
  <path className="mp-m" d="M32 56l64-24 64 24 64-24v168l-64 24-64-24-64 24Z" {...f} />
  <path className="mp-1" d="M96 32v168" />
  <path className="mp-2" d="M160 56v168" />
</>));

export const ChatsCircle = make("chat", (<>
  <path d="M32 128a96 96 0 1 1 41 79L32 224l14-44a96 96 0 0 1-14-52Z" {...f} />
  <circle className="ch-1" cx="92" cy="128" r="10" {...dot} />
  <circle className="ch-2" cx="128" cy="128" r="10" {...dot} />
  <circle className="ch-3" cx="164" cy="128" r="10" {...dot} />
</>));

export const Rows = make("rows", (<>
  <rect className="rw-1" x="32" y="40" width="192" height="52" rx="10" {...f} />
  <rect className="rw-2" x="32" y="102" width="192" height="52" rx="10" {...f} />
  <rect className="rw-3" x="32" y="164" width="192" height="52" rx="10" {...f} />
</>));

export const GitMerge = make("merge", (<>
  <path className="gm-p" pathLength={1} d="M64 88v80M64 112c0 40 60 24 104 24" />
  <circle className="gm-1" cx="64" cy="64" r="24" />
  <circle className="gm-2" cx="64" cy="192" r="24" />
  <circle className="gm-3" cx="192" cy="136" r="24" />
</>));

export const ClockCounterClockwise = make("clock", (<>
  <circle cx="128" cy="128" r="96" />
  <path className="cc-m" d="M128 72v56" />
  <path className="cc-h" d="m128 128 36 24" />
</>));
