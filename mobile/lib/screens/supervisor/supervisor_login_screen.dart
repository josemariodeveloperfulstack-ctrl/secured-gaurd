import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../home/app_shell.dart';

/// Tela de Login do Supervisor via CPF com aceite de termos LGPD.
class SupervisorLoginScreen extends StatefulWidget {
  const SupervisorLoginScreen({super.key});

  @override
  State<SupervisorLoginScreen> createState() => _SupervisorLoginScreenState();
}

class _SupervisorLoginScreenState extends State<SupervisorLoginScreen> {
  final _cpfController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  bool _needsConsent = false;
  String? _error;

  @override
  void dispose() {
    _cpfController.dispose();
    super.dispose();
  }

  String _stripCpf(String value) {
    return value.replaceAll(RegExp(r'[^\d]'), '');
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final cpf = _stripCpf(_cpfController.text);
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.loginSupervisorCpf(cpf);

    if (!mounted) return;
    setState(() => _isLoading = false);

    if (success && authProvider.isAuthenticated) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (_) => const AppShell(),
        ),
        (route) => false,
      );
    } else {
      // AuthProvider já definiu _error com a mensagem adequada
      setState(() {
        if (authProvider.error?.contains('termos') == true) {
          _needsConsent = true;
        } else {
          _error = authProvider.error ?? 'Supervisor não encontrado.';
        }
      });
    }
  }

  Future<void> _handleAcceptTerms() async {
    final cpf = _stripCpf(_cpfController.text);
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.acceptTerms(cpf);

    if (!mounted) return;
    setState(() {
      _isLoading = false;
      _needsConsent = false;
    });

    if (success && authProvider.isAuthenticated) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (_) => const AppShell(),
        ),
        (route) => false,
      );
    } else {
      setState(() {
        _error = authProvider.error ?? 'Erro ao aceitar termos.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Acesso do Supervisor'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: _needsConsent ? _buildTermsScreen(theme) : _buildLoginForm(theme),
        ),
      ),
    );
  }

  Widget _buildLoginForm(ThemeData theme) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 20),

          // Header
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withAlpha(25),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(
              Icons.shield,
              size: 40,
              color: Color(0xFFFFB800),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Login do Supervisor',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Informe seu CPF para acessar o painel de supervisão',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: Colors.grey[400],
            ),
          ),
          const SizedBox(height: 32),

          // CPF Input
          TextFormField(
            controller: _cpfController,
            decoration: const InputDecoration(
              labelText: 'CPF',
              hintText: '000.000.000-00',
              prefixIcon: Icon(Icons.badge_outlined),
              helperText: 'Digite apenas números',
            ),
            keyboardType: TextInputType.number,
            maxLength: 14,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _handleLogin(),
            validator: (value) {
              if (value == null || _stripCpf(value).isEmpty) {
                return 'Informe seu CPF';
              }
              if (_stripCpf(value).length != 11) {
                return 'CPF deve ter 11 dígitos';
              }
              return null;
            },
          ),
          const SizedBox(height: 24),

          // Error message
          if (_error != null)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.withAlpha(20),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.red.withAlpha(60)),
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
          if (_error != null) const SizedBox(height: 16),

          // Login Button
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              onPressed: _isLoading ? null : _handleLogin,
              icon: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: Colors.black,
                      ),
                    )
                  : const Icon(Icons.login),
              label: Text(_isLoading ? 'Verificando...' : 'Entrar'),
            ),
          ),
          const SizedBox(height: 16),

          // Facial login option
          OutlinedButton.icon(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Reconhecimento facial será implementado em breve.'),
                ),
              );
            },
            icon: const Icon(Icons.face_outlined),
            label: const Text('Login por Reconhecimento Facial'),
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
      ),
    );
  }

  Widget _buildTermsScreen(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 20),

        // Icon
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            color: Colors.blue.withAlpha(25),
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Icon(
            Icons.description_outlined,
            size: 40,
            color: Colors.blue,
          ),
        ),
        const SizedBox(height: 20),
        Text(
          'Termos de Uso e LGPD',
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 16),

        // Terms content
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF242438),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF2A2A3E)),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Para acessar o sistema como supervisor, você precisa aceitar os seguintes termos:',
                style: TextStyle(
                  color: Colors.grey,
                  height: 1.5,
                ),
              ),
              SizedBox(height: 16),
              _TermItem(
                icon: Icons.privacy_tip_outlined,
                text: 'Autorizo o tratamento dos meus dados pessoais conforme a Lei Geral de Proteção de Dados (LGPD).',
              ),
              SizedBox(height: 12),
              _TermItem(
                icon: Icons.fingerprint,
                text: 'Autorizo a coleta de dados de localização (GPS) durante as visitas aos postos de trabalho.',
              ),
              SizedBox(height: 12),
              _TermItem(
                icon: Icons.camera_alt_outlined,
                text: 'Autorizo a captura de imagens faciais para fins de reconhecimento e registro de ponto.',
              ),
              SizedBox(height: 12),
              _TermItem(
                icon: Icons.assignment_outlined,
                text: 'Comprometo-me a registrar corretamente as visitas e ocorrências nos postos de trabalho.',
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        if (_error != null)
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: Colors.red.withAlpha(20),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.red.withAlpha(60)),
            ),
            child: Text(
              _error!,
              style: const TextStyle(color: Colors.red, fontSize: 13),
            ),
          ),

        // Accept button
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton.icon(
            onPressed: _isLoading ? null : _handleAcceptTerms,
            icon: _isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      color: Colors.black,
                    ),
                  )
                : const Icon(Icons.check_circle_outline),
            label: Text(
              _isLoading ? 'Processando...' : 'Aceitar Termos e Continuar',
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Decline button
        OutlinedButton(
          onPressed: () => Navigator.of(context).pop(),
          style: OutlinedButton.styleFrom(
            foregroundColor: Colors.grey[400],
            side: BorderSide(color: Colors.grey[700]!),
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: const Text('Recusar e Voltar'),
        ),
      ],
    );
  }
}

class _TermItem extends StatelessWidget {
  final IconData icon;
  final String text;

  const _TermItem({
    required this.icon,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: const Color(0xFFFFB800).withAlpha(20),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 16, color: const Color(0xFFFFB800)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 13,
              height: 1.4,
            ),
          ),
        ),
      ],
    );
  }
}
