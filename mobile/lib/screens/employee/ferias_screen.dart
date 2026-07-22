import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/vacation.dart';
import '../../providers/auth_provider.dart';
import '../../services/vacation_service.dart';

class FeriasScreen extends StatefulWidget {
  const FeriasScreen({super.key});

  @override
  State<FeriasScreen> createState() => _FeriasScreenState();
}

class _FeriasScreenState extends State<FeriasScreen> {
  final VacationService _service = VacationService();
  List<Vacation> _vacations = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadVacations();
  }

  Future<void> _loadVacations() async {
    final user = context.read<AuthProvider>().user;
    final employeeId = user?.employeeId ?? user?.id;
    if (employeeId == null) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final vacations = await _service.getVacationsByEmployee(employeeId);
      if (mounted) {
        setState(() {
          _vacations = vacations;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = 'Erro ao carregar férias';
        });
      }
    }
  }

  Color _getStatusColor(VacationStatus status) {
    switch (status) {
      case VacationStatus.approved:
        return Colors.green;
      case VacationStatus.pending:
        return Colors.orange;
      case VacationStatus.rejected:
        return Colors.red;
      case VacationStatus.cancelled:
        return Colors.grey;
    }
  }

  IconData _getStatusIcon(VacationStatus status) {
    switch (status) {
      case VacationStatus.approved:
        return Icons.check_circle;
      case VacationStatus.pending:
        return Icons.schedule;
      case VacationStatus.rejected:
        return Icons.cancel;
      case VacationStatus.cancelled:
        return Icons.block;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Minhas Férias'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadVacations,
            tooltip: 'Recarregar',
          ),
        ],
      ),
      body: _buildBody(theme),
    );
  }

  Widget _buildBody(ThemeData theme) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.grey),
            const SizedBox(height: 16),
            Text(_error!, style: theme.textTheme.bodyLarge),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _loadVacations,
              icon: const Icon(Icons.refresh),
              label: const Text('Tentar novamente'),
            ),
          ],
        ),
      );
    }

    // Estatísticas
    final approved = _vacations
        .where((v) => v.status == VacationStatus.approved)
        .length;
    final pending = _vacations
        .where((v) => v.status == VacationStatus.pending)
        .length;

    return RefreshIndicator(
      onRefresh: _loadVacations,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Cards de resumo
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  label: 'Aprovadas',
                  value: approved.toString(),
                  icon: Icons.check_circle,
                  color: Colors.green,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  label: 'Pendentes',
                  value: pending.toString(),
                  icon: Icons.schedule,
                  color: Colors.orange,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  label: 'Total',
                  value: _vacations.length.toString(),
                  icon: Icons.beach_access,
                  color: Colors.blue,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Lista de férias
          if (_vacations.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(48),
              child: Column(
                children: [
                  Icon(Icons.beach_access,
                      size: 64, color: Colors.grey.withAlpha(80)),
                  const SizedBox(height: 16),
                  Text(
                    'Nenhum registro de férias',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: Colors.grey,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Suas solicitações de férias aparecerão aqui.',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: Colors.grey.withAlpha(150),
                    ),
                  ),
                ],
              ),
            )
          else
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Solicitações',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Colors.grey,
                  ),
                ),
                const SizedBox(height: 8),
                ..._vacations.map((v) => _VacationCard(
                      vacation: v,
                      statusColor: _getStatusColor(v.status),
                      statusIcon: _getStatusIcon(v.status),
                    )),
              ],
            ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _VacationCard extends StatelessWidget {
  final Vacation vacation;
  final Color statusColor;
  final IconData statusIcon;

  const _VacationCard({
    required this.vacation,
    required this.statusColor,
    required this.statusIcon,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status badge + período
            Row(
              children: [
                Icon(statusIcon, color: statusColor, size: 20),
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withAlpha(25),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: statusColor.withAlpha(60)),
                  ),
                  child: Text(
                    vacation.status.displayName,
                    style: TextStyle(
                      color: statusColor,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const Spacer(),
                Text(
                  '${vacation.daysTaken} dias',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: Colors.grey,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Datas
            Row(
              children: [
                Icon(Icons.calendar_today,
                    size: 16, color: Colors.grey.withAlpha(150)),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Início: ${vacation.startDateFormatted}',
                      style: theme.textTheme.bodyMedium,
                    ),
                    Text(
                      'Fim: ${vacation.endDateFormatted}',
                      style: theme.textTheme.bodyMedium,
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Período aquisitivo
            Row(
              children: [
                Icon(Icons.date_range,
                    size: 16, color: Colors.grey.withAlpha(150)),
                const SizedBox(width: 8),
                Text(
                  'Período aquisitivo: ${vacation.periodoAquisitivo}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: Colors.grey,
                  ),
                ),
              ],
            ),

            // Observações
            if (vacation.notes != null && vacation.notes!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.grey.withAlpha(15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  vacation.notes!,
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontStyle: FontStyle.italic,
                    color: Colors.grey,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
