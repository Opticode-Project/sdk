#!/usr/bin/env bash
set -e

# --- SETTINGS ---
PROGRAM_URL="https://raw.githubusercontent.com/Opticode-Project/schemas/dev/program.fbs"
PROGRAM_NAME="program.fbs"

NET_URL="https://raw.githubusercontent.com/Opticode-Project/schemas/dev/net.fbs"
NET_NAME="network.fbs"

SCHEMA_URL="https://raw.githubusercontent.com/Opticode-Project/schemas/dev/go/main.fbs"
SCHEMA_NAME="go/golang.fbs"
OUTPUT_DIR="."
FLATC="flatc"     # assumes flatc is in PATH; change to absolute path if needed

# --- CREATE OUTPUT DIR ---
mkdir -p "$OUTPUT_DIR"

copy () {
  # Works in Windows Git Bash, Linux, macOS
  if command -v curl >/dev/null 2>&1; then
      curl -L "$1" -o "$2"
  elif command -v wget >/dev/null 2>&1; then
      wget -O "$2" "$1"
  else
      echo "Error: curl or wget required!"
      exit 1
  fi
}

echo "Downloading schema..."
copy $NET_URL $NET_NAME
copy $PROGRAM_URL $PROGRAM_NAME
copy $SCHEMA_URL "$SCHEMA_NAME"

echo "Running flatc..."

$FLATC --ts -o "$OUTPUT_DIR/" "$NET_NAME"
$FLATC --ts -o "$OUTPUT_DIR/" "$PROGRAM_NAME"
$FLATC --ts -o "$OUTPUT_DIR/go" "$SCHEMA_NAME"

echo "Cleaning up..."
rm "$NET_NAME"
rm "$PROGRAM_NAME"
rm "$SCHEMA_NAME"

echo "Done!"
