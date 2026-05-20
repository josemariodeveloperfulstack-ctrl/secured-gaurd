import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  QrCode, 
  Camera, 
  Type, 
  Package, 
  MapPin, 
  Hash, 
  Box, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { stockService } from '@/services/stockService';
import { StockItem } from '@/types/stock';
import { useToast } from '@/hooks/use-toast';

interface StockInventoryScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSyncComplete: () => void;
}

const StockInventoryScanner: React.FC<StockInventoryScannerProps> = ({
  open,
  onOpenChange,
  onSyncComplete
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'scan' | 'details' | 'success'>('scan');
  const [manualCode, setManualCode] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [physicalQuantity, setPhysicalQuantity] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setStep('scan');
      setManualCode('');
      setSelectedItem(null);
      setPhysicalQuantity(0);
      setScannerActive(false);
    }
  }, [open]);

  const handleScan = async (code: string) => {
    setLoading(true);
    try {
      const item = await stockService.getItemByQrCode(code);
      setSelectedItem(item);
      setPhysicalQuantity(item.currentQuantity);
      setStep('details');
    } catch (error) {
      toast({
        title: 'Item não encontrado',
        description: 'O QR Code não corresponde a nenhum item no sistema.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setScannerActive(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
    }
  };

  const startScanner = () => {
    setScannerActive(true);
    // Simulação de scanner (em produção usaria uma lib como react-qr-reader)
    setTimeout(() => {
      // Aqui simularia a leitura de um QR Code real
      // handleScan('QR-CODE-VAL'); 
    }, 1000);
  };

  const handleSyncSubmit = async () => {
    if (!selectedItem) return;
    
    setIsSubmitting(true);
    try {
      await stockService.adjustInventoryViaQrCode(
        selectedItem.qrCode || '', 
        physicalQuantity
      );
      
      setStep('success');
      toast({
        title: 'Sucesso',
        description: 'Quantidade física atualizada no sistema.',
      });
      
      setTimeout(() => {
        onSyncComplete();
        onOpenChange(false);
      }, 2000);
    } catch (error: any) {
      toast({
        title: 'Erro na sincronização',
        description: error?.message || 'Não foi possível atualizar a quantidade.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md bg-gradient-to-br from-seguranca-graphite/95 to-seguranca-black/95 border-gray-600/50 shadow-2xl backdrop-blur-sm p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <QrCode className="h-6 w-6 text-seguranca-red" />
            Sincronizar Inventário
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {step === 'scan' ? 'Escaneie a etiqueta da prateleira' : 'Confirme as quantidades'}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-2">
          {step === 'scan' && (
            <div className="space-y-6">
              {/* Área do Scanner */}
              <div className="relative group">
                <div className="w-full aspect-square max-w-[240px] mx-auto border-2 border-dashed border-seguranca-red/30 rounded-2xl flex items-center justify-center bg-seguranca-black/40 overflow-hidden transition-all group-hover:border-seguranca-red/50">
                  {scannerActive ? (
                    <div className="text-center relative z-10">
                      <div className="absolute inset-0 bg-seguranca-red/5 animate-pulse" />
                      <Camera className="h-16 w-16 mx-auto mb-3 text-seguranca-red animate-bounce" />
                      <p className="text-sm font-medium text-white">Escaneando...</p>
                    </div>
                  ) : (
                    <div className="text-center p-6 cursor-pointer" onClick={startScanner}>
                      <div className="p-4 rounded-full bg-seguranca-red/10 mb-4 inline-block">
                        <QrCode className="h-12 w-12 text-seguranca-red" />
                      </div>
                      <p className="text-sm text-gray-400 font-medium">Toque para ativar a câmera</p>
                    </div>
                  )}
                  {/* Cantos decorativos */}
                  <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-seguranca-red" />
                  <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-seguranca-red" />
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-seguranca-red" />
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-seguranca-red" />
                </div>
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-2 text-seguranca-red font-medium">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando item...
                </div>
              )}

              {/* Entrada Manual */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-600/30" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-transparent px-2 text-gray-500 font-semibold tracking-wider">OU DIGITE O CÓDIGO</span>
                </div>
              </div>

              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Type className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Código do item ou QR"
                    className="pl-10 bg-seguranca-black/50 border-gray-600/30 text-white"
                  />
                </div>
                <Button type="submit" disabled={!manualCode.trim() || loading} className="bg-seguranca-red hover:bg-seguranca-darkred">
                  Ir
                </Button>
              </form>
            </div>
          )}

          {step === 'details' && selectedItem && (
            <div className="space-y-6">
              {/* Info do Item */}
              <Card className="bg-seguranca-black/50 border-gray-600/30 p-4 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-2">
                  <Badge variant="outline" className="border-seguranca-red/30 text-seguranca-red bg-seguranca-red/5">
                    {selectedItem.category}
                  </Badge>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-seguranca-red/20 border border-seguranca-red/20">
                    <Package className="h-6 w-6 text-seguranca-red" />
                  </div>
                  <div className="space-y-1 pr-12">
                    <h4 className="text-lg font-bold text-white leading-tight">
                      {selectedItem.fullName}
                    </h4>
                    <div className="flex flex-col gap-1 text-sm text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5 text-seguranca-red" />
                        Ref: {selectedItem.code}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-seguranca-red" />
                        {selectedItem.locations && selectedItem.locations.length > 0 
                          ? `Prateleira: ${selectedItem.locations[0].shelfIdentification} - ${selectedItem.locations[0].floor}`
                          : 'Localização não definida'}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Comparação de Quantidades */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-seguranca-black/30 border-gray-600/20 p-4 text-center">
                  <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Sistema</span>
                  <div className="text-3xl font-black text-white mt-1">
                    {selectedItem.currentQuantity}
                  </div>
                  <span className="text-[10px] text-gray-500 uppercase">Unidades</span>
                </Card>
                
                <Card className="bg-seguranca-red/5 border-seguranca-red/20 p-4 text-center">
                  <span className="text-xs text-seguranca-red uppercase font-bold tracking-wider">Físico</span>
                  <div className="mt-1">
                    <Input
                      type="number"
                      value={physicalQuantity}
                      onChange={(e) => setPhysicalQuantity(parseInt(e.target.value) || 0)}
                      className="text-2xl font-black text-center bg-transparent border-none text-white focus-visible:ring-0 h-9 p-0"
                    />
                  </div>
                  <span className="text-[10px] text-seguranca-red/60 uppercase">Toque para ajustar</span>
                </Card>
              </div>

              {/* Botão de Ação */}
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleSyncSubmit}
                  disabled={isSubmitting}
                  className="w-full h-12 text-lg font-bold bg-gradient-to-r from-seguranca-red to-seguranca-darkred hover:from-seguranca-darkred hover:to-seguranca-red shadow-xl shadow-seguranca-red/20"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2" />
                      Sincronizar Agora
                    </>
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setStep('scan')}
                  className="text-gray-400 hover:text-white"
                >
                  Voltar ao Scanner
                </Button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                <CheckCircle2 className="h-10 w-10 text-green-500 animate-in zoom-in duration-300" />
              </div>
              <h3 className="text-2xl font-bold text-white">Sincronizado!</h3>
              <p className="text-gray-400">
                O estoque do sistema foi atualizado <br /> para <span className="text-white font-bold">{physicalQuantity}</span> unidades.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StockInventoryScanner;
