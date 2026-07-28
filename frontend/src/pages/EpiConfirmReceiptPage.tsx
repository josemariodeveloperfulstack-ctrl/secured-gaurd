import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import LoadingSpinner from '@/components/LoadingSpinner';
import SignaturePad from '@/components/SignaturePad';
import { epiDeliveryFormService, PublicEpiConfirmation } from '@/services/epiDeliveryFormService';
import { AlertCircle, CheckCircle2, Shield } from 'lucide-react';

export default function EpiConfirmReceiptPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicEpiConfirmation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [signatureBase64, setSignatureBase64] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await epiDeliveryFormService.getPublicConfirmation(token!);
      setData(result);
      if (result.alreadyConfirmed) {
        setConfirmed(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Link inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!code.trim() || code.trim().length !== 6) {
      setError('Informe o código de 6 dígitos recebido no WhatsApp.');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      const result = await epiDeliveryFormService.confirmPublicReceipt(
        token!,
        code.trim(),
        signatureBase64 || undefined
      );
      setData(result);
      setConfirmed(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Não foi possível confirmar. Verifique o código.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (confirmed) {
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
              Obrigado, <strong>{data?.employeeName}</strong>. O recebimento dos EPIs foi registrado com sucesso.
            </p>
            <p className="mt-4 text-sm text-gray-500">Você já pode fechar esta aba.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-seguranca-black flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-16 h-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl text-red-500">Link inválido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data?.expired) {
    return (
      <div className="min-h-screen bg-seguranca-black flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-16 h-16 text-amber-500" />
            </div>
            <CardTitle className="text-2xl">Código expirado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Solicite ao responsável uma nova confirmação via WhatsApp.
            </p>
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
            <div className="flex justify-center mb-2">
              <Shield className="h-8 w-8 text-seguranca-red" />
            </div>
            <h1 className="text-2xl font-bold text-seguranca-red">Confirmação de Recebimento de EPI</h1>
            <p className="text-muted-foreground">Digite o código recebido no WhatsApp para confirmar</p>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4 bg-muted/50 p-4 rounded-lg">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Funcionário</Label>
                <p className="font-semibold">{data?.employeeName}</p>
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Empresa</Label>
                <p className="font-semibold">{data?.companyName || '-'}</p>
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Data da Entrega</Label>
                <p className="font-semibold">
                  {data?.deliveryDate
                    ? new Date(data.deliveryDate + 'T12:00:00').toLocaleDateString('pt-BR')
                    : '-'}
                </p>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Itens entregues</Label>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead>EPI</TableHead>
                      <TableHead>CA</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.items?.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.epiName}</TableCell>
                        <TableCell>{item.ca || '-'}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Código de confirmação</Label>
              <Input
                id="code"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl tracking-[0.4em] font-mono h-14"
              />
              <p className="text-xs text-muted-foreground">Código de 6 dígitos enviado no WhatsApp</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Assinatura (opcional)</Label>
                {signatureBase64 ? (
                  <Badge className="bg-green-500 text-white border-none">Assinado</Badge>
                ) : (
                  <Badge variant="outline">Opcional</Badge>
                )}
              </div>
              {!signatureBase64 ? (
                <div className="bg-white rounded-lg p-2 border-2 border-dashed">
                  <SignaturePad onSave={setSignatureBase64} />
                </div>
              ) : (
                <div className="bg-white rounded-lg border p-4 text-center">
                  <img src={signatureBase64} alt="Assinatura" className="max-h-28 mx-auto" />
                  <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setSignatureBase64('')}>
                    Refazer assinatura
                  </Button>
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <Button
              className="w-full h-12"
              onClick={handleConfirm}
              disabled={submitting || code.length !== 6}
            >
              {submitting ? 'Confirmando...' : 'Confirmar recebimento'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
