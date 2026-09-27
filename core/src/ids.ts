import { randomBytes } from "node:crypto";

// Identifiants de stream : imprévisibles (128 bits), préfixés pour être reconnaissables dans le SLS.

const hex = () => randomBytes(16).toString("hex");

export type StreamIds = {
  publish_id: string; // Moblin publie avec celui-ci (secret : quiconque le connaît peut diffuser à ta place)
  play_id: string; // OBS lit avec celui-ci en mode Direct
  out_publish_id: string; // la régie republie la sortie avec celui-ci
  out_play_id: string; // OBS lit avec celui-ci en mode Régie
};

export function newStreamIds(): StreamIds {
  return {
    publish_id: `live_${hex()}`,
    play_id: `play_${hex()}`,
    out_publish_id: `live_out_${hex()}`,
    out_play_id: `play_out_${hex()}`,
  };
}

/** Identifiant de session court affiché sur la mire (ex. 7F3A-21C4). */
export function sessionCode() {
  const h = randomBytes(4).toString("hex").toUpperCase();
  return `${h.slice(0, 4)}-${h.slice(4)}`;
}
