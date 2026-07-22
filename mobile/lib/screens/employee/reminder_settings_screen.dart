import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../services/reminder_settings_service.dart';
import '../../services/notification_service.dart';

const _soundModes = ReminderSoundMode.values;

Color _colorForMode(ReminderSoundMode mode) {
  switch (mode) {
    case ReminderSoundMode.sound:
      return Colors.blue;
    case ReminderSoundMode.vibrate:
      return Colors.amber;
    case ReminderSoundMode.silent:
      return Colors.grey;
  }
}

IconData _iconForMode(ReminderSoundMode mode) {
  switch (mode) {
    case ReminderSoundMode.sound:
      return Icons.volume_up;
    case ReminderSoundMode.vibrate:
      return Icons.vibration;
    case ReminderSoundMode.silent:
      return Icons.notifications_off;
  }
}

/// Tela de configuração do lembrete diário de ponto.
///
/// Permite ao funcionário escolher o horário em que deseja ser
/// lembrado de bater o ponto, com feedback visual do agendamento.
/// Também permite ativar um aviso prévio opcional 15 minutos antes.
class ReminderSettingsScreen extends StatefulWidget {
  const ReminderSettingsScreen({super.key});

  @override
  State<ReminderSettingsScreen> createState() => _ReminderSettingsScreenState();
}

class _ReminderSettingsScreenState extends State<ReminderSettingsScreen> {
  final ReminderSettingsService _settings = ReminderSettingsService();

  int _hour = 8;
  int _minute = 0;
  bool _earlyEnabled = false;
  bool _weekdaysOnly = false;
  ReminderSoundMode _soundMode = ReminderSoundMode.sound;
  bool _isLoading = true;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final hour = await _settings.getReminderHour();
    final minute = await _settings.getReminderMinute();
    final earlyEnabled = await _settings.isEarlyReminderEnabled();
    final weekdaysOnly = await _settings.isWeekdaysOnly();
    final soundMode = await _settings.getSoundMode();
    if (mounted) {
      setState(() {
        _hour = hour;
        _minute = minute;
        _earlyEnabled = earlyEnabled;
        _weekdaysOnly = weekdaysOnly;
        _soundMode = soundMode;
        _isLoading = false;
      });
    }
  }

  /// Retorna o horário do aviso prévio (15 min antes) formatado.
  String get _earlyTimeDisplay {
    final total = _hour * 60 + _minute - 15;
    if (total < 0) return '---';
    final earlyHour = total ~/ 60;
    final earlyMinute = total % 60;
    return '${earlyHour.toString().padLeft(2, '0')}:${earlyMinute.toString().padLeft(2, '0')}';
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: _hour, minute: _minute),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: Theme.of(context).colorScheme.copyWith(
                  primary: const Color(0xFFFFB800),
                ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _hour = picked.hour;
        _minute = picked.minute;
      });
    }
  }

  Future<void> _save() async {
    setState(() => _isSaving = true);

    try {
      // Persistir configurações
      await _settings.saveReminderTime(hour: _hour, minute: _minute);
      await _settings.setEarlyReminderEnabled(_earlyEnabled);
      await _settings.setWeekdaysOnly(_weekdaysOnly);
      await _settings.setSoundMode(_soundMode);

      // Reagendar usando método combinado
      await NotificationService().scheduleAllPontoReminders(
        hour: _hour,
        minute: _minute,
        earlyEnabled: _earlyEnabled,
        weekdaysOnly: _weekdaysOnly,
        soundMode: _soundMode,
      );

      if (mounted) {
        final parts = <String>[
          '${_hour.toString().padLeft(2, '0')}:${_minute.toString().padLeft(2, '0')}',
        ];
        if (_earlyEnabled) parts.add('aviso às $_earlyTimeDisplay');
        if (_weekdaysOnly) parts.add('dias úteis');
        else parts.add('todos os dias');
        parts.add(_soundMode.label.toLowerCase());
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white, size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Text('Lembrete configurado: ${parts.join(', ')}'),
                ),
              ],
            ),
            backgroundColor: Colors.green.shade700,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Erro ao salvar configuração'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _resetToDefault() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Restaurar padrão'),
        content: const Text('Voltar o lembrete para 08:00 e desativar aviso prévio?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Restaurar'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await _settings.resetToDefault();
      await _loadSettings();
      await NotificationService().scheduleAllPontoReminders(
        hour: 8,
        minute: 0,
        earlyEnabled: false,
        weekdaysOnly: false,
        soundMode: ReminderSoundMode.sound,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Lembrete restaurado para 08:00, aviso desativado'),
            backgroundColor: Colors.green,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final formatter = DateFormat('HH:mm', 'pt_BR');
    final timeDisplay = formatter.format(
      DateTime(2024, 1, 1, _hour, _minute),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Configurar Lembrete'),
        actions: [
          if (!_isLoading)
            IconButton(
              icon: const Icon(Icons.restore),
              onPressed: _resetToDefault,
              tooltip: 'Restaurar padrão (08:00)',
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Card principal - seletor de horário
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      children: [
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            color: theme.colorScheme.primary.withAlpha(15),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Icon(
                            Icons.alarm,
                            size: 40,
                            color: theme.colorScheme.primary,
                          ),
                        ),
                        const SizedBox(height: 20),

                        const Text(
                          'Lembrete de Ponto Eletrônico',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Escolha o horário para receber o lembrete\ndiário de bater o ponto.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.grey[400],
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Time display card
                        InkWell(
                          onTap: _pickTime,
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(
                              vertical: 20,
                              horizontal: 24,
                            ),
                            decoration: BoxDecoration(
                              color: theme.colorScheme.primary.withAlpha(10),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: theme.colorScheme.primary.withAlpha(40),
                              ),
                            ),
                            child: Column(
                              children: [
                                Text(
                                  'Horário do lembrete',
                                  style: TextStyle(
                                    color: Colors.grey[500],
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.schedule,
                                      color: theme.colorScheme.primary,
                                      size: 28,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      timeDisplay,
                                      style: TextStyle(
                                        fontSize: 48,
                                        fontWeight: FontWeight.w900,
                                        color: theme.colorScheme.primary,
                                        letterSpacing: 2,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Toque para alterar',
                                  style: TextStyle(
                                    color: Colors.grey[500],
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // ====== Aviso prévio toggle ======
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: _earlyEnabled
                                ? Colors.orange.withAlpha(8)
                                : Colors.grey.withAlpha(8),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: _earlyEnabled
                                  ? Colors.orange.withAlpha(50)
                                  : Colors.grey.withAlpha(30),
                            ),
                          ),
                          child: Column(
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    Icons.notifications_active,
                                    size: 22,
                                    color: _earlyEnabled
                                        ? Colors.orange
                                        : Colors.grey,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Aviso prévio',
                                          style: TextStyle(
                                            fontWeight: FontWeight.w600,
                                            fontSize: 15,
                                            color: _earlyEnabled
                                                ? Colors.orange
                                                : Colors.grey[300],
                                          ),
                                        ),
                                        Text(
                                          _earlyEnabled
                                              ? 'Receba um alerta 15 minutos antes'
                                              : 'Toque para ativar',
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: Colors.grey[500],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Switch(
                                    value: _earlyEnabled,
                                    activeColor: Colors.orange,
                                    onChanged: (v) {
                                      setState(() => _earlyEnabled = v);
                                    },
                                  ),
                                ],
                              ),
                              if (_earlyEnabled) ...[
                                const SizedBox(height: 12),
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 8,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.orange.withAlpha(15),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.access_time,
                                        size: 16,
                                        color: Colors.orange[300],
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        'Aviso às $_earlyTimeDisplay '
                                        '(15 min antes)',
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: Colors.orange[200],
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),

                        // ====== Dias úteis toggle ======
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: _weekdaysOnly
                                ? Colors.teal.withAlpha(8)
                                : Colors.grey.withAlpha(8),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: _weekdaysOnly
                                  ? Colors.teal.withAlpha(50)
                                  : Colors.grey.withAlpha(30),
                            ),
                          ),
                          child: Column(
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    Icons.calendar_view_week,
                                    size: 22,
                                    color: _weekdaysOnly
                                        ? Colors.teal
                                        : Colors.grey,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Apenas dias úteis',
                                          style: TextStyle(
                                            fontWeight: FontWeight.w600,
                                            fontSize: 15,
                                            color: _weekdaysOnly
                                                ? Colors.teal
                                                : Colors.grey[300],
                                          ),
                                        ),
                                        Text(
                                          _weekdaysOnly
                                              ? 'Seg a Sex, sem fins de semana'
                                              : 'Todos os dias da semana',
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: Colors.grey[500],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Switch(
                                    value: _weekdaysOnly,
                                    activeColor: Colors.teal,
                                    activeTrackColor: Colors.teal.withAlpha(80),
                                    onChanged: (v) {
                                      setState(() => _weekdaysOnly = v);
                                    },
                                  ),
                                ],
                              ),
                              if (_weekdaysOnly) ...[
                                const SizedBox(height: 12),
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 8,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.teal.withAlpha(15),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.info_outline,
                                        size: 14,
                                        color: Colors.teal[300],
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          'O lembrete não será enviado em sábados e domingos.',
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: Colors.teal[200],
                                            height: 1.3,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),

                        // ====== Modo de som ======
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.grey.withAlpha(8),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.grey.withAlpha(30)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    _soundMode == ReminderSoundMode.sound
                                        ? Icons.volume_up
                                        : _soundMode == ReminderSoundMode.vibrate
                                            ? Icons.vibration
                                            : Icons.notifications_off,
                                    size: 22,
                                    color: _soundMode == ReminderSoundMode.sound
                                        ? Colors.blue
                                        : _soundMode == ReminderSoundMode.vibrate
                                            ? Colors.amber
                                            : Colors.grey,
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                    'Modo de notificação',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: 15,
                                      color: Colors.grey[300],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              ..._soundModes.map((mode) {
                                final selected = _soundMode == mode;
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 4),
                                  child: InkWell(
                                    onTap: () => setState(() => _soundMode = mode),
                                    borderRadius: BorderRadius.circular(10),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 10,
                                      ),
                                      decoration: BoxDecoration(
                                        color: selected
                                            ? _colorForMode(mode).withAlpha(15)
                                            : Colors.transparent,
                                        borderRadius: BorderRadius.circular(10),
                                        border: selected
                                            ? Border.all(
                                                color: _colorForMode(mode).withAlpha(60))
                                            : null,
                                      ),
                                      child: Row(
                                        children: [
                                          Icon(
                                            _iconForMode(mode),
                                            size: 18,
                                            color: selected
                                                ? _colorForMode(mode)
                                                : Colors.grey[500],
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  mode.label,
                                                  style: TextStyle(
                                                    fontWeight: FontWeight.w600,
                                                    fontSize: 14,
                                                    color: selected
                                                        ? Colors.white
                                                        : Colors.grey[400],
                                                  ),
                                                ),
                                                Text(
                                                  mode.description,
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    color: Colors.grey[600],
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          Radio<ReminderSoundMode>(
                                            value: mode,
                                            groupValue: _soundMode,
                                            activeColor: _colorForMode(mode),
                                            onChanged: (v) {
                                              if (v != null) setState(() => _soundMode = v);
                                            },
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              }),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Informações
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.blue.withAlpha(10),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: Colors.blue.withAlpha(30),
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.info_outline,
                                size: 18,
                                color: Colors.blue[400],
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'As notificações são enviadas diariamente. '
                                  'Após bater o ponto, os lembretes são '
                                  'reagendados para o dia seguinte.',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.blue[200],
                                    height: 1.4,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Botão salvar
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton.icon(
                    onPressed: _isSaving ? null : _save,
                    icon: _isSaving
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.black,
                            ),
                          )
                        : const Icon(Icons.check),
                    label: Text(
                      _isSaving
                          ? 'Salvando...'
                          : 'Salvar e agendar para ${timeDisplay}h',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                // Botão restaurar padrão
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: _resetToDefault,
                    icon: const Icon(Icons.restore, size: 18),
                    label: const Text('Restaurar padrão (08:00)'),
                  ),
                ),
              ],
            ),
    );
  }
}
