#!/usr/bin/env bash
# Creates a NEW Play upload keystore + PEM for "Request upload key reset" in Google Play Console.
# Uses alias "upload" and filenames that match Google's keytool example.
# Run from anywhere; writes into android/ (both files are gitignored except PEM is public — still do not commit .jks).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
JKS="$ANDROID_DIR/upload-keystore.jks"
PEM="$ANDROID_DIR/upload_certificate.pem"
ALIAS="upload"

if [[ -f "$JKS" ]]; then
  echo "Already exists: $JKS"
  echo "Remove it first or rename it, then run again. (Do not delete if it is already registered with Play.)"
  exit 1
fi

command -v keytool >/dev/null 2>&1 || { echo "keytool not found. Install a JDK and ensure keytool is on PATH."; exit 1; }

echo "You will choose one password for both the keystore and the key (simplest for Gradle)."
echo "Store it in a password manager — you cannot recover it if lost."
echo ""
read -r -s -p "New keystore password: " PASS1
echo ""
read -r -s -p "Repeat password: " PASS2
echo ""
if [[ "$PASS1" != "$PASS2" ]]; then
  echo "Passwords do not match."
  exit 1
fi
if [[ ${#PASS1} -lt 8 ]]; then
  echo "Use at least 8 characters (Google recommends a strong password)."
  exit 1
fi

# Distinguished name — edit if you want a different organization string (does not affect signing for Play).
DNAME="CN=Bonyad Upload, OU=Mobile, O=Bonyad, C=SA"

keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore "$JKS" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$PASS1" \
  -keypass "$PASS1" \
  -dname "$DNAME"

keytool -export -rfc \
  -keystore "$JKS" \
  -alias "$ALIAS" \
  -file "$PEM" \
  -storepass "$PASS1"

echo ""
echo "Created:"
echo "  $JKS   (PRIVATE — backup safely, never commit)"
echo "  $PEM   (upload this file in Play Console upload key reset)"
echo ""
echo "Next:"
echo "  1. In Play Console, finish 'Request upload key reset' and upload: $PEM"
echo "  2. Wait for Google approval before building/uploading a new AAB."
echo "  3. Then create android/keystore.properties with:"
echo "       storeFile=upload-keystore.jks"
echo "       storePassword=<your password>"
echo "       keyAlias=upload"
echo "       keyPassword=<same password>"
echo ""
