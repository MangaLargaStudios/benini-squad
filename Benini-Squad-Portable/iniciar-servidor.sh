#!/usr/bin/env bash
cd "$(dirname "$0")"
PORT=8080

if command -v python3 >/dev/null 2>&1; then
  echo "Benini Squad — http://localhost:${PORT}/"
  echo "Pressione Ctrl+C para encerrar."
  if command -v open >/dev/null 2>&1; then
    (sleep 1 && open "http://localhost:${PORT}/") &
  fi
  exec python3 -m http.server "$PORT"
fi

if command -v python >/dev/null 2>&1; then
  echo "Benini Squad — http://localhost:${PORT}/"
  exec python -m SimpleHTTPServer "$PORT" 2>/dev/null || python -m http.server "$PORT"
fi

echo "Instale Python 3 para iniciar o servidor local."
exit 1
