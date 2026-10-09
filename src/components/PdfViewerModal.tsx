import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Printer,
  ExternalLink,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Order, OrderSeat } from '../types';
import { buildTicketPdfDoc, generateTicketPdf, cleanText } from '../services/ticketPdfService';

interface PdfViewerModalProps {
  order: Order;
  initialSeat?: OrderSeat;
  onClose: () => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  order,
  initialSeat,
  onClose,
}) => {
  const [selectedSeat, setSelectedSeat] = useState<OrderSeat | undefined>(initialSeat);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Generate dynamic PDF Data URI or Object URL on seat change
  useEffect(() => {
    let activeUrl: string | null = null;
    try {
      setIsGenerating(true);
      const doc = buildTicketPdfDoc(order, selectedSeat);
      // Produce high-fidelity Blob
      const blob = doc.output('blob');
      activeUrl = URL.createObjectURL(blob);
      setPdfDataUrl(activeUrl);
    } catch (err) {
      console.error('Error generating in-viewer PDF blob:', err);
    } finally {
      setIsGenerating(false);
    }

    return () => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [order, selectedSeat]);

  const handleDownload = async () => {
    try {
      await generateTicketPdf(order, selectedSeat);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handlePrint = () => {
    if (pdfDataUrl) {
      const iframe = document.getElementById('ticket-pdf-iframe') as HTMLIFrameElement | null;
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          return;
        } catch {
          // fallback window print
        }
      }
      window.open(pdfDataUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header Bar */}
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate">
                  Boleto PDF Oficial: {cleanText(order.eventTitle)}
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/30 shrink-0">
                  Folio {order.id}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Documento oficial con código QR activo, trazabilidad y firma criptográfica
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              title="Imprimir documento PDF"
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Descargar Archivo .PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Strip if Order has multiple seats */}
        {order.seats && order.seats.length > 1 && (
          <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider shrink-0 mr-1">
              Seleccionar Vista:
            </span>
            <button
              onClick={() => setSelectedSeat(undefined)}
              className={`px-3 py-1 rounded-md font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedSeat === undefined
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Todos los Boletos ({order.seats.length})</span>
            </button>

            {order.seats.map((seat, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedSeat(seat)}
                className={`px-3 py-1 rounded-md font-medium transition-all shrink-0 cursor-pointer ${
                  selectedSeat?.seatId === seat.seatId
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Fila {seat.row} - Asiento #{seat.number}
              </button>
            ))}
          </div>
        )}

        {/* Success Alert Toast */}
        {downloadSuccess && (
          <div className="bg-emerald-500 text-slate-950 text-xs px-4 py-2 font-bold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>¡Boleto en formato PDF guardado exitosamente en tus Descargas!</span>
          </div>
        )}

        {/* Main PDF Viewer (native browser iframe renderer) */}
        <div className="flex-1 bg-slate-950 p-2 sm:p-4 flex flex-col items-center justify-center relative overflow-hidden">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <span className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
              <p className="text-xs font-medium">Renderizando documento PDF oficial...</p>
            </div>
          ) : pdfDataUrl ? (
            <div className="w-full h-full flex flex-col rounded-xl overflow-hidden border border-slate-800 shadow-inner bg-slate-900">
              <iframe
                id="ticket-pdf-iframe"
                src={`${pdfDataUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                title="Boleto Oficial PDF"
                className="w-full h-full border-0 bg-slate-800"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <AlertCircle className="w-8 h-8 text-amber-400" />
              <p className="text-xs">No fue posible generar la previsualización del PDF.</p>
              <button
                onClick={handleDownload}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Descargar Directamente
              </button>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Documento emitido con validez oficial para acceso en torniquetes.</span>
          </div>
          <div className="flex items-center gap-3">
            {pdfDataUrl && (
              <a
                href={pdfDataUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
              >
                <span>Abrir en nueva pestaña</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <span className="text-slate-600">|</span>
            <span>TicketsMX Pro México © 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
};
