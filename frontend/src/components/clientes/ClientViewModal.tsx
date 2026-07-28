import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Client, ClientStatus } from '@/types/client';
import { MapPin, Phone, Mail, User, Building, Calendar, Shield, ExternalLink, Plus } from 'lucide-react';
import { workPostService, WorkPost } from '@/services/workPostService';

interface ClientViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client;
}

export const ClientViewModal: React.FC<ClientViewModalProps> = ({
  isOpen,
  onClose,
  client
}) => {
  const navigate = useNavigate();
  const [workPosts, setWorkPosts] = useState<WorkPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    if (isOpen && client?.id) {
      setLoadingPosts(true);
      workPostService.getAllWorkPosts()
        .then((posts) => {
          const INVALID_SECTOR_KEYWORDS = [
            'ENSINO FUNDAMENTAL', 'ENSINO MÉDIO', 'ENSINO MEDIO',
            'EDUCAÇÃO SUPERIOR', 'EDUCACAO SUPERIOR', 'PÓS-GRADUAÇÃO',
            'POS-GRADUACAO', 'MESTRADO', 'DOUTORADO', 'ANALFABETO',
            'PRETA', 'BRANCA', 'PARDA', 'AMARELA', 'INDÍGENA', 'INDIGENA'
          ];
          const isValidSector = (p: WorkPost) => {
            const nameUpper = (p.name || '').trim().toUpperCase();
            const codeUpper = (p.postCode || '').trim().toUpperCase();
            return !INVALID_SECTOR_KEYWORDS.some(kw => nameUpper === kw || codeUpper === kw || (kw.length > 5 && nameUpper.includes(kw)));
          };

          const clientPosts = posts.filter(
            (p) => isValidSector(p) && (p.clientId === client.id || (p.clientName && p.clientName.trim().toLowerCase() === client.name.trim().toLowerCase()))
          );
          setWorkPosts(clientPosts);
        })
        .catch((err) => console.error('Erro ao buscar postos do cliente:', err))
        .finally(() => setLoadingPosts(false));
    }
  }, [isOpen, client]);

  if (!client) return null;

  const getStatusBadge = (status: ClientStatus) => {
    const statusConfig = {
      [ClientStatus.ACTIVE]: { label: 'Ativo', variant: 'default' as const },
      [ClientStatus.INACTIVE]: { label: 'Inativo', variant: 'secondary' as const },
      [ClientStatus.SUSPENDED]: { label: 'Suspenso', variant: 'destructive' as const },
      [ClientStatus.PENDING]: { label: 'Pendente', variant: 'outline' as const }
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCnpj = (cnpj: string) => {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {client.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <h2 className="text-xl font-semibold">{client.name}</h2>
              <p className="text-sm text-gray-600 font-mono">{formatCnpj(client.cnpj)}</p>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(client.status)}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Informações da Empresa */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Informações da Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {client.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-gray-600">{client.email}</p>
                    </div>
                  </div>
                )}
                
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Telefone</p>
                      <p className="text-sm text-gray-600">{client.phone}</p>
                    </div>
                  </div>
                )}
                
                {client.mobile && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Celular</p>
                      <p className="text-sm text-gray-600">{client.mobile}</p>
                    </div>
                  </div>
                )}
                
                {client.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Endereço</p>
                      <p className="text-sm text-gray-600">
                        {client.address}
                        {client.city && `, ${client.city}`}
                        {client.state && ` - ${client.state}`}
                        {client.zipCode && `, ${client.zipCode}`}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Informações do Contato */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Dados do Contato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {client.contactName && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Nome do Contato</p>
                      <p className="text-sm text-gray-600">{client.contactName}</p>
                    </div>
                  </div>
                )}
                
                {client.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Email do Contato</p>
                      <p className="text-sm text-gray-600">{client.contactEmail}</p>
                    </div>
                  </div>
                )}
                
                {client.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Telefone do Contato</p>
                      <p className="text-sm text-gray-600">{client.contactPhone}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Setores e Postos de Trabalho do Cliente */}
          <Card className="border-primary/20 bg-muted/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5 text-primary" />
                Setores e Postos de Trabalho do Cliente ({workPosts.length})
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => {
                  onClose();
                  navigate(`/postos?clientSearch=${encodeURIComponent(client.name)}`);
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Gerenciar na Tela de Postos
              </Button>
            </CardHeader>
            <CardContent>
              {loadingPosts ? (
                <p className="text-xs text-muted-foreground animate-pulse py-2">Carregando setores e postos do cliente...</p>
              ) : workPosts.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-lg bg-background/50">
                  <Shield className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Nenhum setor ou posto cadastrado para este cliente.</p>
                  <Button
                    variant="default"
                    size="sm"
                    className="mt-3 gap-1"
                    onClick={() => {
                      onClose();
                      navigate(`/postos?clientSearch=${encodeURIComponent(client.name)}`);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Cadastrar Primeiro Setor
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const sectorsMap: Record<string, { code: string; name: string; posts: WorkPost[] }> = {};
                    workPosts.forEach((post) => {
                      const key = (post.name || post.postCode || 'Setor Geral').trim();
                      if (!sectorsMap[key]) {
                        sectorsMap[key] = {
                          code: post.postCode || 'SETOR',
                          name: post.name || 'Setor sem nome',
                          posts: [],
                        };
                      }
                      sectorsMap[key].posts.push(post);
                    });

                    return Object.values(sectorsMap).map((sector, idx) => (
                      <div key={idx} className="rounded-md border bg-card p-3 space-y-2">
                        <div className="flex items-center justify-between bg-muted/30 p-2 rounded">
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="text-xs">
                              Setor: {sector.code}
                            </Badge>
                            <span className="font-semibold text-sm">{sector.name}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {sector.posts.length} Posto{sector.posts.length > 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                          {sector.posts.map((post) => (
                            <div key={post.id} className="p-2 border rounded bg-background flex flex-col justify-between">
                              <div>
                                <span className="font-medium text-foreground">{post.name}</span>
                                <div className="text-muted-foreground text-[11px] mt-0.5">
                                  {post.city ? `${post.city}, ${post.state}` : post.address}
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-2 pt-1 border-t text-[11px]">
                                <span className="text-muted-foreground">{post.workSchedule || '12x36'} • {post.requiredVigilantes || 1} vig.</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {post.status || 'ATIVO'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Observações */}
          {client.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{client.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Informações do Sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Informações do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Data de Criação</p>
                  <p className="text-sm text-gray-600">{formatDate(client.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Última Atualização</p>
                  <p className="text-sm text-gray-600">{formatDate(client.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 