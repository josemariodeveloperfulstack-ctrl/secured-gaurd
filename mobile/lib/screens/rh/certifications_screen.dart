import 'package:flutter/material.dart';
import '../../models/certification.dart';
import '../../services/certification_service.dart';

class CertificationsScreen extends StatefulWidget {
  const CertificationsScreen({super.key});

  @override
  State<CertificationsScreen> createState() => _CertificationsScreenState();
}

class _CertificationsScreenState extends State<CertificationsScreen> {
  final CertificationService _service = CertificationService();
  List<Certification> _certifications = [];
  bool _isLoading = true;
  String? _error;
  Map<String, dynamic>? _stats;

  // Filtros
  String _selectedStatus = 'TODOS';
  String _searchQuery = '';

  static const _statusOptions = [
    'TODOS',
    'ACTIVE',
    'EXPIRED',
    'RENEWED',
    'CANCELLED',
  ];

  static const _statusLabels = {
    'TODOS': 'Todas',
    'ACTIVE': 'Ativas',
    'EXPIRED': 'Vencidas',
    'RENEWED': 'Renovadas',
    'CANCELLED': 'Canceladas',
  };

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
        _service.getMyCertifications(),
        _service.getMyStats(),
      ]);
      if (!mounted) return;
      setState(() {
        _certifications = results[0] as List<Certification>;
        _stats = results[1] as Map<String, dynamic>?;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Erro ao carregar certificações.';
        _isLoading = false;
      });
    }
  }

  List<Certification> get _filteredCertifications {
    return _certifications.where((c) {
      if (_selectedStatus != 'TODOS' &&
          c.status.toUpperCase() != _selectedStatus) {
        return false;
      }
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        final matchName =
            (c.trainingName ?? '').toLowerCase().contains(query);
        final matchNum =
            (c.certificationNumber ?? '').toLowerCase().contains(query);
        final matchPost =
            (c.workPostName ?? '').toLowerCase().contains(query);
        if (!matchName && !matchNum && !matchPost) {
          return false;
        }
      }
      return true;
    }).toList()
      ..sort((a, b) {
        if (a.expirationDate == null && b.expirationDate == null) return 0;
        if (a.expirationDate == null) return 1;
        if (b.expirationDate == null) return -1;
        return a.expirationDate!.compareTo(b.expirationDate!);
      });
  }

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return Colors.green;
      case 'EXPIRED':
        return Colors.red;
      case 'RENEWED':
        return Colors.blue;
      case 'CANCELLED':
        return Colors.grey;
      default:
        return Colors.orange;
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredCertifications;
    final activeStats = _stats;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Certificações'),
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
                            icon: Icons.verified,
                            label: 'Total',
                            value: '${activeStats?['total'] ?? _certifications.length}',
                            color: Colors.blue,
                          ),
                          const SizedBox(width: 8),
                          _StatCard(
                            icon: Icons.check_circle,
                            label: 'Ativas',
                            value: '${activeStats?['active'] ?? _certifications.where((c) => c.status.toUpperCase() == 'ACTIVE').length}',
                            color: Colors.green,
                          ),
                          const SizedBox(width: 8),
                          _StatCard(
                            icon: Icons.error,
                            label: 'Vencidas',
                            value: '${activeStats?['expired'] ?? _certifications.where((c) => c.status.toUpperCase() == 'EXPIRED').length}',
                            color: Colors.red,
                          ),
                          const SizedBox(width: 8),
                          _StatCard(
                            icon: Icons.warning_amber,
                            label: 'Vencem',
                            value: '${activeStats?['expiringSoon'] ?? _certifications.where((c) => c.isExpiringSoon).length}',
                            color: Colors.orange,
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
                        onChanged: (value) =>
                            setState(() => _searchQuery = value),
                        decoration: InputDecoration(
                          hintText: 'Buscar por treinamento, número...',
                          prefixIcon: const Icon(Icons.search, size: 20),
                          suffixIcon: _searchQuery.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear, size: 18),
                                  onPressed: () =>
                                      setState(() => _searchQuery = ''),
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
                          children: _statusOptions.map((status) {
                            final isSelected = _selectedStatus == status;
                            return Padding(
                              padding: const EdgeInsets.only(right: 6),
                              child: FilterChip(
                                label: Text(
                                  _statusLabels[status]!,
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
                                    () => _selectedStatus = status),
                                selectedColor:
                                    _statusColor(status).withAlpha(200),
                                backgroundColor: const Color(0xFF242438),
                                side: BorderSide(
                                  color: isSelected
                                      ? _statusColor(status)
                                      : const Color(0xFF2A2A3E),
                                  width: isSelected ? 1.5 : 1,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                materialTapTargetSize:
                                    MaterialTapTargetSize.shrinkWrap,
                                visualDensity: VisualDensity.compact,
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 4),
                                labelPadding: const EdgeInsets.symmetric(
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
                                        color: Colors.red,
                                        fontSize: 13)),
                              ),
                              TextButton(
                                onPressed: _loadData,
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
                            Icon(Icons.verified_outlined,
                                size: 56, color: Colors.grey[600]),
                            const SizedBox(height: 16),
                            Text(
                              _searchQuery.isNotEmpty ||
                                      _selectedStatus != 'TODOS'
                                  ? 'Nenhuma certificação encontrada'
                                  : 'Nenhuma certificação registrada',
                              style: TextStyle(
                                  color: Colors.grey[400],
                                  fontSize: 15),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    // Certification list
                    SliverPadding(
                      padding:
                          const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final cert = filtered[index];
                            final color = _statusColor(cert.status);
                            final expiring = cert.isExpiringSoon;
                            final expired = cert.isExpired;

                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: Padding(
                                padding: const EdgeInsets.all(14),
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    // Top row - status + training name
                                    Row(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        // Status indicator
                                        Container(
                                          width: 44,
                                          height: 44,
                                          decoration: BoxDecoration(
                                            color:
                                                color.withAlpha(20),
                                            borderRadius:
                                                BorderRadius.circular(
                                                    10),
                                          ),
                                          child: Icon(
                                            expired
                                                ? Icons
                                                    .gpp_bad
                                                : expiring
                                                    ? Icons
                                                        .warning
                                                    : Icons
                                                        .verified,
                                            color: color,
                                            size: 22,
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        // Info
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment
                                                    .start,
                                            children: [
                                              Text(
                                                cert.trainingName ??
                                                    'Certificação',
                                                style: const TextStyle(
                                                  fontWeight:
                                                      FontWeight.w600,
                                                  fontSize: 14,
                                                ),
                                                maxLines: 2,
                                                overflow:
                                                    TextOverflow
                                                        .ellipsis,
                                              ),
                                              const SizedBox(
                                                  height: 2),
                                              if (cert
                                                      .certificationNumber !=
                                                  null)
                                                Text(
                                                  'Nº ${cert.certificationNumber!}',
                                                  style: TextStyle(
                                                    color: Colors
                                                        .grey[500],
                                                    fontSize: 11,
                                                  ),
                                                ),
                                              if (cert
                                                      .workPostName !=
                                                  null)
                                                Text(
                                                  cert.workPostName!,
                                                  style: TextStyle(
                                                    color: Colors
                                                        .grey[600],
                                                    fontSize: 11,
                                                  ),
                                                ),
                                            ],
                                          ),
                                        ),
                                        // Status badge
                                        Container(
                                          padding:
                                              const EdgeInsets
                                                  .symmetric(
                                                      horizontal:
                                                          8,
                                                      vertical:
                                                          4),
                                          decoration:
                                              BoxDecoration(
                                            color: color
                                                .withAlpha(20),
                                            borderRadius:
                                                BorderRadius
                                                    .circular(8),
                                            border: Border.all(
                                                color: color
                                                    .withAlpha(
                                                        60)),
                                          ),
                                          child: Text(
                                            cert.displayStatus,
                                            style: TextStyle(
                                              color: color,
                                              fontSize: 11,
                                              fontWeight:
                                                  FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 10),
                                    // Dates row
                                    Row(
                                      children: [
                                        Icon(Icons.date_range,
                                            size: 12,
                                            color: Colors.grey[500]),
                                        const SizedBox(width: 4),
                                        Text(
                                          'Emissão: ${cert.formattedIssueDate}',
                                          style: TextStyle(
                                              color: Colors.grey[500],
                                              fontSize: 11),
                                        ),
                                        const SizedBox(width: 16),
                                        Icon(Icons.event,
                                            size: 12,
                                            color: expired
                                                ? Colors.red[400]
                                                : Colors.grey[500]),
                                        const SizedBox(width: 4),
                                        Text(
                                          'Validade: ${cert.formattedExpirationDate}',
                                          style: TextStyle(
                                            color: expired
                                                ? Colors.red[400]
                                                : Colors.grey[500],
                                            fontSize: 11,
                                            fontWeight: expired
                                                ? FontWeight.w600
                                                : FontWeight.w400,
                                          ),
                                        ),
                                      ],
                                    ),
                                    // Warning text
                                    if (expired)
                                      Padding(
                                        padding:
                                            const EdgeInsets.only(
                                                top: 6),
                                        child: Row(
                                          children: [
                                            Icon(Icons.error_outline,
                                                size: 14,
                                                color:
                                                    Colors.red[400]),
                                            const SizedBox(
                                                width: 4),
                                            Text(
                                              'Certificação vencida',
                                              style: TextStyle(
                                                color:
                                                    Colors.red[400],
                                                fontSize: 11,
                                                fontWeight:
                                                    FontWeight.w600,
                                              ),
                                            ),
                                          ],
                                        ),
                                      )
                                    else if (expiring)
                                      Padding(
                                        padding:
                                            const EdgeInsets.only(
                                                top: 6),
                                        child: Row(
                                          children: [
                                            Icon(
                                                Icons.warning_amber,
                                                size: 14,
                                                color: Colors
                                                    .orange[400]),
                                            const SizedBox(
                                                width: 4),
                                            Text(
                                              'Vence em breve',
                                              style: TextStyle(
                                                color: Colors
                                                    .orange[400],
                                                fontSize: 11,
                                                fontWeight:
                                                    FontWeight.w600,
                                              ),
                                            ),
                                          ],
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
