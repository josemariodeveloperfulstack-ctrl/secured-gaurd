import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/benefit.dart';
import '../../services/benefit_service.dart';
import '../../providers/auth_provider.dart';

class BenefitsScreen extends StatefulWidget {
  const BenefitsScreen({super.key});

  @override
  State<BenefitsScreen> createState() => _BenefitsScreenState();
}

class _BenefitsScreenState extends State<BenefitsScreen> {
  final BenefitService _service = BenefitService();
  List<EmployeeBenefit> _benefits = [];
  bool _isLoading = true;
  String? _error;
  String _selectedFilter = 'TODOS';

  @override
  void initState() {
    super.initState();
    _loadBenefits();
  }

  Future<void> _loadBenefits() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final user = context.read<AuthProvider>().user;
      final employeeId = user?.id;
      List<EmployeeBenefit> data;
      if (employeeId != null) {
        data = await _service.getByEmployeeId(employeeId);
      } else {
        data = await _service.getAll();
      }
      if (!mounted) return;
      setState(() {
        _benefits = data;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Erro ao carregar benefícios.';
        _isLoading = false;
      });
    }
  }

  List<EmployeeBenefit> get _filteredBenefits {
    return _benefits.where((b) {
      if (_selectedFilter == 'ATIVOS' && !b.isActive) return false;
      if (_selectedFilter == 'INATIVOS' && b.isActive) return false;
      return true;
    }).toList()
      ..sort((a, b) {
        if (a.startDate == null && b.startDate == null) return 0;
        if (a.startDate == null) return 1;
        if (b.startDate == null) return -1;
        return b.startDate!.compareTo(a.startDate!);
      });
  }

  IconData _benefitIcon(String? type) {
    switch (type?.toUpperCase()) {
      case 'TRANSPORT':
        return Icons.directions_bus;
      case 'MEAL':
      case 'FOOD':
        return Icons.restaurant;
      case 'HEALTH':
        return Icons.local_hospital;
      case 'DENTAL':
        return Icons.face;
      case 'LIFE_INSURANCE':
        return Icons.verified_user;
      case 'EDUCATION':
        return Icons.school;
      default:
        return Icons.card_giftcard;
    }
  }

  Color _benefitColor(String? type) {
    switch (type?.toUpperCase()) {
      case 'TRANSPORT':
        return Colors.amber;
      case 'MEAL':
      case 'FOOD':
        return Colors.orange;
      case 'HEALTH':
        return Colors.blue;
      case 'DENTAL':
        return Colors.teal;
      case 'LIFE_INSURANCE':
        return Colors.purple;
      case 'EDUCATION':
        return Colors.indigo;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredBenefits;
    final activeCount =
        _benefits.where((b) => b.isActive).length;
    final totalValue =
        _benefits.fold<double>(0, (sum, b) => sum + b.value);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Benefícios'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isLoading ? null : _loadBenefits,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadBenefits,
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
                            icon: Icons.card_giftcard,
                            label: 'Total',
                            value: '${_benefits.length}',
                            color: Colors.blue,
                          ),
                          const SizedBox(width: 8),
                          _StatCard(
                            icon: Icons.check_circle,
                            label: 'Ativos',
                            value: '$activeCount',
                            color: Colors.green,
                          ),
                          const SizedBox(width: 8),
                          _StatCard(
                            icon: Icons.attach_money,
                            label: 'Valor Total',
                            value:
                                'R\$ ${totalValue.toStringAsFixed(0)}',
                            color: Colors.amber,
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Filter chips
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                      child: Row(
                        children: [
                          _buildChip('TODOS', 'Todos', Colors.blue),
                          const SizedBox(width: 6),
                          _buildChip(
                              'ATIVOS', 'Ativos', Colors.green),
                          const SizedBox(width: 6),
                          _buildChip('INATIVOS', 'Inativos',
                              Colors.grey),
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
                                onPressed: _loadBenefits,
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
                            Icon(Icons.card_giftcard_outlined,
                                size: 56,
                                color: Colors.grey[600]),
                            const SizedBox(height: 16),
                            Text(
                              _selectedFilter != 'TODOS'
                                  ? 'Nenhum benefício encontrado'
                                  : 'Nenhum benefício cadastrado',
                              style: TextStyle(
                                  color: Colors.grey[400],
                                  fontSize: 15),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    // Benefit list
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(
                          16, 0, 16, 16),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final benefit = filtered[index];
                            final icon =
                                _benefitIcon(benefit.type);
                            final color =
                                _benefitColor(benefit.type);
                            final opacity = benefit.isActive
                                ? 1.0
                                : 0.5;

                            return Opacity(
                              opacity: opacity,
                              child: Card(
                                margin:
                                    const EdgeInsets.only(
                                        bottom: 8),
                                child: Padding(
                                  padding:
                                      const EdgeInsets.all(14),
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 44,
                                        height: 44,
                                        decoration:
                                            BoxDecoration(
                                          color: color
                                              .withAlpha(25),
                                          borderRadius:
                                              BorderRadius
                                                  .circular(
                                                      10),
                                        ),
                                        child: Icon(
                                          icon,
                                          color: color,
                                          size: 22,
                                        ),
                                      ),
                                      const SizedBox(
                                          width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment
                                                  .start,
                                          children: [
                                            Text(
                                              benefit.name,
                                              style: const TextStyle(
                                                fontWeight:
                                                    FontWeight
                                                        .w600,
                                                fontSize: 14,
                                              ),
                                              maxLines: 1,
                                              overflow:
                                                  TextOverflow
                                                      .ellipsis,
                                            ),
                                            const SizedBox(
                                                height: 2),
                                            Text(
                                              benefit
                                                  .displayType,
                                              style: TextStyle(
                                                color: Colors
                                                    .grey[500],
                                                fontSize: 12,
                                              ),
                                            ),
                                            if (benefit
                                                    .description !=
                                                null)
                                              Text(
                                                benefit
                                                    .description!,
                                                style: TextStyle(
                                                  color: Colors
                                                      .grey[600],
                                                  fontSize: 11,
                                                ),
                                                maxLines: 1,
                                                overflow:
                                                    TextOverflow
                                                        .ellipsis,
                                              ),
                                          ],
                                        ),
                                      ),
                                      Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment
                                                .end,
                                        children: [
                                          Text(
                                            benefit
                                                .formattedValue,
                                            style: TextStyle(
                                              color: Colors
                                                  .green[400],
                                              fontWeight:
                                                  FontWeight
                                                      .w700,
                                              fontSize: 14,
                                            ),
                                          ),
                                          const SizedBox(
                                              height: 4),
                                          if (!benefit.isActive)
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
                                                            6),
                                              ),
                                              child: Text(
                                                'Inativo',
                                                style: TextStyle(
                                                  color: Colors
                                                      .grey[500],
                                                  fontSize: 9,
                                                  fontWeight:
                                                      FontWeight
                                                          .w600,
                                                ),
                                              ),
                                            ),
                                          if (benefit
                                                  .startDate !=
                                              null)
                                            Padding(
                                              padding:
                                                  const EdgeInsets
                                                      .only(
                                                      top: 2),
                                              child: Text(
                                                'Desde ${benefit.formattedStartDate}',
                                                style: TextStyle(
                                                  color: Colors
                                                      .grey[600],
                                                  fontSize: 9,
                                                ),
                                              ),
                                            ),
                                        ],
                                      ),
                                    ],
                                  ),
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

  Widget _buildChip(
      String value, String label, Color color) {
    final isSelected = _selectedFilter == value;
    return FilterChip(
      label: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          color: isSelected ? Colors.black : Colors.grey[300],
          fontWeight:
              isSelected ? FontWeight.w700 : FontWeight.w500,
        ),
      ),
      selected: isSelected,
      onSelected: (_) => setState(() => _selectedFilter = value),
      selectedColor: color.withAlpha(200),
      backgroundColor: const Color(0xFF242438),
      side: BorderSide(
        color: isSelected ? color : const Color(0xFF2A2A3E),
        width: isSelected ? 1.5 : 1,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.compact,
      padding: const EdgeInsets.symmetric(horizontal: 4),
      labelPadding: const EdgeInsets.symmetric(horizontal: 6),
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
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(value,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 14)),
            ),
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
