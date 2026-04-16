"use client";

import { useState } from "react";
import Image from "next/image";
import { Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components/admin";

interface QrMesasPrintableProps {
  qrCodes: { mesa: number | string; dataUrl: string; url: string }[];
  nomeEstabelecimento: string;
  totalAtual: number;
  inicioAtual: number;
}

export function QrMesasPrintable({
  qrCodes,
  nomeEstabelecimento,
  totalAtual,
  inicioAtual,
}: QrMesasPrintableProps) {
  const router = useRouter();
  const [total, setTotal] = useState(String(totalAtual));
  const [inicio, setInicio] = useState(String(inicioAtual));

  function handleGerar() {
    const params = new URLSearchParams({ total, inicio });
    router.push(`/admin/qr-mesas?${params.toString()}`);
  }

  function handleImprimir() {
    window.print();
  }

  return (
    <>
      <Card className="print:hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Número inicial da mesa"
              type="number"
              min="1"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Input
              label="Quantidade de mesas"
              type="number"
              min="1"
              max="100"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleGerar}>
              Gerar
            </Button>
            <Button onClick={handleImprimir}>
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>
      </Card>

      <div
        id="qr-mesas-print"
        className="grid grid-cols-1 gap-6 print:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3"
      >
        {qrCodes.map((qr) => (
          <div
            key={qr.mesa}
            className="flex flex-col items-center gap-3 rounded-2xl border border-onyx-800/70 bg-onyx-900/60 p-6 text-center print:border-2 print:border-black print:bg-white print:text-black print:break-inside-avoid"
          >
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-flame-400 print:text-black">
              {nomeEstabelecimento}
            </p>
            <h2 className="font-display text-3xl font-bold text-ivory-50 print:text-black">
              Mesa {qr.mesa}
            </h2>
            <div className="rounded-xl bg-white p-3">
              <Image
                src={qr.dataUrl}
                alt={`QR Code da mesa ${qr.mesa}`}
                width={220}
                height={220}
                unoptimized
                className="h-56 w-56"
              />
            </div>
            <p className="text-xs text-onyx-300 print:text-black">
              Escaneie para ver o cardápio
            </p>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          @page {
            size: A4;
            margin: 12mm;
          }
        }
      `}</style>
    </>
  );
}
