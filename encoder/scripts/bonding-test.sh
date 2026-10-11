#!/usr/bin/env bash
# Test de bonding SRTLA sur Linux (VM OrbStack, boîtier). À lancer en root :
#   sudo scripts/bonding-test.sh
# Crée deux espaces réseau : « tx » (le boîtier, avec wlan0 et eth0) et « rx » (le serveur, 10.9.9.1 avec srtla_rec).
# Envoie la mire par l'agent, applique de la perte, coupe un lien en plein direct, le remet, et vérifie que le flux continue d'arriver.
# srtla est sous licence AGPL : on le télécharge et on le compile ici, on ne l'ajoute pas au dépôt.
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
SRTLA_DIR="${SRTLA_DIR:-/var/tmp/srtla}"
WORK="$(mktemp -d)"
OUT="$WORK/rx.ts"
PIDS=()

cleanup() {
  for p in "${PIDS[@]:-}"; do kill "$p" 2>/dev/null || true; done
  ip netns del tx 2>/dev/null || true
  ip netns del rx 2>/dev/null || true
}
trap cleanup EXIT

if [ ! -x "$SRTLA_DIR/srtla_send" ]; then
  rm -rf "$SRTLA_DIR"
  git clone -q --depth 1 https://github.com/BELABOX/srtla "$SRTLA_DIR"
  make -C "$SRTLA_DIR" >/dev/null
fi
cleanup

ip netns add tx
ip netns add rx
ip -n tx link set lo up
ip -n rx link set lo up
ip -n rx addr add 10.9.9.1/32 dev lo

link() { # nom_côté_tx  réseau  index
  local name=$1 net=$2
  ip link add "v$name" type veth peer name "r$name"
  ip link set "v$name" netns tx
  ip link set "r$name" netns rx
  ip -n tx link set "v$name" name "$name"
  ip -n tx addr add "$net.2/24" dev "$name"
  ip -n tx link set "$name" up
  ip -n rx addr add "$net.1/24" dev "r$name"
  ip -n rx link set "r$name" up
  ip -n rx route replace "$net.0/24" dev "r$name" src 10.9.9.1 # le serveur répond avec sa seule adresse, comme sur Internet
  ip -n tx rule add from "$net.2" table "$3"
  ip -n tx route add default via "$net.1" dev "$name" table "$3"
}
link wlan0 10.1.1 101
link eth0 10.2.2 102
ip -n tx route add default via 10.1.1.1 dev wlan0
ip netns exec rx sysctl -qw net.ipv4.conf.all.rp_filter=0

# Serveur : srtla_rec (5000) -> srt-live-transmit (5002) -> fichier
ip netns exec rx srt-live-transmit "srt://127.0.0.1:5002?mode=listener&lossmaxttl=40&latency=2000" file://con >"$OUT" 2>/dev/null & PIDS+=($!)
sleep 0.5
ip netns exec rx "$SRTLA_DIR/srtla_rec" 5000 127.0.0.1 5002 >/dev/null 2>&1 & PIDS+=($!)
sleep 0.5

# Boîtier : l'agent (backend test), SRTLA vers 10.9.9.1
export PATH="$SRTLA_DIR:$PATH"
export SYXTEE_TEST_PATTERN=snow # bruit : x264 sature le débit demandé (une mire simple ne produit que quelques centaines de kb/s)
ip netns exec tx node --experimental-strip-types "$HERE/src/main.ts" start --url "srtla://10.9.9.1:5000?streamid=test" --backend test --res 720p30 --bitrate 2000 --latency 2000 >"$WORK/agent.log" 2>&1 & PIDS+=($!)

size() { stat -c %s "$OUT"; }
tx_bytes() { ip -n tx -s link show "$1" | awk '/TX:/{getline; print $1}'; }
FAIL=0
phase() { # titre  durée  octets_minimum
  local b0 w0 e0 b1 w1 e1
  b0=$(size); w0=$(tx_bytes wlan0); e0=$(tx_bytes eth0)
  sleep "$2"
  b1=$(size); w1=$(tx_bytes wlan0); e1=$(tx_bytes eth0)
  local got=$((b1 - b0)) ok="OK  "
  [ "$got" -lt "$3" ] && { ok="ECHEC"; FAIL=1; }
  printf '%-5s %-34s reçu %7d o   émis wlan0 %8d o   eth0 %8d o\n' "$ok" "$1" "$got" $((w1 - w0)) $((e1 - e0))
}

sleep 6 # démarrage et handshake
echo "Liens vus par l'agent :"; grep -h "" "$WORK/agent.log" | head -3 || true
phase "1. deux liens sains"              6 800000
ip netns exec tx tc qdisc add dev wlan0 root netem delay 60ms loss 5%
ip netns exec tx tc qdisc add dev eth0 root netem delay 30ms loss 2%
phase "2. perte 5 % / 2 % + latence"     6 600000
ip -n tx link set eth0 down
phase "3. eth0 coupé en plein direct"    8 600000
ip -n tx link set eth0 up
ip -n tx addr add 10.2.2.2/24 dev eth0 2>/dev/null || true
ip -n tx route add default via 10.2.2.1 dev eth0 table 102 2>/dev/null || true
ip -n rx route replace 10.2.2.0/24 dev reth0 src 10.9.9.1 # la route du serveur disparaît avec le lien
phase "4. eth0 rétabli"                  10 1200000

head -c 1 "$OUT" | xxd -p | grep -q '^47$' || { echo "ECHEC : le flux reçu n'est pas du MPEG-TS"; FAIL=1; }
[ "$FAIL" = 0 ] && echo "Bonding : OK" || { echo "Bonding : ECHEC (agent.log ci-dessous)"; tail -5 "$WORK/agent.log"; }
exit "$FAIL"
