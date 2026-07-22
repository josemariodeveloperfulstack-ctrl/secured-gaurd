import 'package:flutter/material.dart';
import '../../models/accounts_receivable.dart';
import '../../services/accounts_receivable_service.dart';

class AccountsReceivableScreen extends StatefulWidget {
  const AccountsReceivableScreen({super.key});

  @override
  State<AccountsReceivableScreen> createState() =>
      _AccountsReceivableScreenState();
}

class _AccountsReceivableScreenState extends State<AccountsReceivableScreen> {
  final AccountsReceivableService _service = AccountsReceivableService();
  List<AccountsReceivable> _accounts = [];
  bool _isLoading = true;
  String? _error;
  String _selectedStatus = 'TODOS';

  static const _statusOptions = [
    'TODOS', 'PENDING', 'PAID', 'OVERDUE', 'PARTIALLY_PAID', 'CANCELLED'
  ];
  static const _statusLabels = {
    'TODOS': 'Todas', 'PENDING': 'Pendentes', 'PAID': 'Pagas',
    'OVERDUE': 'Vencidas', 'PARTIALLY_PAID': 'Parcial', 'CANCELLED': 'Canceladas',
  };

  @override
  void initState() {
    super.initState();
    _loadAccounts();
  }

  Future<void> _loadAccounts() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final data = await _service.getAll();
      if (!mounted) return;
      setState(() { _accounts = data; _isLoading = false; });
    } catch (e) {
      if (!mounted) return;
      setState(() { _error = 'Erro ao carregar contas a receber.'; _isLoading = false; });
    }
  }

  List<AccountsReceivable> get _filtered {
    return _accounts.where((a) {
      if (_selectedStatus == 'TODOS') return true;
      if (_selectedStatus == 'OVERDUE') return a.isOverdue;
      return a.status.toUpperCase() == _selectedStatus;
    }).toList()
      ..sort((a, b) {
        if (a.dueDate == null && b.dueDate == null) return 0;
        if (a.dueDate == null) return 1;
        if (b.dueDate == null) return -1;
        return a.dueDate!.compareTo(b.dueDate!);
      });
  }

  Color _statusColor(String status) {
    if (status == 'OVERDUE' || _filtered.any((a) => a.isOverdue && status == 'TODOS')) return Colors.red;
    switch (status.toUpperCase()) {
      case 'PENDING': return Colors.orange;
      case 'PAID': return Colors.green;
      case 'OVERDUE': return Colors.red;
      case 'PARTIALLY_PAID': return Colors.blue;
      case 'CANCELLED': return Colors.grey;
      default: return Colors.grey;
    }
  }

  Color _statusColorFromAccount(AccountsReceivable a) {
    if (a.isOverdue) return Colors.red;
    switch (a.status.toUpperCase()) {
      case 'PENDING': return Colors.orange;
      case 'PAID': return Colors.green;
      case 'OVERDUE': return Colors.red;
      case 'PARTIALLY_PAID': return Colors.blue;
      case 'CANCELLED': return Colors.grey;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;
    final totalAmount = _accounts.fold<double>(0, (s, a) => s + a.amount);
    final pendingAmount = _accounts.fold<double>(0, (s, a) => a.isOverdue ? s + a.pendingAmount : s);
    final paid = _accounts.where((a) => a.status.toUpperCase() == 'PAID').length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Contas a Receber'),
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _isLoading ? null : _loadAccounts)],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadAccounts,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  SliverToBoxAdapter(child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                    child: Row(children: [
                      _StatCard(icon: Icons.receipt, label: 'Total', value: '${_accounts.length}', color: Colors.blue),
                      const SizedBox(width: 8),
                      _StatCard(icon: Icons.attach_money, label: 'Valor Total', value: 'R\$${totalAmount.toStringAsFixed(0)}', color: Colors.amber),
                      const SizedBox(width: 8),
                      _StatCard(icon: Icons.warning, label: 'Vencidas', value: 'R\$${pendingAmount.toStringAsFixed(0)}', color: Colors.red),
                      const SizedBox(width: 8),
                      _StatCard(icon: Icons.check_circle, label: 'Pagas', value: '$paid', color: Colors.green),
                    ]),
                  )),
                  SliverToBoxAdapter(child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                    child: SizedBox(
                      height: 36,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        children: _statusOptions.map((s) {
                          final isSelected = _selectedStatus == s;
                          return Padding(
                            padding: const EdgeInsets.only(right: 6),
                            child: FilterChip(
                              label: Text(_statusLabels[s]!, style: TextStyle(fontSize: 11, color: isSelected ? Colors.black : Colors.grey[300], fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500)),
                              selected: isSelected,
                              onSelected: (_) => setState(() => _selectedStatus = s),
                              selectedColor: _statusColor(s).withAlpha(200),
                              backgroundColor: const Color(0xFF242438),
                              side: BorderSide(color: isSelected ? _statusColor(s) : const Color(0xFF2A2A3E), width: isSelected ? 1.5 : 1),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              visualDensity: VisualDensity.compact,
                              padding: const EdgeInsets.symmetric(horizontal: 4),
                              labelPadding: const EdgeInsets.symmetric(horizontal: 6),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  )),
                  if (_error != null)
                    SliverToBoxAdapter(child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: Colors.red.withAlpha(15), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.red.withAlpha(50))),
                        child: Row(children: [
                          const Icon(Icons.error_outline, color: Colors.red, size: 20),
                          const SizedBox(width: 12),
                          Expanded(child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13))),
                          TextButton(onPressed: _loadAccounts, child: const Text('Tentar')),
                        ]),
                      ),
                    )),
                  if (filtered.isEmpty)
                    SliverFillRemaining(child: Center(
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.receipt_long_outlined, size: 56, color: Colors.grey[600]),
                        const SizedBox(height: 16),
                        Text(_selectedStatus != 'TODOS' ? 'Nenhuma conta encontrada' : 'Nenhuma conta a receber', style: TextStyle(color: Colors.grey[400], fontSize: 15)),
                      ]),
                    ))
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate((context, index) {
                          final acc = filtered[index];
                          final color = _statusColorFromAccount(acc);
                          final isOverdue = acc.isOverdue;

                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Row(children: [
                                  Container(
                                    width: 44, height: 44,
                                    decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(10)),
                                    child: Icon(isOverdue ? Icons.warning_amber : Icons.receipt, color: color, size: 22),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text(acc.clientName ?? 'Cliente', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14), maxLines: 1, overflow: TextOverflow.ellipsis),
                                    if (acc.invoiceNumber != null) Text('Fatura: ${acc.invoiceNumber}', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                                  ])),
                                  Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(8), border: Border.all(color: color.withAlpha(60))),
                                      child: Text(acc.displayStatus, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
                                    ),
                                  ]),
                                ]),
                                const SizedBox(height: 10),
                                Row(children: [
                                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text(acc.formattedAmount, style: TextStyle(color: Colors.green[400], fontWeight: FontWeight.w700, fontSize: 16)),
                                    Text('Valor', style: TextStyle(color: Colors.grey[500], fontSize: 9)),
                                  ])),
                                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text(acc.formattedPendingAmount, style: TextStyle(color: Colors.amber, fontWeight: FontWeight.w600, fontSize: 14)),
                                    Text('Pendente', style: TextStyle(color: Colors.grey[500], fontSize: 9)),
                                  ])),
                                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text(acc.formattedDueDate, style: TextStyle(color: isOverdue ? Colors.red[400] : Colors.grey[300], fontWeight: FontWeight.w600, fontSize: 13)),
                                    Text('Vencimento', style: TextStyle(color: Colors.grey[500], fontSize: 9)),
                                  ])),
                                ]),
                                if (acc.description != null) Padding(
                                  padding: const EdgeInsets.only(top: 6),
                                  child: Text(acc.description!, style: TextStyle(color: Colors.grey[600], fontSize: 11), maxLines: 1, overflow: TextOverflow.ellipsis),
                                ),
                                if (isOverdue) Padding(
                                  padding: const EdgeInsets.only(top: 4),
                                  child: Row(children: [
                                    Icon(Icons.error_outline, size: 14, color: Colors.red[400]),
                                    const SizedBox(width: 4),
                                    Text('${acc.overdueDays} dia(s) em atraso', style: TextStyle(color: Colors.red[400], fontSize: 11, fontWeight: FontWeight.w600)),
                                  ]),
                                ),
                              ]),
                            ),
                          );
                        }, childCount: filtered.length),
                      ),
                    ),
                ],
              ),
            ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon; final String label; final String value; final Color color;
  const _StatCard({required this.icon, required this.label, required this.value, required this.color});
  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: const Color(0xFF242438), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFF2A2A3E))),
        child: Column(children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(height: 4),
          FittedBox(fit: BoxFit.scaleDown, child: Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13))),
          Text(label, style: TextStyle(color: Colors.grey[500], fontSize: 9, fontWeight: FontWeight.w500), textAlign: TextAlign.center),
        ]),
      ),
    );
  }
}
