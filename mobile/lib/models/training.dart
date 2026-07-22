/// Modelo de Treinamento.
class EmployeeTraining {
  final String id;
  final String name;
  final String? description;
  final String? provider;
  final int? duration;
  final int? renewalPeriodMonths;
  final bool? mandatoryForGuards;
  final String? createdAt;

  EmployeeTraining({
    required this.id,
    required this.name,
    this.description,
    this.provider,
    this.duration,
    this.renewalPeriodMonths,
    this.mandatoryForGuards,
    this.createdAt,
  });

  factory EmployeeTraining.fromJson(Map<String, dynamic> json) {
    return EmployeeTraining(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      provider: json['provider'] as String?,
      duration: json['duration'] as int?,
      renewalPeriodMonths: json['renewalPeriodMonths'] as int?,
      mandatoryForGuards: json['mandatoryForGuards'] as bool?,
      createdAt: json['createdAt'] as String?,
    );
  }

  String get formattedDuration {
    if (duration == null) return '--';
    if (duration! < 60) return '${duration}min';
    final hours = duration! ~/ 60;
    final mins = duration! % 60;
    return mins > 0 ? '${hours}h${mins}min' : '${hours}h';
  }

  String get renewalInfo {
    if (renewalPeriodMonths == null) return '--';
    if (renewalPeriodMonths! >= 12) {
      final years = renewalPeriodMonths! ~/ 12;
      return 'A cada $years ano${years > 1 ? 's' : ''}';
    }
    return 'A cada $renewalPeriodMonths meses';
  }
}
