import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { AlertCircle, Building2, Loader2 } from 'lucide-react';

interface NovaClinicaModalProps {
  open: boolean;
  onClose: () => void;
  onClinicCreated: (name: string) => void;
}

const NovaClinicaModal: React.FC<NovaClinicaModalProps> = ({ open, onClose, onClinicCreated }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Nome da clínica é obrigatório.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Não há entidade de clínica no backend.
      // O "cadastro" aqui é definir o nome que será salvo junto ao exame médico.
      onClinicCreated(name.trim());
      setName('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar clínica.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto p-0 mx-4 sm:mx-0">
        <DialogHeader className="bg-gradient-to-r from-seguranca-red to-seguranca-yellow p-4 sm:p-6 text-white sticky top-0 z-10">
          <DialogTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl font-bold">
            <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg">
              <Building2 className="h-4 w-4 sm:h-6 sm:w-6" />
            </div>
            <span className="truncate">Nova Clínica</span>
          </DialogTitle>
          <DialogDescription className="text-white/90 text-sm sm:text-base mt-1">
            Informe o nome da clínica para vincular ao exame médico.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <Card className="bg-seguranca-graphite border-gray-700">
            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clinicName" className="text-xs sm:text-sm font-medium text-gray-200 flex items-center gap-2">
                  <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="truncate">Nome da Clínica</span>
                </Label>
                <Input
                  id="clinicName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Clínica ABC Saúde Ocupacional"
                  disabled={loading}
                  autoFocus
                  className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                />
              </div>

              {error && (
                <Card className="bg-red-500/10 border-red-500/30">
                  <div className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-red-300 font-medium break-words">{error}</span>
                  </div>
                </Card>
              )}
            </div>
          </Card>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 sm:pt-6 border-t border-gray-600">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="w-full sm:w-auto border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white h-10 sm:h-11 text-sm sm:text-base order-2 sm:order-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full sm:w-auto bg-gradient-to-r from-seguranca-red to-seguranca-yellow hover:from-seguranca-red/90 hover:to-seguranca-yellow/90 text-white font-medium h-10 sm:h-11 text-sm sm:text-base order-1 sm:order-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                  <span className="truncate">Cadastrando...</span>
                </>
              ) : (
                'Cadastrar Clínica'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NovaClinicaModal;

