import 'package:flutter/material.dart';
import '../../models/operational_occurrence.dart';
import '../../services/occurrence_service.dart';

class OccurrenceDetailScreen extends StatefulWidget {
  final OperationalOccurrence occurrence;
  final VoidCallback? onStatusChanged;

  const OccurrenceDetailScreen({
    super.key,
    required this.occurrence,
    this.onStatusChanged,
  });

  @override
  State<OccurrenceDetailScreen> createState() =>
      _OccurrenceDetailScreenState();
}

class _OccurrenceDetailScreenState extends State<OccurrenceDetailScreen> {
  final OccurrenceService _service = OccurrenceService();
  late OperationalOccurrence _occurrence;
  bool _isUpdating = false;
  String? _updateError;

  @override
  void initState() {
    super.initState();
    _occurrence = widget.occurrence;
  }

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'PENDENTE':
        return Colors.orange;
      case 'EM_ANDAMENTO':
        return Colors.blue;
      case 'RESOLVIDO':
        return Colors.green;
      case 'CONCLUIDO':
        return Colors.teal;
      default:
        return Colors.grey;
    }
  }

  Color _priorityColor(String priority) {
    switch (priority.toUpperCase()) {
      case 'ALTA':
      case 'HIGH':
        return Colors.red;
      case 'MEDIA':
      case 'MEDIUM':
        return Colors.orange;
      case 'BAIXA':
      case 'LOW':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  Future<void> _updateStatus(String newStatus) async {
    setState(() {
      _isUpdating = true;
      _updateError = null;
    });

    try {
      final success =
          await _service.updateStatus(_occurrence.id, newStatus);
      if (!mounted) return;
      if (success) {
        setState(() {
          _occurrence = OperationalOccurrence(
            id: _occurrence.id,
            type: _occurrence.type,
            title: _occurrence.title,
            description: _occurrence.description,
            employeeId: _occurrence.employeeId,
            employeeName: _occurrence.employeeName,
            location: _occurrence.location,
            status: newStatus,
            priority: _occurrence.priority,
            date: _occurrence.date,
            responsible: _occurrence.responsible,
            warningNumber: _occurrence.warningNumber,
            createdAt: _occurrence.createdAt,
            updatedAt: _occurrence.updatedAt,
          );
        });
        widget.onStatusChanged?.call();
      } else {
        _updateError = 'Erro ao atualizar status.';
      }
    } catch (e) {
      _updateError = 'Erro de conexão.';
    } finally {
      if (mounted) setState(() => _isUpdating = false);
    }
  }

  Future<void> _updatePriority(String newPriority) async {
    setState(() {
      _isUpdating = true;
      _updateError = null;
    });

    try {
      final success =
          await _service.updatePriority(_occurrence.id, newPriority);
      if (!mounted) return;
      if (success) {
        setState(() {
          _occurrence = OperationalOccurrence(
            id: _occurrence.id,
            type: _occurrence.type,
            title: _occurrence.title,
            description: _occurrence.description,
            employeeId: _occurrence.employeeId,
            employeeName: _occurrence.employeeName,
            location: _occurrence.location,
            status: _occurrence.status,
            priority: newPriority,
            date: _occurrence.date,
            responsible: _occurrence.responsible,
            warningNumber: _occurrence.warningNumber,
            createdAt: _occurrence.createdAt,
            updatedAt: _occurrence.updatedAt,
          );
        });
      } else {
        _updateError = 'Erro ao atualizar prioridade.';
      }
    } catch (e) {
      _updateError = 'Erro de conexão.';
    } finally {
      if (mounted) setState(() => _isUpdating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final occ = _occurrence;
    final statusClr = _statusColor(occ.status);
    final priorityClr = _priorityColor(occ.priority);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Detalhes da Ocorrência'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Type + Status + Priority badges
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: [
                        _Badge(
                          label: occ.displayType,
                          color: Colors.grey,
                          icon: Icons.category,
                        ),
                        _Badge(
                          label: occ.displayStatus,
                          color: statusClr,
                          icon: Icons.circle,
                        ),
                        _Badge(
                          label: occ.displayPriority,
                          color: priorityClr,
                          icon: Icons.flag,
                        ),
                        if (occ.warningNumber != null)
                          _Badge(
                            label: '#${occ.warningNumber}',
                            color: Colors.purple,
                            icon: Icons.tag,
                          ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Title
                    Text(
                      occ.title,
                      style: Theme.of(context)
                          .textTheme
                          .titleLarge
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    if (occ.description != null &&
                        occ.description!.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Text(
                        occ.description!,
                        style: TextStyle(
                          color: Colors.grey[300],
                          fontSize: 14,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Info card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Informações',
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 16),
                    _InfoRow(
                        icon: Icons.person,
                        label: 'Funcionário',
                        value: occ.employeeName ?? '--'),
                    const Divider(height: 20, color: Color(0xFF2A2A3E)),
                    _InfoRow(
                        icon: Icons.schedule,
                        label: 'Data',
                        value: occ.formattedDate),
                    const Divider(height: 20, color: Color(0xFF2A2A3E)),
                    _InfoRow(
                        icon: Icons.location_on,
                        label: 'Local',
                        value: occ.location ?? '--'),
                    const Divider(height: 20, color: Color(0xFF2A2A3E)),
                    _InfoRow(
                        icon: Icons.person_outline,
                        label: 'Responsável',
                        value: occ.responsible ?? '--'),
                    const Divider(height: 20, color: Color(0xFF2A2A3E)),
                    _InfoRow(
                        icon: Icons.calendar_today,
                        label: 'Criado em',
                        value: occ.formattedCreatedAt),
                    if (occ.substituteName != null) ...[
                      const Divider(height: 20, color: Color(0xFF2A2A3E)),
                      _InfoRow(
                          icon: Icons.swap_horiz,
                          label: 'Substituto',
                          value: occ.substituteName!),
                    ],
                    if (occ.totalHours != null) ...[
                      const Divider(height: 20, color: Color(0xFF2A2A3E)),
                      _InfoRow(
                          icon: Icons.access_time,
                          label: 'Total Horas',
                          value: '${occ.totalHours!.toStringAsFixed(1)}h'),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Action card - Update Status
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Ações',
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 16),

                    // Status update
                    Text(
                      'Status',
                      style: TextStyle(
                          color: Colors.grey[400],
                          fontSize: 12,
                          fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    _buildActionChips(
                      ['PENDENTE', 'EM_ANDAMENTO', 'RESOLVIDO', 'CONCLUIDO'],
                      occ.status,
                      _statusColor,
                      _updateStatus,
                    ),
                    const SizedBox(height: 16),

                    // Priority update
                    Text(
                      'Prioridade',
                      style: TextStyle(
                          color: Colors.grey[400],
                          fontSize: 12,
                          fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    _buildActionChips(
                      ['BAIXA', 'MEDIA', 'ALTA'],
                      occ.priority,
                      _priorityColor,
                      _updatePriority,
                    ),

                    if (_updateError != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _updateError!,
                        style: const TextStyle(
                            color: Colors.red, fontSize: 13),
                      ),
                    ],
                    if (_isUpdating)
                      const Padding(
                        padding: EdgeInsets.only(top: 12),
                        child: LinearProgressIndicator(),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionChips(
    List<String> options,
    String currentValue,
    Color Function(String) colorFn,
    Future<void> Function(String) onTap,
  ) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: options.map((option) {
        final isActive = option == currentValue;
        final color = colorFn(option);
        return ActionChip(
          label: Text(
            _statusLabel(option),
            style: TextStyle(
              fontSize: 12,
              color: isActive ? Colors.black : color,
              fontWeight:
                  isActive ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
          onPressed: isActive || _isUpdating
              ? null
              : () => onTap(option),
          backgroundColor: isActive ? color : color.withAlpha(15),
          side: BorderSide(
            color: isActive ? color : color.withAlpha(60),
            width: isActive ? 1.5 : 1,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
        );
      }).toList(),
    );
  }

  String _statusLabel(String value) {
    switch (value.toUpperCase()) {
      case 'PENDENTE':
        return 'Pendente';
      case 'EM_ANDAMENTO':
        return 'Em Andamento';
      case 'RESOLVIDO':
        return 'Resolvido';
      case 'CONCLUIDO':
        return 'Concluído';
      case 'ALTA':
        return 'Alta';
      case 'MEDIA':
        return 'Média';
      case 'BAIXA':
        return 'Baixa';
      default:
        return value;
    }
  }
}

class _Badge extends StatelessWidget {
  final String label;
  final Color color;
  final IconData icon;

  const _Badge({
    required this.label,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withAlpha(20),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withAlpha(60)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: Colors.grey[500]),
        const SizedBox(width: 12),
        SizedBox(
          width: 90,
          child: Text(
            label,
            style: TextStyle(
                color: Colors.grey[500],
                fontSize: 13,
                fontWeight: FontWeight.w500),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontSize: 13),
          ),
        ),
      ],
    );
  }
}
