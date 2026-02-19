# 🔧 404 Externo em PROD (Cloudflare/Traefik)

## Problema

A aplicação funciona **internamente** (health check retorna 200 em `localhost:8084/api/health`), mas retorna **404** quando acessada externamente via `https://securedguard.z7botsolutions.com.br/api/health`.

## Fluxo de Requisição

```
Internet → Cloudflare → Traefik:443 → Nginx:80 → Backend:8080
```

O 404 indica que algo na cadeia Cloudflare/Traefik/Nginx não está encaminhando corretamente.

## Solução Rápida

Execute na VPS (o script é copiado automaticamente pelo deploy):

```bash
cd /var/www/secured_guard/prod/deploy
bash fix-404-prod.sh
```

## Verificações Manuais

### 1. Nginx na rede z7network

O Traefik precisa acessar o Nginx. Ambos devem estar na rede `z7network`:

```bash
docker network inspect z7network | grep -E "secured-guard-nginx-prod|traefik"
```

Se o Nginx não estiver na rede:

```bash
docker network connect z7network secured-guard-nginx-prod
docker restart traefik
sleep 15
```

### 2. Router PROD no Traefik

```bash
docker exec traefik wget -qO- http://localhost:8080/api/http/routers | jq -r '.[].name' | grep prod
```

Deve listar `secured-guard-prod-https` e `secured-guard-prod-http`.

### 3. Teste interno (sem Cloudflare)

```bash
curl -k -H "Host: securedguard.z7botsolutions.com.br" https://localhost/api/health
```

- **200**: Traefik/Nginx/Backend OK → problema pode estar no Cloudflare
- **404**: Problema no Traefik ou Nginx

### 4. Cloudflare

- **DNS**: Registro do domínio deve estar com proxy ativado (nuvem laranja)
- **SSL/TLS**: Modo "Full" ou "Full (strict)"
- **Page Rules**: Nenhuma regra retornando 404 para `/api/*`

## docker-compose.prod.yml

O Nginx PROD tem labels Traefik que roteiam todo o host `securedguard.z7botsolutions.com.br` para a porta 80 do container. O Nginx então encaminha `/api/*` para o backend.

## Referências

- `scripts/fix-404-traefik.sh` – Script similar para CI
- `CORRIGIR_404_TRAEFIK.md` – Documentação para CI
- `scripts/diagnose-404-traefik.sh` – Diagnóstico 404
