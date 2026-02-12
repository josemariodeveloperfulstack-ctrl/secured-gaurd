# Cloudflare + Traefik – Secured Guard PROD

Fluxo do tráfego: **Utilizador → Cloudflare → VPS (Traefik:443) → nginx (porta 80)**.

Se o site devolve 404 mas no servidor `curl http://127.0.0.1:8085/` dá 200, o problema está no Cloudflare ou no Traefik.

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
2. Estar na rede Docker **`z7network`** para “ver” o container do nginx.

### Verificar rede

No servidor:

```bash
docker network inspect z7network
```

Na lista de **Containers** deve aparecer algo como `secured-guard-nginx-prod` (nome pode variar). Se não aparecer, o nginx não está na rede que o Traefik usa.

### Criar a rede se não existir

```bash
docker network create z7network
```

Depois, no diretório do deploy do Secured Guard, subir de novo o stack para o nginx entrar na rede:

```bash
cd /var/www/secured_guard/prod/deploy
docker-compose -f docker-compose.prod.yml up -d
```

### Nomes que o Traefik espera

As labels do `docker-compose.prod.yml` usam:

- **Entrypoints:** `web` (80) e **`websecure`** (443).  
  Se no teu Traefik os entrypoints tiverem outros nomes (ex.: `https` em vez de `websecure`), o router não liga e podes ter 404. Ajusta as labels ou a configuração do Traefik para usar `web` e `websecure`, ou altera as labels para os nomes que realmente tens.
- **Certificado:** `letsencryptresolver`.  
  O Traefik tem de ter um resolver com este nome para TLS (Let’s Encrypt). Se usares outro nome, altera a label `traefik.http.routers.secured-guard-prod-https.tls.certresolver` no compose.

---

## 3. Checklist rápido (404 externo)

| Onde | O quê |
|------|--------|
| **Cloudflare** | DNS A/AAAA para o domínio → IP da VPS; SSL/TLS = Full ou Full (strict). |
| **VPS** | Algo a escutar na **443** (normalmente Traefik). |
| **Traefik** | Na rede **`z7network`**; entrypoints **`web`** e **`websecure`**; resolver TLS (ex.: `letsencryptresolver`). |
| **Rede** | `docker network inspect z7network` deve mostrar o container do nginx do Secured Guard. |
| **Local** | `curl -I http://127.0.0.1:8085/` e `curl -I http://127.0.0.1:8085/api/health` devem dar **200**. |

Se tudo isto estiver certo e ainda houver 404, vale a pena ver os logs do Traefik (erros de certificado, router não anexado ao entrypoint, etc.).

---

## 4. Script de correção no servidor

No servidor (SSH), para criar a rede, ligar o nginx e testar localmente:

```bash
cd /var/www/secured_guard/prod/deploy
bash fix-404-prod.sh
```

O script: cria a rede `z7network` se não existir, garante que o nginx está nela, reinicia o nginx e faz um teste com `curl` a `127.0.0.1:8085`. No final indica passos para verificar o Traefik (entrypoints `web`/`websecure`, rede `z7network`).
