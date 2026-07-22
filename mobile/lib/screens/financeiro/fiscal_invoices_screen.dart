import 'package:flutter/material.dart';
import '../../models/fiscal_invoice.dart';
import '../../services/fiscal_invoice_service.dart';

class FiscalInvoicesScreen extends StatefulWidget {
  const FiscalInvoicesScreen({super.key});

  @override
  State<FiscalInvoicesScreen> createState() => _FiscalInvoicesScreenState();
}

class _FiscalInvoicesScreenState extends State<FiscalInvoicesScreen> {
  final FiscalInvoiceService _service = FiscalInvoiceService();
  List<FiscalInvoice> _invoices = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadInvoices();
  }

  Future<void> _loadInvoices() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final data = await _service.getByFilters();
      if (!mounted) return;
      setState(() { _invoices = data; _isLoading = false; });
    } catch (e) {
      if (!mounted) return;
      setState(() { _error = 'Erro ao carregar notas fiscais.'; _isLoading = false; });
    }
  }

  IconData _fileIcon(String? fileType) {
    switch (fileType?.toUpperCase()) {
      case 'PDF': return Icons.picture_as_pdf;
      case 'XML': return Icons.code;
      default: return Icons.description;
    }
  }

  Color _fileColor(String? fileType) {
    switch (fileType?.toUpperCase()) {
      case 'PDF': return Colors.red;
      case 'XML': return Colors.blue;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notas Fiscais'),
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _isLoading ? null : _loadInvoices)],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadInvoices,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  SliverToBoxAdapter(child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                    child: Row(children: [
                      _StatCard(icon: Icons.description, label: 'Total', value: '${_invoices.length}', color: Colors.blue),
                      const SizedBox(width: 8),
                      _StatCard(icon: Icons.picture_as_pdf, label: 'PDF', value: '${_invoices.where((i) => i.fileType?.toUpperCase() == 'PDF').length}', color: Colors.red),
                      const SizedBox(width: 8),
                      _StatCard(icon: Icons.code, label: 'XML', value: '${_invoices.where((i) => i.fileType?.toUpperCase() == 'XML').length}', color: Colors.blue),
                    ]),
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
                          TextButton(onPressed: _loadInvoices, child: const Text('Tentar')),
                        ]),
                      ),
                    )),
                  if (_invoices.isEmpty)
                    SliverFillRemaining(child: Center(
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.description_outlined, size: 56, color: Colors.grey[600]),
                        const SizedBox(height: 16),
                        Text('Nenhuma nota fiscal encontrada', style: TextStyle(color: Colors.grey[400], fontSize: 15)),
                        const SizedBox(height: 8),
                        Text('As notas fiscais importadas aparecerão aqui.', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                      ]),
                    ))
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate((context, index) {
                          final inv = _invoices[index];
                          final icon = _fileIcon(inv.fileType);
                          final color = _fileColor(inv.fileType);

                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Row(children: [
                                Container(
                                  width: 44, height: 44,
                                  decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(10)),
                                  child: Icon(icon, color: color, size: 24),
                                ),
                                const SizedBox(width: 12),
                                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text(inv.clientName ?? '--', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14), maxLines: 1, overflow: TextOverflow.ellipsis),
                                  const SizedBox(height: 2),
                                  Row(children: [
                                    Text(inv.displayPeriod, style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                                    const SizedBox(width: 12),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(4)),
                                      child: Text(inv.fileType ?? '--', style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600)),
                                    ),
                                  ]),
                                ])),
                                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                                  Text(inv.formattedFileSize, style: TextStyle(color: Colors.grey[500], fontSize: 11)),
                                  const SizedBox(height: 4),
                                  Text(inv.formattedCreatedAt, style: TextStyle(color: Colors.grey[600], fontSize: 10)),
                                ]),
                              ]),
                            ),
                          );
                        }, childCount: _invoices.length),
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
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          Text(label, style: TextStyle(color: Colors.grey[500], fontSize: 9, fontWeight: FontWeight.w500), textAlign: TextAlign.center),
        ]),
      ),
    );
  }
}
