# 🔒 Sistema de Timeout de Sessão

## 📋 Visão Geral

O sistema implementa um mecanismo de timeout de sessão por inatividade que automaticamente encerra a sessão do usuário após um período de inatividade configurável. Isso aumenta a segurança do sistema, especialmente em ambientes compartilhados ou quando o usuário esquece de fazer logout.

## ⚙️ Funcionalidades

- ✅ **Detecção automática de inatividade**: Monitora eventos do usuário (cliques, teclas, movimento do mouse, scroll, etc.)
- ✅ **Aviso antes do logout**: Exibe um aviso alguns minutos antes de encerrar a sessão
- ✅ **Opção de estender sessão**: O usuário pode clicar em "Continuar usando" para resetar o timer
- ✅ **Logout automático**: Encerra a sessão e redireciona para a página de login após o timeout
- ✅ **Configurável**: Tempos de timeout e aviso podem ser configurados via variáveis de ambiente

## 🎯 Como Funciona

1. **Monitoramento de Atividade**: O sistema monitora continuamente a atividade do usuário através de eventos do navegador:
   - Cliques do mouse
   - Movimento do mouse
   - Teclas pressionadas
   - Scroll da página
   - Toques na tela (mobile)

2. **Timer de Inatividade**: Quando o usuário não realiza nenhuma ação por um período configurado (padrão: 30 minutos), o sistema inicia o processo de logout.

3. **Aviso Prévio**: Alguns minutos antes do logout (padrão: 5 minutos), um aviso é exibido na tela informando ao usuário que a sessão está prestes a expirar.

4. **Opções do Usuário**:
   - **Continuar usando**: Reseta o timer e permite que o usuário continue trabalhando
   - **Fechar aviso**: O aviso desaparece, mas o timer continua contando
   - **Não fazer nada**: Após o tempo restante, o logout é executado automaticamente

5. **Logout Automático**: Quando o tempo expira, o sistema:
   - Remove o token JWT do localStorage
   - Remove os dados do usuário
   - Redireciona para a página de login

## 🔧 Configuração

### Variáveis de Ambiente

Você pode configurar os tempos de timeout através de variáveis de ambiente no arquivo `.env`:

```env
# Tempo total de inatividade antes do logout (em minutos)
VITE_SESSION_TIMEOUT_MINUTES=30

# Tempo antes do logout para mostrar aviso (em minutos)
VITE_SESSION_WARNING_MINUTES=5
```

### Valores Padrão

Se as variáveis de ambiente não forem definidas, os seguintes valores padrão são usados:
- **Timeout**: 30 minutos
- **Aviso**: 5 minutos

### Exemplos de Configuração

```env
# Sessão curta (15 minutos de timeout, aviso em 3 minutos)
VITE_SESSION_TIMEOUT_MINUTES=15
VITE_SESSION_WARNING_MINUTES=3

# Sessão longa (60 minutos de timeout, aviso em 10 minutos)
VITE_SESSION_TIMEOUT_MINUTES=60
VITE_SESSION_WARNING_MINUTES=10

# Sessão muito curta para ambientes sensíveis (10 minutos)
VITE_SESSION_TIMEOUT_MINUTES=10
VITE_SESSION_WARNING_MINUTES=2
```

## 📁 Arquivos Relacionados

- `frontend/src/hooks/useSessionTimeout.ts` - Hook principal que gerencia o timeout
- `frontend/src/components/SessionTimeoutWarning.tsx` - Componente de aviso visual
- `frontend/src/components/SessionTimeoutManager.tsx` - Componente gerenciador que integra tudo
- `frontend/src/App.tsx` - Integração do sistema no App principal

## 🎨 Interface do Usuário

O aviso de timeout é exibido como um alerta fixo no canto superior direito da tela com:
- Ícone de alerta (⚠️)
- Título: "Sessão prestes a expirar"
- Contador regressivo do tempo restante
- Botão "Continuar usando" para estender a sessão
- Botão de fechar (X) para dispensar o aviso

## 🔐 Segurança

- O sistema funciona completamente no frontend, mas é complementado pela segurança do backend JWT
- O token JWT tem sua própria expiração configurada no backend (`jwt.expiration` em `application.properties`)
- O timeout de sessão é uma camada adicional de segurança que força logout por inatividade
- Mesmo que o token JWT ainda seja válido, a sessão será encerrada após o período de inatividade

## 🧪 Testando

Para testar o sistema de timeout:

1. **Reduzir o tempo de timeout temporariamente**:
   ```env
   VITE_SESSION_TIMEOUT_MINUTES=2
   VITE_SESSION_WARNING_MINUTES=1
   ```

2. **Fazer login no sistema**

3. **Não realizar nenhuma ação** por 1 minuto

4. **Verificar se o aviso aparece** após 1 minuto

5. **Aguardar mais 1 minuto** sem clicar em "Continuar usando"

6. **Verificar se o logout automático ocorre** e redireciona para login

## ⚠️ Considerações Importantes

- O sistema só funciona quando o usuário está autenticado
- O timer é resetado automaticamente a cada atividade do usuário
- O sistema não interfere com o funcionamento normal da aplicação
- O logout automático limpa completamente os dados da sessão local
- O usuário precisará fazer login novamente após o timeout

## 🔄 Integração com Backend

O sistema de timeout de sessão funciona independentemente do backend, mas é complementado por:

- **Expiração do Token JWT**: Configurada no backend (`jwt.expiration`)
- **Validação de Token**: O backend valida o token em cada requisição
- **Logout no Backend**: Quando necessário, pode ser implementado um endpoint de logout que invalida o token no servidor

## 📝 Notas de Implementação

- O hook `useSessionTimeout` usa `useEffect` e `useCallback` para otimizar performance
- Os eventos são registrados com `{ passive: true }` para melhor performance de scroll
- O sistema evita resetar o timer muito frequentemente (mínimo de 1 segundo entre resets)
- O componente de aviso usa um contador regressivo visual para melhor UX
