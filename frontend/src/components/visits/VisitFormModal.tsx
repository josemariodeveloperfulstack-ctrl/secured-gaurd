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
import { CreateVisitRequest, VisitStatus } from '@/types/visit';
import { visitService } from '@/services/visitService';

interface VisitFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit?: Visit | null;
  onSave: (data: CreateVisitRequest) => void;
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
    status: VisitStatus.SCHEDULED,
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

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
        status: VisitStatus.SCHEDULED,
        presentEmployees: [],
        attachedFiles: [],
        photos: [],
        latitude: undefined,
        longitude: undefined,
        locationAddress: '',
        qrCodeScanned: '',
        qrCodeVerified: false,
      });
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
    setCapturingLocation(true);
    try {
      const location = await visitService.getCurrentLocation();
      
      setFormData(prev => ({
        ...prev,
        latitude: location.latitude,
        longitude: location.longitude,
        locationAddress: `Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}`,
      }));

      toast({
        title: 'Sucesso',
        description: 'Localização capturada com sucesso',
      });
    } catch (error) {
      console.error('Erro ao capturar localização:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao capturar localização. Verifique as permissões do navegador.',
        variant: 'destructive',
      });
    } finally {
      setCapturingLocation(false);
    }
  };

  const handleScanQRCode = async () => {
    setScanningQR(true);
    try {
      // Simular leitura de QR Code
      // Em um sistema real, isso seria integrado com uma biblioteca de QR Code
      const qrData = await visitService.simulateQRCodeScan('mock-qr-data');
      
      setFormData(prev => ({
        ...prev,
        workPostId: qrData.workPostId,
        clientId: qrData.clientId,
        qrCodeScanned: JSON.stringify(qrData),
        qrCodeVerified: true,
        presentEmployees: qrData.employees.map(emp => emp.id),
      }));

      toast({
        title: 'Sucesso',
        description: `QR Code lido com sucesso! ${qrData.employees.length} funcionário(s) carregado(s).`,
      });
    } catch (error) {
      console.error('Erro ao ler QR Code:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao ler QR Code',
        variant: 'destructive',
      });
    } finally {
      setScanningQR(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newPhotos = Array.from(files);
      setCapturedPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        attachedFiles: [...(formData.attachedFiles || []), ...uploadedFiles.map(f => f.name)],
        photos: [...(formData.photos || []), ...capturedPhotos.map(f => f.name)],
      };

      onSave(submitData);
    } catch (error) {
      console.error('Erro ao salvar visita:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao salvar visita',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-seguranca-graphite border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">
            {visit ? 'Editar Visita' : 'Nova Visita'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <Card className="bg-seguranca-black border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Data da Visita *</Label>
                  <Input
                    type="date"
                    value={formData.visitDate}
                    onChange={(e) => handleInputChange('visitDate', e.target.value)}
                    className="bg-seguranca-graphite border-gray-600 text-white"
                    required
                  />
                </div>
                
                <div>
                  <Label className="text-gray-300">Horário *</Label>
                  <Input
                    type="time"
                    value={formData.visitTime}
                    onChange={(e) => handleInputChange('visitTime', e.target.value)}
                    className="bg-seguranca-graphite border-gray-600 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Supervisor *</Label>
                  <Input
                    value={formData.supervisorId}
                    onChange={(e) => handleInputChange('supervisorId', e.target.value)}
                    placeholder="ID do supervisor"
                    className="bg-seguranca-graphite border-gray-600 text-white"
                    required
                  />
                </div>
                
                <div>
                  <Label className="text-gray-300">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger className="bg-seguranca-graphite border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={VisitStatus.SCHEDULED}>Agendada</SelectItem>
                      <SelectItem value={VisitStatus.IN_PROGRESS}>Em Andamento</SelectItem>
                      <SelectItem value={VisitStatus.COMPLETED}>Concluída</SelectItem>
                      <SelectItem value={VisitStatus.CANCELLED}>Cancelada</SelectItem>
                      <SelectItem value={VisitStatus.MISSED}>Não Realizada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Posto de Trabalho *</Label>
                  <Input
                    value={formData.workPostId}
                    onChange={(e) => handleInputChange('workPostId', e.target.value)}
                    placeholder="ID do posto de trabalho"
                    className="bg-seguranca-graphite border-gray-600 text-white"
                    required
                  />
                </div>
                
                <div>
                  <Label className="text-gray-300">Cliente *</Label>
                  <Input
                    value={formData.clientId}
                    onChange={(e) => handleInputChange('clientId', e.target.value)}
                    placeholder="ID do cliente"
                    className="bg-seguranca-graphite border-gray-600 text-white"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code e Localização */}
          <Card className="bg-seguranca-black border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <QrCode className="w-5 h-5 mr-2" />
                QR Code e Localização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleScanQRCode}
                  disabled={scanningQR}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  {scanningQR ? 'Lendo...' : 'Ler QR Code'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCaptureLocation}
                  disabled={capturingLocation}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  {capturingLocation ? 'Capturando...' : 'Capturar Localização'}
                </Button>
              </div>

              {formData.qrCodeVerified && (
                <div className="p-3 bg-green-900/20 border border-green-500 rounded-lg">
                  <div className="flex items-center text-green-400">
                    <QrCode className="w-4 h-4 mr-2" />
                    <span>QR Code verificado com sucesso</span>
                  </div>
                </div>
              )}

              {formData.latitude && formData.longitude && (
                <div className="p-3 bg-blue-900/20 border border-blue-500 rounded-lg">
                  <div className="flex items-center text-blue-400">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>Localização capturada: {formData.locationAddress}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Funcionários Presentes */}
          <Card className="bg-seguranca-black border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <User className="w-5 h-5 mr-2" />
                Funcionários Presentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {formData.presentEmployees?.map((employeeId, index) => (
                  <Badge key={index} className="bg-seguranca-yellow text-black mr-2">
                    Funcionário {employeeId}
                  </Badge>
                ))}
                {(!formData.presentEmployees || formData.presentEmployees.length === 0) && (
                  <p className="text-gray-400 text-sm">Nenhum funcionário adicionado</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Descrição e Observações */}
          <Card className="bg-seguranca-black border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Descrição e Observações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300">Descrição da Visita</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descreva os detalhes da visita..."
                  className="bg-seguranca-graphite border-gray-600 text-white min-h-[100px]"
                />
              </div>

              <div>
                <Label className="text-gray-300">Observações</Label>
                <Textarea
                  value={formData.observations}
                  onChange={(e) => handleInputChange('observations', e.target.value)}
                  placeholder="Observações adicionais..."
                  className="bg-seguranca-graphite border-gray-600 text-white min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Upload de Arquivos e Fotos */}
          <Card className="bg-seguranca-black border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                Arquivos e Fotos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload de Arquivos */}
              <div>
                <Label className="text-gray-300">Arquivos</Label>
                <div className="flex space-x-2 mb-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Arquivo
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-seguranca-graphite rounded">
                        <span className="text-white text-sm">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Captura de Fotos */}
              <div>
                <Label className="text-gray-300">Fotos</Label>
                <div className="flex space-x-2 mb-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => cameraInputRef.current?.click()}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Tirar Foto
                  </Button>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    capture="environment"
                    onChange={handleCameraCapture}
                    className="hidden"
                  />
                </div>

                {capturedPhotos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {capturedPhotos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-24 object-cover rounded border border-gray-600"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700"
                        >
                          <X className="w-3 h-3 text-white" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancelar
            </Button>
            
            <Button
              type="submit"
              disabled={loading}
              className="bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-black"
            >
              {loading ? 'Salvando...' : (visit ? 'Atualizar' : 'Criar')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
