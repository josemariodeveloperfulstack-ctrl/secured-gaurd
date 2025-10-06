import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Upload, QrCode, MapPin, User, Building, Clock, FileText, Scan } from 'lucide-react';
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
import { facialRecognitionService } from '@/services/facialRecognitionService';
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
  
  // Reconhecimento facial
  const [showFacialRecognition, setShowFacialRecognition] = useState(false);
  const [capturedFace, setCapturedFace] = useState<string | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  const startFacialRecognition = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowFacialRecognition(true);
      }
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      toast({
        title: "Erro ao acessar câmera",
        description: "Não foi possível acessar a câmera. Verifique as permissões.",
        variant: "destructive",
      });
    }
  };

  const stopFacialRecognition = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowFacialRecognition(false);
    setCapturedFace(null);
    setRecognitionResult(null);
    setIsRecognizing(false);
  };

  const captureFace = async () => {
    if (videoRef.current) {
      try {
        setIsRecognizing(true);
        
        // Capturar imagem da câmera
        const imageFile = await facialRecognitionService.captureFromCamera(videoRef.current);
        
        if (!imageFile) {
          throw new Error('Falha ao capturar imagem');
        }
        
        // Validar arquivo
        const validation = facialRecognitionService.validateImageFile(imageFile);
        if (!validation.valid) {
          throw new Error(validation.error);
        }
        
        // Converter para base64 para exibição
        const reader = new FileReader();
        reader.onload = (e) => {
          setCapturedFace(e.target?.result as string);
        };
        reader.readAsDataURL(imageFile);
        
        // Realizar reconhecimento facial
        const result = await facialRecognitionService.recognizeFace(imageFile);
        setRecognitionResult(result);
        
        if (result.success) {
          // Preencher dados do supervisor automaticamente
          setSupervisorCpf(result.cpf || '');
          setSupervisorName(result.employee?.name || '');
          
          toast({
            title: "Reconhecimento facial realizado com sucesso!",
            description: `Supervisor identificado: ${result.employee?.name} (CPF: ${result.cpf})`,
          });
        } else {
          toast({
            title: "Face não reconhecida",
            description: result.error || "Não foi possível identificar o supervisor",
            variant: "destructive",
          });
        }
        
      } catch (error: any) {
        console.error('Erro no reconhecimento facial:', error);
        toast({
          title: "Erro no reconhecimento facial",
          description: error.message || "Erro desconhecido",
          variant: "destructive",
        });
      } finally {
        setIsRecognizing(false);
      }
    }
  };

  const processFacialRecognition = async (imageData: string) => {
    setLoadingSupervisor(true);
    
    try {
      // SIMULAÇÃO: Em produção, aqui você enviaria a imagem para uma API de reconhecimento facial
      // que retornaria o ID ou CPF do funcionário identificado
      
      // Por enquanto, vamos simular um pequeno delay e mostrar uma mensagem
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Reconhecimento facial",
        description: "Funcionalidade em desenvolvimento. Por favor, use o CPF para identificação.",
        variant: "destructive",
      });
      
      stopFacialRecognition();
      
      /* 
      // CÓDIGO PARA PRODUÇÃO (quando tiver API de reconhecimento facial):
      const formData = new FormData();
      formData.append('image', imageData);
      
      const response = await api.post('/api/facial-recognition/identify', formData);
      
      if (response.data && response.data.employeeId) {
        const employee = response.data;
        setSupervisorName(employee.name);
        setSupervisorCpf(employee.cpf);
        setFormData(prev => ({ ...prev, supervisorId: employee.id }));
        
        toast({
          title: "Supervisor identificado",
          description: `${employee.name}`,
        });
        
        stopFacialRecognition();
      } else {
        toast({
          title: "Supervisor não identificado",
          description: "Não foi possível identificar o supervisor. Tente novamente.",
          variant: "destructive",
        });
      }
      */
    } catch (error) {
      console.error('Erro no reconhecimento facial:', error);
      toast({
        title: "Erro no reconhecimento",
        description: "Erro ao processar reconhecimento facial",
        variant: "destructive",
      });
    } finally {
      setLoadingSupervisor(false);
    }
  };

  const retryCapture = () => {
    setCapturedFace(null);
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
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={startFacialRecognition}
                  className="flex items-center gap-2"
                  disabled={loadingSupervisor}
                >
                  <Scan size={16} />
                  Reconhecimento Facial
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Modal de Reconhecimento Facial */}
          {showFacialRecognition && (
            <Dialog open={showFacialRecognition} onOpenChange={stopFacialRecognition}>
              <DialogContent className="max-w-2xl bg-seguranca-graphite border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-seguranca-yellow">
                    Reconhecimento Facial do Supervisor
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  {!capturedFace ? (
                    <>
                      <div className="relative bg-black rounded-lg overflow-hidden">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-auto"
                          style={{ maxHeight: '400px' }}
                        />
                      </div>
                      
                      <div className="flex gap-3 justify-center">
                        <Button
                          onClick={captureFace}
                          disabled={isRecognizing}
                          className="bg-seguranca-yellow text-seguranca-black hover:bg-yellow-600"
                        >
                          <Camera size={16} className="mr-2" />
                          {isRecognizing ? 'Reconhecendo...' : 'Capturar e Reconhecer'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={stopFacialRecognition}
                          disabled={isRecognizing}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="relative bg-black rounded-lg overflow-hidden">
                        <img
                          src={capturedFace}
                          alt="Foto capturada"
                          className="w-full h-auto"
                          style={{ maxHeight: '400px' }}
                        />
                      </div>
                      
                      {isRecognizing && (
                        <div className="text-center space-y-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-seguranca-yellow mx-auto"></div>
                          <p className="text-seguranca-lightgray">
                            Processando reconhecimento facial...
                          </p>
                        </div>
                      )}
                      
                      {recognitionResult && (
                        <div className="space-y-3">
                          {recognitionResult.success ? (
                            <div className="p-4 bg-green-900/20 border border-green-600 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <span className="text-green-400 font-medium">Reconhecimento bem-sucedido!</span>
                              </div>
                              <div className="text-sm text-green-300">
                                <p><strong>Nome:</strong> {recognitionResult.employee?.name}</p>
                                <p><strong>CPF:</strong> {recognitionResult.cpf}</p>
                                <p><strong>Confiança:</strong> {recognitionResult.confidence?.toFixed(1)}%</p>
                                <p><strong>Qualidade:</strong> {recognitionResult.quality?.toFixed(1)}%</p>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 bg-red-900/20 border border-red-600 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <XCircle className="w-5 h-5 text-red-500" />
                                <span className="text-red-400 font-medium">Face não reconhecida</span>
                              </div>
                              <div className="text-sm text-red-300">
                                <p>{recognitionResult.error}</p>
                                {recognitionResult.quality && (
                                  <p><strong>Qualidade da imagem:</strong> {recognitionResult.quality.toFixed(1)}%</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {!isRecognizing && (
                        <div className="flex gap-3 justify-center">
                          <Button
                            onClick={() => {
                              setCapturedFace(null);
                              setRecognitionResult(null);
                            }}
                            variant="outline"
                          >
                            Tirar Outra Foto
                          </Button>
                          <Button
                            onClick={stopFacialRecognition}
                          >
                            Fechar
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                {/* Canvas oculto para processar a imagem */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </DialogContent>
            </Dialog>
          )}

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