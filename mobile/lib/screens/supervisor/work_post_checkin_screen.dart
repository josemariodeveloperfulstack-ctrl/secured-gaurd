import 'dart:async';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import '../../models/work_post.dart';
import '../../services/work_post_service.dart';
import '../../services/supervisor_visit_service.dart';
import '../../providers/auth_provider.dart';

/// Tela de Check-in no Posto de Trabalho via QR Code e GPS.
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
  WorkPost? _scannedPost;
  bool _isScanning = false;
  bool _isLoadingLocation = false;
  bool _isRegistering = false;
  String? _error;
  String? _successMessage;

  @override
  void initState() {
    super.initState();
    _requestLocation();
  }

  @override
  void dispose() {
    _scannerController?.dispose();
    super.dispose();
  }

  Future<void> _requestLocation() async {
    setState(() => _isLoadingLocation = true);

    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() {
          _error = 'Ative a localização para fazer check-in.';
          _isLoadingLocation = false;
        });
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          setState(() {
            _error = 'Permissão de localização negada.';
            _isLoadingLocation = false;
          });
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        setState(() {
          _error = 'Permissão de localização negada permanentemente.';
          _isLoadingLocation = false;
        });
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
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Erro ao obter localização.';
        _isLoadingLocation = false;
      });
    }
  }

  void _startScanner() {
    _scannerController = MobileScannerController();
    setState(() {
      _isScanning = true;
      _error = null;
      _scannedPost = null;
    });
  }

  void _stopScanner() {
    _scannerController?.dispose();
    _scannerController = null;
    setState(() => _isScanning = false);
  }

  void _onQrCodeDetected(String code) async {
    // Parar o scanner após detecção
    _stopScanner();

    setState(() => _isLoadingLocation = true);

    try {
      // O QR Code pode conter o código do posto ou ID
      String postCode = code.trim();

      // Tentar buscar o posto pelo código
      final post = await _workPostService.getWorkPostByCode(postCode);

      if (!mounted) return;

      if (post != null) {
        setState(() {
          _scannedPost = post;
          _isLoadingLocation = false;
          _error = null;
        });
      } else {
        // Tentar como ID
        final postById = await _workPostService.getWorkPostById(postCode);
        if (!mounted) return;

        if (postById != null) {
          setState(() {
            _scannedPost = postById;
            _isLoadingLocation = false;
            _error = null;
          });
        } else {
          setState(() {
            _error = 'Posto de trabalho não encontrado para o código: $postCode';
            _isLoadingLocation = false;
          });
        }
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Erro ao buscar posto de trabalho.';
        _isLoadingLocation = false;
      });
    }
  }

  Future<void> _doCheckin() async {
    if (_scannedPost == null) return;

    setState(() {
      _isRegistering = true;
      _error = null;
      _successMessage = null;
    });

    try {
      final user = context.read<AuthProvider>().user;
      final now = DateTime.now();

      // Criar uma visita com check-in
      final visitData = {
        'workPostId': _scannedPost!.id,
        'workPostName': _scannedPost!.name,
        'workPostCode': _scannedPost!.postCode,
        'location': _scannedPost!.address ?? 'Posto: ${_scannedPost!.name}',
        'supervisorId': user?.id,
        'supervisorName': user?.name,
        'visitDate': now.toIso8601String().split('T').first,
        'scheduledAt': now.toIso8601String(),
        'startedAt': now.toIso8601String(),
        'observations': _currentPosition != null
            ? 'Check-in via app móvel. Lat: ${_currentPosition!.latitude}, Lon: ${_currentPosition!.longitude}'
            : 'Check-in via app móvel.',
        'status': 'IN_PROGRESS',
      };

      final created = await _visitService.createVisit(visitData);

      // Iniciar a visita
      if (created != null) {
        await _visitService.startVisit(created.id);
      }

      if (!mounted) return;

      setState(() {
        _isRegistering = false;
        _successMessage =
            'Check-in realizado em ${_scannedPost!.displayName}!';
        _scannedPost = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isRegistering = false;
        _error = 'Erro ao realizar check-in.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Check-in no Posto'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status da localização
            _buildLocationStatus(theme),
            const SizedBox(height: 16),

            // Scanner ou resultado
            if (_isScanning)
              _buildScanner(theme)
            else if (_scannedPost != null)
              _buildPostResult(theme)
            else
              _buildIdleState(theme),

            // Error
            if (_error != null) ...[
              const SizedBox(height: 16),
              Container(
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
                      child: Text(
                        _error!,
                        style: const TextStyle(color: Colors.red, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Success
            if (_successMessage != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.green.withAlpha(15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.green.withAlpha(50)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle, color: Colors.green, size: 24),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _successMessage!,
                        style: const TextStyle(color: Colors.green),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: () {
                  setState(() {
                    _successMessage = null;
                    _error = null;
                  });
                },
                icon: const Icon(Icons.qr_code_scanner),
                label: const Text('Novo Check-in'),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildLocationStatus(ThemeData theme) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: _currentPosition != null
                    ? Colors.green.withAlpha(25)
                    : Colors.orange.withAlpha(25),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                Icons.gps_fixed,
                color: _currentPosition != null ? Colors.green : Colors.orange,
                size: 22,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Localização',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _isLoadingLocation
                        ? 'Obtendo localização...'
                        : _currentPosition != null
                            ? 'Lat: ${_currentPosition!.latitude.toStringAsFixed(4)}, Lon: ${_currentPosition!.longitude.toStringAsFixed(4)}'
                            : 'Localização não disponível',
                    style: TextStyle(
                      color: Colors.grey[400],
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            if (_isLoadingLocation)
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildScanner(ThemeData theme) {
    return Column(
      children: [
        Container(
          height: 300,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: const Color(0xFFFFB800),
              width: 2,
            ),
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
        const SizedBox(height: 16),
        Text(
          'Aponte a câmera para o QR Code do posto',
          style: TextStyle(color: Colors.grey[400], fontSize: 13),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 16),
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

  Widget _buildIdleState(ThemeData theme) {
    return Column(
      children: [
        Container(
          height: 200,
          decoration: BoxDecoration(
            color: const Color(0xFF242438),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF2A2A3E)),
          ),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.qr_code_scanner,
                  size: 64,
                  color: Colors.grey[600],
                ),
                const SizedBox(height: 16),
                Text(
                  'Leia o QR Code do Posto',
                  style: TextStyle(
                    color: Colors.grey[400],
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'ou informe o código manualmente',
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Scan button
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton.icon(
            onPressed: _startScanner,
            icon: const Icon(Icons.qr_code_scanner),
            label: const Text('Ler QR Code'),
          ),
        ),
        const SizedBox(height: 12),

        // Manual code input
        OutlinedButton.icon(
          onPressed: () => _showManualCodeDialog(),
          icon: const Icon(Icons.edit),
          label: const Text('Digitar Código Manualmente'),
          style: OutlinedButton.styleFrom(
            foregroundColor: Colors.grey[300],
            side: BorderSide(color: Colors.grey[600]!),
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPostResult(ThemeData theme) {
    final post = _scannedPost!;

    return Column(
      children: [
        // Post info card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: Colors.green.withAlpha(25),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(
                    Icons.location_on,
                    size: 32,
                    color: Colors.green,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  post.displayName,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                if (post.address != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    post.address!,
                    style: TextStyle(
                      color: Colors.grey[400],
                      fontSize: 13,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
                if (post.city != null && post.state != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    '${post.city}, ${post.state}',
                    style: TextStyle(
                      color: Colors.grey[500],
                      fontSize: 12,
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _buildInfoChip(
                      Icons.business,
                      post.clientName ?? 'N/A',
                      Colors.blue,
                    ),
                    const SizedBox(width: 8),
                    _buildInfoChip(
                      Icons.category,
                      post.type ?? 'N/A',
                      Colors.purple,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // GPS info
        if (_currentPosition != null)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF242438),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF2A2A3E)),
            ),
            child: Row(
              children: [
                const Icon(Icons.location_on, color: Colors.green, size: 18),
                const SizedBox(width: 8),
                Text(
                  'GPS: ${_currentPosition!.latitude.toStringAsFixed(6)}, ${_currentPosition!.longitude.toStringAsFixed(6)}',
                  style: const TextStyle(
                    color: Colors.grey,
                    fontSize: 12,
                    fontFamily: 'monospace',
                  ),
                ),
              ],
            ),
          ),
        const SizedBox(height: 24),

        // Check-in button
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton.icon(
            onPressed: _isRegistering ? null : _doCheckin,
            icon: _isRegistering
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      color: Colors.black,
                    ),
                  )
                : const Icon(Icons.check_circle),
            label: Text(_isRegistering ? 'Registrando...' : 'Fazer Check-in'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Cancel
        OutlinedButton(
          onPressed: () {
            setState(() {
              _scannedPost = null;
              _error = null;
            });
          },
          style: OutlinedButton.styleFrom(
            foregroundColor: Colors.grey[400],
          ),
          child: const Text('Cancelar'),
        ),
      ],
    );
  }

  Widget _buildInfoChip(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withAlpha(20),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withAlpha(50)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(color: color, fontSize: 12),
          ),
        ],
      ),
    );
  }

  void _showManualCodeDialog() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A2E),
        title: const Text('Código do Posto'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            hintText: 'Ex: POSTO-001',
            prefixIcon: Icon(Icons.location_on_outlined),
          ),
          autofocus: true,
          textInputAction: TextInputAction.done,
          onSubmitted: (value) {
            if (value.trim().isNotEmpty) {
              Navigator.of(context).pop();
              _onQrCodeDetected(value.trim());
            }
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              if (controller.text.trim().isNotEmpty) {
                Navigator.of(context).pop();
                _onQrCodeDetected(controller.text.trim());
              }
            },
            child: const Text('Buscar'),
          ),
        ],
      ),
    );
  }
}
