import 'package:flutter/material.dart';
import '../../models/message.dart';
import '../../services/message_service.dart';

class MensagensScreen extends StatefulWidget {
  const MensagensScreen({super.key});

  @override
  State<MensagensScreen> createState() => _MensagensScreenState();
}

class _MensagensScreenState extends State<MensagensScreen> {
  final MessageService _messageService = MessageService();
  List<EmployeeMessage> _messages = [];
  bool _isLoading = true;
  String? _error;
  int _unreadCount = 0;
  bool _showReceived = true;

  @override
  void initState() {
    super.initState();
    _loadMessages();
  }

  Future<void> _loadMessages() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final results = await Future.wait([
        if (_showReceived) _messageService.getReceivedMessages() else _messageService.getSentMessages(),
        _messageService.getUnreadCount(),
      ]);
      if (!mounted) return;
      setState(() {
        _messages = results[0] as List<EmployeeMessage>;
        _unreadCount = results[1] as int;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() { _error = 'Erro ao carregar mensagens.'; _isLoading = false; });
    }
  }

  Future<void> _markAsRead(String messageId) async {
    await _messageService.markAsRead(messageId);
    _loadMessages();
  }

  @override
  Widget build(BuildContext context) {
    final unread = _messages.where((m) => m.status == MessageStatus.unread).length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mensagens'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _isLoading ? null : _loadMessages),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadMessages,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  // Toggle received/sent
                  SliverToBoxAdapter(child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                    child: Row(children: [
                      Expanded(child: _ToggleButton(
                        label: 'Recebidas',
                        count: unread,
                        selected: _showReceived,
                        onTap: () { setState(() => _showReceived = true); _loadMessages(); },
                      )),
                      const SizedBox(width: 12),
                      Expanded(child: _ToggleButton(
                        label: 'Enviadas',
                        count: null,
                        selected: !_showReceived,
                        onTap: () { setState(() => _showReceived = false); _loadMessages(); },
                      )),
                      const Spacer(),
                      if (_showReceived && _unreadCount > 0)
                        Text('$_unreadCount não lida${_unreadCount != 1 ? 's' : ''}', style: TextStyle(color: Colors.orange, fontSize: 12, fontWeight: FontWeight.w600)),
                    ]),
                  )),
                  if (_error != null)
                    SliverToBoxAdapter(child: _errorBanner()),
                  if (_messages.isEmpty)
                    SliverFillRemaining(child: Center(
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.mail_outline, size: 56, color: Colors.grey[600]),
                        const SizedBox(height: 16),
                        Text(_showReceived ? 'Nenhuma mensagem recebida' : 'Nenhuma mensagem enviada',
                          style: TextStyle(color: Colors.grey[400], fontSize: 15)),
                      ]),
                    ))
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate((context, index) {
                          final msg = _messages[index];
                          final isUnread = msg.status == MessageStatus.unread;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 6),
                            child: InkWell(
                              onTap: () {
                                if (isUnread) _markAsRead(msg.id);
                                _showMessageDetail(msg);
                              },
                              borderRadius: BorderRadius.circular(16),
                              child: Padding(
                                padding: const EdgeInsets.all(14),
                                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Container(
                                    width: 40, height: 40,
                                    decoration: BoxDecoration(
                                      color: isUnread ? Colors.blue.withAlpha(25) : Colors.grey.withAlpha(15),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Icon(
                                      isUnread ? Icons.markunread : Icons.email,
                                      color: isUnread ? Colors.blue : Colors.grey[500],
                                      size: 20,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Row(children: [
                                      Expanded(child: Text(msg.title, style: TextStyle(fontWeight: isUnread ? FontWeight.w700 : FontWeight.w500, fontSize: 14))),
                                      Text(msg.formattedDate, style: TextStyle(color: Colors.grey[500], fontSize: 11)),
                                    ]),
                                    const SizedBox(height: 4),
                                    if (msg.senderName != null)
                                      Text(msg.senderName!, style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                                    const SizedBox(height: 2),
                                    Text(msg.preview, style: TextStyle(color: Colors.grey[400], fontSize: 12), maxLines: 2, overflow: TextOverflow.ellipsis),
                                  ])),
                                ]),
                              ),
                            ),
                          );
                        }, childCount: _messages.length),
                      ),
                    ),
                ],
              ),
            ),
    );
  }

  void _showMessageDetail(EmployeeMessage msg) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1A1A2E),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          Row(children: [
            Expanded(child: Text(msg.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
            IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
          ]),
          if (msg.senderName != null) ...[
            const SizedBox(height: 4),
            Text('De: ${msg.senderName}', style: TextStyle(color: Colors.grey[400], fontSize: 13)),
          ],
          const Divider(height: 24),
          Text(msg.content, style: TextStyle(color: Colors.grey[300], height: 1.5, fontSize: 14)),
          const SizedBox(height: 16),
        ]),
      ),
    );
  }

  Widget _errorBanner() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: Colors.red.withAlpha(15), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.red.withAlpha(50))),
        child: Row(children: [
          const Icon(Icons.error_outline, color: Colors.red, size: 20),
          const SizedBox(width: 12),
          Expanded(child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13))),
          TextButton(onPressed: _loadMessages, child: const Text('Tentar')),
        ]),
      ),
    );
  }
}

class _ToggleButton extends StatelessWidget {
  final String label; final int? count; final bool selected; final VoidCallback onTap;
  const _ToggleButton({required this.label, this.count, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFFFB800).withAlpha(20) : const Color(0xFF242438),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: selected ? const Color(0xFFFFB800).withAlpha(80) : const Color(0xFF2A2A3E)),
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Text(label, style: TextStyle(fontWeight: selected ? FontWeight.w700 : FontWeight.w500, fontSize: 13, color: selected ? const Color(0xFFFFB800) : Colors.grey[400])),
          if (count != null && count! > 0) ...[
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(10)),
              child: Text('$count', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
            ),
          ],
        ]),
      ),
    );
  }
}
