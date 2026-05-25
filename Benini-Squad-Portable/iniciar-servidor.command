#!/usr/bin/env bash
cd "$(dirname "$0")"
chmod +x iniciar-servidor.sh 2>/dev/null
exec ./iniciar-servidor.sh
