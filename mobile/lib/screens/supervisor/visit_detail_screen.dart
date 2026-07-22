import 'package:flutter/material.dart';
import '../../models/supervisor_visit.dart';
import '../../services/supervisor_visit_service.dart';

/// Tela de Detalhes da Visita com opção de completar com observações.
class VisitDetailScreen extends StatefulWidget {
  final SupervisorVisit visit;

  const VisitDetailScreen({super.key, required this.visit});

  @override
  State<VisitDetailScreen> createState() => _VisitDetailScreenState();
}

class _VisitDetailScreenState extends State<VisitDetailScreen> {
  final SupervisorVisitService _visitService = SupervisorVisitService();
  late SupervisorVisit _visit;
  late TextEditingController _findingsController;
  bool _isSuccessful = true;
  bool _isProcessing = false;
  String? _error;
  String? _successMessage;

  @override
  void initState() {
    super.initState();
    _visit = widget.visit;
    _findingsController = TextEditingController(text: _visit.findings ?? '');
  }

  @override
  void dispose() {
    _findingsController.dispose();
    super.dispose();
  }

  Future<void> _startVisit() async {
    setState(() {
      _isProcessing = true;
      _error = null;
    });

    try {
      final result = await _visitService.startVisit(_visit.id);
      if (!mounted) return;

      if (result != null) {
        setState(() {
          _visit = result;
          _isProcessing = false;
          _successMessage = 'Visita iniciada com sucesso!';
        });
      } else {
        setState(() {
          _error = 'Erro ao iniciar visita.';
          _isProcessing = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Erro ao iniciar visita.';
        _isProcessing = false;
      });
    }
  }

  Future<void> _completeVisit() async {
    setState(() {
      _isProcessing = true;
      _error = null;
    });

    try {
      final result = await _visitService.completeVisit(
        _visit.id,
        findings: _findingsController.text.trim().isEmpty
            ? null
            : _findingsController.text.trim(),
        isSuccessful: _isSuccessful,
      );

      if (!mounted) return;

      if (result != null) {
        setState(() {
          _visit = result;
          _isProcessing = false;
          _successMessage = 'Visita concluída com sucesso!';
        });
      } else {
        setState(() {
          _error = 'Erro ao concluir visita.';
          _isProcessing = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Erro ao concluir visita.';
        _isProcessing = false;
      });
    }
  }

  String _formatDateTime(String? isoString) {
    if (isoString == null) return '--';
    try {
      final dt = DateTime.parse(isoString);
      final day = dt.day.toString().padLeft(2, '0');
      final month = dt.month.toString().padLeft(2, '0');
      final hour = dt.hour.toString().padLeft(2, '0');
      final minute = dt.minute.toString().padLeft(2, '0');
      return '$day/${month}/${dt.year} às $hour:$minute';
    } catch (_) {
      return isoString;
    }
  }

  String _formatDate(String? isoString) {
    if (isoString == null) return '--';
    try {
      final dt = DateTime.parse(isoString);
      final months = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
      ];
      return '${dt.day} de ${months[dt.month - 1]} de ${dt.year}';
    } catch (_) {
      return isoString;
    }
  }

  Color _statusColor(VisitStatus status) {
    switch (status) {
      case VisitStatus.scheduled:
        return Colors.blue;
      case VisitStatus.inProgress:
        return Colors.orange;
      case VisitStatus.completed:
        return Colors.green;
      case VisitStatus.cancelled:
        return Colors.red;
      case VisitStatus.pending:
        return Colors.grey;
    }
  }

  IconData _statusIcon(VisitStatus status) {
    switch (status) {
      case VisitStatus.scheduled:
        return Icons.schedule;
      case VisitStatus.inProgress:
        return Icons.play_circle;
      case VisitStatus.completed:
        return Icons.check_circle;
      case VisitStatus.cancelled:
        return Icons.cancel;
      case VisitStatus.pending:
        return Icons.pending;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Detalhes da Visita'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status header
            _buildStatusHeader(theme),
            const SizedBox(height: 20),

            // Post / Location info
            _buildSectionCard(
              theme,
              icon: Icons.location_on,
              title: 'Posto de Trabalho',
              children: [
                _infoRow('Nome', _visit.workPostName ?? '--'),
                if (_visit.workPostCode != null)
                  _infoRow('Código', _visit.workPostCode!),
                if (_visit.location != null)
                  _infoRow('Local', _visit.location!),
              ],
            ),
            const SizedBox(height: 12),

            // Dates & Times
            _buildSectionCard(
              theme,
              icon: Icons.calendar_today,
              title: 'Datas e Horários',
              children: [
                _infoRow('Data da Visita', _formatDate(_visit.visitDate)),
                _infoRow('Agendada', _formatDateTime(_visit.scheduledAt)),
                _infoRow('Iniciada', _formatDateTime(_visit.startedAt)),
                _infoRow('Concluída', _formatDateTime(_visit.completedAt)),
              ],
            ),
            const SizedBox(height: 12),

            // Supervisor info
            if (_visit.supervisorName != null)
              _buildSectionCard(
                theme,
                icon: Icons.shield,
                title: 'Supervisor',
                children: [
                  _infoRow('Nome', _visit.supervisorName!),
                  if (_visit.supervisorId != null)
                    _infoRow('ID', _visit.supervisorId!),
                ],
              ),
            if (_visit.supervisorName != null) const SizedBox(height: 12),

            // Observations
            if (_visit.observations != null && _visit.observations!.isNotEmpty)
              _buildSectionCard(
                theme,
                icon: Icons.notes,
                title: 'Observações',
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      _visit.observations!,
                      style: TextStyle(
                        color: Colors.grey[300],
                        height: 1.5,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ],
              ),
            if (_visit.observations != null && _visit.observations!.isNotEmpty)
              const SizedBox(height: 12),

            // Findings (for completed visits)
            if (_visit.status == VisitStatus.completed &&
                _visit.findings != null &&
                _visit.findings!.isNotEmpty)
              _buildSectionCard(
                theme,
                icon: Icons.summarize,
                title: 'Resultados',
                children: [
                  if (_visit.isSuccessful != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          Icon(
                            _visit.isSuccessful!
                                ? Icons.check_circle
                                : Icons.warning_amber,
                            color: _visit.isSuccessful!
                                ? Colors.green
                                : Colors.orange,
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _visit.isSuccessful!
                                ? 'Visita bem-sucedida'
                                : 'Não conforme',
                            style: TextStyle(
                              color: _visit.isSuccessful!
                                  ? Colors.green
                                  : Colors.orange,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  Text(
                    _visit.findings!,
                    style: TextStyle(
                      color: Colors.grey[300],
                      height: 1.5,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            if (_visit.status == VisitStatus.completed)
              const SizedBox(height: 12),

            // Error
            if (_error != null)
              Container(
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
                      child: Text(
                        _error!,
                        style: const TextStyle(color: Colors.red, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),

            // Success message
            if (_successMessage != null)
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.green.withAlpha(15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.green.withAlpha(50)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle, color: Colors.green, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _successMessage!,
                        style: const TextStyle(color: Colors.green, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),

            // Complete visit form (only for in-progress visits)
            if (_visit.status == VisitStatus.inProgress)
              _buildCompleteForm(theme),
            if (_visit.status == VisitStatus.inProgress)
              const SizedBox(height: 12),

            // Action buttons
            if (_visit.status == VisitStatus.scheduled)
              _buildActionButton(
                label: 'Iniciar Visita',
                icon: Icons.play_arrow,
                color: Colors.orange,
                onPressed: _isProcessing ? null : _startVisit,
              ),

            if (_visit.status == VisitStatus.inProgress)
              _buildActionButton(
                label: _isProcessing ? 'Concluindo...' : 'Concluir Visita',
                icon: Icons.check_circle,
                color: Colors.green,
                onPressed: _isProcessing ? null : _completeVisit,
              ),

            if (_visit.status == VisitStatus.completed)
              _buildActionButton(
                label: 'Visita Concluída',
                icon: Icons.check_circle,
                color: Colors.green,
                onPressed: null,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusHeader(ThemeData theme) {
    final color = _statusColor(_visit.status);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: color.withAlpha(25),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(_statusIcon(_visit.status), color: color, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _visit.displayStatus,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _visit.workPostName ?? 'Visita de supervisão',
                    style: TextStyle(
                      color: Colors.grey[400],
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            if (_visit.isSuccessful == true)
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.green.withAlpha(20),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.verified, color: Colors.green, size: 22),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionCard(
    ThemeData theme, {
    required IconData icon,
    required String title,
    required List<Widget> children,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 18, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: TextStyle(
                color: Colors.grey[500],
                fontSize: 13,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCompleteForm(ThemeData theme) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.edit_note, size: 18, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  'Concluir Visita',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Success toggle
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF242438),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(
                    _isSuccessful ? Icons.check_circle : Icons.warning_amber,
                    color: _isSuccessful ? Colors.green : Colors.orange,
                    size: 22,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Status da Visita',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          _isSuccessful
                              ? 'Visita concluída normalmente'
                              : 'Houve não conformidades',
                          style: TextStyle(
                            color: Colors.grey[400],
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Switch(
                    value: _isSuccessful,
                    onChanged: (value) => setState(() => _isSuccessful = value),
                    activeTrackColor: Colors.green.withAlpha(80),
                    activeThumbColor: Colors.green,
                    inactiveThumbColor: Colors.orange,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Findings text field
            TextField(
              controller: _findingsController,
              decoration: const InputDecoration(
                labelText: 'Observações / Achados',
                hintText: 'Descreva o resultado da visita...',
                alignLabelWithHint: true,
              ),
              maxLines: 4,
              textInputAction: TextInputAction.newline,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required String label,
    required IconData icon,
    required Color color,
    VoidCallback? onPressed,
  }) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: _isProcessing
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: Colors.black,
                ),
              )
            : Icon(icon),
        label: Text(label),
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          disabledBackgroundColor: color.withAlpha(100),
          disabledForegroundColor: Colors.white70,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }
}
