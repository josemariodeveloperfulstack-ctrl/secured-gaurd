import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';
import 'package:open_file/open_file.dart';
import '../../models/holerite.dart';
import '../../services/holerite_service.dart';

class HoleritesScreen extends StatefulWidget {
  const HoleritesScreen({super.key});

  @override
  State<HoleritesScreen> createState() => _HoleritesScreenState();
}

class _HoleritesScreenState extends State<HoleritesScreen> {
  final HoleriteService _service = HoleriteService();
  List<Holerite> _holerites = [];
  bool _isLoading = true;
  bool _isDownloading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadHolerites();
  }

  Future<void> _loadHolerites() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final holerites = await _service.getMyHolerites();
      if (mounted) {
        setState(() {
          _holerites = holerites;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = 'Erro ao carregar holerites';
        });
      }
    }
  }

  /// Agrupa holerites por ano (mais recente primeiro).
  Map<int, List<Holerite>> _groupByYear() {
    final map = <int, List<Holerite>>{};
    for (final h in _holerites) {
      map.putIfAbsent(h.year, () => []);
      map[h.year]!.add(h);
    }
    // Ordenar anos decrescente
    final sortedKeys = map.keys.toList()..sort((a, b) => b.compareTo(a));
    return {for (final k in sortedKeys) k: map[k]!};
  }

  Future<void> _downloadAndOpen(Holerite holerite) async {
    setState(() => _isDownloading = true);

    try {
      // Download do PDF
      final bytes = await _service.downloadHoleriteById(holerite.id);

      // Salvar em arquivo temporário
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/${holerite.fileName}');
      await file.writeAsBytes(bytes);

      // Abrir com visualizador padrão
      final result = await OpenFile.open(file.path);
      if (result.type != ResultType.done) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Erro ao abrir: ${result.message}'),
              backgroundColor: Colors.orange,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao baixar: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isDownloading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Meus Holerites'),
        actions: [
          if (_isDownloading)
            const Padding(
              padding: EdgeInsets.all(16),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadHolerites,
            tooltip: 'Recarregar',
          ),
        ],
      ),
      body: _buildBody(theme),
    );
  }

  Widget _buildBody(ThemeData theme) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.grey),
            const SizedBox(height: 16),
            Text(_error!, style: theme.textTheme.bodyLarge),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _loadHolerites,
              icon: const Icon(Icons.refresh),
              label: const Text('Tentar novamente'),
            ),
          ],
        ),
      );
    }

    if (_holerites.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.description_outlined,
                size: 64, color: Colors.grey.withAlpha(80)),
            const SizedBox(height: 16),
            Text(
              'Nenhum holerite encontrado',
              style: theme.textTheme.titleMedium?.copyWith(
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Seus holerites aparecerão aqui\nassim que forem processados.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: Colors.grey.withAlpha(150),
              ),
            ),
          ],
        ),
      );
    }

    final grouped = _groupByYear();

    return RefreshIndicator(
      onRefresh: _loadHolerites,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Header com total
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Text(
              '${_holerites.length} holerite(s) disponívei(s)',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: Colors.grey,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),

          // Lista agrupada por ano
          ...grouped.entries.map((entry) {
            final year = entry.key;
            final holerites = entry.value;

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    year.toString(),
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                ...holerites.map((h) =>                    _HoleriteCard(
                      holerite: h,
                      onTap: () => _downloadAndOpen(h),
                    )),
                const SizedBox(height: 8),
              ],
            );
          }),
        ],
      ),
    );
  }
}

class _HoleriteCard extends StatelessWidget {
  final Holerite holerite;
  final VoidCallback onTap;

  const _HoleriteCard({
    required this.holerite,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: Colors.blue.withAlpha(25),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.description, color: Colors.blue),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    holerite.displayLabel,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                    ),
                  ),
                  if (holerite.companySigla != null)
                    Text(
                      holerite.companySigla!,
                      style: TextStyle(
                        color: Colors.grey.withAlpha(180),
                        fontSize: 12,
                      ),
                    ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.download, size: 20),
              onPressed: onTap,
              tooltip: 'Baixar e visualizar',
            ),
          ],
        ),
      ),
    );
  }
}
