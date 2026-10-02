// Client WHIP (WebRTC-HTTP Ingestion Protocol) minimal pour SYXTEE Cam.
// Vidéo forcée en H.264 : le Core la copie telle quelle dans le flux SRT (MPEG-TS n'accepte pas VP8/VP9).

export class WhipError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type WhipSession = { pc: RTCPeerConnection; resource: string | null };

/** Attend la fin de la collecte ICE (au plus `ms`), pour envoyer une offre complète (sans trickle). */
function gathered(pc: RTCPeerConnection, ms: number) {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise<void>((resolve) => {
    const t = setTimeout(done, ms);
    function done() {
      clearTimeout(t);
      pc.removeEventListener("icegatheringstatechange", check);
      resolve();
    }
    function check() {
      if (pc.iceGatheringState === "complete") done();
    }
    pc.addEventListener("icegatheringstatechange", check);
  });
}

export function supportsH264() {
  const caps = typeof RTCRtpSender !== "undefined" ? RTCRtpSender.getCapabilities?.("video") : null;
  return !!caps?.codecs.some((c) => c.mimeType.toLowerCase() === "video/h264");
}

/** Opus stéréo : par défaut, WebRTC envoie de l'Opus mono. On demande stéréo et 192 kb/s dans l'offre (stereo=1, sprop-stereo=1). */
export function opusStereo(sdp: string): string {
  const pt = /a=rtpmap:(\d+) opus\/48000\/2/i.exec(sdp)?.[1];
  if (!pt) return sdp;
  const params = "stereo=1;sprop-stereo=1;maxaveragebitrate=192000;useinbandfec=1";
  const fmtp = new RegExp(`a=fmtp:${pt} ([^\\r\\n]*)`);
  if (fmtp.test(sdp)) return sdp.replace(fmtp, (_m, rest: string) => `a=fmtp:${pt} ${rest.replace(/;?(stereo|sprop-stereo|maxaveragebitrate|useinbandfec)=\d+/g, "")};${params}`);
  return sdp.replace(new RegExp(`(a=rtpmap:${pt} opus\\/48000\\/2\\r?\\n)`, "i"), `$1a=fmtp:${pt} ${params}\r\n`);
}

export async function whipPublish(url: string, stream: MediaStream, maxBitrate: number, opts: { stereo?: boolean } = {}): Promise<WhipSession> {
  const pc = new RTCPeerConnection({ bundlePolicy: "max-bundle" });
  try {
    for (const track of stream.getTracks()) {
      const tr = pc.addTransceiver(track, { direction: "sendonly", streams: [stream] });
      if (track.kind === "video") {
        const codecs = RTCRtpSender.getCapabilities("video")?.codecs ?? [];
        const h264 = codecs.filter((c) => c.mimeType.toLowerCase() === "video/h264");
        if (!h264.length) throw new WhipError(0, "H.264 indisponible sur ce navigateur");
        // H.264 d'abord (profil baseline/main selon l'appareil) + codecs de protection éventuels.
        tr.setCodecPreferences?.([...h264, ...codecs.filter((c) => /rtx|red|ulpfec/i.test(c.mimeType))]);
      }
    }
    const offer = await pc.createOffer();
    await pc.setLocalDescription(opts.stereo && offer.sdp ? { type: "offer", sdp: opusStereo(offer.sdp) } : offer);
    await gathered(pc, 2500);

    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/sdp" }, body: pc.localDescription!.sdp });
    if (res.status !== 201) throw new WhipError(res.status, `WHIP ${res.status}`);
    const loc = res.headers.get("Location");
    await pc.setRemoteDescription({ type: "answer", sdp: await res.text() });

    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (sender) {
      const p = sender.getParameters();
      p.encodings = p.encodings?.length ? p.encodings : [{}];
      p.encodings[0].maxBitrate = maxBitrate;
      (p as RTCRtpSendParameters & { degradationPreference?: string }).degradationPreference = "maintain-framerate";
      await sender.setParameters(p).catch(() => {});
    }
    return { pc, resource: loc ? new URL(loc, url).href : null };
  } catch (e) {
    pc.close();
    throw e;
  }
}

/** Fin de session propre (DELETE sur la ressource WHIP), sans attendre la réponse. */
export function whipStop(s: WhipSession | null) {
  if (!s) return;
  if (s.resource) fetch(s.resource, { method: "DELETE", keepalive: true }).catch(() => {});
  s.pc.close();
}
