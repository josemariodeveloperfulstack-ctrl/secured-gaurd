# Corrigir crash do Traefik (restart a cada ~60s após "Testing certificate renew")

## Problema
O Traefik reinicia continuamente (~60s) após iniciar o provider ACME (Let's Encrypt). O último log antes do crash é "Testing certificate renew...". Exit code 137 (SIGKILL).

---

## Teste rápido: Servidor Let's Encrypt Staging

Se o servidor de produção do Let's Encrypt estiver com problemas, o staging pode estabilizar. O certificado não será confiável no browser (aviso), mas serve para testar.

No `docker-compose.traefik.yml`, adicione antes das outras linhas do ACME:

```yaml
- "--certificatesresolvers.letsencryptresolver.acme.caserver=https://acme-staging-v02.api.letsencrypt.org/directory"
```

Depois:
```bash
cd /var/www/secured_guard
docker-compose -f docker-compose.traefik.yml down
rm -f traefik/letsencrypt/acme.json  # forçar novos certos
docker-compose -f docker-compose.traefik.yml up -d
```

Se estabilizar, o problema é com o Let's Encrypt produção. Remova a linha do staging e use a solução Cloudflare abaixo.

---

## Solução recomendada: Certificado de Origem do Cloudflare

Como o site usa Cloudflare, o certificado SSL pode ser gerenciado pelo Cloudflare. Assim o Traefik não precisa do ACME/Let's Encrypt.

### Passo 1: Criar certificado no Cloudflare

1. Acesse o **Cloudflare Dashboard** → seu domínio
2. **SSL/TLS** → **Origin Server**
3. Clique em **Create Certificate**
4. Deixe as opções padrão (RSA 2048, 15 anos)
5. Domínios: `*.z7botsolutions.com.br` e `z7botsolutions.com.br` (e outros que usar)
6. Clique em **Create**
7. **Copie** o certificado (Origin Certificate) e a chave privada (Private Key)

### Passo 2: Salvar certificados na VPS

```bash
# Criar diretório
mkdir -p /var/www/secured_guard/traefik/certs

# Salvar certificado (cole o conteúdo entre as linhas BEGIN/END)
nano /var/www/secured_guard/traefik/certs/origin.pem
# Colar o Origin Certificate

# Salvar chave privada
nano /var/www/secured_guard/traefik/certs/origin-key.pem
# Colar a Private Key

# Permissões
chmod 600 /var/www/secured_guard/traefik/certs/origin-key.pem
chmod 644 /var/www/secured_guard/traefik/certs/origin.pem
```

### Passo 3: Configurar Traefik para usar certificado estático

É necessário usar configuração dinâmica em arquivo. O Traefik já monta `/var/www/secured_guard/traefik/dynamic`.

Crie ou edite `/var/www/secured_guard/traefik/dynamic/tls.yml`:

```yaml
tls:
  certificates:
    - certFile: /etc/traefik/certs/origin.pem
      keyFile: /etc/traefik/certs/origin-key.pem
```

### Passo 4: Atualizar docker-compose.traefik.yml

1. **Remover** as linhas do ACME (certificatesresolvers.letsencryptresolver.*)
2. **Adicionar** volume para os certificados:

```yaml
volumes:
  - "/var/run/docker.sock:/var/run/docker.sock:ro"
  - "/var/www/secured_guard/traefik/letsencrypt:/etc/traefik/letsencrypt"
  - "/var/www/secured_guard/traefik/certs:/etc/traefik/certs:ro"  # NOVO
  - "/var/www/secured_guard/traefik/logs:/var/log/traefik"
  - "/var/www/secured_guard/traefik/dynamic:/etc/traefik/dynamic:ro"
```

3. **Atualizar** os routers dinâmicos (prod/ci) para NÃO usar certresolver - o TLS será servido pelo certificado estático.

### Passo 5: Cloudflare SSL/TLS

No Cloudflare: **SSL/TLS** → **Overview** → selecione **Full (strict)** para validar o certificado de origem.

### Passo 6: Reiniciar Traefik

```bash
cd /var/www/secured_guard
docker-compose -f docker-compose.traefik.yml down
docker-compose -f docker-compose.traefik.yml up -d
docker logs -f traefik
```

---

## Alternativa rápida: testar acme.json corrompido

Se o arquivo `acme.json` estiver corrompido, o Traefik pode crashar ao lê-lo:

```bash
# Backup
cp /var/www/secured_guard/traefik/letsencrypt/acme.json /var/www/secured_guard/traefik/letsencrypt/acme.json.bak

# Remover (Traefik vai solicitar novos certos ao Let's Encrypt)
rm /var/www/secured_guard/traefik/letsencrypt/acme.json

# Reiniciar
cd /var/www/secured_guard
docker-compose -f docker-compose.traefik.yml restart
```

**Atenção:** Isso fará o Traefik solicitar novos certificados. Se o problema for no handshake com Let's Encrypt, o crash pode continuar.
