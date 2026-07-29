import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/epi.dart';
import '../../services/epi_service.dart';
import '../../providers/auth_provider.dart';

class EpisScreen extends StatefulWidget {
  const EpisScreen({super.key});

  @override
  State<EpisScreen> createState() => _EpisScreenState();
}

class _EpisScreenState extends State<EpisScreen> {
  final EpiService _epiService = EpiService();
  List<EmployeeEPI> _epis = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadEpis();
  }

  Future<void> _loadEpis() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final user = context.read<AuthProvider>().user;
      final employeeId = user?.employeeId ?? user?.id;
      if (employeeId == null) {
        setState(() { _epis = []; _isLoading = false; });
        return;
      }
      final epis = await _epiService.getEmployeeEpis(employeeId);
      if (!mounted) return;
      setState(() { _epis = epis; _isLoading = false; });
    } catch (e) {
      if (!mounted) return;
      setState(() { _error = 'Erro ao carregar EPIs.'; _isLoading = false; });
    }
  }

  Color _statusColor(EPIStatus status) {
    switch (status) {
      case EPIStatus.issued: return Colors.green;
      case EPIStatus.returned: return Colors.blue;
      case EPIStatus.expired: return Colors.red;
      case EPIStatus.lost: return Colors.orange;
      case EPIStatus.damaged: return Colors.red;
    }
  }

  IconData _statusIcon(EPIStatus status) {
    switch (status) {
      case EPIStatus.issued: return Icons.check_circle;
      case EPIStatus.returned: return Icons.swap_horiz;
      case EPIStatus.expired: return Icons.warning;
      case EPIStatus.lost: return Icons.search_off;
      case EPIStatus.damaged: return Icons.error_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    final activeCount = _epis.where((e) => e.status == EPIStatus.issued && !e.isExpired).length;
    final expiredCount = _epis.where((e) => e.isExpired || e.status == EPIStatus.expired).length;

    return Scaffold(
      appBar: AppBar(title: const Text('Meus EPIs'), actions: [
        IconButton(icon: const Icon(Icons.refresh), onPressed: _isLoading ? null : _loadEpis),
      ]),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadEpis,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  SliverToBoxAdapter(child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(children: [
                      _StatCard(icon: Icons.shield, label: 'Em Uso', value: '$activeCount', color: Colors.green),
                      const SizedBox(width: 12),
                      _StatCard(icon: Icons.warning, label: 'Vencidos', value: '$expiredCount', color: Colors.red),
                      const SizedBox(width: 12),
                      _StatCard(icon: Icons.inventory_2, label: 'Total', value: '${_epis.length}', color: Colors.blue),
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
                          TextButton(onPressed: _loadEpis, child: const Text('Tentar')),
                        ]),
                      ),
                    )),
                  if (_epis.isEmpty)
                    SliverFillRemaining(child: Center(
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.inventory_2_outlined, size: 56, color: Colors.grey[600]),
                        const SizedBox(height: 16),
                        Text('Nenhum EPI encontrado', style: TextStyle(color: Colors.grey[400], fontSize: 15)),
                      ]),
                    ))
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate((context, index) {
                          final epi = _epis[index];
                          final color = _statusColor(epi.status);
                          final isExpired = epi.isExpired;

                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Row(children: [
                                Container(
                                  width: 48, height: 48,
                                  decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(12)),
                                  child: Icon(_statusIcon(epi.status), color: color, size: 24),
                                ),
                                const SizedBox(width: 14),
                                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text(epi.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                                  if (epi.description != null)
                                    Text(epi.description!, style: TextStyle(color: Colors.grey[500], fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
                                  const SizedBox(height: 4),
                                  Row(children: [
                                    Icon(Icons.calendar_today, size: 12, color: Colors.grey[600]),
                                    const SizedBox(width: 4),
                                    Text('Entrega: ${epi.formattedIssueDate}', style: TextStyle(color: Colors.grey[500], fontSize: 11)),
                                    const SizedBox(width: 12),
                                    Icon(Icons.event, size: 12, color: isExpired ? Colors.red : Colors.grey[600]),
                                    const SizedBox(width: 4),
                                    Text('Validade: ${epi.formattedExpirationDate}', style: TextStyle(color: isExpired ? Colors.red : Colors.grey[500], fontSize: 11, fontWeight: isExpired ? FontWeight.w600 : FontWeight.normal)),
                                  ]),
                                ])),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(8), border: Border.all(color: color.withAlpha(60))),
                                  child: Text(isExpired ? 'Vencido' : epi.displayStatus, style: TextStyle(color: isExpired ? Colors.red : color, fontSize: 11, fontWeight: FontWeight.w600)),
                                ),
                              ]),
                            ),
                          );
                        }, childCount: _epis.length),
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
  const _StatCard({required this.icon, required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: const Color(0xFF242438), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF2A2A3E))),
        child: Column(children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 6),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          Text(label, style: TextStyle(color: Colors.grey[500], fontSize: 11), textAlign: TextAlign.center),
        ]),
      ),
    );
  }
}
