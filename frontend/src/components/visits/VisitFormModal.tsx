import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Upload, QrCode, MapPin, User, Building, Clock, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CreateVisitRequest, VisitStatus, Visit } from '@/types/visit';
import { visitService } from '@/services/visitService';
import MapWithPin from '@/components/ui/MapWithPin';
import api from '@/lib/axios';

interface VisitFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit?: Visit | null;
  onSave: (data: CreateVisitRequest) => void;
}

interface Supervisor {
  id: string;
  name: string;
  cpf: string;
}

interface Client {
  id: string;
  name: string;
}

interface WorkPost {
  id: string;
  name: string;
  clientId: string;
}

export const VisitFormModal: React.FC<VisitFormModalProps> = ({
  open,
  onOpenChange,
  visit,
  onSave,
}) => {
  const [formData, setFormData] = useState<CreateVisitRequest>({
    supervisorId: '',
    workPostId: '',
    clientId: '',
    visitDate: '',
    visitTime: '',
    description: '',
    observations: '',
    status: VisitStatus.PENDING,
    presentEmployees: [],
    attachedFiles: [],
    photos: [],
    latitude: undefined,
    longitude: undefined,
    locationAddress: '',
    qrCodeScanned: '',
    qrCodeVerified: false,
  });

  const [loading, setLoading] = useState(false);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [scanningQR, setScanningQR] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [capturedPhotos, setCapturedPhotos] = useState<File[]>([]);
  
  // Dados do banco
  const [supervisorCpf, setSupervisorCpf] = useState('');
  const [supervisorName, setSupervisorName] = useState('');
  const [loadingSupervisor, setLoadingSupervisor] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [allWorkPosts, setAllWorkPosts] = useState<WorkPost[]>([]);
  const [filteredWorkPosts, setFilteredWorkPosts] = useState<WorkPost[]>([]);
  

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  // Carregar clientes e postos de trabalho
  useEffect(() => {
    if (open) {
      loadClients();
      loadWorkPosts();
    }
  }, [open]);

  // Filtrar postos de trabalho quando cliente for selecionado
  useEffect(() => {
    if (formData.clientId) {
      const filtered = allWorkPosts.filter(wp => wp.clientId === formData.clientId);
      setFilteredWorkPosts(filtered);
      
      // Se o posto atual não pertence ao cliente selecionado, limpar
      if (formData.workPostId && !filtered.some(wp => wp.id === formData.workPostId)) {
        setFormData(prev => ({ ...prev, workPostId: '' }));
      }
    } else {
      setFilteredWorkPosts([]);
      setFormData(prev => ({ ...prev, workPostId: '' }));
    }
  }, [formData.clientId, allWorkPosts]);

  const loadClients = async () => {
    try {
      const response = await api.get('/api/clients/all');
      setClients(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de clientes",
        variant: "destructive",
      });
    }
  };

  const loadWorkPosts = async () => {
    try {
      const response = await api.get('/api/work-posts/all');
      setAllWorkPosts(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar postos de trabalho:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de postos de trabalho",
        variant: "destructive",
      });
    }
  };

  const handleSupervisorCpfChange = (cpf: string) => {
    setSupervisorCpf(cpf);
    
    // Limpar nome e ID se CPF for apagado
    if (!cpf) {
      setSupervisorName('');
      setFormData(prev => ({ ...prev, supervisorId: '' }));
    }
  };

  const handleSupervisorCpfBlur = async () => {
    if (!supervisorCpf || supervisorCpf.length < 11) {
      return;
    }

    setLoadingSupervisor(true);
    try {
      // Buscar supervisor por CPF
      const response = await api.get(`/api/employees/search/simple?q=${supervisorCpf}`);
      
      if (response.data && response.data.length > 0) {
        const supervisor = response.data[0];
        setSupervisorName(supervisor.name);
        setFormData(prev => ({ ...prev, supervisorId: supervisor.id }));
        
        toast({
          title: "Supervisor encontrado",
          description: `${supervisor.name}`,
        });
      } else {
        setSupervisorName('');
        setFormData(prev => ({ ...prev, supervisorId: '' }));
        
        toast({
          title: "Supervisor não encontrado",
          description: "CPF não encontrado no sistema",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao buscar supervisor:', error);
      setSupervisorName('');
      setFormData(prev => ({ ...prev, supervisorId: '' }));
      
      toast({
        title: "Erro",
        description: "Erro ao buscar supervisor",
        variant: "destructive",
      });
    } finally {
      setLoadingSupervisor(false);
    }
  };


  useEffect(() => {
    if (visit) {
      setFormData({
        supervisorId: visit.supervisorId,
        workPostId: visit.workPostId,
        clientId: visit.clientId,
        visitDate: visit.visitDate,
        visitTime: visit.visitTime,
        description: visit.description || '',
        observations: visit.observations || '',
        status: visit.status,
        presentEmployees: visit.presentEmployees || [],
        attachedFiles: visit.attachedFiles || [],
        photos: visit.photos || [],
        latitude: visit.latitude,
        longitude: visit.longitude,
        locationAddress: visit.locationAddress || '',
        qrCodeScanned: visit.qrCodeScanned || '',
        qrCodeVerified: visit.qrCodeVerified || false,
      });
      setSupervisorName(visit.supervisorName || '');
    } else {
      // Reset form for new visit
      setFormData({
        supervisorId: '',
        workPostId: '',
        clientId: '',
        visitDate: new Date().toISOString().split('T')[0],
        visitTime: new Date().toTimeString().slice(0, 5),
        description: '',
        observations: '',
        status: VisitStatus.PENDING,
        presentEmployees: [],
        attachedFiles: [],
        photos: [],
        latitude: undefined,
        longitude: undefined,
        locationAddress: '',
        qrCodeScanned: '',
        qrCodeVerified: false,
      });
      setSupervisorCpf('');
      setSupervisorName('');
    }
    setUploadedFiles([]);
    setCapturedPhotos([]);
  }, [visit, open]);

  const handleInputChange = (field: keyof CreateVisitRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCaptureLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocalização não suportada",
        description: "Seu navegador não suporta geolocalização",
        variant: "destructive",
      });
      return;
    }

    setCapturingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        setFormData(prev => ({
          ...prev,
          latitude,
          longitude,
          locationAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        }));

        toast({
          title: "Localização capturada",
          description: `Lat: ${latitude.toFixed(6)}, Long: ${longitude.toFixed(6)}`,
        });

        setCapturingLocation(false);
      },
      (error) => {
        console.error('Erro ao capturar localização:', error);
        toast({
          title: "Erro ao capturar localização",
          description: error.message,
          variant: "destructive",
        });
        setCapturingLocation(false);
      }
    );
  };

  const handleMapLocationSelect = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      locationAddress: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    }));

    toast({
      title: "Localização selecionada no mapa",
      description: `Lat: ${lat.toFixed(6)}, Long: ${lng.toFixed(6)}`,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setCapturedPhotos(prev => [...prev, ...files]);
  };

  const handleSubmit = async () => {
    if (!formData.supervisorId) {
      toast({
        title: "Supervisor obrigatório",
        description: "Informe o CPF do supervisor",
        variant: "destructive",
      });
      return;
    }

    if (!formData.clientId) {
      toast({
        title: "Cliente obrigatório",
        description: "Selecione um cliente",
        variant: "destructive",
      });
      return;
    }

    if (!formData.workPostId) {
      toast({
        title: "Posto de trabalho obrigatório",
        description: "Selecione um posto de trabalho",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar visita:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-seguranca-graphite border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-seguranca-yellow text-xl font-bold">
            {visit ? 'Editar Visita' : 'Nova Visita'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Identificação do Supervisor */}
          <Card className="bg-seguranca-black border-gray-700">
            <CardHeader>
              <CardTitle className="text-seguranca-yellow flex items-center gap-2">
                <User size={20} />
                Identificação do Supervisor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-seguranca-lightgray">CPF do Supervisor *</Label>
                  <Input
                    value={supervisorCpf}
                    onChange={(e) => handleSupervisorCpfChange(e.target.value)}
                    onBlur={handleSupervisorCpfBlur}
                    placeholder="000.000.000-00"
                    className="bg-white text-black"
                    disabled={loadingSupervisor}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-seguranca-lightgray">Nome do Supervisor</Label>
                  <Input
                    value={supervisorName}
                    readOnly
                    placeholder="Nome será carregado automaticamente"
                    className="bg-gray-700 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cliente e Posto de Trabalho */}
          <Card className="bg-seguranca-black border-gray-700">
            <CardHeader>
              <CardTitle className="text-seguranca-yellow flex items-center gap-2">
                <Building size={20} />
                Local da Visita
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cliente - PRIMEIRO */}
                <div className="space-y-2">
                  <Label className="text-seguranca-lightgray">Cliente *</Label>
                  <Select
                    value={formData.clientId}
                    onValueChange={(value) => handleInputChange('clientId', value)}
                  >
                    <SelectTrigger className="bg-white text-black">
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-black border-gray-600">
                      {clients.map((client) => (
                        <SelectItem 
                          key={client.id} 
                          value={client.id}
                          className="text-seguranca-lightgray hover:bg-seguranca-graphite"
                        >
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Posto de Trabalho - SEGUNDO */}
                <div className="space-y-2">
                  <Label className="text-seguranca-lightgray">Posto de Trabalho *</Label>
                  <Select
                    value={formData.workPostId}
                    onValueChange={(value) => handleInputChange('workPostId', value)}
                    disabled={!formData.clientId}
                  >
                    <SelectTrigger className="bg-white text-black">
                      <SelectValue placeholder={
                        formData.clientId 
                          ? "Selecione o posto de trabalho" 
                          : "Selecione um cliente primeiro"
                      } />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-black border-gray-600">
                      {filteredWorkPosts.map((workPost) => (
                        <SelectItem 
                          key={workPost.id} 
                          value={workPost.id}
                          className="text-seguranca-lightgray hover:bg-seguranca-graphite"
                        >
                          {workPost.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.clientId && filteredWorkPosts.length === 0 && (
                    <p className="text-xs text-yellow-500">
                      Nenhum posto de trabalho encontrado para este cliente
                    </p>
                  )}
                </div>
              </div>

              {/* Funcionários Presentes - Leitura de QR Code */}
              <div className="space-y-2 mt-4">
                <Label className="text-seguranca-lightgray flex items-center gap-2">
                  <QrCode size={16} />
                  Funcionários Presentes no Posto
                </Label>
                <Button
                  type="button"
                  onClick={() => setScanningQR(true)}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  disabled={scanningQR || !formData.workPostId}
                >
                  <QrCode size={16} />
                  {scanningQR ? 'Escaneando QR Code...' : 'Escanear QR Code dos Funcionários'}
                </Button>
                {!formData.workPostId && (
                  <p className="text-xs text-yellow-500">
                    Selecione o posto de trabalho primeiro
                  </p>
                )}
                {formData.presentEmployees && formData.presentEmployees.length > 0 && (
                  <div className="mt-2 p-3 bg-seguranca-graphite rounded-lg">
                    <p className="text-sm text-seguranca-lightgray font-medium">
                      ✓ {formData.presentEmployees.length} funcionário(s) registrado(s)
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Data e Hora */}
          <Card className="bg-seguranca-black border-gray-700">
            <CardHeader>
              <CardTitle className="text-seguranca-yellow flex items-center gap-2">
                <Clock size={20} />
                Data e Hora
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-seguranca-lightgray">Data da Visita *</Label>
                  <Input
                    type="date"
                    value={formData.visitDate}
                    onChange={(e) => handleInputChange('visitDate', e.target.value)}
                    className="bg-white text-black"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-seguranca-lightgray">Hora da Visita *</Label>
                  <Input
                    type="time"
                    value={formData.visitTime}
                    onChange={(e) => handleInputChange('visitTime', e.target.value)}
                    className="bg-white text-black"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Descrição e Observações */}
          <Card className="bg-seguranca-black border-gray-700">
            <CardHeader>
              <CardTitle className="text-seguranca-yellow flex items-center gap-2">
                <FileText size={20} />
                Detalhes da Visita
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-seguranca-lightgray">Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descreva o motivo da visita"
                  className="bg-white text-black"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-seguranca-lightgray">Observações</Label>
                <Textarea
                  value={formData.observations}
                  onChange={(e) => handleInputChange('observations', e.target.value)}
                  placeholder="Observações adicionais"
                  className="bg-white text-black"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Geolocalização */}
          <Card className="bg-seguranca-black border-gray-700">
            <CardHeader>
              <CardTitle className="text-seguranca-yellow flex items-center gap-2">
                <MapPin size={20} />
                Geolocalização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                type="button"
                onClick={handleCaptureLocation}
                disabled={capturingLocation}
                className="w-full flex items-center justify-center gap-2"
              >
                <MapPin size={16} />
                {capturingLocation ? 'Capturando localização...' : 'Capturar Localização Atual'}
              </Button>
              {formData.latitude && formData.longitude && (
                <div className="text-sm text-seguranca-lightgray">
                  <p>Latitude: {formData.latitude.toFixed(6)}</p>
                  <p>Longitude: {formData.longitude.toFixed(6)}</p>
                </div>
              )}
              
              {/* Mapa Interativo */}
              {formData.latitude && formData.longitude && (
                <div className="mt-4">
                  <Label className="text-seguranca-lightgray mb-2 block">
                    Mapa da Localização
                  </Label>
                  <MapWithPin
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    onLocationSelect={handleMapLocationSelect}
                    height="300px"
                    className="rounded-lg"
                    showControls={true}
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    💡 Clique no mapa para ajustar a localização
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Anexos e Fotos */}
          <Card className="bg-seguranca-black border-gray-700">
            <CardHeader>
              <CardTitle className="text-seguranca-yellow flex items-center gap-2">
                <Upload size={20} />
                Anexos e Fotos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Upload size={16} />
                    Anexar Arquivos
                  </Button>
                  {uploadedFiles.length > 0 && (
                    <p className="text-xs text-seguranca-lightgray mt-2">
                      {uploadedFiles.length} arquivo(s) selecionado(s)
                    </p>
                  )}
                </div>
                <div>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handleCameraCapture}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Camera size={16} />
                    Tirar Foto
                  </Button>
                  {capturedPhotos.length > 0 && (
                    <p className="text-xs text-seguranca-lightgray mt-2">
                      {capturedPhotos.length} foto(s) capturada(s)
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !formData.supervisorId || !formData.clientId || !formData.workPostId}
            className="bg-seguranca-yellow text-seguranca-black hover:bg-yellow-600"
          >
            {loading ? 'Salvando...' : visit ? 'Atualizar' : 'Salvar Visita'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};