import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PatrimonialAsset, PatrimonialDepreciation } from '@/services/patrimonialService';
import { patrimonialService } from '@/services/patrimonialService';

interface PatrimonialDepreciationModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: PatrimonialAsset | null;
}

export const PatrimonialDepreciationModal: React.FC<PatrimonialDepreciationModalProps> = ({
  isOpen,
  onClose,
  asset,
}) => {
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PatrimonialDepreciation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && asset) {
      setAsOf(new Date().toISOString().slice(0, 10));
      setData(null);
      setError(null);
    }
  }, [isOpen, asset]);

  const handleCalculate = async () => {
    if (!asset) return;
    setLoading(true);
    setError(null);
    try {
      const result = await patrimonialService.getDepreciation(asset.id, asOf);
      setData(result);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erro ao calcular depreciação.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-seguranca-graphite border-gray-700 text-seguranca-lightgray">
        <DialogHeader>
          <DialogTitle>Depreciação {asset ? `— ${asset.code} ${asset.name}` : ''}</DialogTitle>
        </DialogHeader>
        {asset && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="dep-asof">Data de referência</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="dep-asof"
                  type="date"
                  value={asOf}
                  onChange={(e) => setAsOf(e.target.value)}
                  className="bg-seguranca-black border-gray-600"
                />
                <Button type="button" onClick={handleCalculate} disabled={loading} className="bg-seguranca-red hover:bg-seguranca-darkred">
                  {loading ? 'Calculando...' : 'Calcular'}
                </Button>
              </div>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            {data && (
              <div className="rounded-lg border border-gray-600 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Valor de aquisição</span>
                  <span>{formatCurrency(data.acquisitionValue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Depreciação acumulada</span>
                  <span>{formatCurrency(data.accumulatedDepreciation)}</span>
                </div>
                <div className="flex justify-between font-medium pt-2 border-t border-gray-600">
                  <span>Valor contábil em {data.asOfDate}</span>
                  <span>{formatCurrency(data.bookValue)}</span>
                </div>
                <div className="text-xs text-gray-400 pt-1">
                  Meses depreciados: {data.monthsDepreciated} / {data.usefulLifeMonths}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
