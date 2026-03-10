# Cache e Atualização Automática

Este documento descreve as implementações que permitem que o usuário não precise pressionar F5 ou Ctrl+Shift+R para ver atualizações do sistema.

## 1. React Query (Cache de Dados)

Configurado em `frontend/src/lib/queryClient.ts`:

| Opção | Valor | Descrição |
|-------|-------|-----------|
| `staleTime` | 1 minuto | Dados considerados "frescos" – não refaz requisição |
| `gcTime` | 5 minutos | Tempo em cache após o componente desmontar |
| `refetchOnWindowFocus` | true | Atualiza dados quando o usuário volta à aba |
| `refetchOnReconnect` | true | Atualiza quando a conexão é restabelecida |
| `refetchOnMount` | true | Atualiza ao montar o componente |

**Efeito**: Ao trocar de aba e voltar, ou ao navegar entre páginas, os dados são atualizados automaticamente quando estiverem "stale".

## 2. PWA / Service Worker (Atualização de Código)

Quando uma nova versão do frontend é publicada:

1. O Service Worker detecta que há uma nova versão disponível
2. O componente `AppUpdateNotifier` exibe um **toast** com o botão "Atualizar"
3. O usuário clica em "Atualizar" e a página recarrega com o novo código
4. **Não é necessário** pressionar F5 ou Ctrl+Shift+R

**Arquivos**:
- `frontend/src/components/AppUpdateNotifier.tsx` – exibe o toast
- `frontend/vite.config.ts` – `registerType: 'prompt'` para controle manual da atualização

**Modo de desenvolvimento**: O PWA register não é ativado em `npm run dev`. O toast de atualização aparece apenas em builds de produção (ex.: após `npm run build` e deploy).

**Ambiente CI** (`ci.z7botsolutions.com.br`): O proxy reverso (`nginx/ci.conf`) envia headers explícitos para o cache funcionar corretamente:
- **Service Worker** (`sw.js`, `workbox-*.js`): `Cache-Control: no-cache, no-store` e `Service-Worker-Allowed: /` para o navegador sempre verificar nova versão.
- **index.html**: `no-cache` para sempre buscar a versão mais recente.
- **Assets** (`/assets/*.js`, `.css`, etc.): `Cache-Control: public, max-age=31536000, immutable` para cache de longa duração.
- **Rotas SPA** (`/`): `no-cache` para que o HTML/SPA não seja cacheado e a atualização do app funcione.

## 3. Workbox (Cache de Assets)

O `vite-plugin-pwa` com Workbox:
- Faz precache dos arquivos JS, CSS, HTML e ícones
- `cleanupOutdatedCaches: true` – remove caches antigos automaticamente
- `skipWaiting: true` – o novo Service Worker ativa rapidamente após o reload

## Resumo para o Usuário

- **Dados da API**: Atualizam ao voltar à aba, navegar ou reconectar
- **Novo deploy**: Um toast "Nova versão disponível" aparece; clique em "Atualizar" para aplicar
