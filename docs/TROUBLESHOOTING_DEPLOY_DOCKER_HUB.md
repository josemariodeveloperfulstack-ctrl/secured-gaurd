# Troubleshooting: Falhas de Pull do Docker Hub no Deploy

## VPS Contabo: Docker Hub inacessível

**Sintoma:** `❌ Docker Hub inacessível após 5 tentativas` durante o deploy via SSH.

**Causa:** A VPS Contabo (Alemanha) pode ter conectividade instável ou bloqueada para `registry-1.docker.io`.

**Solução aplicada:** O deploy agora usa **fallback para imagens em cache**. Se o pull falhar mas as imagens existirem localmente (de um deploy anterior), o deploy continua.

**Ação manual na VPS** (se deploy continuar falhando):
```bash
# Testar conectividade
curl -4 -v https://registry-1.docker.io/v2/

# Se falhar, configurar Docker para usar mirror ou proxy (ver seção abaixo)
```

---

## Erro típico (pull)
```
Error response from daemon: Head "https://registry-1.docker.io/v2/.../manifests/ci": 
Get "https://auth.docker.io/token?...": read tcp [...]: read: connection reset by peer
```

## Causas comuns
- **Rede instável** entre a VPS e o Docker Hub
- **IPv6** com roteamento problemático (Docker Hub às vezes responde em IPv6)
- **Rate limit** do Docker Hub (100 pulls/6h para anônimos)
- **Firewall/proxy** bloqueando `registry-1.docker.io` ou `auth.docker.io`

## Melhorias já aplicadas nos workflows
- ✅ Verificação de conectividade com `curl -4` (forçar IPv4) antes do pull
- ✅ Retry com backoff exponencial (5 tentativas: 15s, 25s, 35s, 45s)
- ✅ Timeouts aumentados (DOCKER_CLIENT_TIMEOUT=600)
- ✅ Não remover imagens antigas antes do pull (CI)
- ✅ `docker-compose up` sem `--pull always` após pull manual (CI)

## Ações manuais na VPS (se o problema persistir)

### 1. Preferir IPv4 no Docker
Criar/editar `/etc/docker/daemon.json`:
```json
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" },
  "dns": ["8.8.8.8", "8.8.4.4"]
}
```
Reiniciar: `sudo systemctl restart docker`

### 2. Testar conectividade
```bash
# Forçar IPv4
curl -4 -v https://registry-1.docker.io/v2/
curl -4 -v https://auth.docker.io/

# Sem forçar (pode usar IPv6)
curl -v https://registry-1.docker.io/v2/
```

### 3. Alternativa: usar GitHub Container Registry (ghcr.io)
Para evitar dependência do Docker Hub, migrar para `ghcr.io/zemarioramos/secured-guard-*`.
