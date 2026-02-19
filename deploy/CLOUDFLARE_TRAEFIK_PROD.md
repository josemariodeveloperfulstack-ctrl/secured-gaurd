# Cloudflare + Traefik – Secured Guard PROD

Fluxo do tráfego: **Utilizador → Cloudflare → VPS (Traefik:443) → nginx (porta 80)**.

Se o site devolve 404 mas no servidor `curl http://127.0.0.1:8085/api/health` dá 200, o problema está no Cloudflare ou no Traefik.

---

## 1. Cloudflare (DNS e proxy)

- **DNS**
  - Registos **A** ou **AAAA** para `securedguard.z7botsolutions.com.br` → **IP da VPS**.
  - Proxy: **ativado** (nuvem laranja) para usar CDN/SSL do Cloudflare, ou **apenas DNS** (nuvem cinzenta) para falar direto com a VPS.
- **SSL/TLS**
  - Modo: **Full** ou **Full (strict)** (o Cloudflare faz HTTPS até à origem).
- **Origin**
  - A origem é o **IP da VPS**. O Cloudflare liga à **porta 443** (HTTPS) ou 80 (HTTP), consoante o modo SSL. Na VPS tem de haver um serviço a escutar nessa porta (normalmente o Traefik).

---

## 2. Traefik na VPS (mesmo host que os containers)

O Traefik deve:

1. Estar a correr no **mesmo servidor** que o `docker-compose` do Secured Guard (ou num host que partilhe a rede Docker com o nginx).
2. Estar na rede Docker **`z7network`** para "ver" o container do nginx.

### Verificar rede

```bash
docker network inspect z7network
```

Na lista de **Containers** deve aparecer `secured-guard-nginx-prod`. Se não aparecer:

```bash
docker network connect z7network secured-guard-nginx-prod
docker restart traefik
sleep 15
```

### Router PROD no Traefik

```bash
docker exec traefik wget -qO- http://localhost:8080/api/http/routers | jq -r '.[].name' | grep prod
```

---

## 3. Script de correção

Execute na VPS (o script é copiado pelo deploy):

```bash
cd /var/www/secured_guard/prod/deploy
bash fix-404-prod.sh
```

O script: verifica Traefik e Nginx, conecta o nginx à rede `z7network` se necessário, reinicia o Traefik e testa o acesso.

---

## 4. Checklist rápido (404 externo)

| Onde | O quê |
|------|--------|
| **Cloudflare** | DNS A/AAAA para o domínio → IP da VPS; SSL/TLS = Full ou Full (strict). |
| **VPS** | Algo a escutar na **443** (normalmente Traefik). |
| **Traefik** | Na rede **`z7network`**; entrypoints **`web`** e **`websecure`**; resolver TLS `letsencryptresolver`. |
| **Rede** | `docker network inspect z7network` deve mostrar o container do nginx. |
| **Local** | `curl -I http://127.0.0.1:8085/api/health` deve dar **200**. |

---

## Config Dinâmica Traefik (traefik-dynamic-prod.yml)

O deploy copia `traefik-dynamic-prod.yml` para `/var/www/secured_guard/traefik/dynamic/prod.yml`. Isso cria um fallback quando o Docker provider não descobre o Nginx (ex.: fora da rede z7network):

- Router: `Host(securedguard.z7botsolutions.com.br)` → `secured-guard-nginx-prod:80`
- Middlewares: CORS, métodos permitidos, timeouts para upload
- Prioridade 2000

O Traefik recarrega automaticamente (providers.file.watch=true).

## Referências

- `traefik-dynamic-prod.yml` – Config dinâmica PROD (baseada em traefik-dynamic-ci.yml)
- `scripts/fix-404-traefik.sh` – Script similar para CI
- `CORRIGIR_404_TRAEFIK.md` – Documentação para CI
