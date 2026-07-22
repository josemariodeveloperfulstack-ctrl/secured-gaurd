/// Modelo de holerite (contracheque).
class Holerite {
  final String id;
  final String employeeName;
  final String cpf;
  final int month;
  final int year;
  final String fileName;
  final String? filePath;
  final int? fileSize;
  final String status;
  final String? processedAt;
  final String? createdAt;
  final String? companyName;
  final String? companySigla;

  Holerite({
    required this.id,
    required this.employeeName,
    required this.cpf,
    required this.month,
    required this.year,
    required this.fileName,
    this.filePath,
    this.fileSize,
    this.status = 'PROCESSED',
    this.processedAt,
    this.createdAt,
    this.companyName,
    this.companySigla,
  });

  factory Holerite.fromJson(Map<String, dynamic> json) {
    return Holerite(
      id: json['id']?.toString() ?? '',
      employeeName: json['employeeName'] as String? ?? '',
      cpf: json['cpf'] as String? ?? '',
      month: json['month'] as int? ?? 1,
      year: json['year'] as int? ?? DateTime.now().year,
      fileName: json['fileName'] as String? ?? '',
      filePath: json['filePath'] as String?,
      fileSize: json['fileSize'] as int?,
      status: json['status'] as String? ?? 'PROCESSED',
      processedAt: json['processedAt'] as String?,
      createdAt: json['createdAt'] as String?,
      companyName: json['companyName'] as String?,
      companySigla: json['companySigla'] as String?,
    );
  }

  /// Nome do mês em português.
  String get monthName {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month - 1];
  }

  /// Período formatado (ex: "Janeiro/2025").
  String get formattedPeriod => '$monthName/$year';

  /// Label para exibição.
  String get displayLabel => '$monthName/$year';
}
