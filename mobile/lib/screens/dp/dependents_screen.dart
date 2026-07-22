import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/dependent_model.dart';
import '../../services/dependent_service.dart';
import '../../providers/auth_provider.dart';

class DependentsScreen extends StatefulWidget {
  const DependentsScreen({super.key});

  @override
  State<DependentsScreen> createState() => _DependentsScreenState();
}

class _DependentsScreenState extends State<DependentsScreen> {
  final DependentService _service = DependentService();
  List<EmployeeDependent> _dependents = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadDependents();
  }

  Future<void> _loadDependents() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final user = context.read<AuthProvider>().user;
      final employeeId = user?.id;
      List<EmployeeDependent> data;
      if (employeeId != null) {
        data = await _service.getByEmployeeId(employeeId);
      } else {
        data = await _service.getAll();
      }
      if (!mounted) return;
      setState(() {
        _dependents = data;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Erro ao carregar dependentes.';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dependentes'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isLoading ? null : _loadDependents,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadDependents,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  // Stats summary
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                      child: Row(
                        children: [
                          _StatCard(
                            icon: Icons.people,
                            label: 'Total',
                            value: '${_dependents.length}',
                            color: Colors.blue,
                          ),
                          const SizedBox(width: 8),
                          _StatCard(
                            icon: Icons.school,
                            label: 'Estudantes',
                            value:
                                '${_dependents.where((d) => d.isStudent).length}',
                            color: Colors.indigo,
                          ),
                          const SizedBox(width: 8),
                          _StatCard(
                            icon: Icons.favorite,
                            label: 'Beneficiários',
                            value:
                                '${_dependents.where((d) => d.isBeneficiary).length}',
                            color: Colors.pink,
                          ),
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
                                onPressed: _loadDependents,
                                child: const Text('Tentar'),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

                  // Empty state
                  if (_dependents.isEmpty)
                    SliverFillRemaining(
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.people_outline,
                                size: 56,
                                color: Colors.grey[600]),
                            const SizedBox(height: 16),
                            Text(
                              'Nenhum dependente cadastrado',
                              style: TextStyle(
                                  color: Colors.grey[400],
                                  fontSize: 15),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Você pode cadastrar dependentes para benefícios como plano de saúde e vale alimentação.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                  color: Colors.grey[600],
                                  fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    // Dependent list
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(
                          16, 0, 16, 16),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final dep = _dependents[index];

                            return Card(
                              margin:
                                  const EdgeInsets.only(bottom: 8),
                              child: Padding(
                                padding:
                                    const EdgeInsets.all(14),
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    // Header
                                    Row(
                                      children: [
                                        CircleAvatar(
                                          radius: 22,
                                          backgroundColor: dep
                                                  .isBeneficiary
                                              ? Colors
                                                  .pink
                                                  .withAlpha(20)
                                              : Colors
                                                  .blue
                                                  .withAlpha(20),
                                          child: Text(
                                            dep.name
                                                .isNotEmpty
                                                ? dep.name[0]
                                                    .toUpperCase()
                                                : '?',
                                            style: TextStyle(
                                              fontSize: 18,
                                              fontWeight:
                                                  FontWeight
                                                      .w700,
                                              color: dep
                                                      .isBeneficiary
                                                  ? Colors
                                                      .pink
                                                  : Colors
                                                      .blue,
                                            ),
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
                                                dep.name,
                                                style:
                                                    const TextStyle(
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
                                                dep
                                                    .displayRelationship,
                                                style: TextStyle(
                                                  color: Colors
                                                      .grey[500],
                                                  fontSize: 12,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        Row(
                                          mainAxisSize:
                                              MainAxisSize.min,
                                          children: [
                                            if (dep
                                                    .isStudent)
                                              _Tag(
                                                label:
                                                    'Estudante',
                                                color: Colors
                                                    .indigo,
                                              ),
                                            if (dep
                                                    .isBeneficiary)
                                              const SizedBox(
                                                  width: 4),
                                            if (dep
                                                    .isBeneficiary)
                                              _Tag(
                                                label:
                                                    'Benef.',
                                                color: Colors
                                                    .pink,
                                              ),
                                          ],
                                        ),
                                      ],
                                    ),
                                    const SizedBox(
                                        height: 10),
                                    // Details
                                    Row(
                                      children: [
                                        Icon(
                                            Icons.calendar_today,
                                            size: 12,
                                            color: Colors
                                                .grey[500]),
                                        const SizedBox(
                                            width: 4),
                                        Text(
                                          'Nasc: ${dep.formattedBirthDate}',
                                          style: TextStyle(
                                            color: Colors
                                                .grey[500],
                                            fontSize: 11,
                                          ),
                                        ),
                                        if (dep.cpf != null) ...[
                                          const SizedBox(
                                              width: 16),
                                          Icon(Icons.badge,
                                              size: 12,
                                              color: Colors
                                                  .grey[500]),
                                          const SizedBox(
                                              width: 4),
                                          Text(
                                            dep.formattedCpf,
                                            style: TextStyle(
                                              color: Colors
                                                  .grey[500],
                                              fontSize: 11,
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                    if (dep.gender != null ||
                                        dep.phone != null)
                                      Padding(
                                        padding:
                                            const EdgeInsets.only(
                                                top: 4),
                                        child: Row(
                                          children: [
                                            if (dep.gender !=
                                                null) ...[
                                              Icon(Icons.person,
                                                  size: 12,
                                                  color: Colors
                                                      .grey[500]),
                                              const SizedBox(
                                                  width: 4),
                                              Text(
                                                dep
                                                    .displayGender,
                                                style: TextStyle(
                                                  color: Colors
                                                      .grey[500],
                                                  fontSize: 11,
                                                ),
                                              ),
                                            ],
                                            if (dep.phone !=
                                                null) ...[
                                              const SizedBox(
                                                  width: 16),
                                              Icon(
                                                  Icons.phone,
                                                  size: 12,
                                                  color: Colors
                                                      .grey[500]),
                                              const SizedBox(
                                                  width: 4),
                                              Text(
                                                dep.phone!,
                                                style: TextStyle(
                                                  color: Colors
                                                      .grey[500],
                                                  fontSize: 11,
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            );
                          },
                          childCount: _dependents.length,
                        ),
                      ),
                    ),
                ],
              ),
            ),
    );
  }
}

class _Tag extends StatelessWidget {
  final String label;
  final Color color;

  const _Tag({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding:
          const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withAlpha(20),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 9,
          fontWeight: FontWeight.w600,
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
