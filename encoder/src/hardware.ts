// Couche matériel : seul endroit où l'on sait quelle caméra et quel encodeur utiliser. Le reste de l'agent ne change pas entre le Mac et le boîtier.
export type Backend = "mac" | "test" | "rk3588";
export type Resolution = "720p30" | "1080p30" | "1080p60";

export type VideoSpec = { width: number; height: number; fps: number };

export const RESOLUTIONS: Record<Resolution, VideoSpec> = {
  "720p30": { width: 1280, height: 720, fps: 30 },
  "1080p30": { width: 1920, height: 1080, fps: 30 },
  "1080p60": { width: 1920, height: 1080, fps: 60 },
};

export type CaptureOptions = { backend: Backend; res: Resolution; bitrateKbps: number; device?: string };

/** Éléments GStreamer (jetons séparés par « ! ») de la caméra jusqu'au flux H.264 analysé. */
export function videoElements(o: CaptureOptions): string[] {
  const { width, height, fps } = RESOLUTIONS[o.res];
  const gop = fps * 2; // une image clé toutes les 2 s
  const raw = `video/x-raw,width=${width},height=${height},framerate=${fps}/1`;
  const parse = ["h264parse", "config-interval=-1"];
  switch (o.backend) {
    case "mac":
      return [
        "avfvideosrc", `device-index=${o.device ?? "0"}`, "!", "videoconvert", "!", "videoscale", "!", "videorate", "!", raw, "!",
        "vtenc_h264", `bitrate=${o.bitrateKbps}`, "realtime=true", "allow-frame-reordering=false", `max-keyframe-interval=${gop}`, "!",
        ...parse,
      ];
    case "test":
      // Sans caméra ni encodeur matériel : mire + x264 logiciel. Sert aux tests et à l'intégration continue.
      return [
        "videotestsrc", "is-live=true", `pattern=${process.env.SYXTEE_TEST_PATTERN ?? "ball"}`, "!", raw, "!",
        "x264enc", "tune=zerolatency", "speed-preset=ultrafast", `bitrate=${o.bitrateKbps}`, `key-int-max=${gop}`, "!",
        ...parse,
      ];
    case "rk3588":
      // À VALIDER sur le boîtier : caméra UVC en MJPEG, décodeur et encodeur matériels Rockchip (plugin gstreamer-rockchip-mpp).
      return [
        "v4l2src", `device=${o.device ?? "/dev/video0"}`, "!", `image/jpeg,width=${width},height=${height},framerate=${fps}/1`, "!",
        "jpegdec", "!", "videoconvert", "!",
        "mpph264enc", `bitrate=${o.bitrateKbps * 1000}`, `gop=${gop}`, "rc-mode=cbr", "!",
        ...parse,
      ];
  }
}

/** Plugins GStreamer nécessaires pour un backend (vérifiés par `doctor`). */
export function requiredPlugins(backend: Backend): string[] {
  const common = ["h264parse", "mpegtsmux", "srtsink"];
  if (backend === "mac") return ["avfvideosrc", "vtenc_h264", "videoconvert", ...common];
  if (backend === "test") return ["videotestsrc", "x264enc", ...common];
  return ["v4l2src", "jpegdec", "mpph264enc", "videoconvert", ...common];
}

export function defaultBackend(): Backend {
  return process.platform === "darwin" ? "mac" : "rk3588";
}
