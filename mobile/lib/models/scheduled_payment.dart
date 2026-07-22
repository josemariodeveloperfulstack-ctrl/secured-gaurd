/// Modelo de Pagamento Agendado.
class ScheduledPayment {
  final String id;
  final String? clientId;
  final String? clientName;
  final String? description;
  final double amount;
  final String? scheduledDate;
  final String? executionDate;
  final String status;
  final String? paymentMethod;
  final String? invoiceNumber;
  final String? notes;
  final bool alertSent;
  final int daysUntilDue;
  final bool isOverdue;

  ScheduledPayment({
    required this.id,
    this.clientId,
    this.clientName,
    this.description,
    this.amount = 0,
    this.scheduledDate,
    this.executionDate,
    this.status = 'SCHEDULED',
    this.paymentMethod,
    this.invoiceNumber,
    this.notes,
    this.alertSent = false,
    this.daysUntilDue = 0,
    this.isOverdue = false,
  });

  factory ScheduledPayment.fromJson(Map<String, dynamic> json) {
    return ScheduledPayment(
      id: json['id'] as String? ?? '',
      clientId: json['clientId'] as String?,
      clientName: _extractClientName(json),
      description: json['description'] as String?,
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      scheduledDate: json['scheduledDate'] as String?,
      executionDate: json['executionDate'] as String?,
      status: json['status'] as String? ?? 'SCHEDULED',
      paymentMethod: json['paymentMethod'] as String?,
      invoiceNumber: json['invoiceNumber'] as String?,
      notes: json['notes'] as String?,
      alertSent: json['alertSent'] as bool? ?? false,
      daysUntilDue: json['daysUntilDue'] as int? ?? 0,
      isOverdue: json['isOverdue'] as bool? ?? false,
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
      case 'SCHEDULED':
        return 'Agendado';
      case 'EXECUTED':
        return 'Executado';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status;
    }
  }

  String get formattedAmount {
    return 'R\$ ${amount.toStringAsFixed(2)}';
  }

  String get formattedScheduledDate {
    if (scheduledDate == null) return '--';
    try {
      final dt = DateTime.parse(scheduledDate!);
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    } catch (_) {
      return scheduledDate!;
    }
  }

  String get displayPaymentMethod {
    switch (paymentMethod?.toUpperCase()) {
      case 'BOLETO':
        return 'Boleto';
      case 'PIX':
        return 'Pix';
      case 'TRANSFER':
      case 'TRANSFERENCIA':
        return 'Transferência';
      case 'CREDIT_CARD':
      case 'CREDITO':
        return 'Cartão Crédito';
      case 'DEBIT':
      case 'DEBITO':
        return 'Débito';
      case 'DINHEIRO':
      case 'CASH':
        return 'Dinheiro';
      case 'CHEQUE':
        return 'Cheque';
      default:
        return paymentMethod ?? '--';
    }
  }
}
