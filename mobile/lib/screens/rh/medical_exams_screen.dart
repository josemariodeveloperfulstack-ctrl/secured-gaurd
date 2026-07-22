import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/medical_exam.dart';
import '../../services/medical_exam_service.dart';
import '../../providers/auth_provider.dart';

class MedicalExamsScreen extends StatefulWidget {
  const MedicalExamsScreen({super.key});

  @override
  State<MedicalExamsScreen> createState() => _MedicalExamsScreenState();
}

class _MedicalExamsScreenState extends State<MedicalExamsScreen> {
  final MedicalExamService _service = MedicalExamService();
  List<MedicalExam> _exams = [];
  bool _isLoading = true;
  String? _error;

  String _selectedStatus = 'TODOS';
  String _searchQuery = '';

  static const _statusOptions = [
    'TODOS',
    'PENDENTE',
    'REALIZADO',
    'ATRASADO',
    'CANCELADO',
  ];

  static const _statusLabels = {
    'TODOS': 'Todos',
    'PENDENTE': 'Pendentes',
    'REALIZADO': 'Realizados',
    'ATRASADO': 'Atrasados',
    'CANCELADO': 'Cancelados',
  };

  @override
  void initState() {
    super.initState();
    _loadExams();
  }

  Future<void> _loadExams() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final user = context.read<AuthProvider>().user;
      final employeeId = user?.id;

      List<MedicalExam> data;
      if (employeeId != null) {
        data = await _service.getByEmployeeId(employeeId);
      } else {
        data = await _service.getAll();
      }
      if (!mounted) return;
      setState(() {
        _exams = data;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Erro ao carregar exames médicos.';
        _isLoading = false;
      });
    }
  }

  List<MedicalExam> get _filteredExams {
    return _exams.where((e) {
      if (_selectedStatus != 'TODOS' &&
          e.status.toUpperCase() != _selectedStatus) {
        return false;
      }
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        final matchType =
            (e.examTypeName ?? '').toLowerCase().contains(query);
        final matchDoctor =
            (e.doctorName ?? '').toLowerCase().contains(query);
        final matchClinic =
            (e.clinicName ?? '').toLowerCase().contains(query);
        if (!matchType && !matchDoctor && !matchClinic) {
          return false;
        }
      }
      return true;
    }).toList()
      ..sort((a, b) {
        if (a.scheduledDate == null && b.scheduledDate == null) return 0;
        if (a.scheduledDate == null) return 1;
        if (b.scheduledDate == null) return -1;
        return b.scheduledDate!.compareTo(a.scheduledDate!);
      });
  }

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'PENDENTE':
        return Colors.orange;
      case 'REALIZADO':
        return Colors.green;
      case 'ATRASADO':
        return Colors.red;
      case 'CANCELADO':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  Color _resultColor(String? result) {
    switch (result?.toUpperCase()) {
      case 'APTO':
        return Colors.green;
      case 'INAPTO':
        return Colors.red;
      case 'APTO_COM_RESTRICOES':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredExams;
    final pendentes =
        _exams.where((e) => e.status.toUpperCase() == 'PENDENTE').length;
    final realizados =
        _exams.where((e) => e.status.toUpperCase() == 'REALIZADO').length;
    final atrasados =
        _exams.where((e) => e.status.toUpperCase() == 'ATRASADO').length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Exames Médicos'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isLoading ? null : _loadExams,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadExams,
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
                            icon: Icons.medical_services,
                            label: 'Total',
                            value: '${_exams.length}',
                            color: Colors.blue,
                          ),
                          const SizedBox(width: 8),
                          _StatCard(
                            icon: Icons.pending,
                            label: 'Pendentes',
                            value: '$pendentes',
                            color: Colors.orange,
                          ),
                          const SizedBox(width: 8),
                          _StatCard(
                            icon: Icons.check_circle,
                            label: 'Realizados',
                            value: '$realizados',
                            color: Colors.green,
                          ),
                          const SizedBox(width: 8),
                          _StatCard(
                            icon: Icons.error,
                            label: 'Atrasados',
                            value: '$atrasados',
                            color: Colors.red,
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Search bar
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                      child: TextField(
                        onChanged: (value) =>
                            setState(() => _searchQuery = value),
                        decoration: InputDecoration(
                          hintText: 'Buscar por tipo, médico, clínica...',
                          prefixIcon: const Icon(Icons.search, size: 20),
                          suffixIcon: _searchQuery.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear, size: 18),
                                  onPressed: () =>
                                      setState(() => _searchQuery = ''),
                                )
                              : null,
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 12),
                          isDense: true,
                        ),
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
                                onSelected: (_) =>
                                    setState(() => _selectedStatus = status),
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
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                materialTapTargetSize:
                                    MaterialTapTargetSize.shrinkWrap,
                                visualDensity: VisualDensity.compact,
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 4),
                                labelPadding: const EdgeInsets.symmetric(
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
                                onPressed: _loadExams,
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
                            Icon(Icons.medical_services_outlined,
                                size: 56, color: Colors.grey[600]),
                            const SizedBox(height: 16),
                            Text(
                              _searchQuery.isNotEmpty ||
                                      _selectedStatus != 'TODOS'
                                  ? 'Nenhum exame encontrado'
                                  : 'Nenhum exame registrado',
                              style: TextStyle(
                                  color: Colors.grey[400],
                                  fontSize: 15),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    // Exam list
                    SliverPadding(
                      padding:
                          const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final exam = filtered[index];
                            final sColor = _statusColor(exam.status);
                            final rColor = _resultColor(exam.result);

                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: Padding(
                                padding: const EdgeInsets.all(14),
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    // Top row
                                    Row(
                                      children: [
                                        // Exam type icon
                                        Container(
                                          width: 44,
                                          height: 44,
                                          decoration: BoxDecoration(
                                            color: sColor.withAlpha(20),
                                            borderRadius:
                                                BorderRadius.circular(
                                                    10),
                                          ),
                                          child: Column(
                                            mainAxisAlignment:
                                                MainAxisAlignment.center,
                                            children: [
                                              Icon(
                                                exam.status
                                                            .toUpperCase() ==
                                                        'REALIZADO'
                                                    ? Icons.task_alt
                                                    : Icons
                                                        .medical_information,
                                                color: sColor,
                                                size: 20,
                                              ),
                                            ],
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
                                                exam.examTypeName ??
                                                    'Exame Médico',
                                                style:
                                                    const TextStyle(
                                                  fontWeight:
                                                      FontWeight.w600,
                                                  fontSize: 14,
                                                ),
                                                maxLines: 1,
                                                overflow:
                                                    TextOverflow
                                                        .ellipsis,
                                              ),
                                              const SizedBox(
                                                  height: 2),
                                              if (exam.clinicName !=
                                                  null)
                                                Text(
                                                  exam.clinicName!,
                                                  style: TextStyle(
                                                    color: Colors
                                                        .grey[500],
                                                    fontSize: 12,
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
                                                color: sColor
                                                    .withAlpha(20),
                                                borderRadius:
                                                    BorderRadius
                                                        .circular(8),
                                                border: Border.all(
                                                    color: sColor
                                                        .withAlpha(
                                                            60)),
                                              ),
                                              child: Text(
                                                exam.displayStatus,
                                                style: TextStyle(
                                                  color: sColor,
                                                  fontSize: 11,
                                                  fontWeight:
                                                      FontWeight.w600,
                                                ),
                                              ),
                                            ),
                                            if (exam.result !=
                                                null) ...[
                                              const SizedBox(
                                                  height: 4),
                                              Container(
                                                padding:
                                                    const EdgeInsets
                                                            .symmetric(
                                                        horizontal:
                                                            6,
                                                        vertical:
                                                            2),
                                                decoration:
                                                    BoxDecoration(
                                                  color: rColor
                                                      .withAlpha(
                                                          20),
                                                  borderRadius:
                                                      BorderRadius
                                                          .circular(
                                                              6),
                                                ),
                                                child: Text(
                                                  exam.displayResult,
                                                  style: TextStyle(
                                                    color: rColor,
                                                    fontSize: 10,
                                                    fontWeight:
                                                        FontWeight
                                                            .w600,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 10),
                                    // Dates and details
                                    Row(
                                      children: [
                                        Icon(Icons.calendar_today,
                                            size: 12,
                                            color: Colors.grey[500]),
                                        const SizedBox(width: 4),
                                        Text(
                                          'Agendado: ${exam.formattedScheduledDate}',
                                          style: TextStyle(
                                              color: Colors.grey[500],
                                              fontSize: 11),
                                        ),
                                        if (exam.examDate != null) ...[
                                          const SizedBox(width: 12),
                                          Icon(Icons.check_circle_outline,
                                              size: 12,
                                              color: Colors.grey[500]),
                                          const SizedBox(width: 4),
                                          Expanded(
                                            child: Text(
                                              'Realizado: ${exam.formattedExamDate}',
                                              style: TextStyle(
                                                  color:
                                                      Colors.grey[500],
                                                  fontSize: 11),
                                              overflow:
                                                  TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                    if (exam.doctorName != null ||
                                        exam.examTypeName != null)
                                      Padding(
                                        padding:
                                            const EdgeInsets.only(
                                                top: 4),
                                        child: Row(
                                          children: [
                                            if (exam.doctorName !=
                                                null) ...[
                                              Icon(Icons.person,
                                                  size: 12,
                                                  color:
                                                      Colors.grey[500]),
                                              const SizedBox(
                                                  width: 4),
                                              Text(
                                                exam.doctorName!,
                                                style: TextStyle(
                                                    color: Colors
                                                        .grey[500],
                                                    fontSize: 11),
                                              ),
                                            ],
                                            if (exam.nextExamDate !=
                                                null) ...[
                                              const SizedBox(
                                                  width: 12),
                                              Icon(
                                                  Icons.event_repeat,
                                                  size: 12,
                                                  color: exam
                                                          .isExpired
                                                      ? Colors.red[
                                                          400]
                                                      : Colors
                                                          .grey[500]),
                                              const SizedBox(
                                                  width: 4),
                                              Text(
                                                'Próximo: ${exam.formattedNextExamDate}',
                                                style: TextStyle(
                                                  color: exam
                                                          .isExpired
                                                      ? Colors
                                                          .red[400]
                                                      : Colors
                                                          .grey[500],
                                                  fontSize: 11,
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                      ),
                                    // Notes
                                    if (exam.notes != null &&
                                        exam.notes!.isNotEmpty)
                                      Padding(
                                        padding:
                                            const EdgeInsets.only(
                                                top: 6),
                                        child: Text(
                                          exam.notes!,
                                          style: TextStyle(
                                            color: Colors.grey[600],
                                            fontSize: 11,
                                            fontStyle: FontStyle.italic,
                                          ),
                                          maxLines: 2,
                                          overflow:
                                              TextOverflow.ellipsis,
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
