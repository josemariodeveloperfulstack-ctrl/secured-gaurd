import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/connectivity_provider.dart';
import '../../services/offline_queue_service.dart';
import '../../services/notification_service.dart';
import '../../services/reminder_settings_service.dart';
import '../auth/login_screen.dart';
import '../dp/benefits_screen.dart';
import '../dp/dependents_screen.dart';
import '../dp/payroll_screen.dart';
import '../employee/employee_dashboard_screen.dart';
import '../employee/epis_screen.dart';
import '../employee/ferias_screen.dart';
import '../employee/holerites_screen.dart';
import '../employee/mensagens_screen.dart';
import '../employee/plantoes_screen.dart';
import '../employee/ponto_screen.dart';
import '../employee/reminder_settings_screen.dart';
import '../employee/suporte_screen.dart';
import '../employee/treinamentos_screen.dart';
import '../financeiro/accounts_receivable_screen.dart';
import '../financeiro/fiscal_invoices_screen.dart';
import '../financeiro/scheduled_payments_screen.dart';
import '../operacional/occurrence_list_screen.dart';
import '../operacional/scale_list_screen.dart';
import '../rh/certifications_screen.dart';
import '../rh/evaluations_screen.dart';
import '../rh/medical_exams_screen.dart';
import '../supervisor/my_visits_screen.dart';
import '../supervisor/supervisor_dashboard_screen.dart';
import '../supervisor/supervisor_login_screen.dart';
import '../supervisor/weekly_route_screen.dart';
import '../supervisor/work_post_checkin_screen.dart';
import 'home_dashboard_screen.dart';

// =============== ACOES DO DIALOGO ===============

/// Acoes do dialogo de fila offline.
enum _DialogAction { clear, retry }

// =============== STANDALONE HELPERS ===============

/// ConstrOi widget de icone colorido por metodo HTTP.
Widget buildMethodIcon(String method) {
  Color color;
  IconData icon;
  switch (method.toUpperCase()) {
    case 'POST':
      color = Colors.green;
      icon = Icons.add_circle_outline;
    case 'PUT':
      color = Colors.blue;
      icon = Icons.edit_outlined;
    case 'PATCH':
      color = Colors.orange;
      icon = Icons.build_outlined;
    case 'UPLOAD':
      color = Colors.purple;
      icon = Icons.upload_file;
    default:
      color = Colors.grey;
      icon = Icons.help_outline;
  }
  return Container(
    padding: const EdgeInsets.all(4),
    decoration: BoxDecoration(
      color: color.withAlpha(20),
      borderRadius: BorderRadius.circular(6),
    ),
    child: Icon(icon, size: 16, color: color),
  );
}

/// Formata timestamp para exibicao amigavel.
String formatTimestamp(DateTime dt) {
  final now = DateTime.now();
  final diff = now.difference(dt);
  if (diff.inSeconds < 60) return 'Agora ha pouco';
  if (diff.inMinutes < 60) return 'Ha ${diff.inMinutes} min';
  if (diff.inHours < 24) return 'Ha ${diff.inHours}h';
  return '${dt.day}/${dt.month} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
}

/// Exibe o dialog da fila offline pendente.
/// Funcao standalone, pode ser chamada de qualquer lugar com um BuildContext.
Future<void> showOfflineQueueDialog(BuildContext context) async {
  final queue = OfflineQueueService();
  final entries = queue.queue;

  if (entries.isEmpty) return;

  final result = await showDialog<_DialogAction>(
    context: context,
    builder: (ctx) {
      return AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.cloud_upload_outlined,
                color: Colors.orange, size: 22),
            const SizedBox(width: 8),
            Text('${entries.length} pendente${entries.length == 1 ? '' : 's'}'),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: ListView.separated(
            shrinkWrap: true,
            itemCount: entries.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (_, i) {
              final e = entries[i];
              return ListTile(
                dense: true,
                contentPadding: const EdgeInsets.symmetric(vertical: 2),
                leading: buildMethodIcon(e.method),
                title: Text(
                  e.path,
                  style: const TextStyle(fontSize: 12, fontFamily: 'monospace'),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                subtitle: Text(
                  formatTimestamp(e.queuedAt),
                  style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                ),
                trailing: e.retryCount > 0
                    ? Text(
                        '${e.retryCount}/5',
                        style: TextStyle(
                          fontSize: 10,
                          color: Colors.grey[600],
                        ),
                      )
                    : null,
              );
            },
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, _DialogAction.clear),
            child: const Text('Limpar fila'),
          ),
          FilledButton.icon(
            onPressed: () => Navigator.pop(ctx, _DialogAction.retry),
            icon: const Icon(Icons.refresh, size: 18),
            label: const Text('Reenviar agora'),
          ),
        ],
      );
    },
  );

  if (result == _DialogAction.clear) {
    await queue.clear();
  } else if (result == _DialogAction.retry) {
    if (context.mounted) {
      await showReplayProgress(context, queue);
    }
  }
}

/// Exibe o dialog de progresso do replay.
/// Funcao standalone, usada por [showOfflineQueueDialog] e por notificacoes.
Future<void> showReplayProgress(
    BuildContext context, OfflineQueueService queue) async {
  if (!context.mounted) return;

  final progressNotifier = ValueNotifier<ReplayProgress?>(
    const ReplayProgress(completed: 0, total: 1, successCount: 0, failureCount: 0),
  );

  showDialog(
    context: context,
    barrierDismissible: false,
    builder: (_) => _ReplayProgressDialog(progressNotifier: progressNotifier),
  );

  int successCount = 0;
  try {
    successCount = await queue.replayAll(
      onProgress: (progress) {
        progressNotifier.value = progress;
      },
    );
  } catch (e) {
    debugPrint('[AppShell] Erro ao reenviar fila: $e');
  } finally {
    if (progressNotifier.value != null) {
      final last = progressNotifier.value!;
      progressNotifier.value = ReplayProgress(
        completed: last.total,
        total: last.total,
        successCount: successCount,
        failureCount: last.total - successCount,
      );
    }
  }
}

// =============== APP SHELL ===============

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> with TickerProviderStateMixin {
  int _currentIndex = 0;

  late final AnimationController _pulseController;
  late final Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    // Animacao de pulsacao para indicador offline
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 0.3, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    // Iniciar monitor de conectividade assim que o widget estiver na arvore
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ConnectivityProvider>().start();

      // Conectar callback de notificacao para abrir dialog da fila offline
      NotificationService().onNotificationTap = (ctx) {
        showOfflineQueueDialog(ctx);
      };

      // Conectar callback de notificacao do lembrete diario de ponto
      NotificationService().onPontoReminderTap = (ctx) {
        Navigator.of(ctx).push(
          MaterialPageRoute(builder: (_) => const PontoScreen()),
        );
      };

      // Agendar lembrete diario de bater o ponto
      _schedulePontoReminder();
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    // Limpar callbacks ao sair
    NotificationService().onPontoReminderTap = null;
    super.dispose();
  }

  /// Agenda (ou re-agenda) os lembretes diários de bater o ponto:
  /// - Principal no horário configurado (padrão 08:00)
  /// - Aviso prévio opcional (15 minutos antes, se ativado)
  Future<void> _schedulePontoReminder() async {
    final settings = ReminderSettingsService();
    final hour = await settings.getReminderHour();
    final minute = await settings.getReminderMinute();
    final earlyEnabled = await settings.isEarlyReminderEnabled();
    final weekdaysOnly = await settings.isWeekdaysOnly();
    final soundMode = await settings.getSoundMode();
    debugPrint('[AppShell] ⏰ Agendando lembrete para ${hour}h${minute.toString().padLeft(2, "0")}${earlyEnabled ? " (aviso)" : ""}${weekdaysOnly ? " (dias úteis)" : ""} [${soundMode.label}]');
    await NotificationService().scheduleAllPontoReminders(
      hour: hour,
      minute: minute,
      earlyEnabled: earlyEnabled,
      weekdaysOnly: weekdaysOnly,
      soundMode: soundMode,
    );
  }
  
  /// Abre a tela de configuração do lembrete e re-agenda ao voltar.
  Future<void> _openReminderSettings() async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const ReminderSettingsScreen()),
    );
    // Se o horário foi alterado, re-agendar
    if (changed == true) {
      _schedulePontoReminder();
    }
  }
  bool _employeeExpanded = true;
  bool _supervisorExpanded = true;
  bool _operacionalExpanded = false;
  bool _rhExpanded = false;
  bool _dpExpanded = false;
  bool _financeiroExpanded = false;

  final List<Widget> _pages = [
    const HomeDashboardScreen(),
    const EmployeeDashboardScreen(),
    const SupervisorDashboardScreen(),
  ];

  final List<String> _titles = [
    'Secured Guard',
    'Portal do Funcionario',
    'Supervisor',
  ];

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final isSupervisor = authProvider.isSupervisor;

    if (!authProvider.isAuthenticated) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
          (route) => false,
        );
      });
      return const SizedBox.shrink();
    }

    final connectivity = context.watch<ConnectivityProvider>();
    final isOnline = connectivity.isOnline;
    final pendingCount = connectivity.pendingQueueCount;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_titles[_currentIndex]),
            const SizedBox(width: 8),
            _AppBarConnectivityIndicator(
              isOnline: isOnline,
              pulseAnimation: _pulseAnimation,
            ),
          ],
        ),
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () => Scaffold.of(ctx).openDrawer(),
          ),
        ),
        actions: [
          // Badge de fila offline pendente
          if (pendingCount > 0)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: Badge(
                label: Text(
                  pendingCount > 99 ? '99+' : '$pendingCount',
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                ),
                smallSize: 18,
                backgroundColor: Colors.orange.shade700,
                textColor: Colors.white,
                child: IconButton(
                  icon: const Icon(Icons.cloud_upload_outlined, color: Colors.orange),
                  onPressed: () => _showOfflineQueueDialog(context, connectivity),
                  tooltip: 'Fila offline',
                ),
              ),
            ),
          if (!isSupervisor)
            IconButton(
              icon: const Icon(Icons.shield, color: Colors.grey),
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const SupervisorLoginScreen()),
                );
              },
              tooltip: 'Login do Supervisor',
            ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => context.read<AuthProvider>().logout(),
            tooltip: 'Sair',
          ),
        ],
      ),
      drawer: _buildDrawer(context, authProvider, isSupervisor, isOnline),
      body: Column(
        children: [
          // Offline banner animado com botao reconectar
          _OfflineBanner(
            isOnline: isOnline,
            onRetry: () => connectivity.checkNow(),
          ),
          Expanded(
            child: IndexedStack(
              index: _currentIndex,
              children: _pages,
            ),
          ),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          if (!isSupervisor && index == 2) return;
          setState(() => _currentIndex = index);
        },
        items: [
          BottomNavigationBarItem(
            icon: _buildNavIcon(Icons.dashboard, Icons.dashboard, isOnline),
            activeIcon: _buildNavIcon(Icons.dashboard, Icons.dashboard, isOnline),
            label: 'Inicio',
          ),
          BottomNavigationBarItem(
            icon: _buildNavIcon(Icons.person, Icons.person, isOnline),
            activeIcon: _buildNavIcon(Icons.person, Icons.person, isOnline),
            label: 'Funcionario',
          ),
          BottomNavigationBarItem(
            icon: _buildNavIcon(Icons.shield, Icons.shield, isOnline),
            activeIcon: _buildNavIcon(Icons.shield, Icons.shield, isOnline),
            label: isSupervisor ? 'Supervisor' : 'Admin',
          ),
        ],
      ),
    );
  }

  Widget _buildDrawer(BuildContext context, AuthProvider authProvider, bool isSupervisor, bool isOnline) {
    final user = authProvider.user;
    final onlineColor = isOnline ? Colors.green : Colors.red;
    final onlineLabel = isOnline ? 'Online' : 'Offline';

    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          // Drawer Header
          DrawerHeader(
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor:
                          Theme.of(context).colorScheme.primary.withAlpha(30),
                      child: Text(
                        (user?.name.isNotEmpty == true)
                            ? user!.name[0].toUpperCase()
                            : '?',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: onlineColor.withAlpha(20),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: onlineColor.withAlpha(60)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: onlineColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            onlineLabel,
                            style: TextStyle(
                              color: onlineColor,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  user?.name ?? 'Usuario',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 16),
                ),
                Text(
                  user?.role.name.toUpperCase() ?? '',
                  style: TextStyle(color: Colors.grey[400], fontSize: 12),
                ),
              ],
            ),
          ),

          _DrawerSection(title: 'NAVEGACAO'),
          _DrawerItem(
            icon: Icons.home,
            title: 'Inicio',
            onTap: () {
              setState(() => _currentIndex = 0);
              Navigator.pop(context);
            },
          ),
          _DrawerItem(
            icon: Icons.person,
            title: 'Funcionario',
            onTap: () {
              setState(() => _currentIndex = 1);
              Navigator.pop(context);
            },
          ),
          if (isSupervisor)
            _DrawerItem(
              icon: Icons.shield,
              title: 'Supervisor',
              onTap: () {
                setState(() => _currentIndex = 2);
                Navigator.pop(context);
              },
            ),

          const Divider(color: Color(0xFF2A2A3E)),

          _DrawerSection(title: 'MODULOS'),

          _ExpansionDrawerItem(
            icon: Icons.person,
            title: 'Funcionario',
            subtitle: 'Servicos do Colaborador',
            expanded: _employeeExpanded,
            onToggle: () => setState(() => _employeeExpanded = !_employeeExpanded),
            children: [
              _DrawerSubItem(icon: Icons.access_time, title: 'Ponto Eletronico',
                  onTap: () { Navigator.pop(context); _navigateToModule(const PontoScreen()); }),
              _DrawerSubItem(icon: Icons.description, title: 'Holerites',
                  onTap: () { Navigator.pop(context); _navigateToModule(const HoleritesScreen()); }),
              _DrawerSubItem(icon: Icons.beach_access, title: 'Ferias',
                  onTap: () { Navigator.pop(context); _navigateToModule(const FeriasScreen()); }),
              _DrawerSubItem(icon: Icons.health_and_safety, title: 'Meus EPIs',
                  onTap: () { Navigator.pop(context); _navigateToModule(const EpisScreen()); }),
              _DrawerSubItem(icon: Icons.calendar_month, title: 'Plantoes',
                  onTap: () { Navigator.pop(context); _navigateToModule(const PlantoesScreen()); }),
              _DrawerSubItem(icon: Icons.school, title: 'Treinamentos',
                  onTap: () { Navigator.pop(context); _navigateToModule(const TreinamentosScreen()); }),
              _DrawerSubItem(icon: Icons.message, title: 'Mensagens',
                  onTap: () { Navigator.pop(context); _navigateToModule(const MensagensScreen()); }),
              _DrawerSubItem(icon: Icons.support_agent, title: 'Suporte RH',
                  onTap: () { Navigator.pop(context); _navigateToModule(const SuporteScreen()); }),
              _DrawerSubItem(icon: Icons.alarm, title: 'Configurar Lembrete',
                  onTap: () { Navigator.pop(context); _openReminderSettings(); }),
            ],
          ),

          if (isSupervisor)
            _ExpansionDrawerItem(
              icon: Icons.shield,
              title: 'Supervisor',
              subtitle: 'Ferramentas de Supervisao',
              expanded: _supervisorExpanded,
              onToggle: () => setState(() => _supervisorExpanded = !_supervisorExpanded),
              children: [
                _DrawerSubItem(icon: Icons.qr_code_scanner, title: 'Check-in no Posto',
                    onTap: () { Navigator.pop(context); _navigateToModule(const WorkPostCheckinScreen()); }),
                _DrawerSubItem(icon: Icons.route, title: 'Rota Semanal',
                    onTap: () { Navigator.pop(context); _navigateToModule(const WeeklyRouteScreen()); }),
                _DrawerSubItem(icon: Icons.list_alt, title: 'Minhas Visitas',
                    onTap: () { Navigator.pop(context); _navigateToModule(const MyVisitsScreen()); }),
              ],
            ),

          _ExpansionDrawerItem(
            icon: Icons.assignment,
            title: 'Operacional',
            subtitle: 'Ocorrencias e Escalas',
            expanded: _operacionalExpanded,
            onToggle: () => setState(() => _operacionalExpanded = !_operacionalExpanded),
            children: [
              _DrawerSubItem(icon: Icons.warning_amber, title: 'Ocorrencias',
                  onTap: () { Navigator.pop(context); _navigateToModule(const OccurrenceListScreen()); }),
              _DrawerSubItem(icon: Icons.calendar_month, title: 'Escalas',
                  onTap: () { Navigator.pop(context); _navigateToModule(const ScaleListScreen()); }),
            ],
          ),

          _ExpansionDrawerItem(
            icon: Icons.verified_user,
            title: 'RH',
            subtitle: 'Certificacoes e Exames',
            expanded: _rhExpanded,
            onToggle: () => setState(() => _rhExpanded = !_rhExpanded),
            children: [
              _DrawerSubItem(icon: Icons.verified, title: 'Certificacoes',
                  onTap: () { Navigator.pop(context); _navigateToModule(const CertificationsScreen()); }),
              _DrawerSubItem(icon: Icons.medical_information, title: 'Exames Medicos',
                  onTap: () { Navigator.pop(context); _navigateToModule(const MedicalExamsScreen()); }),
              _DrawerSubItem(icon: Icons.assignment_turned_in, title: 'Avaliacoes',
                  onTap: () { Navigator.pop(context); _navigateToModule(const EvaluationsScreen()); }),
            ],
          ),

          _ExpansionDrawerItem(
            icon: Icons.badge,
            title: 'Departamento Pessoal',
            subtitle: 'Folha, Beneficios e Dependentes',
            expanded: _dpExpanded,
            onToggle: () => setState(() => _dpExpanded = !_dpExpanded),
            children: [
              _DrawerSubItem(icon: Icons.receipt_long, title: 'Folha de Pagamento',
                  onTap: () { Navigator.pop(context); _navigateToModule(const PayrollScreen()); }),
              _DrawerSubItem(icon: Icons.card_giftcard, title: 'Beneficios',
                  onTap: () { Navigator.pop(context); _navigateToModule(const BenefitsScreen()); }),
              _DrawerSubItem(icon: Icons.people, title: 'Dependentes',
                  onTap: () { Navigator.pop(context); _navigateToModule(const DependentsScreen()); }),
            ],
          ),

          _ExpansionDrawerItem(
            icon: Icons.account_balance,
            title: 'Financeiro',
            subtitle: 'Contas, Notas e Pagamentos',
            expanded: _financeiroExpanded,
            onToggle: () => setState(() => _financeiroExpanded = !_financeiroExpanded),
            children: [
              _DrawerSubItem(icon: Icons.receipt, title: 'Contas a Receber',
                  onTap: () { Navigator.pop(context); _navigateToModule(const AccountsReceivableScreen()); }),
              _DrawerSubItem(icon: Icons.description, title: 'Notas Fiscais',
                  onTap: () { Navigator.pop(context); _navigateToModule(const FiscalInvoicesScreen()); }),
              _DrawerSubItem(icon: Icons.calendar_month, title: 'Pagamentos',
                  onTap: () { Navigator.pop(context); _navigateToModule(const ScheduledPaymentsScreen()); }),
            ],
          ),
        ],
      ),
    );
  }

  void _navigateToModule(Widget screen) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => screen),
    );
  }

  Future<void> _showOfflineQueueDialog(
      BuildContext context, ConnectivityProvider connectivity) async {
    await showOfflineQueueDialog(context);
  }

  Future<void> _showReplayProgress(
      BuildContext context, OfflineQueueService queue) async {
    await showReplayProgress(context, queue);
  }

  Widget _methodIcon(String method) => buildMethodIcon(method);
  String _formatTimestamp(DateTime dt) => formatTimestamp(dt);

  Widget _buildNavIcon(IconData icon, IconData activeIcon, bool isOnline) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Icon(isOnline ? activeIcon : icon),
        Positioned(
          right: -4,
          bottom: -2,
          child: Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: isOnline ? Colors.green : Colors.red,
              shape: BoxShape.circle,
              border: Border.all(
                color: Theme.of(context).colorScheme.surface,
                width: 1.5,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// =============== DRAWER WIDGETS ===============

class _DrawerSection extends StatelessWidget {
  final String title;
  const _DrawerSection({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
      child: Text(
        title,
        style: TextStyle(
          color: Theme.of(context).colorScheme.primary,
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;

  const _DrawerItem({
    required this.icon,
    required this.title,
    this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: Colors.grey[400], size: 22),
      title: Text(title, style: const TextStyle(fontSize: 14)),
      subtitle: subtitle != null
          ? Text(subtitle!,
              style: TextStyle(color: Colors.grey[600], fontSize: 11))
          : null,
      onTap: onTap,
      dense: true,
    );
  }
}

class _ExpansionDrawerItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool expanded;
  final VoidCallback onToggle;
  final List<_DrawerSubItem> children;

  const _ExpansionDrawerItem({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.expanded,
    required this.onToggle,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ListTile(
          leading: Icon(icon, color: Colors.grey[400], size: 22),
          title: Text(title, style: const TextStyle(fontSize: 14)),
          subtitle: Text(subtitle,
              style: TextStyle(color: Colors.grey[600], fontSize: 11)),
          trailing: Icon(
            expanded ? Icons.expand_less : Icons.expand_more,
            color: Colors.grey[500],
            size: 20,
          ),
          onTap: onToggle,
          dense: true,
        ),
        AnimatedCrossFade(
          firstChild: const SizedBox.shrink(),
          secondChild: Column(
            children: children.map((child) => child).toList(),
          ),
          crossFadeState: expanded
              ? CrossFadeState.showSecond
              : CrossFadeState.showFirst,
          duration: const Duration(milliseconds: 200),
        ),
      ],
    );
  }
}

class _AppBarConnectivityIndicator extends StatelessWidget {
  final bool isOnline;
  final Animation<double> pulseAnimation;

  const _AppBarConnectivityIndicator({
    required this.isOnline,
    required this.pulseAnimation,
  });

  @override
  Widget build(BuildContext context) {
    final color = isOnline ? Colors.green : Colors.red;

    return AnimatedBuilder(
      animation: pulseAnimation,
      builder: (context, child) {
        return Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            boxShadow: isOnline
                ? []
                : [
                    BoxShadow(
                      color: color.withAlpha(80),
                      blurRadius: 4,
                      spreadRadius: pulseAnimation.value * 2,
                    ),
                  ],
          ),
          child: isOnline
              ? null
              : Center(
                  child: Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: Colors.white.withAlpha((pulseAnimation.value * 180).toInt()),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
        );
      },
    );
  }
}

class _OfflineBanner extends StatelessWidget {
  final bool isOnline;
  final VoidCallback? onRetry;
  const _OfflineBanner({required this.isOnline, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      height: isOnline ? 0 : 36,
      width: double.infinity,
      decoration: BoxDecoration(
        color: isOnline ? Colors.transparent : Colors.red.shade800,
      ),
      child: isOnline
          ? const SizedBox.shrink()
          : Center(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.cloud_off, size: 14, color: Colors.white70),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      'Servidor offline',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    height: 24,
                    child: TextButton.icon(
                      onPressed: onRetry,
                      icon: const Icon(Icons.refresh, size: 14, color: Colors.white),
                      label: const Text(
                        'Tentar reconectar',
                        style: TextStyle(fontSize: 11, color: Colors.white),
                      ),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 6),
                        backgroundColor: Colors.white.withAlpha(25),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(6),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}

class _DrawerSubItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;

  const _DrawerSubItem({
    required this.icon,
    required this.title,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: const EdgeInsets.only(left: 56, right: 16),
      leading: Icon(icon, color: Colors.grey[500], size: 18),
      title: Text(title, style: const TextStyle(fontSize: 13)),
      onTap: onTap,
      dense: true,
      visualDensity: VisualDensity.compact,
    );
  }
}

// =============== REPLAY PROGRESS DIALOG ===============

class _ReplayProgressDialog extends StatefulWidget {
  final ValueNotifier<ReplayProgress?> progressNotifier;

  const _ReplayProgressDialog({required this.progressNotifier});

  @override
  State<_ReplayProgressDialog> createState() => _ReplayProgressDialogState();
}

class _ReplayProgressDialogState extends State<_ReplayProgressDialog> {
  @override
  void initState() {
    super.initState();
    widget.progressNotifier.addListener(_onProgressChanged);
  }

  @override
  void dispose() {
    widget.progressNotifier.removeListener(_onProgressChanged);
    super.dispose();
  }

  void _onProgressChanged() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final progress = widget.progressNotifier.value;
    if (progress == null) return const SizedBox.shrink();

    final isDone = progress.isDone;

    return AlertDialog(
      title: Row(
        children: [
          Icon(
            isDone ? Icons.check_circle_outline : Icons.cloud_sync,
            color: isDone ? Colors.green : Colors.orange,
            size: 22,
          ),
          const SizedBox(width: 8),
          Text(isDone ? 'Reenvio concluido' : 'Reenviando...'),
        ],
      ),
      content: SizedBox(
        width: 320,
        child: isDone ? _buildSummary(progress) : _buildProgress(progress),
      ),
      actions: [
        if (isDone)
          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Fechar'),
          ),
      ],
    );
  }

  Widget _buildProgress(ReplayProgress progress) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: progress.percent,
            minHeight: 8,
            backgroundColor: Colors.grey.withAlpha(30),
          ),
        ),
        const SizedBox(height: 12),
        Center(
          child: Text(
            '${progress.completed} de ${progress.total}',
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
        ),
        const SizedBox(height: 4),
        Center(
          child: Text(
            '${progress.successCount} sucesso${progress.successCount == 1 ? '' : 's'}',
            style: TextStyle(fontSize: 13, color: Colors.green.shade600),
          ),
        ),
        const SizedBox(height: 12),
        if (progress.currentEntry != null) ...[
          const Divider(),
          const SizedBox(height: 4),
          Row(
            children: [
              buildMethodIcon(progress.currentEntry!.method),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Processando:',
                        style: TextStyle(fontSize: 11, color: Colors.grey[600])),
                    Text(progress.currentEntry!.path,
                        style: const TextStyle(fontSize: 12, fontFamily: 'monospace'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildSummary(ReplayProgress progress) {
    final hasFailures = progress.failureCount > 0;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          hasFailures ? Icons.warning_amber_rounded : Icons.check_circle_rounded,
          color: hasFailures ? Colors.orange : Colors.green,
          size: 48,
        ),
        const SizedBox(height: 12),
        Text(
          hasFailures
              ? '${progress.successCount} de ${progress.total} reenviados'
              : 'Todos os ${progress.total} reenviados',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: hasFailures ? Colors.orange.shade700 : Colors.green.shade700,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _StatChip(
              icon: Icons.check_circle,
              label: 'Sucesso',
              count: progress.successCount,
              color: Colors.green,
            ),
            _StatChip(
              icon: Icons.error_outline,
              label: 'Falha',
              count: progress.failureCount,
              color: Colors.red,
            ),
          ],
        ),
      ],
    );
  }
}

class _StatChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final int count;
  final Color color;

  const _StatChip({
    required this.icon,
    required this.label,
    required this.count,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: color.withAlpha(15),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withAlpha(40)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 4),
          Text('$count',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
          Text(label,
              style: TextStyle(fontSize: 11, color: color.withAlpha(180))),
        ],
      ),
    );
  }
}
