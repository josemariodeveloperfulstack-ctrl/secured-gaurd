# Domínios por ambiente

Domínios configurados no Cloudflare e utilizados em cada ambiente:

| Ambiente | Domínio |
|----------|---------|
| **PROD** | securedguard.z7botsolutions.com.br |
| **CI**   | ci.z7botsolutions.com.br |
| **TEST** | test.z7botsolutions.com.br |
| **DEV**  | test.z7botsolutions.com.br |

Configuração DNS feita no Cloudflare. O tráfego (HTTPS) chega ao Traefik na VPS, que encaminha pelo `Host` para o respetivo nginx/stack.
