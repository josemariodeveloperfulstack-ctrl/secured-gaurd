import 'package:flutter/material.dart';
import '../../models/operational_occurrence.dart';
import '../../services/occurrence_service.dart';
import 'occurrence_detail_screen.dart';

class OccurrenceListScreen extends StatefulWidget {
  final String? employeeId;

  const OccurrenceListScreen({super.key, this.employeeId});

  @override
  State<OccurrenceListScreen> createState() => _OccurrenceListScreenState();
}

class _OccurrenceListScreenState extends State<OccurrenceListScreen> {
  final OccurrenceService _service = OccurrenceService();
  List<OperationalOccurrence> _allOccurrences = [];
  List<OperationalOccurrence> _filteredOccurrences = [];
  bool _isLoading = true;
  String? _error;

  // Filtros
  String _selectedType = 'TODOS';
  String _selectedStatus = 'TODOS';
  String _selectedPriority = 'TODOS';
  String _searchQuery = '';

  static const _types = [
    'TODOS',
    'SEGURANCA',
    'DISCIPLINAR',
    'EQUIPAMENTO',
    'INCIDENTE',
    'MANUTENCAO',
    'FALTA',
    'TROCA',
    'HE',
    'SOLICITACAO_CLIENTE',
    'OUTROS',
  ];

  static const _typeLabels = {
    'TODOS': 'Todos',
    'SEGURANCA': 'Segurança',
    'DISCIPLINAR': 'Disciplinar',
    'EQUIPAMENTO': 'Equipamento',
    'INCIDENTE': 'Incidente',
    'MANUTENCAO': 'Manutenção',
    'FALTA': 'Falta',
    'TROCA': 'Troca',
    'HE': 'Hora Extra',
    'SOLICITACAO_CLIENTE': 'Solic. Cliente',
    'OUTROS': 'Outros',
  };

  static const _statuses = [
    'TODOS',
    'PENDENTE',
    'EM_ANDAMENTO',
    'RESOLVIDO',
    'CONCLUIDO',
  ];

  static const _statusLabels = {
    'TODOS': 'Todos',
    'PENDENTE': 'Pendentes',
    'EM_ANDAMENTO': 'Andamento',
    'RESOLVIDO': 'Resolvidos',
    'CONCLUIDO': 'Concluídos',
  };

  static const _priorities = ['TODOS', 'ALTA', 'MEDIA', 'BAIXA'];
  static const _priorityLabels = {
    'TODOS': 'Todas',
    'ALTA': 'Alta',
    'MEDIA': 'Média',
    'BAIXA': 'Baixa',
  };

  @override
  void initState() {
    super.initState();
    _loadOccurrences();
  }

  Future<void> _loadOccurrences() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      List<OperationalOccurrence> data;
      if (widget.employeeId != null) {
        data = await _service.getByEmployeeId(widget.employeeId!);
      } else {
        data = await _service.getAll();
      }
      if (!mounted) return;
      setState(() {
        _allOccurrences = data;
        _applyFilters();
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Erro ao carregar ocorrências.';
        _isLoading = false;
      });
    }
  }

  void _applyFilters() {
    var filtered = _allOccurrences.where((o) {
      // Filtro por tipo
      if (_selectedType != 'TODOS' &&
          o.type.toUpperCase() != _selectedType) {
        return false;
      }
      // Filtro por status
      if (_selectedStatus != 'TODOS' &&
          o.status.toUpperCase() != _selectedStatus) {
        return false;
      }
      // Filtro por prioridade
      if (_selectedPriority != 'TODOS' &&
          o.priority.toUpperCase() != _selectedPriority) {
        return false;
      }
      // Busca textual
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        final matchTitle = o.title.toLowerCase().contains(query);
        final matchDesc =
            (o.description ?? '').toLowerCase().contains(query);
        final matchLoc = (o.location ?? '').toLowerCase().contains(query);
        final matchResp =
            (o.responsible ?? '').toLowerCase().contains(query);
        final matchEmp = (o.employeeName ?? '').toLowerCase().contains(query);
        if (!matchTitle &&
            !matchDesc &&
            !matchLoc &&
            !matchResp &&
            !matchEmp) {
          return false;
        }
      }
      return true;
    }).toList();

    // Ordenar por data (mais recente primeiro)
    filtered.sort((a, b) {
      if (a.date == null && b.date == null) return 0;
      if (a.date == null) return 1;
      if (b.date == null) return -1;
      return b.date!.compareTo(a.date!);
    });

    setState(() => _filteredOccurrences = filtered);
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ocorrências'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isLoading ? null : _loadOccurrences,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadOccurrences,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  // Stats cards
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                      child: Row(
                        children: [
                          _StatCard(
                            icon: Icons.list,
                            label: 'Total',
                            value: '${_allOccurrences.length}',
                            color: Colors.blue,
                          ),
                          const SizedBox(width: 8),
                          _StatCard(
                            icon: Icons.pending_actions,
                            label: 'Pendentes',
                            value:
                                '${_allOccurrences.where((o) => o.status.toUpperCase() == 'PENDENTE').length}',
                            color: Colors.orange,
                          ),
                          const SizedBox(width: 8),
                          _StatCard(
                            icon: Icons.info,
                            label: 'Andamento',
                            value:
                                '${_allOccurrences.where((o) => o.status.toUpperCase() == 'EM_ANDAMENTO').length}',
                            color: Colors.blue,
                          ),
                          const SizedBox(width: 8),
                          _StatCard(
                            icon: Icons.check_circle,
                            label: 'Resolv.',
                            value:
                                '${_allOccurrences.where((o) => o.status.toUpperCase() == 'RESOLVIDO' || o.status.toUpperCase() == 'CONCLUIDO').length}',
                            color: Colors.green,
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Search bar
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                      child: TextField(
                        onChanged: (value) {
                          _searchQuery = value;
                          _applyFilters();
                        },
                        decoration: InputDecoration(
                          hintText: 'Buscar ocorrências...',
                          prefixIcon: const Icon(Icons.search, size: 20),
                          suffixIcon: _searchQuery.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear, size: 18),
                                  onPressed: () {
                                    _searchQuery = '';
                                    _applyFilters();
                                  },
                                )
                              : null,
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 12),
                          isDense: true,
                        ),
                      ),
                    ),
                  ),

                  // Type filter chips
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
                      child: _buildFilterSection(
                        'Tipo',
                        _types,
                        _typeLabels,
                        _selectedType,
                        (v) {
                          _selectedType = v;
                          _applyFilters();
                        },
                      ),
                    ),
                  ),

                  // Status and Priority filters
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                      child: Row(
                        children: [
                          Expanded(
                            child: _buildFilterChips(
                              _statuses,
                              _statusLabels,
                              _selectedStatus,
                              (v) {
                                _selectedStatus = v;
                                _applyFilters();
                              },
                              _statusColor,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _buildFilterChips(
                              _priorities,
                              _priorityLabels,
                              _selectedPriority,
                              (v) {
                                _selectedPriority = v;
                                _applyFilters();
                              },
                              _priorityColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Error banner
                  if (_error != null)
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red.withAlpha(15),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                                color: Colors.red.withAlpha(50)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.error_outline,
                                  color: Colors.red, size: 20),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(_error!,
                                    style: const TextStyle(
                                        color: Colors.red, fontSize: 13)),
                              ),
                              TextButton(
                                onPressed: _loadOccurrences,
                                child: const Text('Tentar'),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

                  // Empty state
                  if (_filteredOccurrences.isEmpty)
                    SliverFillRemaining(
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.assignment_late,
                                size: 56, color: Colors.grey[600]),
                            const SizedBox(height: 16),
                            Text(
                              _searchQuery.isNotEmpty ||
                                      _selectedType != 'TODOS' ||
                                      _selectedStatus != 'TODOS' ||
                                      _selectedPriority != 'TODOS'
                                  ? 'Nenhuma ocorrência encontrada'
                                  : 'Nenhuma ocorrência registrada',
                              style: TextStyle(
                                  color: Colors.grey[400], fontSize: 15),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    // Occurrence list
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final occ = _filteredOccurrences[index];
                            return _OccurrenceCard(
                              occurrence: occ,
                              onTap: () => _openDetail(occ),
                              statusColor: _statusColor(occ.status),
                              priorityColor: _priorityColor(occ.priority),
                            );
                          },
                          childCount: _filteredOccurrences.length,
                        ),
                      ),
                    ),
                ],
              ),
            ),
    );
  }

  Widget _buildFilterSection(
    String title,
    List<String> items,
    Map<String, String> labels,
    String selected,
    ValueChanged<String> onChanged,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title,
            style: TextStyle(
                color: Colors.grey[400],
                fontSize: 12,
                fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        SizedBox(
          height: 36,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: items.map((item) {
              final isSelected = selected == item;
              return Padding(
                padding: const EdgeInsets.only(right: 6),
                child: FilterChip(
                  label: Text(
                    labels[item] ?? item,
                    style: TextStyle(
                      fontSize: 11,
                      color:
                          isSelected ? Colors.black : Colors.grey[300],
                      fontWeight: isSelected
                          ? FontWeight.w700
                          : FontWeight.w500,
                    ),
                  ),
                  selected: isSelected,
                  onSelected: (_) => onChanged(item),
                  selectedColor: const Color(0xFFFFB800),
                  backgroundColor: const Color(0xFF242438),
                  side: BorderSide(
                    color: isSelected
                        ? const Color(0xFFFFB800)
                        : const Color(0xFF2A2A3E),
                    width: isSelected ? 1.5 : 1,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  visualDensity: VisualDensity.compact,
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  labelPadding: const EdgeInsets.symmetric(horizontal: 6),
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildFilterChips(
    List<String> items,
    Map<String, String> labels,
    String selected,
    ValueChanged<String> onChanged,
    Color Function(String) colorFn,
  ) {
    return SizedBox(
      height: 36,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: items.map((item) {
          final isSelected = selected == item;
          return Padding(
            padding: const EdgeInsets.only(right: 4),
            child: FilterChip(
              label: Text(
                labels[item] ?? item,
                style: TextStyle(
                  fontSize: 10,
                  color: isSelected ? Colors.black : Colors.grey[300],
                  fontWeight:
                      isSelected ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
              selected: isSelected,
              onSelected: (_) => onChanged(item),
              selectedColor: colorFn(item).withAlpha(200),
              backgroundColor: const Color(0xFF242438),
              side: BorderSide(
                color: isSelected ? colorFn(item) : const Color(0xFF2A2A3E),
                width: isSelected ? 1.5 : 1,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              visualDensity: VisualDensity.compact,
              padding: const EdgeInsets.symmetric(horizontal: 4),
              labelPadding: const EdgeInsets.symmetric(horizontal: 4),
            ),
          );
        }).toList(),
      ),
    );
  }

  void _openDetail(OperationalOccurrence occ) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => OccurrenceDetailScreen(
          occurrence: occ,
          onStatusChanged: () => _loadOccurrences(),
        ),
      ),
    );
  }
}

class _OccurrenceCard extends StatelessWidget {
  final OperationalOccurrence occurrence;
  final VoidCallback onTap;
  final Color statusColor;
  final Color priorityColor;

  const _OccurrenceCard({
    required this.occurrence,
    required this.onTap,
    required this.statusColor,
    required this.priorityColor,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: priorityColor.withAlpha(20),
                      borderRadius: BorderRadius.circular(6),
                      border:
                          Border.all(color: priorityColor.withAlpha(60)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.flag,
                            size: 12, color: priorityColor),
                        const SizedBox(width: 4),
                        Text(
                          occurrence.displayPriority,
                          style: TextStyle(
                            color: priorityColor,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: statusColor.withAlpha(20),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: statusColor.withAlpha(60)),
                    ),
                    child: Text(
                      occurrence.displayStatus,
                      style: TextStyle(
                        color: statusColor,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  if (occurrence.warningNumber != null) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.purple.withAlpha(20),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '#${occurrence.warningNumber}',
                        style: TextStyle(
                          color: Colors.purple[300],
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 10),
              Text(
                occurrence.title,
                style: const TextStyle(
                    fontWeight: FontWeight.w600, fontSize: 14),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(Icons.category,
                      size: 12, color: Colors.grey[500]),
                  const SizedBox(width: 4),
                  Text(
                    occurrence.displayType,
                    style: TextStyle(
                        color: Colors.grey[500], fontSize: 11),
                  ),
                  const SizedBox(width: 16),
                  Icon(Icons.person_outline,
                      size: 12, color: Colors.grey[500]),
                  const SizedBox(width: 4),
                  Text(
                    occurrence.employeeName ?? '--',
                    style: TextStyle(
                        color: Colors.grey[500], fontSize: 11),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(Icons.schedule,
                      size: 12, color: Colors.grey[500]),
                  const SizedBox(width: 4),
                  Text(
                    occurrence.formattedDate,
                    style: TextStyle(
                        color: Colors.grey[500], fontSize: 11),
                  ),
                  if (occurrence.location != null) ...[
                    const SizedBox(width: 16),
                    Icon(Icons.location_on,
                        size: 12, color: Colors.grey[500]),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        occurrence.location!,
                        style: TextStyle(
                            color: Colors.grey[500], fontSize: 11),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ],
              ),
              if (occurrence.description != null &&
                  occurrence.description!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  occurrence.description!.length > 100
                      ? '${occurrence.description!.substring(0, 100)}...'
                      : occurrence.description!,
                  style: TextStyle(
                      color: Colors.grey[600], fontSize: 12),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: const Color(0xFF242438),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFF2A2A3E)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(height: 4),
            Text(value,
                style: const TextStyle(
                    fontWeight: FontWeight.bold, fontSize: 16)),
            Text(label,
                style: TextStyle(
                    color: Colors.grey[500],
                    fontSize: 9,
                    fontWeight: FontWeight.w500),
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
