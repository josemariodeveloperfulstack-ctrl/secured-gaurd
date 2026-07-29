/// Modelo de Plantão/Ronda.
class Plantao {
  final String id;
  final String nome;
  final String? descricao;
  final String? tipo;
  final String? prioridade;
  final String status;
  final String dataInicio;
  final String? dataFim;
  final int? duracaoEstimada;
  final int? duracaoReal;
  final String? localNome;
  final String? endereco;

  Plantao({
    required this.id,
    required this.nome,
    this.descricao,
    this.tipo,
    this.prioridade,
    this.status = 'AGENDADA',
    required this.dataInicio,
    this.dataFim,
    this.duracaoEstimada,
    this.duracaoReal,
    this.localNome,
    this.endereco,
  });

  factory Plantao.fromJson(Map<String, dynamic> json) {
    return Plantao(
      id: json['id'] as String? ?? '',
      nome: json['nome'] as String? ?? '',
      descricao: json['descricao'] as String?,
      tipo: json['tipo'] as String?,
      prioridade: json['prioridade'] as String?,
      status: json['status'] as String? ?? 'AGENDADA',
      dataInicio: json['dataInicio'] as String? ?? '',
      dataFim: json['dataFim'] as String?,
      duracaoEstimada: json['duracaoEstimada'] as int?,
      duracaoReal: json['duracaoReal'] as int?,
      localNome: json['local'] is Map ? json['local']['name'] as String? : null,
      endereco: json['endereco'] as String?,
    );
  }

  String get displayStatus {
    switch (status.toUpperCase()) {
      case 'AGENDADA':
        return 'Agendada';
      case 'EM_ANDAMENTO':
      case 'IN_PROGRESS':
        return 'Em Andamento';
      case 'CONCLUIDA':
      case 'CONCLUÍDA':
      case 'COMPLETED':
        return 'Concluída';
      case 'CANCELADA':
      case 'CANCELLED':
        return 'Cancelada';
      case 'ATRASADA':
        return 'Atrasada';
      default:
        return status;
    }
  }

  String get formattedDate {
    try {
      final dt = DateTime.parse(dataInicio);
      final weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
      final months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return '${weekdays[dt.weekday - 1]}, ${dt.day} ${months[dt.month - 1]}';
    } catch (_) {
      return dataInicio;
    }
  }

  String get formattedTime {
    try {
      final dt = DateTime.parse(dataInicio);
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return '--:--';
    }
  }

  String get formattedEndTime {
    if (dataFim == null) return '--:--';
    try {
      final dt = DateTime.parse(dataFim!);
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return '--:--';
    }
  }

  String get tipoLabel {
    switch (tipo?.toUpperCase()) {
      case 'PREVENTIVA':
        return 'Preventiva';
      case 'VIGILANCIA':
        return 'Vigilância';
      case 'PATRULHAMENTO':
        return 'Patrulhamento';
      case 'EMERGENCIA':
        return 'Emergência';
      case 'ESPECIAL':
        return 'Especial';
      case 'CORRETIVA':
        return 'Corretiva';
      default:
        return tipo ?? '--';
    }
  }

  String get prioridadeLabel {
    switch (prioridade?.toUpperCase()) {
      case 'ALTA':
      case 'HIGH':
        return 'Alta';
      case 'MEDIA':
      case 'MEDIUM':
        return 'Média';
      case 'BAIXA':
      case 'LOW':
        return 'Baixa';
      case 'CRITICA':
        return 'Crítica';
      default:
        return prioridade ?? '--';
    }
  }
}
