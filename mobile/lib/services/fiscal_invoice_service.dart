import '../config/api_config.dart';
import '../models/fiscal_invoice.dart';
import 'api_service.dart';

/// Serviço de Notas Fiscais.
class FiscalInvoiceService {
  final ApiService _api = ApiService();

  /// Busca notas fiscais com filtros.
  Future<List<FiscalInvoice>> getByFilters({
    int? periodYear,
    int? periodMonth,
    String? clientName,
    String? fileType,
  }) async {
    final params = <String, String>{};
    if (periodYear != null) params['periodYear'] = periodYear.toString();
    if (periodMonth != null) params['periodMonth'] = periodMonth.toString();
    if (clientName != null) params['clientName'] = clientName;
    if (fileType != null) params['fileType'] = fileType;

    final queryString = params.entries.map((e) => '${e.key}=${Uri.encodeComponent(e.value)}').join('&');
    final uri = queryString.isNotEmpty
        ? '${ApiConfig.fiscalInvoices}?$queryString'
        : ApiConfig.fiscalInvoices;

    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => FiscalInvoice.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['content'] is List) {
      return (data['content'] as List)
          .map((e) => FiscalInvoice.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }
}
