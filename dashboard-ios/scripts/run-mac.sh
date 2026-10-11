#!/usr/bin/env bash
# Compile l'app SYXTEE Dashboard et la lance sur ce Mac, en version iPhone (« Mac conçu pour iPhone »).
# Usage : dashboard-ios/scripts/run-mac.sh
set -euo pipefail
cd "$(dirname "$0")/.."

DERIVED="build"
APP_NAME="SyxteeDashboard"
WRAP="$HOME/Applications/SYXTEE Dashboard.app"

xcodebuild -project SyxteeDashboard.xcodeproj -scheme SyxteeDashboard \
  -destination 'platform=macOS,variant=Designed for iPhone' \
  -derivedDataPath "$DERIVED" -allowProvisioningUpdates build 2>&1 | grep -E "error:|BUILD (SUCCEEDED|FAILED)" || true

APP="$DERIVED/Build/Products/Debug-iphoneos/$APP_NAME.app"
[ -d "$APP" ] || { echo "Build introuvable : $APP"; exit 1; }

# Un iPhone app s'ouvre sur Mac dans une enveloppe « Wrapper » (comme celles de l'App Store).
pkill -f "$APP_NAME.app/$APP_NAME" 2>/dev/null || true
rm -rf "$WRAP"
mkdir -p "$WRAP/Wrapper" "$HOME/Applications"
cp -R "$APP" "$WRAP/Wrapper/"
ln -s "Wrapper/$APP_NAME.app" "$WRAP/WrappedBundle"
/usr/libexec/PlistBuddy -c "Add :artistName string SYXTEE" "$WRAP/iTunesMetadata.plist" >/dev/null 2>&1 || true
open "$WRAP"
echo "Lancé : $WRAP"
