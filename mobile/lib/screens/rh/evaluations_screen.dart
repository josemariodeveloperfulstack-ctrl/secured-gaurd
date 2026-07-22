import 'package:flutter/material.dart';

class EvaluationsScreen extends StatefulWidget {
  const EvaluationsScreen({super.key});

  @override
  State<EvaluationsScreen> createState() => _EvaluationsScreenState();
}

class _EvaluationsScreenState extends State<EvaluationsScreen> {
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadEvaluations();
  }

  Future<void> _loadEvaluations() async {
    setState(() => _isLoading = true);
    try {
      // Placeholder - substituir quando endpoint /api/performance-evaluations estiver disponível
      if (!mounted) return;
      setState(() => _isLoading = false);
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Avaliações de Desempenho'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isLoading ? null : _loadEvaluations,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadEvaluations,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  // Info banner
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF242438),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                              color: const Color(0xFF2A2A3E)),
                        ),
                        child: Column(
                          children: [
                            Icon(Icons.assignment_turned_in,
                                size: 40,
                                color: Colors.grey[500]),
                            const SizedBox(height: 12),
                            Text(
                              'Avaliações de Desempenho',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(
                                      fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'O módulo de avaliações de desempenho estará disponível em breve. '
                              'Você poderá visualizar suas avaliações mensais, trimestrais e anuais aqui.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: Colors.grey[500],
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Empty state
                  SliverFillRemaining(
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.assignment_outlined,
                              size: 56,
                              color: Colors.grey[600]),
                          const SizedBox(height: 16),
                          Text(
                            'Nenhuma avaliação encontrada',
                            style: TextStyle(
                                color: Colors.grey[400],
                                fontSize: 15),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'As avaliações aparecerão aqui quando o RH as disponibilizar.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
