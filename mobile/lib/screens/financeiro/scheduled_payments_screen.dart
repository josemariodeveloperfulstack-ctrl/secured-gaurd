import 'package:flutter/material.dart';
import '../../models/scheduled_payment.dart';
import '../../services/scheduled_payment_service.dart';

class ScheduledPaymentsScreen extends StatefulWidget {
  const ScheduledPaymentsScreen({super.key});

  @override
  State<ScheduledPaymentsScreen> createState() => _ScheduledPaymentsScreenState();
}

class _ScheduledPaymentsScreenState extends State<ScheduledPaymentsScreen> {
  final ScheduledPaymentService _service = ScheduledPaymentService();
  List<ScheduledPayment> _payments = [];
  bool _isLoading = true;
  String? _error;
  String _selectedStatus = 'TODOS';

  static const _statusOptions = ['TODOS', 'SCHEDULED', 'EXECUTED', 'CANCELLED'];
  static const _statusLabels = {
    'TODOS': 'Todos', 'SCHEDULED': 'Agendados', 'EXECUTED': 'Executados', 'CANCELLED': 'Cancelados',
  };

  @override
  void initState() {
    super.initState();
    _loadPayments();
  }

  Future<void> _loadPayments() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final data = await _service.getAll();
      if (!mounted) return;
      setState(() { _payments = data; _isLoading = false; });
    } catch (e) {
      if (!mounted) return;
      setState(() { _error = 'Erro ao carregar pagamentos.'; _isLoading = false; });
    }
  }

  List<ScheduledPayment> get _filtered {
    return _payments.where((p) {
      if (_selectedStatus == 'TODOS') return true;
      return p.status.toUpperCase() == _selectedStatus;
    }).toList()
      ..sort((a, b) {
        if (a.scheduledDate == null && b.scheduledDate == null) return 0;
        if (a.scheduledDate == null) return 1;
        if (b.scheduledDate == null) return -1;
        return a.scheduledDate!.compareTo(b.scheduledDate!);
      });
  }

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'SCHEDULED': return Colors.blue;
      case 'EXECUTED': return Colors.green;
      case 'CANCELLED': return Colors.grey;
      default: return Colors.grey;
    }
  }
  Color _statusColorFromPayment(ScheduledPayment p) {
    if (p.isOverdue) return Colors.red;
    return _statusColor(p.status);
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;
    final totalAmount = _payments.fold<double>(0, (s, p) => s + p.amount);
    final overdue = _payments.where((p) => p.isOverdue).length;
    final executed = _payments.where((p) => p.status.toUpperCase() == 'EXECUTED').length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pagamentos Agendados'),
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _isLoading ? null : _loadPayments)],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadPayments,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  SliverToBoxAdapter(child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                    child: Row(children: [
                      _StatCard(icon: Icons.calendar_month, label: 'Total', value: '${_payments.length}', color: Colors.blue),
                      const SizedBox(width: 8),
                      _StatCard(icon: Icons.attach_money, label: 'Valor Total', value: 'R\$${totalAmount.toStringAsFixed(0)}', color: Colors.amber),
                      const SizedBox(width: 8),
                      _StatCard(icon: Icons.warning, label: 'Vencidos', value: '$overdue', color: Colors.red),
                      const SizedBox(width: 8),
                      _StatCard(icon: Icons.check_circle, label: 'Executados', value: '$executed', color: Colors.green),
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
                          TextButton(onPressed: _loadPayments, child: const Text('Tentar')),
                        ]),
                      ),
                    )),
                  if (filtered.isEmpty)
                    SliverFillRemaining(child: Center(
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.event_busy, size: 56, color: Colors.grey[600]),
                        const SizedBox(height: 16),
                        Text(_selectedStatus != 'TODOS' ? 'Nenhum pagamento encontrado' : 'Nenhum pagamento agendado', style: TextStyle(color: Colors.grey[400], fontSize: 15)),
                      ]),
                    ))
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate((context, index) {
                          final pmt = filtered[index];
                          final color = _statusColorFromPayment(pmt);
                          final isOverdue = pmt.isOverdue;

                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Row(children: [
                                  Container(
                                    width: 44, height: 44,
                                    decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(10)),
                                    child: Icon(
                                      isOverdue ? Icons.warning_amber : pmt.status.toUpperCase() == 'EXECUTED' ? Icons.check_circle : Icons.event,
                                      color: color, size: 22,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text(pmt.clientName ?? 'Cliente', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14), maxLines: 1, overflow: TextOverflow.ellipsis),
                                    if (pmt.description != null) Text(pmt.description!, style: TextStyle(color: Colors.grey[500], fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
                                  ])),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(8), border: Border.all(color: color.withAlpha(60))),
                                    child: Text(pmt.displayStatus, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
                                  ),
                                ]),
                                const SizedBox(height: 10),
                                Row(children: [
                                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text(pmt.formattedAmount, style: TextStyle(color: Colors.green[400], fontWeight: FontWeight.w700, fontSize: 16)),
                                    Text('Valor', style: TextStyle(color: Colors.grey[500], fontSize: 9)),
                                  ])),
                                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text(pmt.formattedScheduledDate, style: TextStyle(color: isOverdue ? Colors.red[400] : Colors.grey[300], fontWeight: FontWeight.w600, fontSize: 13)),
                                    Text('Agendamento', style: TextStyle(color: Colors.grey[500], fontSize: 9)),
                                  ])),
                                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text(pmt.displayPaymentMethod, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                    Text('Pagamento', style: TextStyle(color: Colors.grey[500], fontSize: 9)),
                                  ])),
                                ]),
                                if (isOverdue) Padding(
                                  padding: const EdgeInsets.only(top: 4),
                                  child: Row(children: [
                                    Icon(Icons.error_outline, size: 14, color: Colors.red[400]),
                                    const SizedBox(width: 4),
                                    Text('Pagamento em atraso', style: TextStyle(color: Colors.red[400], fontSize: 11, fontWeight: FontWeight.w600)),
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
