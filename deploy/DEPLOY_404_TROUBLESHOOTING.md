# 404 em Produção – O que verificar

Se https://securedguard.z7botsolutions.com.br/ retorna **404** mesmo com o deploy em sucesso:

## 1. Diagnóstico no servidor (SSH)

Na VPS, dentro da pasta do deploy:

```bash
cd /var/www/secured_guard/prod/deploy
bash diagnose-404-prod.sh
```

Ou manualmente:

```bash
# Containers devem estar Up
docker-compose -f docker-compose.prod.yml ps -a

# Este comando deve retornar 200 (nginx + frontend)
curl -I http://127.0.0.1:8085/
```

- Se **curl http://127.0.0.1:8085/** retorna **200**: nginx e frontend estão OK. O 404 vem de **antes** do nginx (Traefik ou Cloudflare).
- Se retorna **404** ou **502**: problema no nginx ou no frontend (ver logs: `docker logs secured-guard-nginx-prod`).

## 2. Se o 404 vem de antes do nginx (Traefik / Cloudflare)

### Traefik na frente

O `docker-compose.prod.yml` define labels para o Traefik. Para o site responder em HTTPS:

- O **Traefik** deve estar a correr no **mesmo host** (ou num host que veja os containers).
- O Traefik deve estar na rede Docker **`z7network`** (igual ao container nginx).
- No Traefik, os entrypoints devem chamar-se **`web`** (80) e **`websecure`** (443). Se forem outros (ex.: `https`), o router não liga ao entrypoint e pode dar 404.

No host onde corre o Traefik:

```bash
docker network inspect z7network
# Deve listar o container secured-guard-nginx-prod
```

### Cloudflare

- Em **DNS**, o registo do domínio deve apontar para o **IP da VPS** (proxy laranja ou cinzento).
- Em **SSL/TLS**, usar **Full** ou **Full (strict)**.
- O **origin** (VPS) deve ter um serviço a escutar na **porta 443** (normalmente o Traefik) e esse serviço deve encaminhar para o nginx (porta 80 do container ou 8085 no host, consoante a configuração).

## 3. Sem Traefik – encaminhar tráfego para o nginx

Se **não** usas Traefik e tens outro proxy (nginx/Caddy no host) a escutar na 443:

- Esse proxy deve encaminhar `Host: securedguard.z7botsolutions.com.br` para:
  - **http://127.0.0.1:8085** (porta do container nginx no host), ou
  - para o container nginx na rede Docker, se o proxy também estiver em Docker na mesma rede.

## 4. Nginx com erro de config

Se o nginx reinicia constantemente (ex.: `docker ps` mostra Restarting):

- Não pode haver **`resolver`** dentro do bloco **`upstream`** no `nginx-prod.conf` (o Nginx não aceita e falha ao carregar).
- Depois de alterar o ficheiro no servidor:

```bash
docker exec secured-guard-nginx-prod nginx -t
docker restart secured-guard-nginx-prod
```

Resumo: primeiro confirma com `curl http://127.0.0.1:8085/` no servidor. Se for 200, o 404 é no Traefik/Cloudflare ou no encaminhamento para a porta 8085/443.
