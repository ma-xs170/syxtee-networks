#!/usr/bin/env node
// Test de charge : plusieurs visiteurs en même temps sur les pages publiques de SYXTEE.
//
//   node scripts/load-test.mjs --url http://localhost:3000 --visitors 50 --seconds 30
//
// Chaque « visiteur » enchaîne des pages au hasard avec une courte pause, comme un vrai lecteur.
// Sortie : requêtes, débit, erreurs, codes HTTP, temps de réponse (médiane, p95, p99).
// Code de sortie 1 si plus de 1 % d'erreurs ou si le p95 dépasse --max-p95 (3000 ms par défaut) : utilisable en CI.
//
// À lancer seulement contre TON site (local, aperçu Vercel ou production en heure creuse), jamais contre un site tiers.
// Sur la production : commencer à 10 visiteurs, monter par paliers. Les limites anti-abus (429) comptent comme « limité », pas comme erreur.

const args = new Map(process.argv.slice(2).flatMap((a, i, all) => (a.startsWith("--") ? [[a.slice(2), all[i + 1]]] : [])));
const base = (args.get("url") ?? "http://localhost:3000").replace(/\/$/, "");
const visitors = Number(args.get("visitors") ?? 25);
const seconds = Number(args.get("seconds") ?? 20);
const maxP95 = Number(args.get("max-p95") ?? 3000);
const paths = (args.get("paths") ?? "/,/tarifs,/faq,/statut,/connexion,/docs,/contact,/api/health").split(",");

if (!Number.isFinite(visitors) || visitors < 1 || visitors > 500) throw new Error("--visitors : entre 1 et 500");

const times = [];
const codes = new Map();
let errors = 0;
let limited = 0;
const stopAt = Date.now() + seconds * 1000;

async function visitor() {
  while (Date.now() < stopAt) {
    const path = paths[Math.floor(Math.random() * paths.length)];
    const t0 = performance.now();
    try {
      const res = await fetch(base + path, { redirect: "follow", signal: AbortSignal.timeout(15_000) });
      await res.arrayBuffer();
      times.push(performance.now() - t0);
      codes.set(res.status, (codes.get(res.status) ?? 0) + 1);
      if (res.status === 429) limited++;
      else if (res.status >= 500 || res.status === 404) errors++;
    } catch {
      times.push(performance.now() - t0);
      errors++;
    }
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 800));
  }
}

console.log(`Test de charge : ${visitors} visiteurs pendant ${seconds} s sur ${base}`);
await Promise.all(Array.from({ length: visitors }, visitor));

times.sort((a, b) => a - b);
const pct = (p) => Math.round(times[Math.min(times.length - 1, Math.floor((times.length * p) / 100))] ?? 0);
const total = times.length;
console.log(`Requêtes : ${total} (${(total / seconds).toFixed(1)}/s)`);
console.log(`Codes HTTP : ${[...codes].sort((a, b) => a[0] - b[0]).map(([c, n]) => `${c}×${n}`).join("  ") || "aucun"}`);
console.log(`Erreurs (5xx, 404, réseau, délai) : ${errors} (${((errors / Math.max(1, total)) * 100).toFixed(2)} %) · limitées (429) : ${limited}`);
console.log(`Temps de réponse : médiane ${pct(50)} ms · p95 ${pct(95)} ms · p99 ${pct(99)} ms · max ${Math.round(times.at(-1) ?? 0)} ms`);

const failed = errors / Math.max(1, total) > 0.01 || pct(95) > maxP95;
console.log(failed ? "RÉSULTAT : à corriger (plus de 1 % d'erreurs ou p95 trop lent)" : "RÉSULTAT : ok");
process.exit(failed ? 1 : 0);
