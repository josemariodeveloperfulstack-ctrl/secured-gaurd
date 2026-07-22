import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/supervisor_visit.dart';
import '../../services/supervisor_visit_service.dart';
import '../../services/work_post_service.dart';
import 'my_visits_screen.dart';
import 'visit_detail_screen.dart';
import 'work_post_checkin_screen.dart';
import 'weekly_route_screen.dart';

/// Dashboard do Supervisor com KPIs reais via API.
/// Sem Scaffold próprio pois está embutido no AppShell.
class SupervisorDashboardScreen extends StatefulWidget {
  const SupervisorDashboardScreen({super.key});

  @override
  State<SupervisorDashboardScreen> createState() =>
      _SupervisorDashboardScreenState();
}

class _SupervisorDashboardScreenState extends State<SupervisorDashboardScreen> {
  final SupervisorVisitService _visitService = SupervisorVisitService();
  final WorkPostService _workPostService = WorkPostService();

  VisitStats _stats = VisitStats();
  List<SupervisorVisit> _todayVisits = [];
  int _activePosts = 0;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        _visitService.getVisitStats(),
        _visitService.getTodayVisits(),
        _workPostService.getWorkPostStats(),
      ]);

      if (!mounted) return;

      setState(() {
        _stats = results[0] as VisitStats;
        _todayVisits = results[1] as List<SupervisorVisit>;
        final postStats = results[2] as Map<String, int>;
        _activePosts = postStats['ativo'] ?? 0;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Erro ao carregar dados.';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;

    return RefreshIndicator(
      onRefresh: _loadData,
      child: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _buildContent(context, user?.name ?? 'Supervisor'),
    );
  }

  Widget _buildContent(BuildContext context, String userName) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header com saudação
          _buildHeader(context, userName),
          const SizedBox(height: 20),

          // KPIs reais
          _buildKpiRow(context),
          const SizedBox(height: 12),
          _buildSecondaryKpiRow(context),
          const SizedBox(height: 24),

          // Error state
          if (_error != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.red.withAlpha(15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.red.withAlpha(50)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: Colors.red, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _error!,
                      style: const TextStyle(color: Colors.red),
                    ),
                  ),
                  TextButton(
                    onPressed: _loadData,
                    child: const Text('Tentar novamente'),
                  ),
                ],
              ),
            ),

          // Today's visits
          _buildSectionTitle(context, 'Visitas de Hoje'),
          const SizedBox(height: 12),
          _todayVisits.isEmpty
              ? _buildEmptyVisits(context)
              : _buildTodayVisitsList(context),
          const SizedBox(height: 24),

          // Menu grid
          _buildSectionTitle(context, 'Ações Rápidas'),
          const SizedBox(height: 12),
          _buildMenuGrid(context),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context, String userName) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: const Color(0xFFFFB800).withAlpha(25),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                Icons.shield,
                size: 28,
                color: Color(0xFFFFB800),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Olá, ${userName.split(' ').first}!',
                    style: Theme.of(context)
                        .textTheme
                        .titleLarge
                        ?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Painel do Supervisor',
                    style: Theme.of(context)
                        .textTheme
                        .bodySmall
                        ?.copyWith(color: Colors.grey),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.green.withAlpha(20),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.green.withAlpha(60)),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.circle, size: 8, color: Colors.green),
                  SizedBox(width: 6),
                  Text(
                    'Online',
                    style: TextStyle(color: Colors.green, fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildKpiRow(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _KpiCard(
            label: 'Visitas Hoje',
            value: '${_stats.todayVisits}',
            icon: Icons.today,
            color: Colors.amber,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _KpiCard(
            label: 'Em Andamento',
            value: '${_stats.inProgress}',
            icon: Icons.play_circle,
            color: Colors.orange,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _KpiCard(
            label: 'Concluídas',
            value: '${_stats.completed}',
            icon: Icons.check_circle,
            color: Colors.green,
          ),
        ),
      ],
    );
  }

  Widget _buildSecondaryKpiRow(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _KpiCard(
            label: 'Agendadas',
            value: '${_stats.scheduled}',
            icon: Icons.schedule,
            color: Colors.blue,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _KpiCard(
            label: 'Postos Ativos',
            value: '$_activePosts',
            icon: Icons.location_on,
            color: Colors.purple,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _KpiCard(
            label: 'Total Visit.',
            value: '${_stats.totalVisits}',
            icon: Icons.analytics,
            color: Colors.teal,
          ),
        ),
      ],
    );
  }

  Widget _buildSectionTitle(BuildContext context, String title) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
    );
  }

  Widget _buildEmptyVisits(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Icon(
              Icons.event_busy,
              size: 40,
              color: Colors.grey[600],
            ),
            const SizedBox(height: 12),
            Text(
              'Nenhuma visita agendada para hoje',
              style: TextStyle(
                color: Colors.grey[400],
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTodayVisitsList(BuildContext context) {
    return Column(
      children: _todayVisits.take(5).map((visit) {
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            leading: _getStatusIcon(visit.status),
            title: Text(
              visit.workPostName ?? visit.location ?? 'Posto',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            subtitle: Text(
              visit.workPostCode ?? '',
              style: TextStyle(color: Colors.grey[500], fontSize: 12),
            ),
            trailing: _getStatusChip(visit.status),
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => VisitDetailScreen(visit: visit),
                ),
              );
            },
          ),
        );
      }).toList(),
    );
  }

  Widget _getStatusIcon(VisitStatus status) {
    IconData icon;
    Color color;
    switch (status) {
      case VisitStatus.scheduled:
        icon = Icons.schedule;
        color = Colors.blue;
      case VisitStatus.inProgress:
        icon = Icons.play_circle;
        color = Colors.orange;
      case VisitStatus.completed:
        icon = Icons.check_circle;
        color = Colors.green;
      case VisitStatus.cancelled:
        icon = Icons.cancel;
        color = Colors.red;
      case VisitStatus.pending:
        icon = Icons.pending;
        color = Colors.grey;
    }
    return Icon(icon, color: color, size: 24);
  }

  Widget _getStatusChip(VisitStatus status) {
    Color color;
    switch (status) {
      case VisitStatus.scheduled:
        color = Colors.blue;
      case VisitStatus.inProgress:
        color = Colors.orange;
      case VisitStatus.completed:
        color = Colors.green;
      case VisitStatus.cancelled:
        color = Colors.red;
      case VisitStatus.pending:
        color = Colors.grey;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withAlpha(20),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withAlpha(60)),
      ),
      child: Text(
        visitStatusLabel(status),
        style: TextStyle(color: color, fontSize: 11),
      ),
    );
  }

  String visitStatusLabel(VisitStatus status) {
    switch (status) {
      case VisitStatus.scheduled:
        return 'Agendada';
      case VisitStatus.inProgress:
        return 'Em and.';
      case VisitStatus.completed:
        return 'Concluída';
      case VisitStatus.cancelled:
        return 'Cancelada';
      case VisitStatus.pending:
        return 'Pendente';
    }
  }

  Widget _buildMenuGrid(BuildContext context) {
    final menuItems = [
      _MenuItemData(
        icon: Icons.qr_code_scanner,
        label: 'Check-in\\nPosto',
        color: const Color(0xFFFFB800),
        route: const WorkPostCheckinScreen(),
      ),
      _MenuItemData(
        icon: Icons.add_location_alt,
        label: 'Nova\\nVisita',
        color: Colors.green,
        route: null,
      ),
      _MenuItemData(
        icon: Icons.route,
        label: 'Rota\\nSemanal',
        color: Colors.purple,
        route: const WeeklyRouteScreen(),
      ),
      _MenuItemData(
        icon: Icons.list_alt,
        label: 'Minhas\\nVisitas',
        color: Colors.blue,
        route: const MyVisitsScreen(),
      ),
      _MenuItemData(
        icon: Icons.bar_chart,
        label: 'Relatórios',
        color: Colors.orange,
        route: null,
      ),
      _MenuItemData(
        icon: Icons.history,
        label: 'Histórico',
        color: Colors.teal,
        route: null,
      ),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 0.85,
      ),
      itemCount: menuItems.length,
      itemBuilder: (context, index) {
        final item = menuItems[index];
        return _MenuCard(
          icon: item.icon,
          label: item.label,
          color: item.color,
          onTap: item.route != null
              ? () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => item.route!),
                  );
                }
              : () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('${item.label.replaceAll('\\n', ' ')} em breve'),
                      duration: const Duration(seconds: 1),
                    ),
                  );
                },
        );
      },
    );
  }
}

class _MenuItemData {
  final IconData icon;
  final String label;
  final Color color;
  final Widget? route;

  const _MenuItemData({
    required this.icon,
    required this.label,
    required this.color,
    this.route,
  });
}

/// Widget de KPI reutilizável.
class _KpiCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _KpiCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                  child: Text(
                    label,
                    style: Theme.of(context)
                        .textTheme
                        .bodySmall
                        ?.copyWith(color: Colors.grey, fontSize: 11),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Icon(icon, color: color, size: 16),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Card de menu para ações rápidas.
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
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: color.withAlpha(25),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(height: 8),
              Text(
                label,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w600,
                      fontSize: 11,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
