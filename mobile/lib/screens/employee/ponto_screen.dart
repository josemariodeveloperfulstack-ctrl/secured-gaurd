import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:intl/intl.dart';
import '../../models/time_record.dart';
import '../../providers/auth_provider.dart';
import '../../services/notification_service.dart';
import '../../services/reminder_settings_service.dart';
import '../../services/time_record_service.dart';

class PontoScreen extends StatefulWidget {
  const PontoScreen({super.key});

  @override
  State<PontoScreen> createState() => _PontoScreenState();
}

class _PontoScreenState extends State<PontoScreen> {
  final TimeRecordService _service = TimeRecordService();
  final DateFormat _dateFormat = DateFormat("EEEE, dd 'de' MMMM", 'pt_BR');
  final DateFormat _timeFormat = DateFormat('HH:mm:ss');

  List<TimeRecord> _todayRecords = [];
  RecordType _nextRecordType = RecordType.entrada;
  Position? _currentPosition;
  String? _qrCodeData;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadData();
    _requestLocation();
  }

  Future<void> _loadData() async {
    final user = context.read<AuthProvider>().user;
    final employeeId = user?.employeeId ?? user?.id;
    if (employeeId == null) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final records = await _service.getTodayRecords(employeeId);
      final nextType = await _service.getNextRecordType(employeeId);
      if (mounted) {
        setState(() {
          _todayRecords = records;
          _nextRecordType = nextType;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Erro ao carregar dados do ponto';
        });
      }
    }
  }

  Future<void> _requestLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return;

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) return;
      }

      final position = await Geolocator.getCurrentPosition();
      if (mounted) {
        setState(() => _currentPosition = position);
      }
    } catch (e) {
      // Localização não disponível - não é crítico
      debugPrint('Erro ao obter localização: $e');
    }
  }

  Future<void> _handleRegister() async {
    final user = context.read<AuthProvider>().user;
    final employeeId = user?.employeeId ?? user?.id;
    if (employeeId == null) return;

    setState(() => _isLoading = true);

    try {
      await _service.registerTimeRecord(
        employeeId: employeeId,
        recordType: _nextRecordType,
        qrCode: _qrCodeData,
        location: _currentPosition != null
            ? '${_currentPosition!.latitude}, ${_currentPosition!.longitude}'
            : null,
        latitude: _currentPosition?.latitude,
        longitude: _currentPosition?.longitude,
        ipAddress: 'mobile',
        userAgent: 'Flutter',
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                '${_nextRecordType.displayName} registrado com sucesso!'),
            backgroundColor: Colors.green,
          ),
        );
        setState(() => _qrCodeData = null);
        // Reagendar lembretes (daily ou dias úteis)
        final rs = ReminderSettingsService();
        final hour = await rs.getReminderHour();
        final minute = await rs.getReminderMinute();
        final earlyEnabled = await rs.isEarlyReminderEnabled();
        final weekdaysOnly = await rs.isWeekdaysOnly();
        final soundMode = await rs.getSoundMode();
        await NotificationService().scheduleAllPontoReminders(
          hour: hour,
          minute: minute,
          earlyEnabled: earlyEnabled,
          weekdaysOnly: weekdaysOnly,
          soundMode: soundMode,
        );
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _openScanner() {
    showDialog(
      context: context,
      builder: (_) => QrScannerModal(
        onDetect: (data) {
          setState(() => _qrCodeData = data);
        },
      ),
    );
  }

  Future<void> _openHistory() async {
    final user = context.read<AuthProvider>().user;
    final employeeId = user?.employeeId ?? user?.id;
    if (employeeId == null) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _HistoryModal(employeeId: employeeId),
    );
  }

  Color _getRecordTypeColor(RecordType type) {
    switch (type) {
      case RecordType.entrada:
        return Colors.green;
      case RecordType.saidaAlmoco:
        return Colors.orange;
      case RecordType.retornoAlmoco:
        return Colors.amber;
      case RecordType.saida:
        return Colors.red;
    }
  }

  IconData _getRecordTypeIcon(RecordType type) {
    switch (type) {
      case RecordType.entrada:
        return Icons.login;
      case RecordType.saidaAlmoco:
        return Icons.free_breakfast;
      case RecordType.retornoAlmoco:
        return Icons.restaurant;
      case RecordType.saida:
        return Icons.logout;
    }
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ponto Eletrônico'),
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            onPressed: _openHistory,
            tooltip: 'Histórico',
          ),
        ],
      ),
      body: _errorMessage != null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.grey),
                  const SizedBox(height: 16),
                  Text(_errorMessage!,
                      style: theme.textTheme.bodyLarge),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: _loadData,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Tentar novamente'),
                  ),
                ],
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  // Digital Clock
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        children: [
                          Text(
                            _dateFormat.format(now),
                            style: theme.textTheme.bodySmall
                                ?.copyWith(color: Colors.grey),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _timeFormat.format(now),
                            style: theme.textTheme.displaySmall?.copyWith(
                              fontWeight: FontWeight.w900,
                              color: theme.colorScheme.primary,
                              letterSpacing: 2,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // QR Code validated banner
                  if (_qrCodeData != null)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: Colors.green.withAlpha(20),
                        borderRadius: BorderRadius.circular(12),
                        border:
                            Border.all(color: Colors.green.withAlpha(60)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle,
                              color: Colors.green),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'QR Code validado',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: Colors.green,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close, size: 18),
                            onPressed: () =>
                                setState(() => _qrCodeData = null),
                          ),
                        ],
                      ),
                    ),

                  // Main Registration Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        children: [
                          Icon(
                            _getRecordTypeIcon(_nextRecordType),
                            size: 48,
                            color: _getRecordTypeColor(_nextRecordType),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'Próximo: ${_nextRecordType.displayName}',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Certifique-se de estar no local de trabalho',
                            style: theme.textTheme.bodySmall
                                ?.copyWith(color: Colors.grey),
                          ),
                          const SizedBox(height: 24),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed: _openScanner,
                              icon:
                                  const Icon(Icons.qr_code_scanner),
                              label:
                                  const Text('Escanear QR Code'),
                              style: OutlinedButton.styleFrom(
                                padding:
                                    const EdgeInsets.symmetric(vertical: 14),
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            height: 60,
                            child: ElevatedButton.icon(
                              onPressed:
                                  _isLoading ? null : _handleRegister,
                              icon: _isLoading
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.black,
                                      ),
                                    )
                                  : Icon(
                                      _getRecordTypeIcon(
                                          _nextRecordType)),
                              label: Text(
                                _nextRecordType.displayName,
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor:
                                    _getRecordTypeColor(_nextRecordType),
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Today's Records
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Registros de Hoje',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Colors.grey,
                        ),
                      ),
                      Text(
                        '${_todayRecords.length}/4',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  if (_todayRecords.isEmpty)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(32),
                      decoration: BoxDecoration(
                        border:
                            Border.all(color: Colors.grey.withAlpha(40)),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        children: [
                          Icon(Icons.access_time,
                              size: 40,
                              color: Colors.grey.withAlpha(100)),
                          const SizedBox(height: 8),
                          Text('Nenhum registro hoje',
                              style: theme.textTheme.bodyMedium
                                  ?.copyWith(color: Colors.grey)),
                        ],
                      ),
                    )
                  else
                    ..._todayRecords.map(
                      (record) => Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: _getRecordTypeColor(record.recordType)
                                  .withAlpha(25),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(
                              _getRecordTypeIcon(record.recordType),
                              color:
                                  _getRecordTypeColor(record.recordType),
                            ),
                          ),
                          title: Text(
                            record.recordType.displayName,
                            style:
                                const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          trailing: Text(
                            record.formattedTime,
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                  const SizedBox(height: 16),

                  // Location Status
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.withAlpha(10),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          _currentPosition != null
                              ? Icons.location_on
                              : Icons.location_off,
                          size: 16,
                          color: _currentPosition != null
                              ? Colors.green
                              : Colors.grey,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          _currentPosition != null
                              ? 'Localização Confirmada'
                              : 'Solicitando Localização...',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: _currentPosition != null
                                ? Colors.green
                                : Colors.grey,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}

/// Modal de scanner QR Code.
class QrScannerModal extends StatelessWidget {
  final void Function(String data) onDetect;

  const QrScannerModal({super.key, required this.onDetect});

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.all(16),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: SizedBox(
          height: 400,
          child: Column(
            children: [
              AppBar(
                title: const Text('Escanear QR Code'),
                leading: IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ),
              Expanded(
                child: MobileScanner(
                  onDetect: (capture) {
                    final barcode = capture.barcodes.firstOrNull;
                    if (barcode?.rawValue != null) {
                      onDetect(barcode!.rawValue!);
                      Navigator.of(context).pop();
                    }
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Modal de histórico de registros de ponto.
class _HistoryModal extends StatefulWidget {
  final String employeeId;

  const _HistoryModal({required this.employeeId});

  @override
  State<_HistoryModal> createState() => _HistoryModalState();
}

class _HistoryModalState extends State<_HistoryModal> {
  final TimeRecordService _service = TimeRecordService();
  List<TimeRecord> _records = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final records =
          await _service.getEmployeeRecords(widget.employeeId, size: 30);
      if (mounted) {
        setState(() {
          _records = records;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Color _getRecordTypeColor(RecordType type) {
    switch (type) {
      case RecordType.entrada:
        return Colors.green;
      case RecordType.saidaAlmoco:
        return Colors.orange;
      case RecordType.retornoAlmoco:
        return Colors.amber;
      case RecordType.saida:
        return Colors.red;
    }
  }

  IconData _getRecordTypeIcon(RecordType type) {
    switch (type) {
      case RecordType.entrada:
        return Icons.login;
      case RecordType.saidaAlmoco:
        return Icons.free_breakfast;
      case RecordType.retornoAlmoco:
        return Icons.restaurant;
      case RecordType.saida:
        return Icons.logout;
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.3,
      maxChildSize: 0.85,
      expand: false,
      builder: (context, scrollController) => Column(
        children: [
          const SizedBox(height: 12),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.withAlpha(80),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'Histórico de Registros',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _records.isEmpty
                    ? const Center(child: Text('Nenhum registro encontrado'))
                    : ListView.separated(
                        controller: scrollController,
                        padding: const EdgeInsets.all(16),
                        itemCount: _records.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: 4),
                        itemBuilder: (context, index) {
                          final rec = _records[index];
                          return ListTile(
                            dense: true,
                            leading: Icon(
                              _getRecordTypeIcon(rec.recordType),
                              color: _getRecordTypeColor(rec.recordType),
                              size: 20,
                            ),
                            title: Text(
                              rec.recordType.displayName,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14),
                            ),
                            subtitle: Text(
                              rec.formattedDate,
                              style: const TextStyle(fontSize: 12),
                            ),
                            trailing: Text(
                              rec.formattedTime,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
