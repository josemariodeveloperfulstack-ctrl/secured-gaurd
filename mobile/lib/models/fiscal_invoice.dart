/// Modelo de Nota Fiscal.
class FiscalInvoice {
  final String id;
  final String? clientName;
  final int? periodMonth;
  final int? periodYear;
  final String? fileType;
  final String? fileNameOriginal;
  final int? fileSize;
  final String? createdAt;

  FiscalInvoice({
    required this.id,
    this.clientName,
    this.periodMonth,
    this.periodYear,
    this.fileType,
    this.fileNameOriginal,
    this.fileSize,
    this.createdAt,
  });

  factory FiscalInvoice.fromJson(Map<String, dynamic> json) {
    return FiscalInvoice(
      id: json['id'] as String? ?? '',
      clientName: json['clientName'] as String?,
      periodMonth: json['periodMonth'] as int?,
      periodYear: json['periodYear'] as int?,
      fileType: json['fileType'] as String?,
      fileNameOriginal: json['fileNameOriginal'] as String?,
      fileSize: json['fileSize'] as int?,
      createdAt: json['createdAt'] as String?,
    );
  }

  String get displayPeriod {
    if (periodMonth == null || periodYear == null) return '--';
    final months = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    final monthIndex = periodMonth! - 1;
    if (monthIndex < 0 || monthIndex >= months.length) return '$periodMonth/$periodYear';
    return '${months[monthIndex]}/$periodYear';
  }

  String get formattedFileSize {
    if (fileSize == null) return '--';
    if (fileSize! < 1024) return '${fileSize}B';
    if (fileSize! < 1024 * 1024) return '${(fileSize! / 1024).toStringAsFixed(1)}KB';
    return '${(fileSize! / (1024 * 1024)).toStringAsFixed(1)}MB';
  }

  String get formattedCreatedAt {
    if (createdAt == null) return '--';
    try {
      final dt = DateTime.parse(createdAt!);
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    } catch (_) {
      return createdAt!;
    }
  }
}
