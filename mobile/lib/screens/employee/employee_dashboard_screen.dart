import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/reminder_settings_service.dart';
import 'ponto_screen.dart';
import 'holerites_screen.dart';
import 'ferias_screen.dart';
import 'epis_screen.dart';
import 'plantoes_screen.dart';
import 'treinamentos_screen.dart';
import 'mensagens_screen.dart';
import 'suporte_screen.dart';

/// Dashboard do Funcionário — sem Scaffold próprio pois está embutido no AppShell.
class EmployeeDashboardScreen extends StatefulWidget {
  const EmployeeDashboardScreen({super.key});

  @override
  State<EmployeeDashboardScreen> createState() =>
      _EmployeeDashboardScreenState();
}

class _EmployeeDashboardScreenState extends State<EmployeeDashboardScreen> {
  final ReminderSettingsService _reminderSettings = ReminderSettingsService();

  int _reminderHour = 8;
  int _reminderMinute = 0;
  bool _earlyEnabled = false;
  bool _weekdaysOnly = false;
  ReminderSoundMode _soundMode = ReminderSoundMode.sound;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _loadReminderSettings();
  }

  Future<void> _loadReminderSettings() async {
    final hour = await _reminderSettings.getReminderHour();
    final minute = await _reminderSettings.getReminderMinute();
    final early = await _reminderSettings.isEarlyReminderEnabled();
    final weekdaysOnly = await _reminderSettings.isWeekdaysOnly();
    final soundMode = await _reminderSettings.getSoundMode();
    if (mounted) {
      setState(() {
        _reminderHour = hour;
        _reminderMinute = minute;
        _earlyEnabled = early;
        _weekdaysOnly = weekdaysOnly;
        _soundMode = soundMode;
        _loaded = true;
      });
    }
  }

  String get _formattedTime {
    final h = _reminderHour.toString().padLeft(2, '0');
    final m = _reminderMinute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  String get _earlyFormattedTime {
    final total = _reminderHour * 60 + _reminderMinute - 15;
    if (total < 0) return '---';
    final h = (total ~/ 60).toString().padLeft(2, '0');
    final m = (total % 60).toString().padLeft(2, '0');
    return '$h:$m';
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final user = authProvider.user;

    return RefreshIndicator(
      onRefresh: _loadReminderSettings,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: Theme.of(context)
                          .colorScheme
                          .primary
                          .withAlpha(30),
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
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Bem-vindo, ${user?.name.split(' ').firstOrNull ?? 'Usuário'}!',
                            style: Theme.of(context)
                                .textTheme
                                .titleLarge
                                ?.copyWith(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${user?.role.name.toUpperCase()} • ${user?.department ?? 'Operacional'}',
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(color: Colors.grey),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Status do lembrete
            _ReminderStatusCard(
              formattedTime: _formattedTime,
              earlyEnabled: _earlyEnabled,
              earlyFormattedTime: _earlyFormattedTime,
              weekdaysOnly: _weekdaysOnly,
              soundMode: _soundMode,
              loaded: _loaded,
            ),
            const SizedBox(height: 20),

            // Menu Grid
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.1,
              children: [
                _MenuCard(
                  icon: Icons.access_time,
                  label: 'Ponto Eletrônico',
                  color: Colors.amber,
                  onTap: () => _navigate(context, const PontoScreen()),
                ),
                _MenuCard(
                  icon: Icons.description,
                  label: 'Holerites',
                  color: Colors.blue,
                  onTap: () => _navigate(context, const HoleritesScreen()),
                ),
                _MenuCard(
                  icon: Icons.beach_access,
                  label: 'Férias',
                  color: Colors.green,
                  onTap: () => _navigate(context, const FeriasScreen()),
                ),
                _MenuCard(
                  icon: Icons.health_and_safety,
                  label: 'Meus EPIs',
                  color: Colors.orange,
                  onTap: () => _navigate(context, const EpisScreen()),
                ),
                _MenuCard(
                  icon: Icons.calendar_month,
                  label: 'Plantões',
                  color: Colors.purple,
                  onTap: () => _navigate(context, const PlantoesScreen()),
                ),
                _MenuCard(
                  icon: Icons.school,
                  label: 'Treinamentos',
                  color: Colors.indigo,
                  onTap: () => _navigate(context, const TreinamentosScreen()),
                ),
                _MenuCard(
                  icon: Icons.message,
                  label: 'Mensagens',
                  color: Colors.teal,
                  onTap: () => _navigate(context, const MensagensScreen()),
                ),
                _MenuCard(
                  icon: Icons.support_agent,
                  label: 'Suporte RH',
                  color: Colors.red,
                  onTap: () => _navigate(context, const SuporteScreen()),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _navigate(BuildContext context, Widget screen) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => screen),
    );
  }
}

// =============== REMINDER STATUS CARD ===============

/// Card compacto exibindo o status do lembrete de ponto no dashboard.
class _ReminderStatusCard extends StatelessWidget {
  final String formattedTime;
  final bool earlyEnabled;
  final String earlyFormattedTime;
  final bool weekdaysOnly;
  final ReminderSoundMode soundMode;
  final bool loaded;

  const _ReminderStatusCard({
    required this.formattedTime,
    required this.earlyEnabled,
    required this.earlyFormattedTime,
    required this.weekdaysOnly,
    required this.soundMode,
    required this.loaded,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final soundColor = soundMode == ReminderSoundMode.sound
        ? Colors.blue
        : soundMode == ReminderSoundMode.vibrate
            ? Colors.amber
            : Colors.grey;
    final soundIcon = soundMode == ReminderSoundMode.sound
        ? Icons.volume_up
        : soundMode == ReminderSoundMode.vibrate
            ? Icons.vibration
            : Icons.notifications_off;

    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            // Icon
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withAlpha(20),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                Icons.alarm,
                color: theme.colorScheme.primary,
                size: 22,
              ),
            ),
            const SizedBox(width: 12),

            // Text info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Lembrete de Ponto',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey[300],
                    ),
                  ),
                  const SizedBox(height: 2),
                  if (!loaded)
                    Text(
                      'Carregando...',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey[600],
                      ),
                    )
                  else
                    RichText(
                      text: TextSpan(
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[400],
                          height: 1.3,
                        ),
                        children: [
                          TextSpan(text: 'Diariamente às '),
                          TextSpan(
                            text: formattedTime,
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: theme.colorScheme.primary,
                            ),
                          ),
                          if (earlyEnabled) ...[
                            const TextSpan(text: ' '),
                            WidgetSpan(
                              alignment: PlaceholderAlignment.middle,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 1,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.orange.withAlpha(25),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  '+15min',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.orange[300],
                                  ),
                                ),
                              ),
                            ),
                            TextSpan(
                              text: ' ($earlyFormattedTime)',
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.orange[300],
                              ),
                            ),
                          ],
                          if (weekdaysOnly) ...[
                            const TextSpan(text: ' '),
                            WidgetSpan(
                              alignment: PlaceholderAlignment.middle,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 1,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.teal.withAlpha(25),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  'Seg-Sex',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.teal[300],
                                  ),
                                ),
                              ),
                            ),
                          ]
                        ],
                      ),
                    ),
                ],
              ),
            ),

            // Sound mode icon
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: soundColor.withAlpha(20),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                soundIcon,
                size: 16,
                color: soundColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// =============== MENU CARD ===============

class _MenuCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _MenuCard({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: color.withAlpha(25),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(icon, color: color, size: 28),
              ),
              const SizedBox(height: 12),
              Text(
                label,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
