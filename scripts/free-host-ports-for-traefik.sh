#!/bin/bash
# Liberta portas 80/443 no host quando nginx ou apache do SO (apt) impedem o Traefik (Docker) de bindar.
# Uso: bash free-host-ports-for-traefik.sh   OU   source e chamar free_host_ports_for_traefik
#
# SKIP_STOP_HOST_NGINX=1 — não parar serviços (ex.: outro site depende do nginx do host)

set +e

free_host_ports_for_traefik() {
  if [ "${SKIP_STOP_HOST_NGINX:-0}" = "1" ]; then
    echo "[free-host-ports] SKIP_STOP_HOST_NGINX=1 — nginx/apache do SO não serão parados."
    return 0
  fi

  local block=false
  if ss -tlnp 2>/dev/null | grep -E ':80\s' | grep -qE 'nginx|apache'; then
    block=true
  fi
  if ss -tlnp 2>/dev/null | grep -E ':443\s' | grep -qE 'nginx|apache'; then
    block=true
  fi

  if [ "$block" != true ]; then
    return 0
  fi

  echo "[free-host-ports] 80/443 em uso por nginx ou apache no host — parando serviços (Traefik precisa destas portas)..."
  _sc() {
    if [ "$(id -u)" -eq 0 ]; then
      systemctl "$@" 2>/dev/null || true
    else
      sudo -n systemctl "$@" 2>/dev/null || systemctl "$@" 2>/dev/null || true
    fi
  }
  if command -v systemctl >/dev/null 2>&1; then
    _sc stop nginx
    _sc stop apache2
    _sc stop httpd
  fi
  service nginx stop 2>/dev/null || true
  service apache2 stop 2>/dev/null || true
  sleep 2
}

if [ "${BASH_SOURCE[0]:-}" = "${0}" ]; then
  free_host_ports_for_traefik
fi
