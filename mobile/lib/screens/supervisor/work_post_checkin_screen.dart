import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:geolocator/geolocator.dart';
import '../../models/supervisor_visit_preview.dart';
import '../../models/work_post.dart';
import '../../services/work_post_service.dart';
import '../../services/supervisor_visit_service.dart';

/// Fluxo de check-in: Scanner QR → Identificar Funcionário → Preview → Check-in.
///
/// Usa o novo [SupervisorVisitController] com endpoints /preview e /checkin.
enum _CheckinStep {
  idle,
  scanning,
  postFound,
  identifyingEmployee,
  preview,
  success,
}

class WorkPostCheckinScreen extends StatefulWidget {
  const WorkPostCheckinScreen({super.key});

  @override
  State<WorkPostCheckinScreen> createState() => _WorkPostCheckinScreenState();
}

class _WorkPostCheckinScreenState extends State<WorkPostCheckinScreen> {
  final WorkPostService _workPostService = WorkPostService();
  final SupervisorVisitService _visitService = SupervisorVisitService();

  MobileScannerController? _scannerController;
  Position? _currentPosition;

  // Step control
  _CheckinStep _step = _CheckinStep.idle;
  bool _isLoadingLocation = false;
  bool _isProcessing = false;
  String? _error;
  String? _successMessage;

  // Data collected across steps
  String? _qrCode;
  WorkPost? _foundPost;
  List<WorkPost> _allWorkPosts = [];
  bool _isLoadingPosts = false;
  String _employeeValue = '';
  SupervisorVisitCheckinResponse? _previewResult;
  final TextEditingController _cpfController = TextEditingController();
  final TextEditingController _matriculaController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _requestLocation();
  }

  @override
  void dispose() {
    _scannerController?.dispose();
    _cpfController.dispose();
    _matriculaController.dispose();
    super.dispose();
  }

  // ────────────────────────────────────────────────
  // LOCATION
  // ────────────────────────────────────────────────

  Future<void> _requestLocation() async {
    setState(() => _isLoadingLocation = true);

    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        _setError('Ative a localização para fazer check-in.');
        return;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied) {
        _setError('Permissão de localização negada.');
        return;
      }
      if (permission == LocationPermission.deniedForever) {
        _setError('Permissão de localização negada permanentemente.');
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      if (!mounted) return;
      setState(() {
        _currentPosition = position;
        _isLoadingLocation = false;
      });
    } catch (_) {
      if (!mounted) return;
      _setError('Erro ao obter localização.');
    }
  }

  // ────────────────────────────────────────────────
  // QR SCANNER
  // ────────────────────────────────────────────────

  void _startScanner() {
    _scannerController = MobileScannerController();
    setState(() {
      _step = _CheckinStep.scanning;
      _error = null;
    });
  }

  void _stopScanner() {
    _scannerController?.dispose();
    _scannerController = null;
    setState(() => _step = _CheckinStep.idle);
  }

  void _onQrCodeDetected(String code) async {
    _stopScanner();
    _setProcessing(true);

    try {
      String postCode = code.trim();

      // Try to find work post by code or ID to show friendly name
      WorkPost? post = await _workPostService.getWorkPostByCode(postCode);
      if (post == null) {
        post = await _workPostService.getWorkPostById(postCode);
      }

      if (!mounted) return;

      setState(() {
        _qrCode = code.trim();
        _foundPost = post;
        _step = post != null ? _CheckinStep.postFound : _CheckinStep.identifyingEmployee;
        _isProcessing = false;
        _error = post != null ? null : 'Posto não encontrado pelo QR. Selecione ou informe o funcionário para continuar.';
      });
    } catch (_) {
      if (!mounted) return;
      _setError('Erro ao processar QR Code.');
    }
  }

  Future<void> _loadAllWorkPosts() async {
    setState(() => _isLoadingPosts = true);
    try {
      final posts = await _workPostService.getAllWorkPosts();
      if (!mounted) return;
      _allWorkPosts = posts;
      _isLoadingPosts = false;
    } catch (_) {
      if (!mounted) return;
      _isLoadingPosts = false;
    }
  }

  // ────────────────────────────────────────────────
  // PREVIEW & CHECKIN
  // ────────────────────────────────────────────────

  Future<void> _doPreview() async {
    if (_employeeValue.trim().isEmpty) {
      _setError('Informe o CPF, matrícula ou escaneie o crachá do funcionário.');
      return;
    }

    if (_qrCode == null && _foundPost == null) {
      _setError('Selecione um posto de trabalho antes de continuar.');
      return;
    }

    _setProcessing(true);

    try {
      final request = SupervisorVisitCheckinRequest(
        qrCode: _qrCode,
        workPostId: _qrCode == null ? _foundPost?.id : null,
        employeeValue: _employeeValue.trim(),
        latitude: _currentPosition?.latitude,
        longitude: _currentPosition?.longitude,
      );

      final result = await _visitService.previewCheckin(request);

      if (!mounted) return;

      if (result != null) {
        setState(() {
          _previewResult = result;
          _step = _CheckinStep.preview;
          _isProcessing = false;
          _error = null;
        });
      } else {
        _setError('Funcionário não encontrado. Verifique o QR Code, CPF ou matrícula.');
      }
    } catch (_) {
      if (!mounted) return;
      _setError('Erro ao consultar dados. Verifique a conexão.');
    }
  }

  Future<void> _doCheckin() async {
    _setProcessing(true);

    try {
      final request = SupervisorVisitCheckinRequest(
        qrCode: _qrCode,
        workPostId: _qrCode == null ? _foundPost?.id : null,
        employeeValue: _employeeValue.trim(),
        latitude: _currentPosition?.latitude,
        longitude: _currentPosition?.longitude,
        locationAddress:
            'Lat: ${_currentPosition?.latitude.toStringAsFixed(6) ?? "?"}, Lon: ${_currentPosition?.longitude.toStringAsFixed(6) ?? "?"}',
      );

      final result = await _visitService.doCheckin(request);

      if (!mounted) return;

      if (result != null) {
        setState(() {
          _step = _CheckinStep.success;
          _isProcessing = false;
          _successMessage =
              'Check-in realizado em ${result.workPostName ?? "posto"}!\n'
              'Funcionário: ${result.employee?.name ?? "—"}';
        });
      } else {
        _setError('Erro ao registrar o check-in.');
      }
    } catch (_) {
      if (!mounted) return;
      _setError('Erro ao registrar o check-in. Tente novamente.');
    }
  }

  // ────────────────────────────────────────────────
  // HELPERS
  // ────────────────────────────────────────────────

  void _setError(String msg) {
    setState(() {
      _error = msg;
      _isProcessing = false;
    });
  }

  void _setProcessing(bool value) {
    setState(() {
      _isProcessing = value;
      _error = null;
    });
  }

  void _reset() {
    _cpfController.clear();
    _matriculaController.clear();
    setState(() {
      _step = _CheckinStep.idle;
      _qrCode = null;
      _foundPost = null;
      _allWorkPosts = [];
      _isLoadingPosts = false;
      _employeeValue = '';
      _previewResult = null;
      _error = null;
      _successMessage = null;
    });
  }

  // ────────────────────────────────────────────────
  // BUILD
  // ────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Check-in no Posto'),
        actions: [
          if (_step != _CheckinStep.idle && _step != _CheckinStep.scanning)
            IconButton(
              icon: const Icon(Icons.refresh),
              tooltip: 'Reiniciar',
              onPressed: _reset,
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Stepper indicator
            _buildStepIndicator(theme),
            const SizedBox(height: 16),

            // Location status
            _buildLocationCard(theme),
            const SizedBox(height: 16),

            // Step content
            _buildStepContent(theme),

            // Error
            if (_error != null) ...[
              const SizedBox(height: 16),
              _buildErrorCard(),
            ],

            // Success
            if (_successMessage != null) ...[
              const SizedBox(height: 16),
              _buildSuccessCard(theme),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStepIndicator(ThemeData theme) {
    final steps = [
      ('Posto', _step.index >= _CheckinStep.postFound.index),
      ('Funcionário', _step.index >= _CheckinStep.identifyingEmployee.index),
      ('Confirmação', _step.index >= _CheckinStep.preview.index),
      ('Check-in', _step == _CheckinStep.success),
    ];

    return Row(
      children: List.generate(steps.length * 2 - 1, (i) {
        if (i.isOdd) {
          final prevIdx = (i ~/ 2);
          final done = steps[prevIdx + 1].$2;
          return Expanded(
            child: Container(
              height: 2,
              color: done
                  ? const Color(0xFFFFB800)
                  : Colors.grey[700],
            ),
          );
        }
        final idx = i ~/ 2;
        final (label, done) = steps[idx];
        final isCurrent = idx == _step.index;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: done
                ? const Color(0xFFFFB800)
                : isCurrent
                    ? const Color(0xFFFFB800).withAlpha(30)
                    : Colors.grey[800],
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: done || isCurrent
                  ? const Color(0xFFFFB800)
                  : Colors.grey[600]!,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: done ? Colors.black : (isCurrent ? const Color(0xFFFFB800) : Colors.grey[400]),
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        );
      }),
    );
  }

  Widget _buildLocationCard(ThemeData theme) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: _currentPosition != null
                    ? Colors.green.withAlpha(25)
                    : Colors.orange.withAlpha(25),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                Icons.gps_fixed,
                color: _currentPosition != null ? Colors.green : Colors.orange,
                size: 18,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                _isLoadingLocation
                    ? 'Obtendo localização...'
                    : _currentPosition != null
                        ? 'GPS: ${_currentPosition!.latitude.toStringAsFixed(4)}, ${_currentPosition!.longitude.toStringAsFixed(4)}'
                        : 'Localização não disponível',
                style: TextStyle(color: Colors.grey[400], fontSize: 12),
              ),
            ),
            if (_isLoadingLocation)
              const SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
          ],
        ),
      ),
    );
  }

  // ────────────────────────────────────────────────
  // STEP CONTENT
  // ────────────────────────────────────────────────

  Widget _buildStepContent(ThemeData theme) {
    switch (_step) {
      case _CheckinStep.idle:
        return _buildIdleState(theme);
      case _CheckinStep.scanning:
        return _buildScanner(theme);
      case _CheckinStep.postFound:
        return _buildPostFoundState(theme);
      case _CheckinStep.identifyingEmployee:
        return _buildIdentifyEmployeeState(theme);
      case _CheckinStep.preview:
        return _buildPreviewState(theme);
      case _CheckinStep.success:
        return const SizedBox.shrink();
    }
  }

  // ── IDLE ──

  Widget _buildIdleState(ThemeData theme) {
    return Column(
      children: [
        Container(
          height: 180,
          decoration: BoxDecoration(
            color: const Color(0xFF242438),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF2A2A3E)),
          ),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.qr_code_scanner, size: 56, color: Colors.grey[600]),
                const SizedBox(height: 12),
                Text(
                  'Leia o QR Code do Posto',
                  style: TextStyle(color: Colors.grey[400], fontSize: 14),
                ),
                const SizedBox(height: 4),
                Text(
                  'ou informe o código manualmente',
                  style: TextStyle(color: Colors.grey[600], fontSize: 12),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton.icon(
            onPressed: _startScanner,
            icon: const Icon(Icons.qr_code_scanner),
            label: const Text('Ler QR Code'),
          ),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: _showManualCodeDialog,
          icon: const Icon(Icons.edit),
          label: const Text('Digitar Código Manualmente'),
          style: OutlinedButton.styleFrom(
            foregroundColor: Colors.grey[300],
            side: BorderSide(color: Colors.grey[600]!),
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
        ),
        const Divider(height: 32),
        OutlinedButton.icon(
          onPressed: () async {
            await _loadAllWorkPosts();
            if (!mounted) return;
            setState(() {
              _step = _CheckinStep.identifyingEmployee;
              _error = null;
            });
          },
          icon: const Icon(Icons.person_search, size: 18),
          label: const Text('Check-in sem QR Code'),
          style: OutlinedButton.styleFrom(
            foregroundColor: Colors.grey[500],
            side: BorderSide(color: Colors.grey[700]!),
          ),
        ),
      ],
    );
  }

  // ── SCANNER ──

  Widget _buildScanner(ThemeData theme) {
    return Column(
      children: [
        Container(
          height: 300,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFFFB800), width: 2),
          ),
          clipBehavior: Clip.antiAlias,
          child: MobileScanner(
            controller: _scannerController,
            onDetect: (capture) {
              final barcode = capture.barcodes.firstOrNull;
              if (barcode?.rawValue != null) {
                _onQrCodeDetected(barcode!.rawValue!);
              }
            },
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Aponte a câmera para o QR Code do posto',
          style: TextStyle(color: Colors.grey[400], fontSize: 13),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: _stopScanner,
          icon: const Icon(Icons.close),
          label: const Text('Cancelar Leitura'),
          style: OutlinedButton.styleFrom(
            foregroundColor: Colors.red,
            side: const BorderSide(color: Colors.red),
          ),
        ),
      ],
    );
  }

  // ── POST FOUND ──

  Widget _buildPostFoundState(ThemeData theme) {
    final post = _foundPost!;
    return Column(
      children: [
        _buildPostCard(theme, post),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton.icon(
            onPressed: () {
              setState(() {
                _step = _CheckinStep.identifyingEmployee;
                _error = null;
              });
            },
            icon: const Icon(Icons.arrow_forward),
            label: const Text('Identificar Funcionário'),
          ),
        ),
        const SizedBox(height: 12),
        TextButton(
          onPressed: _reset,
          child: Text('Trocar Posto',
              style: TextStyle(color: Colors.grey[500], fontSize: 13)),
        ),
      ],
    );
  }

  // ── IDENTIFY EMPLOYEE ──

  Widget _buildIdentifyEmployeeState(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Post summary or picker
        if (_foundPost != null)
          _buildPostSummary(theme)
        else
          _buildWorkPostPicker(theme),
        if (_foundPost != null) const SizedBox(height: 16),

        Text(
          'Identificar Funcionário',
          style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 4),
        Text(
          'Informe o CPF ou a matrícula do vigilante no posto',
          style: TextStyle(color: Colors.grey[500], fontSize: 12),
        ),
        const SizedBox(height: 16),

        // CPF input
        TextField(
          controller: _cpfController,
          decoration: InputDecoration(
            labelText: 'CPF (apenas números)',
            hintText: '000.000.000-00',
            prefixIcon: const Icon(Icons.badge, size: 20),
            suffixIcon: IconButton(
              icon: const Icon(Icons.qr_code, size: 20),
              tooltip: 'Escanear QR do crachá',
              onPressed: _startBadgeScanner,
            ),
          ),
          keyboardType: TextInputType.number,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(11),
          ],
          textInputAction: TextInputAction.done,
          onChanged: (v) => _employeeValue = v,
          onSubmitted: (_) {
            _employeeValue = _cpfController.text.trim();
          },
        ),
        const SizedBox(height: 12),

        // Or registration number
        TextField(
          controller: _matriculaController,
          decoration: InputDecoration(
            labelText: 'Matrícula',
            hintText: 'Nº de matrícula do funcionário',
            prefixIcon: const Icon(Icons.confirmation_number, size: 20),
            suffixIcon: IconButton(
              icon: const Icon(Icons.qr_code, size: 20),
              tooltip: 'Escanear QR do crachá',
              onPressed: _startBadgeScanner,
            ),
          ),
          textInputAction: TextInputAction.done,
          onChanged: (v) => _employeeValue = v,
          onSubmitted: (_) {
            _employeeValue = _matriculaController.text.trim();
            if (_employeeValue.trim().isNotEmpty) _doPreview();
          },
        ),
        const SizedBox(height: 24),

        // Preview button
        SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton.icon(
            onPressed: _isProcessing ? null : _doPreview,
            icon: _isProcessing
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.black),
                  )
                : const Icon(Icons.search),
            label: Text(_isProcessing ? 'Consultando...' : 'Confirmar Dados'),
          ),
        ),
      ],
    );
  }

  // ── PREVIEW ──

  Widget _buildPreviewState(ThemeData theme) {
    final preview = _previewResult!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Work post card
        _buildSectionCard(
          theme,
          icon: Icons.location_on,
          title: 'Posto de Trabalho',
          color: const Color(0xFFFFB800),
          children: [
            _infoRow('Nome', preview.workPostName ?? '--'),
            if (preview.workPostCode != null)
              _infoRow('Código', preview.workPostCode!),
            if (preview.workPostAddress != null)
              _infoRow('Endereço', preview.workPostAddress!),
            if (preview.clientName != null)
              _infoRow('Cliente', preview.clientName!),
          ],
        ),
        const SizedBox(height: 12),

        // Employee card
        if (preview.employee != null)
          _buildEmployeeCard(theme, preview.employee!),
        if (preview.employee != null) const SizedBox(height: 12),

        // Allocation card
        if (preview.allocation != null)
          _buildAllocationCard(theme, preview.allocation!),
        if (preview.allocation != null) const SizedBox(height: 12),

        // QR verified badge
        if (preview.qrCodeVerified == true)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.green.withAlpha(15),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.green.withAlpha(50)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.verified, color: Colors.green, size: 18),
                const SizedBox(width: 8),
                Text(
                  'QR Code verificado',
                  style: TextStyle(color: Colors.green[400], fontSize: 13, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        if (preview.qrCodeVerified == true) const SizedBox(height: 20),

        // Action buttons
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton.icon(
            onPressed: _isProcessing ? null : _doCheckin,
            icon: _isProcessing
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.black),
                  )
                : const Icon(Icons.check_circle),
            label: Text(_isProcessing ? 'Registrando...' : 'Confirmar Check-in'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: () {
            setState(() {
              _step = _CheckinStep.identifyingEmployee;
              _previewResult = null;
            });
          },
          style: OutlinedButton.styleFrom(foregroundColor: Colors.grey[400]),
          child: const Text('Voltar'),
        ),
      ],
    );
  }

  // ── POST SUMMARY / PICKER ──

  Widget _buildPostSummary(ThemeData theme) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF242438),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF2A2A3E)),
      ),
      child: Row(
        children: [
          const Icon(Icons.location_on, color: Color(0xFFFFB800), size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _foundPost!.displayName,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.edit, size: 16),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
            color: Colors.grey[500],
            onPressed: _reset,
          ),
        ],
      ),
    );
  }

  Widget _buildWorkPostPicker(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.location_on, color: Color(0xFFFFB800), size: 18),
            const SizedBox(width: 8),
            Text(
              'Selecionar Posto de Trabalho',
              style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (_isLoadingPosts)
          const Padding(
            padding: EdgeInsets.all(12),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (_allWorkPosts.isEmpty)
          Padding(
            padding: const EdgeInsets.all(12),
            child: Text(
              'Nenhum posto encontrado.',
              style: TextStyle(color: Colors.grey[500], fontSize: 13),
            ),
          )
        else
          SizedBox(
            height: 160,
            child: ListView.separated(
              itemCount: _allWorkPosts.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final post = _allWorkPosts[index];
                final isSelected = _foundPost?.id == post.id;
                return ListTile(
                  dense: true,
                  selected: isSelected,
                  selectedTileColor: const Color(0xFFFFB800).withAlpha(20),
                  leading: Icon(Icons.location_on, size: 18,
                      color: isSelected ? const Color(0xFFFFB800) : Colors.grey[500]),
                  title: Text(post.displayName, style: const TextStyle(fontSize: 13)),
                  subtitle: post.address != null
                      ? Text(post.address!, style: TextStyle(color: Colors.grey[500], fontSize: 11))
                      : null,
                  onTap: () {
                    setState(() => _foundPost = post);
                  },
                );
              },
            ),
          ),
        const SizedBox(height: 8),
      ],
    );
  }

  // ── CARDS ──

  Widget _buildPostCard(ThemeData theme, WorkPost post) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: Colors.green.withAlpha(25),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.location_on, size: 28, color: Colors.green),
            ),
            const SizedBox(height: 12),
            Text(
              post.displayName,
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            if (post.address != null) ...[
              const SizedBox(height: 6),
              Text(post.address!, style: TextStyle(color: Colors.grey[400], fontSize: 13), textAlign: TextAlign.center),
            ],
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _infoChip(Icons.business, post.clientName ?? 'N/A', Colors.blue),
                const SizedBox(width: 8),
                _infoChip(Icons.category, post.type ?? 'N/A', Colors.purple),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmployeeCard(ThemeData theme, EmployeeIdentification emp) {
    return _buildSectionCard(
      theme,
      icon: Icons.person,
      title: 'Funcionário',
      color: Colors.blue,
      children: [
        Row(
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: Colors.blue.withAlpha(25),
              child: Text(
                (emp.name ?? '?')[0].toUpperCase(),
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.blue),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    emp.name ?? '--',
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                  ),
                  if (emp.positionName != null)
                    Text(emp.positionName!, style: TextStyle(color: Colors.grey[400], fontSize: 12)),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (emp.cpf != null)
          _infoRow('CPF', emp.cpfMasked),
        if (emp.registrationNumber != null)
          _infoRow('Matrícula', emp.registrationNumber!),
        if (emp.departmentName != null)
          _infoRow('Departamento', emp.departmentName!),
        if (emp.workPostName != null)
          _infoRow('Posto Efetivo', emp.workPostName!),
        if (emp.companySigla != null)
          _infoRow('Empresa', emp.companySigla!),
        if (emp.matchedBy != null)
          _infoRow('Identificado por', _matchedByLabel(emp.matchedBy!)),
      ],
    );
  }

  Widget _buildAllocationCard(ThemeData theme, PostAllocation allocation) {
    final color = Color(allocation.typeColor);
    return _buildSectionCard(
      theme,
      icon: Icons.link,
      title: 'Vínculo com o Posto',
      color: color,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: color.withAlpha(25),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: color.withAlpha(60)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    allocation.type == 'EFFECTIVE'
                        ? Icons.check_circle
                        : allocation.type == 'REMANEJADO'
                            ? Icons.swap_horiz
                            : Icons.beach_access,
                    size: 14,
                    color: color,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    allocation.typeLabel,
                    style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ],
        ),
        if (allocation.message != null && allocation.message!.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            allocation.message!,
            style: TextStyle(color: Colors.grey[300], fontSize: 13, height: 1.4),
          ),
        ],
        if (allocation.effectiveWorkPostName != null) ...[
          const SizedBox(height: 6),
          _infoRow('Posto Titular', allocation.effectiveWorkPostName!),
        ],
        if (allocation.coveredEmployeeName != null) ...[
          const SizedBox(height: 6),
          _infoRow('Cobrindo', allocation.coveredEmployeeName!),
        ],
      ],
    );
  }

  Widget _buildSectionCard(
    ThemeData theme, {
    required IconData icon,
    required String title,
    required Color color,
    required List<Widget> children,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 18, color: color),
                const SizedBox(width: 8),
                Text(title, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
              ],
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(label, style: TextStyle(color: Colors.grey[500], fontSize: 12)),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }

  Widget _infoChip(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withAlpha(20),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withAlpha(50)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(color: color, fontSize: 11)),
        ],
      ),
    );
  }

  String _matchedByLabel(String matchedBy) {
    switch (matchedBy.toUpperCase()) {
      case 'QR_TOKEN':
        return 'QR Code do crachá';
      case 'CPF':
        return 'CPF';
      case 'MATRICULA':
        return 'Matrícula';
      default:
        return matchedBy;
    }
  }

  // ── ERROR / SUCCESS ──

  Widget _buildErrorCard() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.withAlpha(15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red.withAlpha(50)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: Colors.red, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  Widget _buildSuccessCard(ThemeData theme) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Icon(Icons.check_circle, color: Colors.green, size: 56),
            const SizedBox(height: 16),
            Text(
              'Check-in Realizado!',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold, color: Colors.green),
            ),
            const SizedBox(height: 8),
            Text(
              _successMessage ?? '',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[300], fontSize: 14, height: 1.5),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: _reset,
                icon: const Icon(Icons.qr_code_scanner),
                label: const Text('Novo Check-in'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── DIALOGS ──

  void _showManualCodeDialog() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A2E),
        title: const Text('Código do Posto'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            hintText: 'Ex: POSTO-001',
            prefixIcon: const Icon(Icons.location_on_outlined),
          ),
          autofocus: true,
          textInputAction: TextInputAction.done,
          onSubmitted: (v) {
            if (v.trim().isNotEmpty) {
              Navigator.of(ctx).pop();
              _onQrCodeDetected(v.trim());
            }
          },
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () {
              if (controller.text.trim().isNotEmpty) {
                Navigator.of(ctx).pop();
                _onQrCodeDetected(controller.text.trim());
              }
            },
            child: const Text('Buscar'),
          ),
        ],
      ),
    );
  }

  void _startBadgeScanner() {
    showDialog(
      context: context,
      builder: (_) => const _BadgeScannerModal(),
    ).then((scannedValue) {
      if (scannedValue is String && scannedValue.trim().isNotEmpty) {
        _onBadgeScanned(scannedValue.trim());
      }
    });
  }

  /// Called when a badge QR code is successfully scanned.
  Future<void> _onBadgeScanned(String badgeToken) async {
    setState(() {
      _employeeValue = badgeToken;
      _cpfController.text = badgeToken;
      _matriculaController.clear();
    });

    // Auto-trigger preview after a short delay for UI feedback
    await Future.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;
    await _doPreview();
  }
}

/// Modal de scanner de QR Code do crachá do funcionário.
///
/// Abre a câmera e retorna o valor lido (token do crachá) via Navigator.pop().
class _BadgeScannerModal extends StatefulWidget {
  const _BadgeScannerModal();

  @override
  State<_BadgeScannerModal> createState() => _BadgeScannerModalState();
}

class _BadgeScannerModalState extends State<_BadgeScannerModal> {
  MobileScannerController? _controller;
  bool _cameraReady = false;

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    _controller = MobileScannerController(
      torchEnabled: false,
      facing: CameraFacing.back,
    );
    try {
      await _controller!.start();
    } catch (_) {
      // Câmera pode falhar em emuladores
    }
    if (mounted) setState(() => _cameraReady = true);
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.all(16),
      backgroundColor: Colors.transparent,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Container(
          height: 500,
          decoration: BoxDecoration(
            color: Theme.of(context).scaffoldBackgroundColor,
          ),
          child: Column(
            children: [
              // Header
              _buildHeader(),
              // Camera preview
              Expanded(
                child: Stack(
                  children: [
                    MobileScanner(
                      controller: _controller,
                      onDetect: (capture) {
                        final barcode = capture.barcodes.firstOrNull;
                        if (barcode?.rawValue != null) {
                          Navigator.of(context).pop(barcode!.rawValue!);
                        }
                      },
                    ),
                    // Scan overlay frame
                    Center(
                      child: Container(
                        width: 200,
                        height: 200,
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: const Color(0xFFFFB800).withAlpha(180),
                            width: 2,
                          ),
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                    // Bottom hint overlay
                    Positioned(
                      bottom: 24,
                      left: 0,
                      right: 0,
                      child: Center(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.black54,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.qr_code, color: Colors.white, size: 16),
                              const SizedBox(width: 6),
                              Text(
                                'Centralize o QR Code do crachá no quadro',
                                style: const TextStyle(color: Colors.white, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    // Loading indicator
                    if (!_cameraReady)
                      const Center(child: CircularProgressIndicator()),
                  ],
                ),
              ),
              // Footer
              _buildFooter(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          bottom: BorderSide(color: Colors.grey.withAlpha(30)),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFFFFB800).withAlpha(25),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.badge, color: Color(0xFFFFB800), size: 20),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Escanear Crachá',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                Text(
                  'Aponte a câmera para o QR Code do crachá',
                  style: TextStyle(
                    color: Colors.grey,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      ),
    );
  }

  Widget _buildFooter() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          top: BorderSide(color: Colors.grey.withAlpha(30)),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          OutlinedButton.icon(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.cancel_outlined, size: 18),
            label: const Text('Cancelar'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.grey[400],
              side: BorderSide(color: Colors.grey[600]!),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
          ),
        ],
      ),
    );
  }
}

