# 📱 Sistema de Notificações — Secured Guard Mobile

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura](#2-arquitetura)
3. [Funcionalidade 1: Fila Offline](#3-funcionalidade-1-fila-offline)
4. [Funcionalidade 2: Lembrete Diário de Ponto](#4-funcionalidade-2-lembrete-diário-de-ponto)
5. [Funcionalidade 3: Indicador de Conectividade](#5-funcionalidade-3-indicador-de-conectividade)
6. [Bibliotecas Utilizadas](#6-bibliotecas-utilizadas)
7. [Arquivos Envolvidos](#7-arquivos-envolvidos)

---

## 1. Visão Geral

O sistema de notificações do Secured Guard Mobile possui **3 grandes funcionalidades**:

| # | Funcionalidade | Tipo | Descrição |
|---|---------------|------|-----------|
| 1 | **Fila Offline** | Notificação local + UI | Enfileira requisições que falharam por falta de conexão, reproduz automaticamente quando o servidor volta, e notifica o usuário |
| 2 | **Lembrete Diário de Ponto** | Notificação agendada | Envia lembretes diários para bater o ponto, com múltiplas opções de configuração |
| 3 | **Indicador de Conectividade** | UI | Mostra o status online/offline no AppBar, Drawer e BottomNavigationBar |

---

## 2. Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│                       UI Layer                               │
│                                                              │
│  ┌─────────────────┐  ┌──────────────────┐                  │
│  │  AppShell        │  │  EmployeeDashboard                 │
│  │  (drawer, appbar)│  │  (reminder card)  │                 │
│  └────────┬────────┘  └────────┬─────────┘                  │
│           │                    │                             │
│  ┌────────▼────────────────────▼─────────────────┐          │
│  │  ReminderSettingsScreen                        │          │
│  │  (config: hora, aviso, dias úteis, som)        │          │
│  └────────────────────┬───────────────────────────┘          │
├───────────────────────┼──────────────────────────────────────┤
│              Services Layer                                  │
│                       │                                      │
│  ┌────────────────────▼───────────────────────────┐          │
│  │  NotificationService                           │          │
│  │  - scheduleAllPontoReminders()                 │          │
│  │  - _scheduleDaily() / _scheduleWeekdaysOnly() │          │
│  │  - _buildPontoDetails(mode)                    │          │
│  │  - cancelDailyPontoReminder()                  │          │
│  │  - showReplayComplete() / show()               │          │
│  └────────────────────┬───────────────────────────┘          │
│                       │                                      │
│  ┌────────────────────▼───────────────────────────┐          │
│  │  ReminderSettingsService                       │          │
│  │  - Persiste hora, minuto, aviso prévio,        │          │
│  │    dias úteis, modo de som via SharedPrefs     │          │
│  └────────────────────────────────────────────────┘          │
│                                                              │
│  ┌────────────────────────────────────────────────┐          │
│  │  OfflineQueueService                           │          │
│  │  - enqueue() / enqueueUpload() / replayAll()   │          │
│  │  - ReplayProgress callback para UI em tempo    │          │
│  │    real durante o replay                       │          │
│  └────────────────────┬───────────────────────────┘          │
│                       │                                      │
│  ┌────────────────────▼───────────────────────────┐          │
│  │  ConnectivityProvider / ConnectivityMonitor    │          │
│  │  - Monitora health check periódico             │          │
│  │  - Dispara replayOfflineQueue() ao ficar online│          │
│  └────────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Funcionalidade 1: Fila Offline

### O que faz

Quando o servidor fica indisponível (SocketException, HttpException, TimeoutException), as requisições POST/PUT/PATCH e uploads multipart são **enfileiradas** localmente. Quando a conexão é restabelecida, a fila é **reproduzida automaticamente** na ordem FIFO.

### Fluxo

```
Requisição falha (offline)
       │
       ▼
ApiService detecta erro
       │
       ├─ JSON (POST/PUT/PATCH)
       │   → OfflineQueueService.enqueue(method, path, body)
       │
       └─ Upload multipart (UPLOAD)
           → OfflineQueueService.enqueueUpload(path, fieldName, fileBytes, fileName, fields)
       │
       ▼
Dados salvos em FlutterSecureStorage (base64 dos bytes)
       │
Servidor volta
       │
       ▼
ConnectivityProvider._replayOfflineQueue()
       │
       ▼
OfflineQueueService.replayAll(onProgress: callback)
       │
       ├─ A cada requisição → ReplayProgressCallback atualiza UI
       │
       └─ Após conclusão → NotificationService.showReplayComplete()
                           (notificação na bandeja mesmo em background)
```

### Detalhes técnicos

| Item | Descrição |
|------|-----------|
| **Armazenamento** | `FlutterSecureStorage` — segurança criptografada |
| **IDs únicos** | Timestamp + contador |
| **Deduplicação** | Não enfileira requisição idêntica já existente |
| **Max retries** | 5 tentativas por entrada |
| **Recuperação** | JSON: reprocessa via ApiService.post/put/patch; Upload: reprocessa via ApiService.uploadFile |
| **Notificação** | `showReplayComplete(successCount, failureCount, total)` |
| **Payload** | `'replay_done'` — ao tocar na notificação, abre o dialog da fila |
| **Progresso em tempo real** | `ReplayProgress` (completed, total, successCount, failureCount, currentEntry, percent, isDone) |
| **Dialog de progresso** | `_ReplayProgressDialog` — barra de progresso + contagem + entry atual |
| **Dialog de resumo** | Após conclusão: `_StatChip` com sucessos/falhas |
| **Dialog de gerenciamento** | `showOfflineQueueDialog` — lista pendentes (método colorido, path, timestamp, retries) + botões "Limpar fila" e "Reenviar agora" |
| **Badge no AppBar** | Ícone laranja com contagem de itens pendentes |
| **Upload offline** | Suporte a multipart (fieldName, fileBytes base64, fileName, fields) |

### IDs de notificação

- `replay_done`: notificação padrão com payload `'replay_done'`

### Arquivos principais

- `services/offline_queue_service.dart`
- `services/notification_service.dart` (método `showReplayComplete`)
- `providers/connectivity_provider.dart` (método `_replayOfflineQueue`)
- `screens/home/app_shell.dart` (dialogs de gerenciamento + progresso)

---

## 4. Funcionalidade 2: Lembrete Diário de Ponto

### O que faz

Envia uma notificação diária lembrando o funcionário de bater o ponto eletrônico. Totalmente configurável pelo usuário.

### Fluxo

```
App inicia
    │
    ▼
AppShell.initState() → _schedulePontoReminder()
    │
    ▼
ReminderSettingsService (lê SharedPreferences)
    ├─ hour, minute (padrão 08:00)
    ├─ earlyEnabled (aviso prévio 15 min antes?)
    ├─ weekdaysOnly (apenas dias úteis?)
    └─ soundMode (som/vibração/silencioso)
    │
    ▼
NotificationService.scheduleAllPontoReminders()
    │
    ├─ weekdaysOnly=false → _scheduleDaily() → zonedSchedule(id: 2001, matchDateTimeComponents: time)
    │                                              + early (id: 2002) se habilitado
    │
    └─ weekdaysOnly=true  → _scheduleWeekdaysOnly() → 5 notificações (id: 2101-2105, match: dayOfWeekAndTime)
                                                       + 5 early (id: 2201-2205) se habilitado
    │
    ▼
Notificação dispara no horário agendado
    │
    ├─ Usuário toca → onPontoReminderTap → Navigator.push(PontoScreen)
    │
    └─ Funcionário bate o ponto → PontoScreen._handleRegister()
                                   → scheduleAllPontoReminders() → reagenda para amanhã
```

### Configurações disponíveis

#### ⏰ Horário do lembrete

| Campo | Padrão | Descrição |
|-------|--------|-----------|
| `hour` | 8 | Hora do disparo (0-23) |
| `minute` | 0 | Minuto do disparo (0-59) |

Seletor: `showTimePicker()` com tema amarelo do app.

#### 🔔 Aviso prévio (15 min antes)

| Estado | Padrão | Comportamento |
|--------|--------|---------------|
| Desativado | ✅ | Apenas 1 notificação no horário principal |
| Ativado | ❌ | 2 notificações: aviso 15 min antes + principal |

Mensagem do aviso: *"Seu ponto vai fechar em 15 minutos!"*

#### 📆 Apenas dias úteis

| Estado | Padrão | IDs usados |
|--------|--------|------------|
| Desativado (todos os dias) | ✅ | 2001 (principal), 2002 (early) |
| Ativado (seg-sex) | ❌ | 2101-2105 (principal/seg-sex), 2201-2205 (early/seg-sex) |

Técnica: `DateTimeComponents.dayOfWeekAndTime` — cada dia da semana tem sua própria notificação recorrente semanal.

#### 🔊 Modo de notificação

| Modo | Ícone | Comportamento |
|------|-------|---------------|
| Som | 🔊 Azul | `playSound: true, enableVibration: true, Importance.high` |
| Vibração | 📳 Âmbar | `playSound: false, enableVibration: true, Importance.high` |
| Silencioso | 🔕 Cinza | `playSound: false, enableVibration: false, Importance.low` |

### Tabela completa de IDs

| Tipo | IDs | Match Component | Descrição |
|------|-----|----------------|-----------|
| Daily principal | 2001 | `DateTimeComponents.time` | Repete diariamente |
| Daily early | 2002 | `DateTimeComponents.time` | Repete diariamente (15 min antes) |
| Segunda principal | 2101 | `DateTimeComponents.dayOfWeekAndTime` | Repete semanalmente na seg |
| Terça principal | 2102 | `DateTimeComponents.dayOfWeekAndTime` | Repete semanalmente na ter |
| Quarta principal | 2103 | `DateTimeComponents.dayOfWeekAndTime` | Repete semanalmente na qua |
| Quinta principal | 2104 | `DateTimeComponents.dayOfWeekAndTime` | Repete semanalmente na qui |
| Sexta principal | 2105 | `DateTimeComponents.dayOfWeekAndTime` | Repete semanalmente na sex |
| Segunda early | 2201 | `DateTimeComponents.dayOfWeekAndTime` | Repete semanalmente na seg |
| Terça early | 2202 | `DateTimeComponents.dayOfWeekAndTime` | Repete semanalmente na ter |
| Quarta early | 2203 | `DateTimeComponents.dayOfWeekAndTime` | Repete semanalmente na qua |
| Quinta early | 2204 | `DateTimeComponents.dayOfWeekAndTime` | Repete semanalmente na qui |
| Sexta early | 2205 | `DateTimeComponents.dayOfWeekAndTime` | Repete semanalmente na sex |

### Cancelamento

`NotificationService.cancelDailyPontoReminder()` cancela **todos** os IDs (2001-2002, 2101-2105, 2201-2205).

### Onde as configurações aparecem

| Local | O que mostra |
|-------|-------------|
| **Dashboard do Funcionário** (`EmployeeDashboardScreen`) | Card compacto com horário, badge +15min (se ativo), badge Seg-Sex (se ativo), ícone do modo de som |
| **Drawer > Funcionário > Configurar Lembrete** | Tela completa de configuração |
| **AppBar (ponto eletrônico)** | Ação de abrir o ponto |

### Edge cases tratados

- **Horário antes de 00:15** → aviso prévio não é agendado (UI mostra `---`)
- **Horário já passou hoje** → agenda para amanhã
- **Modo silencioso + Importance.low** → canal pode permanecer Importance.high se já criado (Android 8+), mas `playSound: false` e `enableVibration: false` funcionam como per-notification params
- **Reset para padrão** → lembrete volta para 08:00, aviso desativado, dias úteis desativado, modo som

### Arquivos principais

- `services/notification_service.dart` — agendamento via `zonedSchedule`
- `services/reminder_settings_service.dart` — persistência via `SharedPreferences`
- `screens/employee/reminder_settings_screen.dart` — UI de configuração
- `screens/home/app_shell.dart` — `_schedulePontoReminder()` + `onPontoReminderTap`
- `screens/employee/ponto_screen.dart` — reagendamento após bater o ponto
- `screens/employee/employee_dashboard_screen.dart` — card indicador

---

## 5. Funcionalidade 3: Indicador de Conectividade

### O que faz

Mostra visualmente se o servidor está online ou offline em 3 lugares do app.

### Locais

#### AppBar
```
┌─────────────────────────────────────────┐
│ 🔔  🔴 (pulsando)  Secured Guard       │
│         🟢 (fixo)                       │
└─────────────────────────────────────────┘
```
- Bolinha verde (online) ou vermelha pulsante (offline)
- Animação de pulsação quando offline (`TickerProviderStateMixin`)
- Badge laranja com contagem da fila offline ao lado

#### Drawer Header
```
┌─────────────────────────┐
│ [A]              🟢 Online│
│ Nome do Usuário        │
│ ADMIN                   │
└─────────────────────────┘
```
- Indicador verde/vermelho com label "Online"/"Offline"
- No header do Drawer, ao lado da foto do perfil

#### BottomNavigationBar
```
   🟢          🟢          🔴
  Início     Funcionário  Supervisor
```
- Bolinha verde/vermelha em cada ícone de navegação
- Posicionada no canto inferior direito de cada ícone

### Offline Banner

```
┌──────────────────────────────────────────────┐
│  ☁️ Servidor offline    [🔄 Tentar reconectar]│
└──────────────────────────────────────────────┘
```
- Aparece/desaparece com animação (`AnimatedContainer`)
- Botão "Tentar reconectar" que chama `ConnectivityProvider.checkNow()`

### Detecção

| Mecanismo | Gatilho |
|-----------|---------|
| `ConnectivityMonitor` | Health check periódico no servidor |
| `ApiService.onOffline` | SocketException, HttpException, TimeoutException |
| `ApiService.onOnline` | Requisição bem-sucedida após estar offline |

### Arquivos principais

- `services/connectivity_monitor.dart` — monitor periódico
- `providers/connectivity_provider.dart` — estado + replay da fila
- `screens/home/app_shell.dart` — UI dos indicadores

---

## 6. Bibliotecas Utilizadas

| Pacote | Versão | Função |
|--------|--------|--------|
| `flutter_local_notifications` | ^18.0.0 | Notificações locais e agendadas |
| `timezone` | ^0.9.2 | Timezone-aware scheduling (zonedSchedule) |
| `shared_preferences` | ^2.2.2 | Persistência de configurações |
| `flutter_secure_storage` | ^9.0.0 | Armazenamento criptografado da fila offline |
| `provider` | ^6.1.1 | Gerenciamento de estado |
| `intl` | ^0.19.0 | Formatação de data/hora |

---

## 7. Arquivos Envolvidos

### Services

| Arquivo | Função |
|---------|--------|
| `lib/services/notification_service.dart` | Singleton — inicialização, agendamento, cancelamento, notificações avulsas |
| `lib/services/reminder_settings_service.dart` | Persistência das configurações do lembrete + enum `ReminderSoundMode` |
| `lib/services/offline_queue_service.dart` | Fila offline com suporte a JSON + upload, replay com progresso |
| `lib/services/connectivity_monitor.dart` | Monitor periódico de health check |
| `lib/services/api_service.dart` | Interceptor de rede (_enqueueIfMutating, _notifyOffline, enqueueUpload) |

### Providers

| Arquivo | Função |
|---------|--------|
| `lib/providers/connectivity_provider.dart` | Estado de conectividade, replay automático da fila |

### Screens

| Arquivo | Função |
|---------|--------|
| `lib/screens/home/app_shell.dart` | AppBar/indicadores, drawer, dialogs da fila offline, scheduling inicial |
| `lib/screens/employee/reminder_settings_screen.dart` | Tela de configuração completa do lembrete |
| `lib/screens/employee/employee_dashboard_screen.dart` | Card indicador do lembrete no dashboard |
| `lib/screens/employee/ponto_screen.dart` | Reagendamento do lembrete após bater o ponto |

### Config

| Arquivo | Função |
|---------|--------|
| `android/app/src/main/AndroidManifest.xml` | Permissão `POST_NOTIFICATIONS` |
| `pubspec.yaml` | Dependências |
| `lib/main.dart` | Inicialização do `NotificationService`, `navigatorKey` global |

---

*Documento gerado em: ${DateTime.now().day}/${DateTime.now().month}/${DateTime.now().year}*
