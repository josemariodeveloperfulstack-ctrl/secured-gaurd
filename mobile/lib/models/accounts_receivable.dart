/// Modelo de Conta a Receber.
class AccountsReceivable {
  final String id;
  final String? clientId;
  final String? clientName;
  final String? invoiceNumber;
  final String? measurementNumber;
  final String? measurementInfo;
  final String? description;
  final double amount;
  final double amountPaid;
  final double pendingAmount;
  final String? issueDate;
  final String? dueDate;
  final String? paymentDate;
  final String status;
  final String category;
  final String? paymentMethod;
  final int overdueDays;
  final double lateFee;
  final double latePenalty;
  final String? notes;
  final String? workPostName;

  AccountsReceivable({
    required this.id,
    this.clientId,
    this.clientName,
    this.invoiceNumber,
    this.measurementNumber,
    this.measurementInfo,
    this.description,
    this.amount = 0,
    this.amountPaid = 0,
    this.pendingAmount = 0,
    this.issueDate,
    this.dueDate,
    this.paymentDate,
    this.status = 'PENDING',
    this.category = 'SERVICES',
    this.paymentMethod,
    this.overdueDays = 0,
    this.lateFee = 0,
    this.latePenalty = 0,
    this.notes,
    this.workPostName,
  });

  factory AccountsReceivable.fromJson(Map<String, dynamic> json) {
    return AccountsReceivable(
      id: json['id'] as String? ?? '',
      clientId: json['clientId'] as String?,
      clientName: _extractClientName(json),
      invoiceNumber: json['invoiceNumber'] as String?,
      measurementNumber: json['measurementNumber'] as String?,
      measurementInfo: json['measurementInfo'] as String?,
      description: json['description'] as String?,
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      amountPaid: (json['amountPaid'] as num?)?.toDouble() ?? 0,
      pendingAmount: (json['pendingAmount'] as num?)?.toDouble() ?? 0,
      issueDate: json['issueDate'] as String?,
      dueDate: json['dueDate'] as String?,
      paymentDate: json['paymentDate'] as String?,
      status: json['status'] as String? ?? 'PENDING',
      category: json['category'] as String? ?? 'SERVICES',
      paymentMethod: json['paymentMethod'] as String?,
      overdueDays: json['overdueDays'] as int? ?? 0,
      lateFee: (json['lateFee'] as num?)?.toDouble() ?? 0,
      latePenalty: (json['latePenalty'] as num?)?.toDouble() ?? 0,
      notes: json['notes'] as String?,
      workPostName: json['workPostName'] as String?,
    );
  }

  static String? _extractClientName(Map<String, dynamic> json) {
    final directName = json['clientName'] as String?;
    if (directName != null && directName.isNotEmpty) return directName;
    final client = json['client'];
    if (client is Map) return client['name'] as String?;
    return null;
  }

  String get displayStatus {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'Pendente';
      case 'PAID':
        return 'Pago';
      case 'OVERDUE':
        return 'Vencido';
      case 'PARTIALLY_PAID':
        return 'Pago Parcial';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status;
    }
  }

  String get displayCategory {
    switch (category.toUpperCase()) {
      case 'SERVICES':
        return 'Serviços';
      case 'PRODUCTS':
        return 'Produtos';
      case 'MONITORING':
        return 'Monitoramento';
      case 'MAINTENANCE':
        return 'Manutenção';
      case 'OTHER':
        return 'Outros';
      default:
        return category;
    }
  }

  String get formattedAmount {
    return 'R\$ ${amount.toStringAsFixed(2)}';
  }

  String get formattedPendingAmount {
    return 'R\$ ${pendingAmount.toStringAsFixed(2)}';
  }

  String get formattedDueDate {
    if (dueDate == null) return '--';
    try {
      final dt = DateTime.parse(dueDate!);
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    } catch (_) {
      return dueDate!;
    }
  }

  String get formattedIssueDate {
    if (issueDate == null) return '--';
    try {
      final dt = DateTime.parse(issueDate!);
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    } catch (_) {
      return issueDate!;
    }
  }

  bool get isOverdue {
    if (dueDate == null) return false;
    try {
      final dt = DateTime.parse(dueDate!);
      return dt.isBefore(DateTime.now()) &&
          status.toUpperCase() != 'PAID' &&
          status.toUpperCase() != 'CANCELLED';
    } catch (_) {
      return false;
    }
  }
}
