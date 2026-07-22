import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../models/supervisor_visit.dart';
import '../../services/supervisor_visit_service.dart';
import '../../providers/auth_provider.dart';
import 'visit_detail_screen.dart';

/// Tela de Minhas Visitas com filtros por status e data.
///
/// Lista todas as visitas do supervisor logado com opções de
/// filtrar por status (agendada, em andamento, concluída, etc.)
/// e por período de datas.
class MyVisitsScreen extends StatefulWidget {
  const MyVisitsScreen({super.key});

  @override
  State<MyVisitsScreen> createState() => _MyVisitsScreenState();
}

class _MyVisitsScreenState extends State<MyVisitsScreen> {
  final SupervisorVisitService _visitService = SupervisorVisitService();
  final TextEditingController _searchController = TextEditingController();

  List<SupervisorVisit> _allVisits = [];
  List<SupervisorVisit> _filteredVisits = [];
  bool _isLoading = true;
  String? _error;

  // Filters
  VisitStatus? _selectedStatus;
  DateTime? _startDate;
  DateTime? _endDate;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadVisits();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadVisits() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final userId = context.read<AuthProvider>().user?.id;
      if (userId == null) {
        setState(() {
          _allVisits = [];
          _filteredVisits = [];
          _isLoading = false;
        });
        return;
      }

      final visits = await _visitService.getVisitsBySupervisor(userId);

      if (!mounted) return;

      setState(() {
        _allVisits = visits;
        _isLoading = false;
      });

      _applyFilters();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Erro ao carregar visitas.';
        _isLoading = false;
      });
    }
  }

  void _applyFilters() {
    setState(() {
      _filteredVisits = _allVisits.where((v) {
        // Status filter
        if (_selectedStatus != null && v.status != _selectedStatus) {
          return false;
        }

        // Date range filter
        try {
          final visitDate = DateTime.parse(v.visitDate);
          if (_startDate != null && visitDate.isBefore(_startDate!)) {
            return false;
          }
          if (_endDate != null && visitDate.isAfter(_endDate!)) {
            return false;
          }
        } catch (_) {
          return false;
        }

        // Search filter (by work post name or code)
        if (_searchQuery.isNotEmpty) {
          final query = _searchQuery.toLowerCase();
          final nameMatch = v.workPostName?.toLowerCase().contains(query) ?? false;
          final codeMatch = v.workPostCode?.toLowerCase().contains(query) ?? false;
          final locationMatch = v.location?.toLowerCase().contains(query) ?? false;
          if (!nameMatch && !codeMatch && !locationMatch) {
            return false;
          }
        }

        return true;
      }).toList();

      // Ordenar: mais recentes primeiro
      _filteredVisits.sort((a, b) => b.visitDate.compareTo(a.visitDate));
    });
  }

  void _setStatusFilter(VisitStatus? status) {
    _selectedStatus = _selectedStatus == status ? null : status;
    _applyFilters();
  }

  Future<void> _selectDateRange() async {
    final initialRange = DateTimeRange(
      start: _startDate ?? DateTime.now().subtract(const Duration(days: 30)),
      end: _endDate ?? DateTime.now(),
    );

    final result = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 30)),
      initialDateRange: initialRange,
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: Theme.of(context).colorScheme.copyWith(
                  primary: const Color(0xFFFFB800),
                  onPrimary: Colors.black,
                ),
          ),
          child: child!,
        );
      },
    );

    if (result != null) {
      _startDate = result.start;
      _endDate = result.end;
      _applyFilters();
    }
  }

  void _clearFilters() {
    _selectedStatus = null;
    _startDate = null;
    _endDate = null;
    _searchController.clear();
    _searchQuery = '';
    _applyFilters();
  }

  bool get _hasActiveFilters =>
      _selectedStatus != null || _startDate != null || _endDate != null || _searchQuery.isNotEmpty;

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

  String _formatDate(String isoString) {
    try {
      final dt = DateTime.parse(isoString);
      final weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
      final months = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
      ];
      return '${weekdays[dt.weekday - 1]}, ${dt.day} ${months[dt.month - 1]}';
    } catch (_) {
      return isoString;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Minhas Visitas'),
        actions: [
          if (_hasActiveFilters)
            IconButton(
              icon: const Icon(Icons.filter_alt_off),
              tooltip: 'Limpar filtros',
              onPressed: _clearFilters,
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isLoading ? null : _loadVisits,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadVisits,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  // Search bar
                  SliverToBoxAdapter(child: _buildSearchBar(theme)),

                  // Filter chips
                  SliverToBoxAdapter(child: _buildStatusChips(theme)),

                  // Date filter
                  SliverToBoxAdapter(child: _buildDateFilter(theme)),

                  // Summary
                  SliverToBoxAdapter(child: _buildSummary(theme)),

                  // Error
                  if (_error != null) SliverToBoxAdapter(child: _buildError()),

                  // Empty state
                  if (_filteredVisits.isEmpty)
                    SliverFillRemaining(child: _buildEmptyState(theme))
                  else
                    // Visit list
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final visit = _filteredVisits[index];
                            return _buildVisitCard(theme, visit);
                          },
                          childCount: _filteredVisits.length,
                        ),
                      ),
                    ),
                ],
              ),
            ),
    );
  }

  Widget _buildSearchBar(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: 'Buscar por posto, código ou local...',
          prefixIcon: const Icon(Icons.search, size: 20),
          suffixIcon: _searchQuery.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear, size: 18),
                  onPressed: () {
                    _searchController.clear();
                    _searchQuery = '';
                    _applyFilters();
                  },
                )
              : null,
          filled: true,
          fillColor: const Color(0xFF242438),
          contentPadding: const EdgeInsets.symmetric(vertical: 12),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFF2A2A3E)),
          ),
        ),
        onChanged: (value) {
          _searchQuery = value;
          _applyFilters();
        },
      ),
    );
  }

  Widget _buildStatusChips(ThemeData theme) {
    final statuses = [
      (null, 'Todas', Colors.grey),
      (VisitStatus.scheduled, 'Agendadas', Colors.blue),
      (VisitStatus.inProgress, 'Em Andamento', Colors.orange),
      (VisitStatus.completed, 'Concluídas', Colors.green),
      (VisitStatus.cancelled, 'Canceladas', Colors.red),
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: statuses.map((entry) {
            final status = entry.$1;
            final label = entry.$2;
            final color = entry.$3;
            final isSelected = _selectedStatus == status;

            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: FilterChip(
                label: Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: isSelected ? Colors.black : Colors.grey[300],
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
                selected: isSelected,
                onSelected: (_) => _setStatusFilter(status),
                selectedColor: color,
                backgroundColor: const Color(0xFF242438),
                side: BorderSide(
                  color: isSelected ? color : const Color(0xFF2A2A3E),
                  width: isSelected ? 1.5 : 1,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildDateFilter(ThemeData theme) {
    String dateText;
    if (_startDate != null && _endDate != null) {
      final df = DateFormat('dd/MM');
      dateText = '${df.format(_startDate!)} - ${df.format(_endDate!)}';
    } else {
      dateText = 'Filtrar por período';
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      child: InkWell(
        onTap: _selectDateRange,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xFF242438),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: _startDate != null
                  ? const Color(0xFFFFB800).withAlpha(80)
                  : const Color(0xFF2A2A3E),
            ),
          ),
          child: Row(
            children: [
              Icon(
                Icons.date_range,
                size: 18,
                color: _startDate != null
                    ? const Color(0xFFFFB800)
                    : Colors.grey[500],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  dateText,
                  style: TextStyle(
                    color: _startDate != null ? Colors.white : Colors.grey[500],
                    fontSize: 13,
                  ),
                ),
              ),
              if (_startDate != null)
                GestureDetector(
                  onTap: () {
                    setState(() {
                      _startDate = null;
                      _endDate = null;
                    });
                    _applyFilters();
                  },
                  child: Icon(Icons.close, size: 16, color: Colors.grey[500]),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSummary(ThemeData theme) {
    final total = _filteredVisits.length;
    final scheduled = _filteredVisits
        .where((v) => v.status == VisitStatus.scheduled)
        .length;
    final inProgress = _filteredVisits
        .where((v) => v.status == VisitStatus.inProgress)
        .length;
    final completed = _filteredVisits
        .where((v) => v.status == VisitStatus.completed)
        .length;

    if (_hasActiveFilters) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
        child: Row(
          children: [
            Text(
              '$total visita${total != 1 ? 's' : ''} encontrada${total != 1 ? 's' : ''}',
              style: TextStyle(color: Colors.grey[400], fontSize: 13),
            ),
            if (total > 0) ...[
              const SizedBox(width: 12),
              if (scheduled > 0)
                _miniChip('$scheduled agend.', Colors.blue),
              if (inProgress > 0)
                Padding(
                  padding: const EdgeInsets.only(left: 6),
                  child: _miniChip('$inProgress and.', Colors.orange),
                ),
              if (completed > 0)
                Padding(
                  padding: const EdgeInsets.only(left: 6),
                  child: _miniChip('$completed concl.', Colors.green),
                ),
            ],
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Row(
        children: [
          _miniCard(theme, 'Total', '$total', Icons.list, Colors.blue),
          const SizedBox(width: 8),
          _miniCard(theme, 'Agendadas', '$scheduled', Icons.schedule, Colors.blue),
          const SizedBox(width: 8),
          _miniCard(theme, 'Andamento', '$inProgress', Icons.play_circle, Colors.orange),
          const SizedBox(width: 8),
          _miniCard(theme, 'Concluídas', '$completed', Icons.check_circle, Colors.green),
        ],
      ),
    );
  }

  Widget _miniChip(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withAlpha(20),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(text, style: TextStyle(color: color, fontSize: 11)),
    );
  }

  Widget _miniCard(ThemeData theme, String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: const Color(0xFF242438),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF2A2A3E)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 16),
            const SizedBox(height: 4),
            Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            Text(label, style: TextStyle(color: Colors.grey[500], fontSize: 10), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }

  Widget _buildError() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Container(
        padding: const EdgeInsets.all(12),
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
            TextButton(onPressed: _loadVisits, child: const Text('Tentar novamente')),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(ThemeData theme) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _hasActiveFilters ? Icons.search_off : Icons.event_busy,
            size: 56,
            color: Colors.grey[600],
          ),
          const SizedBox(height: 16),
          Text(
            _hasActiveFilters
                ? 'Nenhuma visita encontrada com esses filtros'
                : 'Nenhuma visita encontrada',
            style: TextStyle(color: Colors.grey[400], fontSize: 15),
            textAlign: TextAlign.center,
          ),
          if (_hasActiveFilters) ...[
            const SizedBox(height: 12),
            TextButton.icon(
              onPressed: _clearFilters,
              icon: const Icon(Icons.filter_alt_off, size: 18),
              label: const Text('Limpar filtros'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildVisitCard(ThemeData theme, SupervisorVisit visit) {
    final color = _statusColor(visit.status);

    // Horário agendado
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
            MaterialPageRoute(
              builder: (_) => VisitDetailScreen(visit: visit),
            ),
          );
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              // Time column
              Container(
                width: 52,
                padding: const EdgeInsets.symmetric(vertical: 6),
                decoration: BoxDecoration(
                  color: color.withAlpha(15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Column(
                  children: [
                    Icon(_statusIcon(visit.status), color: color, size: 20),
                    const SizedBox(height: 2),
                    Text(
                      time,
                      style: TextStyle(
                        color: color,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 14),

              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      visit.workPostName ?? 'Posto',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _formatDate(visit.visitDate),
                      style: TextStyle(color: Colors.grey[500], fontSize: 12),
                    ),
                    if (visit.workPostCode != null)
                      Text(
                        'Cód: ${visit.workPostCode}',
                        style: TextStyle(color: Colors.grey[600], fontSize: 11),
                      ),
                    if (visit.location != null)
                      Text(
                        visit.location!,
                        style: TextStyle(color: Colors.grey[600], fontSize: 11),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),

              // Status chip
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: color.withAlpha(20),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: color.withAlpha(60)),
                ),
                child: Text(
                  visit.displayStatus,
                  style: TextStyle(
                    color: color,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
