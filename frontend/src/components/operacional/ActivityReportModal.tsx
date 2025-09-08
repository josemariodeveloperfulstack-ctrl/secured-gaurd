import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  X, 
  Camera, 
  FileText, 
  User, 
  Building, 
  MapPin, 
  Clock,
  Shield,
  AlertTriangle,
  Stethoscope,
  Calendar
} from 'lucide-react';
import { ActivityReport, CreateActivityReportDTO } from '@/types/activityReport';
import { useToast } from '@/hooks/use-toast';

interface ActivityReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report?: ActivityReport | null;
  onSave: (data: CreateActivityReportDTO) => void;
}

const ActivityReportModal: React.FC<ActivityReportModalProps> = ({
  open,
  onOpenChange,
  report,
  onSave
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<CreateActivityReportDTO>({
    employeeId: '',
    clientId: '',
    workPostId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    description: '',
    absenceStatus: 'PRESENT'
  });

  const [photos, setPhotos] = useState<File[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);

  useEffect(() => {
    if (report) {
      setFormData({
        employeeId: report.employeeId,
        clientId: report.clientId,
        workPostId: report.workPostId,
        date: report.date,
        startTime: report.startTime,
        endTime: report.endTime,
        description: report.description,
        ballisticPlate: report.ballisticPlate,
        weaponRegistry: report.weaponRegistry,
        absenceStatus: report.absenceStatus,
        divergences: report.divergences,
        medicalConsultation: report.medicalConsultation
      });
    } else {
      setFormData({
        employeeId: '',
        clientId: '',
        workPostId: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        description: '',
        absenceStatus: 'PRESENT'
      });
    }
    setPhotos([]);
    setDocuments([]);
  }, [report, open]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedInputChange = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof CreateActivityReportDTO] as any,
        [field]: value
      }
    }));
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length !== files.length) {
      toast({
        title: 'Aviso',
        description: 'Apenas arquivos de imagem são permitidos para fotos.',
        variant: 'default'
      });
    }
    
    setPhotos(prev => [...prev, ...validFiles]);
  };

  const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setDocuments(prev => [...prev, ...files]);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações básicas
    if (!formData.employeeId || !formData.clientId || !formData.workPostId) {
      toast({
        title: 'Erro',
        description: 'Funcionário, Cliente e Posto de Trabalho são obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      toast({
        title: 'Erro',
        description: 'Horário de início e fim são obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: 'Erro',
        description: 'Descrição da atividade é obrigatória.',
        variant: 'destructive'
      });
      return;
    }

    onSave(formData);
  };

  const calculateBallisticPlateExpiry = (issueDate: string) => {
    const date = new Date(issueDate);
    date.setFullYear(date.getFullYear() + 6);
    return date.toISOString().split('T')[0];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {report ? 'Editar Relatório de Atividade' : 'Novo Relatório de Atividade'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employeeId">Funcionário *</Label>
                <Select value={formData.employeeId} onValueChange={(value) => handleInputChange('employeeId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o funcionário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emp-001">João Silva</SelectItem>
                    <SelectItem value="emp-002">Carlos Lima</SelectItem>
                    <SelectItem value="emp-003">Ana Santos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientId">Cliente *</Label>
                <Select value={formData.clientId} onValueChange={(value) => handleInputChange('clientId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client-001">Empresa ABC Ltda</SelectItem>
                    <SelectItem value="client-002">Indústria XYZ S.A.</SelectItem>
                    <SelectItem value="client-003">Comércio 123 ME</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workPostId">Posto de Trabalho *</Label>
                <Select value={formData.workPostId} onValueChange={(value) => handleInputChange('workPostId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o posto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post-001">Portaria Principal</SelectItem>
                    <SelectItem value="post-002">Ronda Noturna</SelectItem>
                    <SelectItem value="post-003">Recepção</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Hora Início *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">Hora Fim *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Descrição da Atividade */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Descrição da Atividade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva detalhadamente as atividades realizadas durante o turno..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Equipamentos de Segurança */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Equipamentos de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <h4 className="font-medium">Placa Balística</h4>
                <div className="space-y-2">
                  <Label htmlFor="ballisticPlateNumber">Número da Placa</Label>
                  <Input
                    id="ballisticPlateNumber"
                    placeholder="BP-001-2025"
                    value={formData.ballisticPlate?.number || ''}
                    onChange={(e) => handleNestedInputChange('ballisticPlate', 'number', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ballisticPlateExpiry">Validade (6 anos)</Label>
                  <Input
                    id="ballisticPlateExpiry"
                    type="date"
                    value={formData.ballisticPlate?.validUntil || ''}
                    onChange={(e) => handleNestedInputChange('ballisticPlate', 'validUntil', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Registro da Arma</h4>
                <div className="space-y-2">
                  <Label htmlFor="weaponRegistryNumber">Número do Registro</Label>
                  <Input
                    id="weaponRegistryNumber"
                    placeholder="AR-12345"
                    value={formData.weaponRegistry?.number || ''}
                    onChange={(e) => handleNestedInputChange('weaponRegistry', 'number', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weaponRegistryExpiry">Validade do Registro</Label>
                  <Input
                    id="weaponRegistryExpiry"
                    type="date"
                    value={formData.weaponRegistry?.validUntil || ''}
                    onChange={(e) => handleNestedInputChange('weaponRegistry', 'validUntil', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status de Presença e Divergências */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Status e Observações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="absenceStatus">Status de Presença</Label>
                <Select value={formData.absenceStatus} onValueChange={(value) => handleInputChange('absenceStatus', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRESENT">Presente</SelectItem>
                    <SelectItem value="ABSENT">Ausente</SelectItem>
                    <SelectItem value="LATE">Atraso</SelectItem>
                    <SelectItem value="MEDICAL_LEAVE">Atestado Médico</SelectItem>
                    <SelectItem value="JUSTIFIED">Falta Justificada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="divergences">Relatar Divergências</Label>
                <Textarea
                  id="divergences"
                  placeholder="Descreva qualquer divergência, incidente ou situação anormal ocorrida..."
                  value={formData.divergences || ''}
                  onChange={(e) => handleInputChange('divergences', e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Consulta Médica */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Consulta Médica
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="medicalDate">Data da Consulta</Label>
                <Input
                  id="medicalDate"
                  type="date"
                  value={formData.medicalConsultation?.date || ''}
                  onChange={(e) => handleNestedInputChange('medicalConsultation', 'date', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medicalReason">Motivo</Label>
                <Input
                  id="medicalReason"
                  placeholder="Consulta de rotina, exame periódico..."
                  value={formData.medicalConsultation?.reason || ''}
                  onChange={(e) => handleNestedInputChange('medicalConsultation', 'reason', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medicalDoctor">Médico Responsável</Label>
                <Input
                  id="medicalDoctor"
                  placeholder="Dr. Nome do Médico"
                  value={formData.medicalConsultation?.doctor || ''}
                  onChange={(e) => handleNestedInputChange('medicalConsultation', 'doctor', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medicalResult">Resultado</Label>
                <Input
                  id="medicalResult"
                  placeholder="Apto para o trabalho, restrições..."
                  value={formData.medicalConsultation?.result || ''}
                  onChange={(e) => handleNestedInputChange('medicalConsultation', 'result', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Upload de Fotos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Fotos das Atividades
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="photos">Adicionar Fotos</Label>
                <Input
                  id="photos"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                />
              </div>

              {photos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={() => removePhoto(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <p className="text-xs text-center mt-1 truncate">{photo.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload de Documentos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="documents">Adicionar Documentos</Label>
                <Input
                  id="documents"
                  type="file"
                  multiple
                  onChange={handleDocumentUpload}
                />
              </div>

              {documents.length > 0 && (
                <div className="space-y-2">
                  {documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{doc.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {(doc.size / 1024).toFixed(1)} KB
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocument(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {report ? 'Atualizar Relatório' : 'Criar Relatório'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityReportModal;