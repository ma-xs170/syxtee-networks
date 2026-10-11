'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { createEncoder, type EncoderHandle, type Finish, type LedState, type Theme, type ViewName } from './encoder-scene';

export interface SyxteeEncoderProps {
  finish?: Finish;       // 'noir' | 'argent'
  led?: LedState;        // 'veille' | 'pret' | 'direct'
  theme?: Theme;         // 'light' | 'dark' (fond de ta page)
  view?: ViewName;       // 'q' | 'front' | 'rear' | 'top' | 'bottom'
  interactive?: boolean; // glisser pour tourner, molette pour zoomer
  fontFamily?: string;
  className?: string;
  style?: CSSProperties;
}

/** Encodeur SYXTEE en 3D. Le conteneur parent doit avoir une hauteur (ex. h-[560px]). */
export function SyxteeEncoder({
  finish = 'noir', led = 'pret', theme = 'dark', view = 'q', interactive = true, fontFamily, className, style,
}: SyxteeEncoderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handle = useRef<EncoderHandle | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      handle.current = createEncoder(canvasRef.current, { finish, led, theme, view, interactive, fontFamily });
    } catch {
      handle.current = null; // WebGL indisponible
    }
    return () => { handle.current?.dispose(); handle.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, fontFamily]);

  useEffect(() => { handle.current?.setFinish(finish); }, [finish]);
  useEffect(() => { handle.current?.setLed(led); }, [led]);
  useEffect(() => { handle.current?.setTheme(theme); }, [theme]);
  useEffect(() => { handle.current?.setView(view); }, [view]);

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} aria-label="Encodeur SYXTEE en 3D" />
    </div>
  );
}

export default SyxteeEncoder;
