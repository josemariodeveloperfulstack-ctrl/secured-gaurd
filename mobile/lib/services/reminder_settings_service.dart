import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Modo de notificação do lembrete de ponto.
enum ReminderSoundMode {
  /// Som + vibração
  sound,

  /// Apenas vibração, sem som
  vibrate,

  /// Silencioso (sem som, sem vibração)
  silent;

  String get label {
    switch (this) {
      case ReminderSoundMode.sound:
        return 'Som';
      case ReminderSoundMode.vibrate:
        return 'Vibração';
      case ReminderSoundMode.silent:
        return 'Silencioso';
    }
  }

  String get description {
    switch (this) {
      case ReminderSoundMode.sound:
        return 'Com som e vibração';
      case ReminderSoundMode.vibrate:
        return 'Apenas vibração';
      case ReminderSoundMode.silent:
        return 'Notificação silenciosa';
    }
  }
}

/// Serviço para persistir as configurações do lembrete diário de ponto.
class ReminderSettingsService {
  static final ReminderSettingsService _instance =
      ReminderSettingsService._();
  factory ReminderSettingsService() => _instance;
  ReminderSettingsService._();

  static const String _hourKey = 'ponto_reminder_hour';
  static const String _minuteKey = 'ponto_reminder_minute';
  static const String _earlyReminderKey = 'ponto_early_reminder_enabled';
  static const String _weekdaysOnlyKey = 'ponto_weekdays_only';
  static const String _soundModeKey = 'ponto_sound_mode';
  static const int _defaultHour = 8;
  static const int _defaultMinute = 0;

  Future<int> getReminderHour() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_hourKey) ?? _defaultHour;
  }

  Future<int> getReminderMinute() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_minuteKey) ?? _defaultMinute;
  }

  Future<bool> isEarlyReminderEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_earlyReminderKey) ?? false;
  }

  Future<void> setEarlyReminderEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_earlyReminderKey, enabled);
    debugPrint('[ReminderSettings] 🔔 Aviso prévio ${enabled ? "ativado" : "desativado"}');
  }

  Future<bool> isWeekdaysOnly() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_weekdaysOnlyKey) ?? false;
  }

  Future<void> setWeekdaysOnly(bool weekdaysOnly) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_weekdaysOnlyKey, weekdaysOnly);
    debugPrint('[ReminderSettings] 📆 Dias úteis ${weekdaysOnly ? "ativado" : "desativado"}');
  }

  /// Carrega o modo de som configurado (padrão: sound).
  Future<ReminderSoundMode> getSoundMode() async {
    final prefs = await SharedPreferences.getInstance();
    final index = prefs.getInt(_soundModeKey);
    if (index == null) return ReminderSoundMode.sound;
    return ReminderSoundMode.values[index.clamp(0, ReminderSoundMode.values.length - 1)];
  }

  /// Salva o modo de som.
  Future<void> setSoundMode(ReminderSoundMode mode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_soundModeKey, mode.index);
    debugPrint('[ReminderSettings] 🔉 Modo de som: ${mode.label}');
  }

  Future<void> saveReminderTime({
    required int hour,
    required int minute,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_hourKey, hour.clamp(0, 23));
    await prefs.setInt(_minuteKey, minute.clamp(0, 59));
    debugPrint(
      '[ReminderSettings] ⏰ Horário salvo: '
      '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}',
    );
  }

  /// Reseta para o padrão (08:00, som, desativa toggles extras).
  Future<void> resetToDefault() async {
    await saveReminderTime(hour: _defaultHour, minute: _defaultMinute);
    await setEarlyReminderEnabled(false);
    await setWeekdaysOnly(false);
    await setSoundMode(ReminderSoundMode.sound);
  }
}
