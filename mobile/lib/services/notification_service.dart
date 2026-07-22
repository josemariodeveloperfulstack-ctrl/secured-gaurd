import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz_data;
import 'reminder_settings_service.dart';

/// Serviço de notificações locais para o app Secured Guard.
class NotificationService {
  static final NotificationService _instance = NotificationService._();
  factory NotificationService() => _instance;
  NotificationService._();

  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  bool _initialized = false;

  // ---- IDs ----
  static const int _dailyPontoReminderId = 2001;
  static const int _dailyPontoEarlyReminderId = 2002;
  // IDs para cada dia da semana (seg=2101, ter=2102, ... sex=2105)
  static const int _weekdayBaseMain = 2100;
  static const int _weekdayBaseEarly = 2200;

  GlobalKey<NavigatorState>? navigatorKey;
  void Function(BuildContext)? onNotificationTap;
  void Function(BuildContext)? onPontoReminderTap;

  Future<void> initialize() async {
    if (_initialized) return;
    tz_data.initializeTimeZones();

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    const settings = InitializationSettings(android: androidSettings, iOS: iosSettings);

    await _plugin.initialize(
      settings,
      onDidReceiveNotificationResponse: _onNotificationResponse,
    );

    final androidPlugin = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    await androidPlugin?.requestNotificationsPermission();

    _initialized = true;
    debugPrint('[NotificationService] ✅ Inicializado');
  }

  void _onNotificationResponse(NotificationResponse response) {
    final payload = response.payload;
    if (payload == 'replay_done') {
      final ctx = navigatorKey?.currentContext;
      if (ctx != null && ctx.mounted) onNotificationTap?.call(ctx);
    } else if (payload == 'daily_ponto_reminder' ||
        payload == 'daily_ponto_early_reminder') {
      final ctx = navigatorKey?.currentContext;
      if (ctx != null && ctx.mounted) onPontoReminderTap?.call(ctx);
    }
  }

  // ========================= helpers =========================

  /// Calcula o próximo [tz.TZDateTime] para [hour]:[minute].
  /// Se já passou hoje, retorna amanhã.
  tz.TZDateTime _nextDateTime(int hour, int minute) {
    final now = DateTime.now();
    final loc = tz.local;
    var dt = tz.TZDateTime(loc, now.year, now.month, now.day, hour, minute);
    if (dt.isBefore(tz.TZDateTime.from(now, loc))) {
      dt = dt.add(const Duration(days: 1));
    }
    return dt;
  }

  /// Calcula o próximo [tz.TZDateTime] para um dia da semana específico.
  /// [weekday] segue DateTime: 1=Monday ... 7=Sunday
  tz.TZDateTime _nextWeekday(int weekday, int hour, int minute) {
    final now = DateTime.now();
    final loc = tz.local;
    var dt = tz.TZDateTime(loc, now.year, now.month, now.day, hour, minute);
    // Avançar dia a dia até encontrar o weekday desejado
    for (int i = 0; i < 8; i++) {
      if (dt.weekday == weekday && dt.isAfter(tz.TZDateTime.from(now, loc))) {
        return dt;
      }
      dt = dt.add(const Duration(days: 1));
    }
    // Fallback: 7 dias à frente (nunca deve chegar aqui)
    return dt.add(const Duration(days: 7));
  }

  /// Constrói [NotificationDetails] com base no modo de som escolhido.
  NotificationDetails _buildPontoDetails(ReminderSoundMode mode) {
    final playSound = mode == ReminderSoundMode.sound;
    final vibrate = mode != ReminderSoundMode.silent;

    // Para silent, rebaixar importância para LOW (não mostra som/vibração)
    final importance = mode == ReminderSoundMode.silent
        ? Importance.low
        : Importance.high;
    final priority = mode == ReminderSoundMode.silent
        ? Priority.defaultPriority
        : Priority.defaultPriority;

    return NotificationDetails(
      android: AndroidNotificationDetails(
        'daily_ponto_channel',
        'Lembrete de Ponto',
        channelDescription: 'Lembrete para bater o ponto eletrônico',
        importance: importance,
        priority: priority,
        icon: '@mipmap/ic_launcher',
        enableVibration: vibrate,
        playSound: playSound,
        showWhen: true,
        category: AndroidNotificationCategory.reminder,
      ),
      iOS: DarwinNotificationDetails(
        presentAlert: playSound,
        presentBadge: true,
        presentSound: playSound,
      ),
    );
  }

  // ========================= agenda combinada =========================

  /// Agenda todos os lembretes com base nas configurações fornecidas.
  /// [soundMode] controla som/vibração/silencioso.
  Future<void> scheduleAllPontoReminders({
    required int hour,
    required int minute,
    required bool earlyEnabled,
    required bool weekdaysOnly,
    ReminderSoundMode soundMode = ReminderSoundMode.sound,
  }) async {
    if (!_initialized) {
      debugPrint('[NotificationService] ⚠️ Não inicializado para agendar');
      return;
    }

    await _cancelAllPonto();

    if (weekdaysOnly) {
      await _scheduleWeekdaysOnly(hour, minute, earlyEnabled, soundMode);
    } else {
      await _scheduleDaily(hour, minute, earlyEnabled, soundMode);
    }
  }

  /// Cancela todos os lembretes de ponto (daily + weekday).
  Future<void> cancelDailyPontoReminder() async {
    await _cancelAllPonto();
  }

  Future<void> _cancelAllPonto() async {
    if (!_initialized) return;
    await _plugin.cancel(_dailyPontoReminderId);
    await _plugin.cancel(_dailyPontoEarlyReminderId);
    for (int d = 1; d <= 5; d++) {
      await _plugin.cancel(_weekdayBaseMain + d);
      await _plugin.cancel(_weekdayBaseEarly + d);
    }
    debugPrint('[NotificationService] ❌ Todos os lembretes cancelados');
  }

  /// Agenda lembretes diários (todos os dias).
  Future<void> _scheduleDaily(
      int hour, int minute, bool earlyEnabled, ReminderSoundMode soundMode) async {
    final details = _buildPontoDetails(soundMode);
    // Principal
    final mainDate = _nextDateTime(hour, minute);
    await _plugin.zonedSchedule(
      _dailyPontoReminderId,
      'Secured Guard',
      'Não esqueça de bater o ponto hoje!',
      mainDate,
      details,
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
      matchDateTimeComponents: DateTimeComponents.time,
      payload: 'daily_ponto_reminder',
    );

    if (!earlyEnabled) {
      debugPrint('[NotificationService] 📅 Lembrete diário às '
          '${mainDate.hour.toString().padLeft(2, '0')}:'
          '${mainDate.minute.toString().padLeft(2, '0')}');
      return;
    }

    // Early
    final total = hour * 60 + minute - 15;
    if (total >= 0) {
      final eh = total ~/ 60;
      final em = total % 60;
      final earlyDate = _nextDateTime(eh, em);
      await _plugin.zonedSchedule(
        _dailyPontoEarlyReminderId,
        'Secured Guard',
        'Seu ponto vai fechar em 15 minutos!',
        earlyDate,
        details,
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
        matchDateTimeComponents: DateTimeComponents.time,
        payload: 'daily_ponto_early_reminder',
      );
    }
    debugPrint('[NotificationService] 📅 Lembrete diário + aviso agendados');
  }

  /// Agenda lembretes apenas para dias úteis (seg-sex), um por dia.
  Future<void> _scheduleWeekdaysOnly(
      int hour, int minute, bool earlyEnabled, ReminderSoundMode soundMode) async {
    final details = _buildPontoDetails(soundMode);
    final weekdayNames = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
    final earlyTotal = hour * 60 + minute - 15;
    final canEarly = earlyEnabled && earlyTotal >= 0;
    final earlyHour = earlyTotal ~/ 60;
    final earlyMin = earlyTotal % 60;

    for (int day = 1; day <= 5; day++) {
      // Main
      final mainDate = _nextWeekday(day, hour, minute);
      await _plugin.zonedSchedule(
        _weekdayBaseMain + day,
        'Secured Guard',
        'Não esqueça de bater o ponto hoje!',
        mainDate,
        details,
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
        matchDateTimeComponents: DateTimeComponents.dayOfWeekAndTime,
        payload: 'daily_ponto_reminder',
      );

      // Early
      if (canEarly) {
        final earlyDate = _nextWeekday(day, earlyHour, earlyMin);
        await _plugin.zonedSchedule(
          _weekdayBaseEarly + day,
          'Secured Guard',
          'Seu ponto vai fechar em 15 minutos!',
          earlyDate,
          details,
          androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
          uiLocalNotificationDateInterpretation:
              UILocalNotificationDateInterpretation.absoluteTime,
          matchDateTimeComponents: DateTimeComponents.dayOfWeekAndTime,
          payload: 'daily_ponto_early_reminder',
        );
      }
      debugPrint('[NotificationService] 📅 ${weekdayNames[day]} às '
          '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}');
    }
    debugPrint('[NotificationService] 📅 Lembretes de dias úteis agendados');
  }

  /// Mostra notificação de conclusão do replay.
  Future<void> showReplayComplete({
    required int successCount,
    required int failureCount,
    required int total,
  }) async {
    final allOk = failureCount == 0;
    final title = allOk ? '✅ Fila offline reenviada' : '⚠️ Reenvio parcial concluído';
    final body = allOk
        ? '$total requisição${total == 1 ? '' : 'ões'} reenviada${total == 1 ? '' : 's'} com sucesso.'
        : '$successCount de $total reenviada${total == 1 ? '' : 's'}, $failureCount falha${failureCount == 1 ? '' : 's'}';
    await show(title: title, body: body, payload: 'replay_done');
  }

  /// Mostra uma notificação local avulsa.
  Future<void> show({
    required String title,
    required String body,
    String? payload,
  }) async {
    if (!_initialized) return;
    final id = DateTime.now().millisecondsSinceEpoch.remainder(100000);
    const androidDetails = AndroidNotificationDetails(
      'offline_queue_channel',
      'Fila Offline',
      channelDescription: 'Notificações sobre o reenvio de requisições offline',
      importance: Importance.high,
      priority: Priority.defaultPriority,
      icon: '@mipmap/ic_launcher',
      enableVibration: true,
      playSound: true,
      showWhen: true,
    );
    const iosDetails = DarwinNotificationDetails(
      presentAlert: true, presentBadge: true, presentSound: true,
    );
    const details = NotificationDetails(android: androidDetails, iOS: iosDetails);
    await _plugin.show(id, title, body, details, payload: payload);
    debugPrint('[NotificationService] 🔔 Notificação: $title');
  }
}
