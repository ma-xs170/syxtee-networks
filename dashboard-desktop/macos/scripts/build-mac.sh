#!/usr/bin/env bash
# Compile SYXTEE Dashboard (macOS) et l'installe dans ~/Applications. Usage : build-mac.sh [--open]
set -euo pipefail
cd "$(dirname "$0")/.."
# Un build par architecture puis lipo (le build universel exige Xcode complet)
for a in arm64 x86_64; do swift build -c release --arch $a; done
BIN=$(mktemp -d)/SyxteeDashboard
lipo -create -output "$BIN" .build/arm64-apple-macosx/release/SyxteeDashboard .build/x86_64-apple-macosx/release/SyxteeDashboard
APP="$HOME/Applications/SYXTEE Dashboard.app"
pkill -x SyxteeDashboard 2>/dev/null || true
rm -rf "$APP"; mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN" "$APP/Contents/MacOS/SyxteeDashboard"

ICON=../../public/icons/icon-512.png
SET=$(mktemp -d)/AppIcon.iconset; mkdir -p "$SET"
for s in 16 32 128 256 512; do
  sips -z $s $s "$ICON" --out "$SET/icon_${s}x${s}.png" >/dev/null
  sips -z $((s*2)) $((s*2)) "$ICON" --out "$SET/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns "$SET" -o "$APP/Contents/Resources/AppIcon.icns"

cat > "$APP/Contents/Info.plist" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleName</key><string>SYXTEE Dashboard</string>
<key>CFBundleDisplayName</key><string>SYXTEE Dashboard</string>
<key>CFBundleExecutable</key><string>SyxteeDashboard</string>
<key>CFBundleIdentifier</key><string>fr.syxtee-networks.dashboard</string>
<key>CFBundleIconFile</key><string>AppIcon</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>1.0.0</string>
<key>CFBundleVersion</key><string>1</string>
<key>LSMinimumSystemVersion</key><string>13.0</string>
<key>NSHighResolutionCapable</key><true/>
<key>CFBundleURLTypes</key><array><dict><key>CFBundleURLName</key><string>fr.syxtee-networks.dashboard</string><key>CFBundleURLSchemes</key><array><string>syxteedashboard</string></array></dict></array>
<key>NSCameraUsageDescription</key><string>Aperçu caméra dans le dashboard.</string>
<key>NSMicrophoneUsageDescription</key><string>Aperçu micro dans le dashboard.</string>
</dict></plist>
PL
codesign --force --deep --sign - "$APP" >/dev/null 2>&1 || true
echo "Installé : $APP"
[ "${1:-}" = "--open" ] && open "$APP"
