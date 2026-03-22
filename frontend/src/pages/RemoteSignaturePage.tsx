import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { deliveryService } from '@/services/deliveryService';
import SignaturePad from '@/components/SignaturePad';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function RemoteSignaturePage() {
  const { token } = useParams<{ token: string }>();
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    if (token) {
      loadDelivery();
    }
  }, [token]);

  const loadDelivery = async () => {
    try {
      setLoading(true);
      const data = await deliveryService.getPublicDelivery(token!);
      setDelivery(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Link inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (signatureBase64: string) => {
    try {
      setLoading(true);
      await deliveryService.signRemote(token!, {
        signatureBase64,
        origin: 'REMOTE_LINK'
      });
      setSigned(true);
    } catch (err: any) {
      setError('Erro ao processar assinatura. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !delivery && !signed) {
    return <LoadingSpinner />;
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-seguranca-black flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Recebimento Confirmado!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Obrigado, <strong>{delivery?.employee?.name}</strong>. Sua assinatura foi registrada com sucesso.
            </p>
            <p className="mt-4 text-sm text-gray-500">Você já pode fechar esta aba.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-seguranca-black flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-16 h-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl text-red-500">Erro na Validação</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
            <Button className="mt-6" onClick={() => window.location.reload()}>Tentar Novamente</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-seguranca-black py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center border-b">
            <h1 className="text-2xl font-bold text-seguranca-red">Protocolo de Recebimento</h1>
            <p className="text-muted-foreground">Confirme os itens recebidos e assine abaixo</p>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4 bg-muted/50 p-4 rounded-lg">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Funcionário</Label>
                <p className="font-semibold">{delivery?.employee?.name}</p>
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Data da Entrega</Label>
                <p className="font-semibold">{new Date(delivery?.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Itens da Entrega</Label>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {delivery?.items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.product?.name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Label className="mb-4 block text-center font-bold">Assinatura Digital</Label>
              <SignaturePad onSave={handleSign} />
              <p className="text-[10px] text-center text-muted-foreground mt-4 italic">
                Ao assinar, você confirma o recebimento integral dos itens acima listados em perfeitas condições.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
