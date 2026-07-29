import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/ronda.dart';
import '../../services/ronda_service.dart';
import '../../providers/auth_provider.dart';

class PlantoesScreen extends StatefulWidget {
  const PlantoesScreen({super.key});

  @override
  State<PlantoesScreen> createState() => _PlantoesScreenState();
}

class _PlantoesScreenState extends State<PlantoesScreen> {
  final RondaService _rondaService = RondaService();
  List<Plantao> _plantoes = [];
  bool _isLoading = true;
  String? _error;
  String _selectedFilter = 'TODAS';

  @override
  void initState() {
    super.initState();
    _loadPlantoes();
  }

  Future<void> _loadPlantoes() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final user = context.read<AuthProvider>().user;
      final employeeId = user?.employeeId ?? user?.id;
      if (employeeId == null) {
        setState(() { _plantoes = []; _isLoading = false; });
        return;
      }
      final plantoes = await _rondaService.getEmployeeRondas(employeeId);
      if (!mounted) return;
      setState(() { _plantoes = plantoes; _isLoading = false; });
    } catch (e) {
      if (!mounted) return;
      setState(() { _error = 'Erro ao carregar plantões.'; _isLoading = false; });
    }
  }

  List<Plantao> get _filteredPlantoes {
    if (_selectedFilter == 'TODAS') return _plantoes;
    return _plantoes.where((p) => p.status.toUpperCase() == _selectedFilter).toList();
  }

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'AGENDADA': return Colors.blue;
      case 'EM_ANDAMENTO': return Colors.orange;
      case 'CONCLUIDA':
      case 'COMPLETED': return Colors.green;
      case 'CANCELADA':
      case 'CANCELLED': return Colors.red;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredPlantoes;
    final emAndamento = _plantoes.where((p) => p.status.toUpperCase() == 'EM_ANDAMENTO').length;
    final concluidas = _plantoes.where((p) => p.status.toUpperCase() == 'CONCLUIDA' || p.status.toUpperCase() == 'COMPLETED').length;

    final filters = ['TODAS', 'AGENDADA', 'EM_ANDAMENTO', 'CONCLUIDA'];
    final filterLabels = {'TODAS': 'Todas', 'AGENDADA': 'Agendadas', 'EM_ANDAMENTO': 'Andamento', 'CONCLUIDA': 'Concluídas'};

    return Scaffold(
      appBar: AppBar(title: const Text('Plantões'), actions: [
        IconButton(icon: const Icon(Icons.refresh), onPressed: _isLoading ? null : _loadPlantoes),
      ]),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadPlantoes,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  SliverToBoxAdapter(child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(children: [
                      _StatCard(icon: Icons.list, label: 'Total', value: '${_plantoes.length}', color: Colors.blue),
                      const SizedBox(width: 12),
                      _StatCard(icon: Icons.play_circle, label: 'Andamento', value: '$emAndamento', color: Colors.orange),
                      const SizedBox(width: 12),
                      _StatCard(icon: Icons.check_circle, label: 'Concluídas', value: '$concluidas', color: Colors.green),
                    ]),
                  )),
                  SliverToBoxAdapter(child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(children: filters.map((f) {
                        final isSelected = _selectedFilter == f;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: FilterChip(
                            label: Text(filterLabels[f]!, style: TextStyle(fontSize: 12, color: isSelected ? Colors.black : Colors.grey[300], fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500)),
                            selected: isSelected,
                            onSelected: (_) => setState(() => _selectedFilter = f),
                            selectedColor: _statusColor(f),
                            backgroundColor: const Color(0xFF242438),
                            side: BorderSide(color: isSelected ? _statusColor(f) : const Color(0xFF2A2A3E), width: isSelected ? 1.5 : 1),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                          ),
                        );
                      }).toList()),
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
                          TextButton(onPressed: _loadPlantoes, child: const Text('Tentar')),
                        ]),
                      ),
                    )),
                  if (filtered.isEmpty)
                    SliverFillRemaining(child: Center(
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.event_busy, size: 56, color: Colors.grey[600]),
                        const SizedBox(height: 16),
                        Text('Nenhum plantão encontrado', style: TextStyle(color: Colors.grey[400], fontSize: 15)),
                      ]),
                    ))
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate((context, index) {
                          final p = filtered[index];
                          final color = _statusColor(p.status);
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Row(children: [
                                Container(
                                  width: 52,
                                  padding: const EdgeInsets.symmetric(vertical: 6),
                                  decoration: BoxDecoration(color: color.withAlpha(15), borderRadius: BorderRadius.circular(10)),
                                  child: Column(children: [
                                    Text(p.formattedTime, style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.w700)),
                                    const SizedBox(height: 2),
                                    Text(p.formattedEndTime, style: TextStyle(color: color.withAlpha(180), fontSize: 11)),
                                  ]),
                                ),
                                const SizedBox(width: 14),
                                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text(p.nome, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                                  const SizedBox(height: 2),
                                  Text(p.formattedDate, style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                                  if (p.localNome != null) Text(p.localNome!, style: TextStyle(color: Colors.grey[600], fontSize: 11), maxLines: 1, overflow: TextOverflow.ellipsis),
                                  if (p.tipoLabel != '--') Row(children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(color: Colors.grey.withAlpha(20), borderRadius: BorderRadius.circular(4)),
                                      child: Text(p.tipoLabel, style: TextStyle(color: Colors.grey[500], fontSize: 10)),
                                    ),
                                  ]),
                                ])),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(8), border: Border.all(color: color.withAlpha(60))),
                                  child: Text(p.displayStatus, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
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
