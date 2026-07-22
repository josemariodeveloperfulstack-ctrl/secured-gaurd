/// Modelo de Avaliação de Desempenho.
class PerformanceEvaluation {
  final String id;
  final String? employeeId;
  final String? employeeName;
  final String? evaluatorId;
  final String? evaluatorName;
  final String? evaluationDate;
  final String evaluationType;
  final int score;
  final String? comments;
  final String status;
  final String? createdAt;

  PerformanceEvaluation({
    required this.id,
    this.employeeId,
    this.employeeName,
    this.evaluatorId,
    this.evaluatorName,
    this.evaluationDate,
    this.evaluationType = 'MONTHLY',
    this.score = 0,
    this.comments,
    this.status = 'PENDING',
    this.createdAt,
  });

  factory PerformanceEvaluation.fromJson(Map<String, dynamic> json) {
    return PerformanceEvaluation(
      id: json['id'] as String? ?? '',
      employeeId: _extractId(json['employeeId'], json['employee']),
      employeeName: _extractName(json['employeeName'], json['employee']),
      evaluatorId: json['evaluator'] is Map ? json['evaluator']['id'] as String? : null,
      evaluatorName: json['evaluator'] is Map ? json['evaluator']['name'] as String? : null,
      evaluationDate: json['evaluationDate'] as String?,
      evaluationType: json['evaluationType'] as String? ?? 'MONTHLY',
      score: json['score'] as int? ?? 0,
      comments: json['comments'] as String?,
      status: json['status'] as String? ?? 'PENDING',
      createdAt: json['createdAt'] as String?,
    );
  }

  static String? _extractId(String? directId, dynamic employee) {
    if (directId != null && directId.isNotEmpty) return directId;
    if (employee is Map) return employee['id'] as String?;
    return null;
  }

  static String? _extractName(String? directName, dynamic employee) {
    if (directName != null && directName.isNotEmpty) return directName;
    if (employee is Map) return employee['name'] as String?;
    return null;
  }

  String get displayEvaluationType {
    switch (evaluationType.toUpperCase()) {
      case 'MONTHLY':
        return 'Mensal';
      case 'QUARTERLY':
        return 'Trimestral';
      case 'SEMIANNUAL':
        return 'Semestral';
      case 'ANNUAL':
        return 'Anual';
      case 'SPECIAL':
        return 'Especial';
      default:
        return evaluationType;
    }
  }

  String get displayStatus {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'Pendente';
      case 'IN_PROGRESS':
        return 'Em Andamento';
      case 'COMPLETED':
        return 'Concluída';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return status;
    }
  }

  String get scoreLabel {
    if (score >= 90) return 'Excelente';
    if (score >= 70) return 'Bom';
    if (score >= 50) return 'Regular';
    if (score >= 30) return 'Ruim';
    return 'Crítico';
  }

  String get formattedDate {
    if (evaluationDate == null) return '--';
    try {
      final dt = DateTime.parse(evaluationDate!);
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    } catch (_) {
      return evaluationDate!;
    }
  }
}
