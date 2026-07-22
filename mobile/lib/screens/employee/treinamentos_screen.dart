import 'package:flutter/material.dart';
import '../../models/training.dart';
import '../../services/training_service.dart';

class TreinamentosScreen extends StatefulWidget {
  const TreinamentosScreen({super.key});

  @override
  State<TreinamentosScreen> createState() => _TreinamentosScreenState();
}

class _TreinamentosScreenState extends State<TreinamentosScreen> {
  final TrainingService _trainingService = TrainingService();
  List<EmployeeTraining> _trainings = [];
  bool _isLoading = true;
  String? _error;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadTrainings();
  }

  Future<void> _loadTrainings() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final trainings = await _trainingService.getAllTrainings();
      if (!mounted) return;
      setState(() { _trainings = trainings; _isLoading = false; });
    } catch (e) {
      if (!mounted) return;
      setState(() { _error = 'Erro ao carregar treinamentos.'; _isLoading = false; });
    }
  }

  List<EmployeeTraining> get _filtered {
    if (_searchQuery.isEmpty) return _trainings;
    final q = _searchQuery.toLowerCase();
    return _trainings.where((t) =>
      t.name.toLowerCase().contains(q) ||
      (t.description?.toLowerCase().contains(q) ?? false) ||
      (t.provider?.toLowerCase().contains(q) ?? false)
    ).toList();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;

    return Scaffold(
      appBar: AppBar(title: const Text('Treinamentos'), actions: [
        IconButton(icon: const Icon(Icons.refresh), onPressed: _isLoading ? null : _loadTrainings),
      ]),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadTrainings,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  SliverToBoxAdapter(child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                    child: TextField(
                      decoration: InputDecoration(
                        hintText: 'Buscar treinamentos...',
                        prefixIcon: const Icon(Icons.search, size: 20),
                        suffixIcon: _searchQuery.isNotEmpty ? IconButton(
                          icon: const Icon(Icons.clear, size: 18),
                          onPressed: () { setState(() => _searchQuery = ''); },
                        ) : null,
                        filled: true, fillColor: const Color(0xFF242438), contentPadding: const EdgeInsets.symmetric(vertical: 12),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF2A2A3E))),
                      ),
                      onChanged: (v) => setState(() => _searchQuery = v),
                    ),
                  )),
                  SliverToBoxAdapter(child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                    child: Text('${filtered.length} treinamento${filtered.length != 1 ? 's' : ''} encontrado${filtered.length != 1 ? 's' : ''}',
                      style: TextStyle(color: Colors.grey[500], fontSize: 13)),
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
                          TextButton(onPressed: _loadTrainings, child: const Text('Tentar')),
                        ]),
                      ),
                    )),
                  if (filtered.isEmpty)
                    SliverFillRemaining(child: Center(
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.school_outlined, size: 56, color: Colors.grey[600]),
                        const SizedBox(height: 16),
                        Text(_searchQuery.isNotEmpty ? 'Nenhum treinamento encontrado' : 'Nenhum treinamento disponível',
                          style: TextStyle(color: Colors.grey[400], fontSize: 15)),
                      ]),
                    ))
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate((context, index) {
                          final t = filtered[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Container(
                                  width: 48, height: 48,
                                  decoration: BoxDecoration(color: Colors.indigo.withAlpha(20), borderRadius: BorderRadius.circular(12)),
                                  child: const Icon(Icons.school, color: Colors.indigo, size: 24),
                                ),
                                const SizedBox(width: 14),
                                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text(t.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                                  if (t.description != null && t.description!.isNotEmpty)
                                    Padding(padding: const EdgeInsets.only(top: 4),
                                      child: Text(t.description!, style: TextStyle(color: Colors.grey[400], fontSize: 12), maxLines: 2, overflow: TextOverflow.ellipsis)),
                                  const SizedBox(height: 8),
                                  Wrap(spacing: 8, runSpacing: 4, children: [
                                    if (t.provider != null)
                                      _tag(Icons.business, t.provider!, Colors.blue),
                                    if (t.duration != null)
                                      _tag(Icons.timer, t.formattedDuration, Colors.orange),
                                    if (t.renewalPeriodMonths != null)
                                      _tag(Icons.replay, t.renewalInfo, Colors.teal),
                                    if (t.mandatoryForGuards == true)
                                      _tag(Icons.verified, 'Obrigatório', Colors.red),
                                  ]),
                                ])),
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

  Widget _tag(IconData icon, String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(color: color.withAlpha(15), borderRadius: BorderRadius.circular(6)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 12, color: color),
        const SizedBox(width: 4),
        Text(text, style: TextStyle(color: color, fontSize: 11)),
      ]),
    );
  }
}
