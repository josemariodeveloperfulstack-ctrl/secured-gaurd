import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/supervisor_visit_service.dart';
import '../../models/supervisor_visit.dart';
import 'visit_detail_screen.dart';
import '../../providers/auth_provider.dart';

/// Tela de Rota Semanal de Supervisão.
///
/// Mostra o cronograma de visitas da semana com KPIs de eficiência.
class WeeklyRouteScreen extends StatefulWidget {
  const WeeklyRouteScreen({super.key});

  @override
  State<WeeklyRouteScreen> createState() => _WeeklyRouteScreenState();
}

class _WeeklyRouteScreenState extends State<WeeklyRouteScreen> {
  final SupervisorVisitService _visitService = SupervisorVisitService();

  List<SupervisorVisit> _visits = [];
  bool _isLoading = true;
  String? _error;
  DateTime _selectedWeekStart = _getWeekStart(DateTime.now());

  static DateTime _getWeekStart(DateTime date) {
    final weekday = date.weekday;
    return DateTime(date.year, date.month, date.day - (weekday - 1));
  }

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
      final user = context.read<AuthProvider>().user;
      final List<SupervisorVisit> allVisits;
      if (user?.id != null) {
        allVisits = await _visitService.getVisitsBySupervisor(user!.id);
      } else {
        allVisits = [];
      }

      if (!mounted) return;

      // Filtrar visitas da semana selecionada
      final weekEnd = _selectedWeekStart.add(const Duration(days: 7));
      final weekVisits = allVisits.where((v) {
        try {
          final visitDate = DateTime.parse(v.visitDate);
          return visitDate
                  .isAfter(_selectedWeekStart.subtract(const Duration(days: 1))) &&
              visitDate.isBefore(weekEnd);
        } catch (_) {
          return false;
        }
      }).toList();

      // Ordenar por data e status
      weekVisits.sort((a, b) {
        final dateCompare = b.visitDate.compareTo(a.visitDate);
        if (dateCompare != 0) return dateCompare;
        return a.status.index.compareTo(b.status.index);
      });

      setState(() {
        _visits = weekVisits;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Erro ao carregar rota semanal.';
        _isLoading = false;
      });
    }
  }

  void _previousWeek() {
    setState(() {
      _selectedWeekStart =
          _selectedWeekStart.subtract(const Duration(days: 7));
    });
    _loadData();
  }

  void _nextWeek() {
    setState(() {
      _selectedWeekStart = _selectedWeekStart.add(const Duration(days: 7));
    });
    _loadData();
  }

  void _goToCurrentWeek() {
    setState(() {
      _selectedWeekStart = _getWeekStart(DateTime.now());
    });
    _loadData();
  }

  String _formatWeekRange() {
    final end = _selectedWeekStart.add(const Duration(days: 6));
    final months = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    return '${_selectedWeekStart.day} ${months[_selectedWeekStart.month - 1]} - ${end.day} ${months[end.month - 1]}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rota Semanal'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isLoading ? null : _loadData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildWeekNavigator(theme),
                    const SizedBox(height: 20),
                    _buildSummaryRow(theme),
                    const SizedBox(height: 24),
                    if (_error != null)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
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
                              child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
                            ),
                            TextButton(onPressed: _loadData, child: const Text('Tentar novamente')),
                          ],
                        ),
                      ),
                    _buildSectionTitle(theme, 'Visitas da Semana'),
                    const SizedBox(height: 12),
                    _visits.isEmpty ? _buildEmptyState(theme) : _buildVisitList(theme),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildWeekNavigator(ThemeData theme) {
    final isCurrentWeek = _getWeekStart(DateTime.now()) == _selectedWeekStart;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            IconButton(
              onPressed: _previousWeek,
              icon: const Icon(Icons.chevron_left),
              tooltip: 'Semana anterior',
            ),
            Expanded(
              child: Column(
                children: [
                  Text(
                    _formatWeekRange(),
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                    textAlign: TextAlign.center,
                  ),
                  if (!isCurrentWeek) ...[
                    const SizedBox(height: 4),
                    GestureDetector(
                      onTap: _goToCurrentWeek,
                      child: Text(
                        'Voltar para esta semana',
                        style: TextStyle(color: theme.colorScheme.primary, fontSize: 12),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            IconButton(
              onPressed: _nextWeek,
              icon: const Icon(Icons.chevron_right),
              tooltip: 'Próxima semana',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryRow(ThemeData theme) {
    final total = _visits.length;
    final completed = _visits.where((v) => v.status == VisitStatus.completed).length;
    final inProgress = _visits.where((v) => v.status == VisitStatus.inProgress).length;
    final scheduled = _visits.where((v) => v.status == VisitStatus.scheduled).length;

    return Row(
      children: [
        Expanded(child: _SummaryCard(label: 'Total', value: '$total', icon: Icons.list, color: Colors.blue)),
        const SizedBox(width: 8),
        Expanded(child: _SummaryCard(label: 'Agendadas', value: '$scheduled', icon: Icons.schedule, color: Colors.amber)),
        const SizedBox(width: 8),
        Expanded(child: _SummaryCard(label: 'Andamento', value: '$inProgress', icon: Icons.play_circle, color: Colors.orange)),
        const SizedBox(width: 8),
        Expanded(child: _SummaryCard(label: 'Concluídas', value: '$completed', icon: Icons.check_circle, color: Colors.green)),
      ],
    );
  }

  Widget _buildSectionTitle(ThemeData theme, String title) {
    return Text(
      title,
      style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
    );
  }

  Widget _buildEmptyState(ThemeData theme) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          children: [
            Icon(Icons.event_busy, size: 48, color: Colors.grey[600]),
            const SizedBox(height: 16),
            Text('Nenhuma visita nesta semana', style: TextStyle(color: Colors.grey[400], fontSize: 15)),
            const SizedBox(height: 8),
            Text('As visitas agendadas aparecerão aqui', style: TextStyle(color: Colors.grey[600], fontSize: 13)),
          ],
        ),
      ),
    );
  }

  Widget _buildVisitList(ThemeData theme) {
    final groupedVisits = <String, List<SupervisorVisit>>{};
    for (final visit in _visits) {
      groupedVisits.putIfAbsent(visit.visitDate, () => []).add(visit);
    }

    final sortedDays = groupedVisits.keys.toList()..sort((a, b) => b.compareTo(a));

    return Column(
      children: sortedDays.map((date) {
        final dayVisits = groupedVisits[date]!;
        return _buildDayGroup(theme, date, dayVisits);
      }).toList(),
    );
  }

  Widget _buildDayGroup(ThemeData theme, String date, List<SupervisorVisit> visits) {
    String formattedDate;
    try {
      final dt = DateTime.parse(date);
      final weekdays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
      final months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      final isToday = dt.day == DateTime.now().day &&
          dt.month == DateTime.now().month &&
          dt.year == DateTime.now().year;
      formattedDate = isToday
          ? 'Hoje, ${dt.day} de ${months[dt.month - 1]}'
          : '${weekdays[dt.weekday - 1]}, ${dt.day} de ${months[dt.month - 1]}';
    } catch (_) {
      formattedDate = date;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            children: [
              Text(
                formattedDate,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: theme.colorScheme.primary,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.grey.withAlpha(20),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '${visits.length} visita${visits.length > 1 ? 's' : ''}',
                  style: TextStyle(color: Colors.grey[500], fontSize: 11),
                ),
              ),
            ],
          ),
        ),
        ...visits.map((visit) => _buildVisitCard(theme, visit)),
        const SizedBox(height: 8),
      ],
    );
  }

  Widget _buildVisitCard(ThemeData theme, SupervisorVisit visit) {
    Color statusColor;
    IconData statusIcon;
    switch (visit.status) {
      case VisitStatus.scheduled:
        statusColor = Colors.blue;
        statusIcon = Icons.schedule;
      case VisitStatus.inProgress:
        statusColor = Colors.orange;
        statusIcon = Icons.play_circle;
      case VisitStatus.completed:
        statusColor = Colors.green;
        statusIcon = Icons.check_circle;
      case VisitStatus.cancelled:
        statusColor = Colors.red;
        statusIcon = Icons.cancel;
      case VisitStatus.pending:
        statusColor = Colors.grey;
        statusIcon = Icons.pending;
    }

    String time = '--:--';
    if (visit.scheduledAt != null) {
      try {
        final dt = DateTime.parse(visit.scheduledAt!);
        time = '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
      } catch (_) {
        time = visit.scheduledAt!;
      }
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => VisitDetailScreen(visit: visit)),
          );
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                width: 48,
                padding: const EdgeInsets.symmetric(vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withAlpha(15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  children: [
                    Icon(statusIcon, color: statusColor, size: 18),
                    const SizedBox(height: 2),
                    Text(time, style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(visit.workPostName ?? 'Posto', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    if (visit.workPostCode != null)
                      Text('Cód: ${visit.workPostCode}', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                    if (visit.location != null)
                      Text(visit.location!, style: TextStyle(color: Colors.grey[500], fontSize: 11), maxLines: 1, overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withAlpha(20),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: statusColor.withAlpha(60)),
                ),
                child: Text(
                  visit.displayStatus,
                  style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.w500),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Card de resumo estatístico.
class _SummaryCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _SummaryCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(height: 6),
            Text(
              value,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(color: Colors.grey[500], fontSize: 10), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
