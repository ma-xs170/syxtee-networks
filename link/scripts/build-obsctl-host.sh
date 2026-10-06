#!/bin/sh
# Construit l'essai du pilotage d'OBS (obsctl.cpp + faux OBS) : sortie par défaut /tmp/obsctl-host.
# Qt : en-têtes et bibliothèques de ~/Qt/<version>/macos/lib (aqtinstall), comme pour le plugin.
# Usage : scripts/build-obsctl-host.sh [sortie] ; puis OBSCTL_HOST=<sortie> npm test
set -e
cd "$(dirname "$0")/.."
OUT="${1:-/tmp/obsctl-host}"
Q="${QT_LIB:-$(ls -d "$HOME"/Qt/*/macos/lib | head -1)}"
H="${OBS_HEADERS:-$(ls -d "$HOME"/syxtee-link-plugin/obs-headers-* | head -1)}"
clang++ -std=c++17 -fPIC -I"$H/libobs" -I"$H/simde" -I"$H/frontend/api" -F"$Q" \
  -I"$Q/QtCore.framework/Headers" -I"$Q/QtGui.framework/Headers" -I"$Q/QtNetwork.framework/Headers" -Wno-deprecated-declarations \
  plugin/qt/test/obsctl-host.cpp plugin/qt/test/obs-stub.cpp plugin/qt/obsctl.cpp \
  -F"$Q" -framework QtCore -framework QtGui -framework QtNetwork -Wl,-rpath,"$Q" -o "$OUT"
echo "$OUT"
