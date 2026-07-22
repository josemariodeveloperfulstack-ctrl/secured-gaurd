import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/payroll.dart';
import '../../services/payroll_service.dart';
import '../../providers/auth_provider.dart';

class PayrollScreen extends StatefulWidget {
  const PayrollScreen({super.key});

  @override
  State<PayrollScreen> createState() => _PayrollScreenState();
}

class _PayrollScreenState extends State<PayrollScreen> {
  final PayrollService _service = PayrollService();
  List<Payroll> _payrolls = [];
  bool _isLoading = true;
  String? _error;
  String _selectedStatus = 'TODOS';

  static const _statusOptions = [
    'TODOS',
    'PENDING',
    'PROCESSING',
    'APPROVED',
    'PAID',
    'CANCELLED',
  ];

  static const _statusLabels = {
    'TODOS': 'Todas',
    'PENDING': 'Pendentes',
    'PROCESSING': 'Processando',
    'APPROVED': 'Aprovadas',
    'PAID': 'Pagas',
    'CANCELLED': 'Canceladas',
  };

  @override
  void initState() {
    super.initState();
    _loadPayrolls();
  }

  Future<void> _loadPayrolls() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final user = context.read<AuthProvider>().user;
      final employeeId = user?.id;
      List<Payroll> data;
      if (employeeId != null) {
        data = await _service.getByEmployeeId(employeeId);
      } else {
        data = await _service.getAll();
      }
      if (!mounted) return;
      setState(() {
        _payrolls = data;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Erro ao carregar folhas de pagamento.';
        _isLoading = false;
      });
    }
  }

  List<Payroll> get _filteredPayrolls {
    return _payrolls.where((p) {
      if (_selectedStatus != 'TODOS' &&
          p.status.toUpperCase() != _selectedStatus) {
        return false;
      }
      return true;
    }).toList()
      ..sort((a, b) {
        if (a.referenceMonth == null && b.referenceMonth == null) return 0;
        if (a.referenceMonth == null) return 1;
        if (b.referenceMonth == null) return -1;
        return b.referenceMonth!.compareTo(a.referenceMonth!);
      });
  }

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return Colors.orange;
      case 'PROCESSING':
        return Colors.blue;
      case 'APPROVED':
        return Colors.teal;
      case 'PAID':
        return Colors.green;
      case 'CANCELLED':
        return Colors.red;
      case 'REOPENED':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredPayrolls;
    final totalNet = _payrolls.fold<double>(
        0, (sum, p) => sum + p.netSalary);
    final totalGross = _payrolls.fold<double>(
        0, (sum, p) => sum + p.grossSalary);
    final paid = _payrolls
        .where((p) => p.status.toUpperCase() == 'PAID')
        .length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Folha de Pagamento'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isLoading ? null : _loadPayrolls,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadPayrolls,
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
                            icon: Icons.receipt_long,
                            label: 'Total',
                            value: '${_payrolls.length}',
                            color: Colors.blue,
                          ),
                          const SizedBox(width: 8),
                          _StatCard(
                            icon: Icons.monetization_on,
                            label: 'Bruto',
                            value: 'R\$ ${totalGross.toStringAsFixed(0)}',
                            color: Colors.amber,
                          ),
                          const SizedBox(width: 8),
                          _StatCard(
                            icon: Icons.account_balance_wallet,
                            label: 'Líquido',
                            value: 'R\$ ${totalNet.toStringAsFixed(0)}',
                            color: Colors.green,
                          ),
                          const SizedBox(width: 8),
                          _StatCard(
                            icon: Icons.check_circle,
                            label: 'Pagas',
                            value: '$paid',
                            color: Colors.teal,
                          ),
                        ],
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
                                  borderRadius:
                                      BorderRadius.circular(20),
                                ),
                                materialTapTargetSize:
                                    MaterialTapTargetSize.shrinkWrap,
                                visualDensity: VisualDensity.compact,
                                padding: const EdgeInsets.symmetric(
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
                                onPressed: _loadPayrolls,
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
                            Icon(Icons.receipt_long_outlined,
                                size: 56, color: Colors.grey[600]),
                            const SizedBox(height: 16),
                            Text(
                              _selectedStatus != 'TODOS'
                                  ? 'Nenhuma folha encontrada'
                                  : 'Nenhuma folha de pagamento',
                              style: TextStyle(
                                  color: Colors.grey[400],
                                  fontSize: 15),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    // Payroll list
                    SliverPadding(
                      padding:
                          const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final payroll = filtered[index];
                            final color =
                                _statusColor(payroll.status);

                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: Padding(
                                padding: const EdgeInsets.all(14),
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    // Header row
                                    Row(
                                      children: [
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
                                            payroll.status
                                                        .toUpperCase() ==
                                                    'PAID'
                                                ? Icons.paid
                                                : payroll.status
                                                            .toUpperCase() ==
                                                        'CANCELLED'
                                                    ? Icons
                                                        .cancel
                                                    : Icons
                                                        .receipt,
                                            color: color,
                                            size: 22,
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment
                                                    .start,
                                            children: [
                                              Text(
                                                payroll
                                                    .displayReferenceMonth,
                                                style:
                                                    const TextStyle(
                                                  fontWeight:
                                                      FontWeight.w600,
                                                  fontSize: 14,
                                                ),
                                              ),
                                              if (payroll
                                                      .employeeName !=
                                                  null)
                                                Text(
                                                  payroll
                                                      .employeeName!,
                                                  style: TextStyle(
                                                    color: Colors
                                                        .grey[500],
                                                    fontSize: 12,
                                                  ),
                                                ),
                                              if (payroll
                                                      .unitName !=
                                                  null)
                                                Text(
                                                  payroll
                                                      .unitName!,
                                                  style: TextStyle(
                                                    color: Colors
                                                        .grey[600],
                                                    fontSize: 11,
                                                  ),
                                                ),
                                            ],
                                          ),
                                        ),
                                        Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.end,
                                          children: [
                                            Container(
                                              padding: const EdgeInsets
                                                      .symmetric(
                                                  horizontal: 8,
                                                  vertical: 4),
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
                                                payroll
                                                    .displayStatus,
                                                style: TextStyle(
                                                  color: color,
                                                  fontSize: 11,
                                                  fontWeight:
                                                      FontWeight
                                                          .w600,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 12),
                                    // Salary values
                                    Row(
                                      children: [
                                        Expanded(
                                          child: _ValueItem(
                                            label: 'Salário Bruto',
                                            value:
                                                payroll.formattedGrossSalary,
                                            color: Colors.amber,
                                          ),
                                        ),
                                        Expanded(
                                          child: _ValueItem(
                                            label: 'Líquido',
                                            value:
                                                payroll.formattedNetSalary,
                                            color: Colors.green,
                                          ),
                                        ),
                                        Expanded(
                                          child: _ValueItem(
                                            label: 'Benefícios',
                                            value:
                                                payroll.formattedBenefitsValue,
                                            color: Colors.blue,
                                          ),
                                        ),
                                        Expanded(
                                          child: _ValueItem(
                                            label: 'Descontos',
                                            value:
                                                payroll.formattedDeductionsValue,
                                            color: Colors.red,
                                          ),
                                        ),
                                      ],
                                    ),
                                    // Bottom detail
                                    if (payroll.overtimeHours > 0 ||
                                        payroll.notes != null)
                                      Padding(
                                        padding:
                                            const EdgeInsets.only(
                                                top: 8),
                                        child: Row(
                                          children: [
                                            if (payroll
                                                    .overtimeHours >
                                                0) ...[
                                              Icon(Icons.access_time,
                                                  size: 12,
                                                  color: Colors
                                                      .grey[500]),
                                              const SizedBox(
                                                  width: 4),
                                              Text(
                                                'HE: ${payroll.overtimeHours.toStringAsFixed(1)}h',
                                                style: TextStyle(
                                                  color: Colors
                                                      .grey[500],
                                                  fontSize: 11,
                                                ),
                                              ),
                                            ],
                                            if (payroll
                                                        .overtimeHours >
                                                    0 &&
                                                payroll.notes !=
                                                    null)
                                              const SizedBox(
                                                  width: 16),
                                            if (payroll.notes !=
                                                null)
                                              Expanded(
                                                child: Text(
                                                  payroll.notes!,
                                                  style: TextStyle(
                                                    color: Colors
                                                        .grey[600],
                                                    fontSize: 11,
                                                    fontStyle:
                                                        FontStyle
                                                            .italic,
                                                  ),
                                                  maxLines: 1,
                                                  overflow:
                                                      TextOverflow
                                                          .ellipsis,
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

class _ValueItem extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _ValueItem({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: TextStyle(
            color: color,
            fontWeight: FontWeight.w700,
            fontSize: 13,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            color: Colors.grey[500],
            fontSize: 9,
          ),
        ),
      ],
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
