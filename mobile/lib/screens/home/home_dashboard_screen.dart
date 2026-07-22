import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../employee/employee_dashboard_screen.dart';
import '../employee/ponto_screen.dart';
import '../employee/holerites_screen.dart';
import '../employee/ferias_screen.dart';
import '../employee/epis_screen.dart';
import '../employee/plantoes_screen.dart';
import '../employee/treinamentos_screen.dart';
import '../employee/mensagens_screen.dart';
import '../employee/suporte_screen.dart';
import '../supervisor/supervisor_dashboard_screen.dart';
import '../supervisor/work_post_checkin_screen.dart';
import '../supervisor/weekly_route_screen.dart';
import '../supervisor/my_visits_screen.dart';
import '../operacional/occurrence_list_screen.dart';
import '../operacional/scale_list_screen.dart';
import '../rh/certifications_screen.dart';
import '../rh/medical_exams_screen.dart';
import '../rh/evaluations_screen.dart';
import '../dp/payroll_screen.dart';
import '../dp/benefits_screen.dart';
import '../dp/dependents_screen.dart';
import '../financeiro/accounts_receivable_screen.dart';
import '../financeiro/fiscal_invoices_screen.dart';
import '../financeiro/scheduled_payments_screen.dart';

class HomeDashboardScreen extends StatelessWidget {
  const HomeDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final user = authProvider.user;
    final isSupervisor = authProvider.isSupervisor;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Welcome card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: Theme.of(context)
                        .colorScheme
                        .primary
                        .withAlpha(30),
                    child: Text(
                      (user?.name.isNotEmpty == true)
                          ? user!.name[0].toUpperCase()
                          : '?',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Bem-vindo, ${user?.name.split(' ').firstOrNull ?? 'Usuário'}!',
                          style: Theme.of(context)
                              .textTheme
                              .titleLarge
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${user?.role.name.toUpperCase()} • ${user?.department ?? 'Operacional'}',
                          style: TextStyle(color: Colors.grey[400], fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Quick Access - Áreas Principais
          Text(
            'ACESSO RÁPIDO',
            style: TextStyle(
              color: Theme.of(context).colorScheme.primary,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 12),

          // Employee / Supervisor quick access cards
          Row(
            children: [
              Expanded(
                child: _MiniCard(
                  icon: Icons.person,
                  label: 'Funcionário',
                  color: Colors.amber,
                  onTap: () => _open(context, const EmployeeDashboardScreen()),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _MiniCard(
                  icon: Icons.shield,
                  label: 'Supervisor',
                  color: Colors.red,
                  onTap: isSupervisor
                      ? () => _open(context, const SupervisorDashboardScreen())
                      : null,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Employee sub-screens
          Text(
            'FUNCIONÁRIO',
            style: TextStyle(
              color: Theme.of(context).colorScheme.primary,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 12),
          _SubModuleSection(
            title: '',
            items: [
              _SubItem(label: 'Ponto Eletrônico', icon: Icons.access_time, color: Colors.amber,
                  onTap: () => _open(context, const PontoScreen())),
              _SubItem(label: 'Holerites', icon: Icons.description, color: Colors.blue,
                  onTap: () => _open(context, const HoleritesScreen())),
              _SubItem(label: 'Férias', icon: Icons.beach_access, color: Colors.green,
                  onTap: () => _open(context, const FeriasScreen())),
              _SubItem(label: 'Meus EPIs', icon: Icons.health_and_safety, color: Colors.orange,
                  onTap: () => _open(context, const EpisScreen())),
              _SubItem(label: 'Plantões', icon: Icons.calendar_month, color: Colors.purple,
                  onTap: () => _open(context, const PlantoesScreen())),
              _SubItem(label: 'Treinamentos', icon: Icons.school, color: Colors.indigo,
                  onTap: () => _open(context, const TreinamentosScreen())),
              _SubItem(label: 'Mensagens', icon: Icons.message, color: Colors.teal,
                  onTap: () => _open(context, const MensagensScreen())),
              _SubItem(label: 'Suporte RH', icon: Icons.support_agent, color: Colors.red,
                  onTap: () => _open(context, const SuporteScreen())),
            ],
          ),
          const SizedBox(height: 24),

          // Supervisor sub-screens (apenas para supervisores)
          if (isSupervisor) ...[
            Text(
              'SUPERVISOR',
              style: TextStyle(
                color: Theme.of(context).colorScheme.primary,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 12),
            _SubModuleSection(
              title: '',
              items: [
                _SubItem(label: 'Check-in no Posto', icon: Icons.qr_code_scanner, color: Colors.amber,
                    onTap: () => _open(context, const WorkPostCheckinScreen())),
                _SubItem(label: 'Rota Semanal', icon: Icons.route, color: Colors.purple,
                    onTap: () => _open(context, const WeeklyRouteScreen())),
                _SubItem(label: 'Minhas Visitas', icon: Icons.list_alt, color: Colors.blue,
                    onTap: () => _open(context, const MyVisitsScreen())),
              ],
            ),
            const SizedBox(height: 24),
          ],

          // Modules section
          Text(
            'MÓDULOS DO SISTEMA',
            style: TextStyle(
              color: Theme.of(context).colorScheme.primary,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 12),

          // Module grid
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.5,
            children: [
              _ModuleCard(
                icon: Icons.assignment,
                label: 'Operacional',
                color: Colors.blue,
                onTap: () => _open(context, const OccurrenceListScreen()),
              ),
              _ModuleCard(
                icon: Icons.verified_user,
                label: 'RH',
                color: Colors.green,
                onTap: () => _open(context, const CertificationsScreen()),
              ),
              _ModuleCard(
                icon: Icons.badge,
                label: 'Dep. Pessoal',
                color: Colors.purple,
                onTap: () => _open(context, const PayrollScreen()),
              ),
              _ModuleCard(
                icon: Icons.account_balance,
                label: 'Financeiro',
                color: Colors.teal,
                onTap: () => _open(context, const AccountsReceivableScreen()),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Sub-modules sections
          Text(
            'RECURSOS DOS MÓDULOS',
            style: TextStyle(
              color: Theme.of(context).colorScheme.primary,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 12),

          _SubModuleSection(
            title: '',
            items: [
              _SubItem(label: 'Ocorrências', icon: Icons.warning_amber, color: Colors.blue,
                  onTap: () => _open(context, const OccurrenceListScreen())),
              _SubItem(label: 'Escalas', icon: Icons.calendar_month, color: Colors.indigo,
                  onTap: () => _open(context, const ScaleListScreen())),
            ],
          ),
          const SizedBox(height: 8),

          _SubModuleSection(
            title: '',
            items: [
              _SubItem(label: 'Certificações', icon: Icons.verified, color: Colors.green,
                  onTap: () => _open(context, const CertificationsScreen())),
              _SubItem(label: 'Exames Médicos', icon: Icons.medical_information, color: Colors.orange,
                  onTap: () => _open(context, const MedicalExamsScreen())),
              _SubItem(label: 'Avaliações', icon: Icons.assignment_turned_in, color: Colors.teal,
                  onTap: () => _open(context, const EvaluationsScreen())),
            ],
          ),
          const SizedBox(height: 8),

          _SubModuleSection(
            title: '',
            items: [
              _SubItem(label: 'Folha de Pagamento', icon: Icons.receipt_long, color: Colors.purple,
                  onTap: () => _open(context, const PayrollScreen())),
              _SubItem(label: 'Benefícios', icon: Icons.card_giftcard, color: Colors.pink,
                  onTap: () => _open(context, const BenefitsScreen())),
              _SubItem(label: 'Dependentes', icon: Icons.people, color: Colors.indigo,
                  onTap: () => _open(context, const DependentsScreen())),
            ],
          ),
          const SizedBox(height: 8),

          _SubModuleSection(
            title: '',
            items: [
              _SubItem(label: 'Contas a Receber', icon: Icons.receipt, color: Colors.teal,
                  onTap: () => _open(context, const AccountsReceivableScreen())),
              _SubItem(label: 'Notas Fiscais', icon: Icons.description, color: Colors.red,
                  onTap: () => _open(context, const FiscalInvoicesScreen())),
              _SubItem(label: 'Pagamentos', icon: Icons.calendar_month, color: Colors.amber,
                  onTap: () => _open(context, const ScheduledPaymentsScreen())),
            ],
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  void _open(BuildContext context, Widget screen) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => screen),
    );
  }
}

class _MiniCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback? onTap;

  const _MiniCard({
    required this.icon,
    required this.label,
    required this.color,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withAlpha(25),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(width: 10),
              Text(
                label,
                style: const TextStyle(
                    fontWeight: FontWeight.w600, fontSize: 13),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ModuleCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ModuleCard({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withAlpha(25),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                      fontWeight: FontWeight.w600, fontSize: 13),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Icon(Icons.chevron_right, color: Colors.grey[600], size: 18),
            ],
          ),
        ),
      ),
    );
  }
}

class _SubModuleSection extends StatelessWidget {
  final String title;
  final List<_SubItem> items;

  const _SubModuleSection({
    required this.title,
    required this.items,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (title.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Text(
              title,
              style: TextStyle(
                color: Colors.grey[500],
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ...items.map((item) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Card(
                margin: EdgeInsets.zero,
                child: ListTile(
                  leading: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: item.color.withAlpha(20),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(item.icon, color: item.color, size: 18),
                  ),
                  title: Text(item.label,
                      style: const TextStyle(fontSize: 13)),
                  trailing: Icon(Icons.chevron_right,
                      color: Colors.grey[600], size: 16),
                  dense: true,
                  onTap: item.onTap,
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
                ),
              ),
            )),
      ],
    );
  }
}

class _SubItem {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  const _SubItem({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });
}
