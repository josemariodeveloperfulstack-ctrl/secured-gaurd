import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/schedule.dart';
import '../../services/schedule_service.dart';
import '../../providers/auth_provider.dart';

class ScaleListScreen extends StatefulWidget {
  const ScaleListScreen({super.key});

  @override
  State<ScaleListScreen> createState() => _ScaleListScreenState();
}

class _ScaleListScreenState extends State<ScaleListScreen> {
  final ScheduleService _service = ScheduleService();
  List<Schedule> _scales = [];
  bool _isLoading = true;
  String? _error;
  String _selectedFilter = 'TODAS';
  String _searchQuery = '';

  static const _statusFilterOptions = [
    'TODAS',
    'PENDING',
    'CONFIRMED',
    'COMPLETED',
    'CANCELLED',
  ];

  static const _statusFilterLabels = {
    'TODAS': 'Todas',
    'PENDING': 'Pendentes',
    'CONFIRMED': 'Confirmadas',
    'COMPLETED': 'Concluídas',
    'CANCELLED': 'Canceladas',
  };

  @override
  void initState() {
    super.initState();
    _loadScales();
  }

  Future<void> _loadScales() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final user = context.read<AuthProvider>().user;
      final employeeId = user?.id;
      List<Schedule> data;
      if (employeeId != null) {
        data = await _service.getByEmployeeId(employeeId);
      } else {
        data = await _service.getAll();
      }
      if (!mounted) return;
      setState(() {
        _scales = data;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Erro ao carregar escalas.';
        _isLoading = false;
      });
    }
  }

  List<Schedule> get _filteredScales {
    return _scales.where((s) {
      // Filtro por status
      if (_selectedFilter != 'TODAS' &&
          s.status.toUpperCase() != _selectedFilter) {
        return false;
      }
      // Busca textual
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        final matchName =
            (s.employeeName ?? '').toLowerCase().contains(query);
        final matchPost =
            (s.workPostName ?? '').toLowerCase().contains(query);
        final matchClient =
            (s.clientName ?? '').toLowerCase().contains(query);
        final matchObs =
            (s.observations ?? '').toLowerCase().contains(query);
        final matchCode =
            (s.workPostCode ?? '').toLowerCase().contains(query);
        if (!matchName &&
            !matchPost &&
            !matchClient &&
            !matchObs &&
            !matchCode) {
          return false;
        }
      }
      return true;
    }).toList()
      ..sort((a, b) {
        if (a.scheduleDate == null && b.scheduleDate == null) return 0;
        if (a.scheduleDate == null) return 1;
        if (b.scheduleDate == null) return -1;
        return b.scheduleDate!.compareTo(a.scheduleDate!);
      });
  }

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return Colors.orange;
      case 'CONFIRMED':
        return Colors.blue;
      case 'COMPLETED':
        return Colors.green;
      case 'CANCELLED':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Color _shiftColor(String shift) {
    switch (shift.toUpperCase()) {
      case 'DAY':
        return Colors.amber;
      case 'NIGHT':
        return Colors.indigo;
      case 'MIXED':
        return Colors.teal;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredScales;
    final confirmed =
        _scales.where((s) => s.status.toUpperCase() == 'CONFIRMED').length;
    final pending =
        _scales.where((s) => s.status.toUpperCase() == 'PENDING').length;
    final completed =
        _scales.where((s) => s.status.toUpperCase() == 'COMPLETED').length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Escalas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isLoading ? null : _loadScales,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadScales,
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
                            icon: Icons.calendar_month,
                            label: 'Total',
                            value: '${_scales.length}',
                            color: Colors.blue,
                          ),
                          const SizedBox(width: 8),
                          _StatCard(
                            icon: Icons.check_circle,
                            label: 'Confirmadas',
                            value: '$confirmed',
                            color: Colors.blue,
                          ),
                          const SizedBox(width: 8),
                          _StatCard(
                            icon: Icons.pending,
                            label: 'Pendentes',
                            value: '$pending',
                            color: Colors.orange,
                          ),
                          const SizedBox(width: 8),
                          _StatCard(
                            icon: Icons.done_all,
                            label: 'Concluídas',
                            value: '$completed',
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
                          setState(() => _searchQuery = value);
                        },
                        decoration: InputDecoration(
                          hintText: 'Buscar por funcionário, posto...',
                          prefixIcon:
                              const Icon(Icons.search, size: 20),
                          suffixIcon: _searchQuery.isNotEmpty
                              ? IconButton(
                                  icon:
                                      const Icon(Icons.clear, size: 18),
                                  onPressed: () {
                                    setState(
                                        () => _searchQuery = '');
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

                  // Status filter chips
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                      child: SizedBox(
                        height: 36,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          children:
                              _statusFilterOptions.map((filter) {
                            final isSelected =
                                _selectedFilter == filter;
                            return Padding(
                              padding:
                                  const EdgeInsets.only(right: 6),
                              child: FilterChip(
                                label: Text(
                                  _statusFilterLabels[filter]!,
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: isSelected
                                        ? Colors.black
                                        : Colors.grey[300],
                                    fontWeight: isSelected
                                        ? FontWeight.w700
                                        : FontWeight.w500,
                                  ),
                                ),
                                selected: isSelected,
                                onSelected: (_) => setState(
                                    () => _selectedFilter = filter),
                                selectedColor:
                                    _statusColor(filter)
                                        .withAlpha(200),
                                backgroundColor:
                                    const Color(0xFF242438),
                                side: BorderSide(
                                  color: isSelected
                                      ? _statusColor(filter)
                                      : const Color(0xFF2A2A3E),
                                  width: isSelected ? 1.5 : 1,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius:
                                      BorderRadius.circular(20),
                                ),
                                materialTapTargetSize:
                                    MaterialTapTargetSize
                                        .shrinkWrap,
                                visualDensity:
                                    VisualDensity.compact,
                                padding:
                                    const EdgeInsets.symmetric(
                                        horizontal: 4),
                                labelPadding:
                                    const EdgeInsets.symmetric(
                                        horizontal: 6),
                              ),
                            );
                          }).toList(),
                        ),
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
                            borderRadius:
                                BorderRadius.circular(12),
                            border: Border.all(
                                color:
                                    Colors.red.withAlpha(50)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.error_outline,
                                  color: Colors.red, size: 20),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(_error!,
                                    style: const TextStyle(
                                        color: Colors.red,
                                        fontSize: 13)),
                              ),
                              TextButton(
                                onPressed: _loadScales,
                                child: const Text('Tentar'),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

                  // Empty state
                  if (filtered.isEmpty)
                    SliverFillRemaining(
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.event_busy,
                                size: 56,
                                color: Colors.grey[600]),
                            const SizedBox(height: 16),
                            Text(
                              _searchQuery.isNotEmpty ||
                                      _selectedFilter != 'TODAS'
                                  ? 'Nenhuma escala encontrada'
                                  : 'Nenhuma escala registrada',
                              style: TextStyle(
                                  color: Colors.grey[400],
                                  fontSize: 15),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    // Scale list
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(
                          16, 0, 16, 16),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final scale = filtered[index];
                            final sColor =
                                _statusColor(scale.status);
                            final shColor =
                                _shiftColor(scale.shift);
                            final isHoraExtra = scale.isHoraExtra;
                            final isMonitoria = scale.isMonitoria;

                            return Card(
                              margin:
                                  const EdgeInsets.only(bottom: 8),
                              child: Padding(
                                padding:
                                    const EdgeInsets.all(14),
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    // Top row - shift + status
                                    Row(
                                      children: [
                                        // Shift indicator
                                        Container(
                                          width: 44,
                                          padding:
                                              const EdgeInsets
                                                  .symmetric(
                                                      vertical:
                                                          6),
                                          decoration:
                                              BoxDecoration(
                                            color: shColor
                                                .withAlpha(20),
                                            borderRadius:
                                                BorderRadius
                                                    .circular(
                                                        10),
                                          ),
                                          child: Column(
                                            children: [
                                              Icon(
                                                scale
                                                            .shift
                                                            .toUpperCase() ==
                                                        'NIGHT'
                                                    ? Icons
                                                        .nights_stay
                                                    : Icons
                                                        .wb_sunny,
                                                size: 18,
                                                color: shColor,
                                              ),
                                              const SizedBox(
                                                  height: 2),
                                              Text(
                                                scale
                                                    .displayShift,
                                                style: TextStyle(
                                                  color:
                                                      shColor,
                                                  fontSize: 9,
                                                  fontWeight:
                                                      FontWeight
                                                          .w700,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(
                                            width: 12),
                                        // Info
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment
                                                    .start,
                                            children: [
                                              Text(
                                                scale
                                                    .formattedDate,
                                                style: TextStyle(
                                                  color: Colors
                                                      .grey[300],
                                                  fontWeight:
                                                      FontWeight
                                                          .w600,
                                                  fontSize:
                                                      14,
                                                ),
                                              ),
                                              const SizedBox(
                                                  height: 2),
                                              if (scale
                                                      .employeeName !=
                                                  null)
                                                Text(
                                                  scale
                                                      .employeeName!,
                                                  style: TextStyle(
                                                    color: Colors
                                                        .grey[500],
                                                    fontSize:
                                                        12,
                                                  ),
                                                ),
                                              if (scale
                                                      .workPostName !=
                                                  null)
                                                Text(
                                                  scale
                                                      .workPostName!,
                                                  style: TextStyle(
                                                    color: Colors
                                                        .grey[600],
                                                    fontSize:
                                                        11,
                                                  ),
                                                  maxLines: 1,
                                                  overflow:
                                                      TextOverflow
                                                          .ellipsis,
                                                ),
                                            ],
                                          ),
                                        ),
                                        // Tags
                                        Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment
                                                  .end,
                                          children: [
                                            Container(
                                              padding: const EdgeInsets
                                                      .symmetric(
                                                  horizontal:
                                                      8,
                                                  vertical:
                                                      4),
                                              decoration:
                                                  BoxDecoration(
                                                color: sColor
                                                    .withAlpha(
                                                        20),
                                                borderRadius:
                                                    BorderRadius
                                                        .circular(
                                                            8),
                                                border: Border.all(
                                                    color:
                                                        sColor
                                                            .withAlpha(
                                                                60)),
                                              ),
                                              child: Text(
                                                scale
                                                    .displayStatus,
                                                style: TextStyle(
                                                  color:
                                                      sColor,
                                                  fontSize:
                                                      11,
                                                  fontWeight:
                                                      FontWeight
                                                          .w600,
                                                ),
                                              ),
                                            ),
                                            if (isHoraExtra ||
                                                isMonitoria) ...[
                                              const SizedBox(
                                                  height: 4),
                                              Container(
                                                padding: const EdgeInsets
                                                        .symmetric(
                                                    horizontal:
                                                        6,
                                                    vertical:
                                                        2),
                                                decoration:
                                                    BoxDecoration(
                                                  color: isHoraExtra
                                                      ? Colors
                                                          .amber
                                                          .withAlpha(
                                                              20)
                                                      : Colors
                                                          .purple
                                                          .withAlpha(
                                                              20),
                                                  borderRadius:
                                                      BorderRadius
                                                          .circular(
                                                              6),
                                                ),
                                                child: Text(
                                                  isHoraExtra
                                                      ? 'HE'
                                                      : 'MON',
                                                  style: TextStyle(
                                                    color: isHoraExtra
                                                        ? Colors
                                                            .amber
                                                        : Colors
                                                            .purple[
                                                            300],
                                                    fontSize:
                                                        9,
                                                    fontWeight:
                                                        FontWeight
                                                            .w600,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                      ],
                                    ),
                                    // Bottom info
                                    if (scale.workPostCode !=
                                            null ||
                                        scale.clientName !=
                                            null ||
                                        scale.sigla != null)
                                      Padding(
                                        padding:
                                            const EdgeInsets
                                                .only(top: 8),
                                        child: Row(
                                          children: [
                                            if (scale
                                                    .workPostCode !=
                                                null) ...[
                                              Icon(Icons.qr_code,
                                                  size: 12,
                                                  color: Colors
                                                      .grey[500]),
                                              const SizedBox(
                                                  width: 4),
                                              Text(
                                                scale
                                                    .workPostCode!,
                                                style: TextStyle(
                                                  color: Colors
                                                      .grey[500],
                                                  fontSize:
                                                      11,
                                                ),
                                              ),
                                              const SizedBox(
                                                  width: 12),
                                            ],
                                            if (scale
                                                    .clientName !=
                                                null) ...[
                                              Icon(Icons
                                                  .business,
                                                  size: 12,
                                                  color: Colors
                                                      .grey[500]),
                                              const SizedBox(
                                                  width: 4),
                                              Text(
                                                scale
                                                    .clientName!,
                                                style: TextStyle(
                                                  color: Colors
                                                      .grey[500],
                                                  fontSize:
                                                      11,
                                                ),
                                                maxLines: 1,
                                                overflow:
                                                    TextOverflow
                                                        .ellipsis,
                                              ),
                                            ],
                                            if (scale.sigla !=
                                                null) ...[
                                              const Spacer(),
                                              Container(
                                                padding: const EdgeInsets
                                                        .symmetric(
                                                    horizontal:
                                                        6,
                                                    vertical:
                                                        2),
                                                decoration:
                                                    BoxDecoration(
                                                  color: Colors
                                                      .grey
                                                      .withAlpha(
                                                          20),
                                                  borderRadius:
                                                      BorderRadius
                                                          .circular(
                                                              4),
                                                ),
                                                child: Text(
                                                  scale
                                                      .sigla!,
                                                  style: TextStyle(
                                                    color: Colors
                                                        .grey[500],
                                                    fontSize:
                                                        10,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                      ),
                                    // Observations
                                    if (scale.observations !=
                                            null &&
                                        scale
                                            .observations!
                                            .isNotEmpty)
                                      Padding(
                                        padding:
                                            const EdgeInsets
                                                .only(top: 6),
                                        child: Text(
                                          scale.observations!,
                                          style: TextStyle(
                                            color:
                                                Colors.grey[600],
                                            fontSize: 11,
                                            fontStyle:
                                                FontStyle.italic,
                                          ),
                                          maxLines: 2,
                                          overflow:
                                              TextOverflow
                                                  .ellipsis,
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            );
                          },
                          childCount: filtered.length,
                        ),
                      ),
                    ),
                ],
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
