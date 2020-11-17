#!/usr/bin/env bash

set -euo pipefail

INPUT_FILE=$1
OUTPUT_FILE=$2
ENCRYPT_KEY=$3

if [[ -n "$ENCRYPT_KEY" && -n "$INPUT_FILE" && -n "$OUTPUT_FILE" ]]; then
    openssl enc -aes-256-cbc -md sha256 -pbkdf2 -d -in "${INPUT_FILE}" -out "${OUTPUT_FILE}" -k "${ENCRYPT_KEY}"
else
    echo "Usage: ./decrypt-secret.sh <input file> <output file> <encryption key>"
fi
