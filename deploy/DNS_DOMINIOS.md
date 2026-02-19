# DNS – Domínios por ambiente

| Ambiente | Domínio |
|----------|---------|
| **PROD** | securedguard.z7botsolutions.com.br |
| **CI**   | ci.z7botsolutions.com.br |
| **TEST** | test.z7botsolutions.com.br |
| **DEV**  | test.z7botsolutions.com.br |

Usar estes domínios em:
- Cloudflare (registos A/AAAA e proxy)
- Traefik (regras `Host(...)`)
- Build do frontend (`VITE_API_URL`, etc.) por ambiente
