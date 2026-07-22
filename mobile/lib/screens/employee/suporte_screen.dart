import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/support_ticket.dart';
import '../../services/support_service.dart';
import '../../providers/auth_provider.dart';

class SuporteScreen extends StatefulWidget {
  const SuporteScreen({super.key});

  @override
  State<SuporteScreen> createState() => _SuporteScreenState();
}

class _SuporteScreenState extends State<SuporteScreen> {
  final SupportService _supportService = SupportService();

  // Lista de tickets
  List<SupportTicket> _tickets = [];
  bool _isLoading = true;
  String? _error;

  // Form
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  String? _selectedCategory;

  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _loadTickets();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _loadTickets() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final tickets = await _supportService.getMyTickets();
      if (!mounted) return;
      setState(() { _tickets = tickets; _isLoading = false; });
    } catch (e) {
      if (!mounted) return;
      setState(() { _error = 'Erro ao carregar tickets.'; _isLoading = false; });
    }
  }

  Future<void> _submitTicket() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    try {
      final user = context.read<AuthProvider>().user;
      final ticket = SupportTicket(
        id: '',
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim(),
        category: _selectedCategory ?? 'OUTROS',
        customerName: user?.name ?? 'Funcionário',
        customerEmail: '',
      );
      final success = await _supportService.createTicket(ticket);
      if (!mounted) return;

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ticket enviado com sucesso!'), backgroundColor: Colors.green),
        );
        _titleController.clear();
        _descriptionController.clear();
        setState(() { _selectedCategory = null; _isSubmitting = false; });
        _loadTickets();
        Navigator.pop(context);
      } else {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Erro ao enviar ticket.'), backgroundColor: Colors.red),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Erro ao enviar ticket.'), backgroundColor: Colors.red),
      );
    }
  }

  Color _statusColor(TicketStatus status) {
    switch (status) {
      case TicketStatus.open: return Colors.blue;
      case TicketStatus.inProgress: return Colors.orange;
      case TicketStatus.resolved: return Colors.green;
      case TicketStatus.closed: return Colors.grey;
    }
  }

  void _showCreateTicketForm() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF1A1A2E),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          left: 20, right: 20, top: 20,
        ),
        child: Form(
          key: _formKey,
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              const Text('Novo Ticket', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              const Spacer(),
              IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
            ]),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _selectedCategory,
              decoration: const InputDecoration(labelText: 'Categoria', prefixIcon: Icon(Icons.category)),
              items: const [
                DropdownMenuItem(value: 'RH', child: Text('Recursos Humanos')),
                DropdownMenuItem(value: 'FOLHA', child: Text('Folha de Pagamento')),
                DropdownMenuItem(value: 'EPI', child: Text('EPIs')),
                DropdownMenuItem(value: 'PONTO', child: Text('Ponto Eletrônico')),
                DropdownMenuItem(value: 'BENEFICIOS', child: Text('Benefícios')),
                DropdownMenuItem(value: 'OUTROS', child: Text('Outros')),
              ],
              onChanged: (v) => _selectedCategory = v,
              validator: (v) => v == null ? 'Selecione uma categoria' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(labelText: 'Título', prefixIcon: Icon(Icons.title)),
              validator: (v) => v == null || v.trim().isEmpty ? 'Informe o título' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(labelText: 'Descrição', prefixIcon: Icon(Icons.description), alignLabelWithHint: true),
              maxLines: 4,
              validator: (v) => v == null || v.trim().isEmpty ? 'Descreva o problema' : null,
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 52,
              child: ElevatedButton.icon(
                onPressed: _isSubmitting ? null : _submitTicket,
                icon: _isSubmitting
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.black))
                    : const Icon(Icons.send),
                label: Text(_isSubmitting ? 'Enviando...' : 'Enviar Ticket'),
              ),
            ),
            const SizedBox(height: 20),
          ]),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final abertos = _tickets.where((t) => t.status == TicketStatus.open || t.status == TicketStatus.inProgress).length;
    final resolvidos = _tickets.where((t) => t.status == TicketStatus.resolved || t.status == TicketStatus.closed).length;

    return Scaffold(
      appBar: AppBar(title: const Text('Suporte RH'), actions: [
        IconButton(icon: const Icon(Icons.refresh), onPressed: _isLoading ? null : _loadTickets),
      ]),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreateTicketForm,
        backgroundColor: const Color(0xFFFFB800),
        foregroundColor: Colors.black,
        icon: const Icon(Icons.add),
        label: const Text('Novo Ticket'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadTickets,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  SliverToBoxAdapter(child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(children: [
                      _StatCard(icon: Icons.list, label: 'Total', value: '${_tickets.length}', color: Colors.blue),
                      const SizedBox(width: 12),
                      _StatCard(icon: Icons.pending, label: 'Abertos', value: '$abertos', color: Colors.orange),
                      const SizedBox(width: 12),
                      _StatCard(icon: Icons.check_circle, label: 'Resolvidos', value: '$resolvidos', color: Colors.green),
                    ]),
                  )),
                  if (_error != null)
                    SliverToBoxAdapter(child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: Colors.red.withAlpha(15), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.red.withAlpha(50))),
                        child: Row(children: [
                          const Icon(Icons.error_outline, color: Colors.red, size: 20),
                          const SizedBox(width: 12),
                          Expanded(child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13))),
                          TextButton(onPressed: _loadTickets, child: const Text('Tentar')),
                        ]),
                      ),
                    )),
                  if (_tickets.isEmpty)
                    SliverFillRemaining(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Icon(Icons.support_agent_outlined, size: 64, color: Colors.grey[600]),
                      const SizedBox(height: 16),
                      Text('Nenhum ticket de suporte', style: TextStyle(color: Colors.grey[400], fontSize: 15)),
                      const SizedBox(height: 8),
                      Text('Toque em "Novo Ticket" para abrir um chamado', style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                    ]))
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate((context, index) {
                          final ticket = _tickets[index];
                          final color = _statusColor(ticket.status);
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Row(children: [
                                Container(
                                  width: 48, height: 48,
                                  decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(12)),
                                  child: Icon(_statusIcon(ticket.status), color: color, size: 24),
                                ),
                                const SizedBox(width: 14),
                                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text(ticket.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                                  const SizedBox(height: 2),
                                  Text(ticket.formattedDate, style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                                  if (ticket.category != null)
                                    Container(
                                      margin: const EdgeInsets.only(top: 4),
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(color: Colors.grey.withAlpha(20), borderRadius: BorderRadius.circular(4)),
                                      child: Text(ticket.category!, style: TextStyle(color: Colors.grey[500], fontSize: 10)),
                                    ),
                                ])),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(8), border: Border.all(color: color.withAlpha(60))),
                                  child: Text(ticket.displayStatus, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
                                ),
                              ]),
                            ),
                          );
                        }, childCount: _tickets.length),
                      ),
                    ),
                ],
              ),
            ),
    );
  }

  IconData _statusIcon(TicketStatus status) {
    switch (status) {
      case TicketStatus.open: return Icons.radio_button_unchecked;
      case TicketStatus.inProgress: return Icons.pending;
      case TicketStatus.resolved: return Icons.check_circle;
      case TicketStatus.closed: return Icons.lock;
    }
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon; final String label; final String value; final Color color;
  const _StatCard({required this.icon, required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: const Color(0xFF242438), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF2A2A3E))),
        child: Column(children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 6),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          Text(label, style: TextStyle(color: Colors.grey[500], fontSize: 11), textAlign: TextAlign.center),
        ]),
      ),
    );
  }
}
