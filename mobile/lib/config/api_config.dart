/// Configuração de endpoints da API do Secured Guard.
///
/// Altere [baseUrl] conforme o ambiente:
/// - Emulador Android: `http://10.0.2.2:8083`
/// - Emulador iOS: `http://localhost:8083`
/// - Produção: `https://app.z7botsolutions.com.br`
class ApiConfig {
  ApiConfig._();

  /// Base URL da API (sem trailing slash).
  /// Para produção, definir via construtor ou env-var futuramente.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8083',
  );

  // Auth
  static const String authLogin = '/api/auth/login';
  static const String authRegister = '/api/auth/register';
  static const String authRefreshToken = '/api/auth/refresh-token';
  static const String authMe = '/api/auth/me';
  static const String authHealth = '/api/auth/test/health';

  // Supervisor Auth
  static const String supervisorLoginCpf = '/api/supervisor-auth/login-cpf';
  static const String supervisorLoginFacial =
      '/api/supervisor-auth/login-facial';
  static const String supervisorAcceptTerms =
      '/api/supervisor-auth/accept-terms';
  static const String supervisorCheckTerms = '/api/supervisor-auth/check-terms';

  // Employee (Funcionário)
  static const String employees = '/api/employees';
  static const String timeRecords = '/api/time-records';
  static const String holerites = '/api/holerites';
  static const String payslips = '/api/payslips';
  static const String vacations = '/api/vacations';
  static const String epis = '/api/epis';
  static const String certifications = '/api/certifications';
  static const String messages = '/api/v1/messages';
  static const String notifications = '/api/notifications';
  static const String supportTickets = '/api/support-tickets';

  // Supervisor
  static const String supervisors = '/api/supervisors';
  static const String supervisorVisits = '/api/supervisor-visits';
  static const String workPosts = '/api/work-posts';
  static const String workPostsAll = '/api/work-posts/all';
  static const String workPostsByCode = '/api/work-posts/code';
  static const String workPostsStats = '/api/work-posts/stats/count';
  static const String visitControls = '/api/visit-controls';
  static const String visitControlsToday = '/api/visit-controls/today';
  static const String visitControlsRecent = '/api/visit-controls/recent';
  static const String visitControlsStats = '/api/visit-controls/stats';
  static const String visitControlsBySupervisor = '/api/visit-controls/supervisor';
  static const String visitControlsFiltered = '/api/visit-controls/filtered';
  static const String visitControlsFindEmployee = '/api/visit-controls/find-employee';
  static const String visitSchedules = '/api/visit-schedules';
  static const String remanejamentoApprovals = '/api/remanejamento-approvals';
  static const String transportGuide = '/api/transport-guide';
  static const String rondas = '/api/rondas';

  // Operacional
  static const String occurrences = '/api/occurrences';
  static const String operationalOccurrences = '/api/operational/occurrences';
  static const String schedules = '/api/schedules';
  static const String scaleHistories = '/api/scale-histories';

  // RH (Recursos Humanos)
  static const String employeeCertifications = '/api/employee-certifications';
  static const String sstMedicalExams = '/api/sst/medical-exams';
  static const String hrEmployees = '/api/hr/employees';
  static const String hrStats = '/api/hr/stats';

  // DP (Departamento Pessoal)
  static const String payrolls = '/api/payrolls';
  static const String benefits = '/api/benefits';
  static const String dependents = '/api/dependents';

  // ──────────────────────────────────────────────
  // Financeiro
  // ──────────────────────────────────────────────
  static const String accountsReceivable = '/api/accounts-receivable';
  static const String fiscalInvoices = '/api/fiscal/invoices';
  static const String scheduledPayments = '/api/scheduled-payments';

  // Utilitários
  static const int connectTimeoutMs = 15000;
  static const int receiveTimeoutMs = 30000;

  /// Intervalo entre verificações de saúde do servidor (em segundos).
  static const int healthCheckIntervalSec = 10;

  static Uri uri(String path) => Uri.parse('$baseUrl$path');
}
