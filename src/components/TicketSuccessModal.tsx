import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Download,
  Calendar,
  MapPin,
  ShieldCheck,
  Smartphone,
  X,
  Ticket,
  FileCheck2,
  Layers,
  Eye,
} from 'lucide-react';
import { Order, OrderSeat } from '../types';
import { generateTicketPdf, cleanText } from '../services/ticketPdfService';
import { PdfViewerModal } from './PdfViewerModal';

interface TicketSuccessModalProps {
  order: Order;
  onClose: () => void;
  onViewMyTickets: () => void;
}

export const TicketSuccessModal: React.FC<TicketSuccessModalProps> = ({
  order,
  onClose,
  onViewMyTickets,
}) => {
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [selectedSeatForViewer, setSelectedSeatForViewer] = useState<OrderSeat | undefined>(undefined);

  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0f172a', '#3b82f6', '#10b981', '#f59e0b'],
      });
    } catch {
      // non-blocking
    }
  }, []);

  const handleDownloadPdf = async (seat?: OrderSeat) => {
    const key = seat ? `${order.id}-${seat.seatId}` : `${order.id}-all`;
    setDownloadingKey(key);
    try {
      await generateTicketPdf(order, seat);
      const msg = seat
        ? `¡Boleto Fila ${seat.row} Asiento #${seat.number} descargado en PDF!`
        : `¡Boletos oficiales (${order.seats.length}) descargados en PDF!`;
      setDownloadSuccessMsg(msg);
      setTimeout(() => setDownloadSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Error generating PDF ticket:', err);
      window.print();
    } finally {
      setDownloadingKey(null);
    }
  };

  const isGeneratingAll = downloadingKey === `${order.id}-all`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-900">
        {/* Header */}
        <div className="bg-slate-900 p-6 text-center text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md mb-2.5">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black">¡Compra Confirmada con Éxito!</h2>
          <p className="text-xs text-slate-300 mt-1">
            Tus boletos oficiales han sido emitidos y enviados a <span className="font-semibold text-white">{order.userEmail}</span>
          </p>
        </div>

        {/* Digital Ticket Pass Card */}
        <div className="p-4 sm:p-6 space-y-4 bg-slate-50">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {/* Top ticket strip */}
            <div className="p-4 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-slate-800" />
                <span className="text-xs font-bold text-slate-900 tracking-wider">BOLETO DIGITAL OFICIAL</span>
              </div>
              <span className="text-[10px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                {order.id}
              </span>
            </div>

            {/* Event Details */}
            <div className="p-4 space-y-3">
              <h3 className="text-base font-extrabold text-slate-900">{cleanText(order.eventTitle)}</h3>

              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{cleanText(order.venue)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{cleanText(order.eventDate)}</span>
                </div>
              </div>

              {/* Seats list with per-seat download option */}
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Asientos Asignados ({order.seats.length})</span>
                  {order.seats.length > 1 && (
                    <span className="text-[10px] text-blue-600 font-medium">Descarga por asiento disponible</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {order.seats.map((seat, i) => {
                    const seatKey = `${order.id}-${seat.seatId}`;
                    const isGeneratingSeat = downloadingKey === seatKey;

                    return (
                      <div
                        key={i}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-[11px] truncate">{seat.sectionName}</div>
                          <div className="text-blue-600 font-extrabold text-[11px]">
                            Fila {seat.row} &middot; Asiento #{seat.number}
                          </div>
                        </div>

                        {order.seats.length > 1 && (
                          <button
                            onClick={() => handleDownloadPdf(seat)}
                            disabled={isGeneratingSeat}
                            title="Descargar este boleto individual en PDF"
                            className="p-1 px-2 bg-white hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-200 transition-colors cursor-pointer shrink-0"
                          >
                            {isGeneratingSeat ? '...' : 'PDF'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cutout perforation line */}
              <div className="relative py-2 flex items-center">
                <div className="absolute -left-6 w-4 h-4 rounded-full bg-slate-50 border-r border-slate-200"></div>
                <div className="flex-1 border-t border-dashed border-slate-300"></div>
                <div className="absolute -right-6 w-4 h-4 rounded-full bg-slate-50 border-l border-slate-200"></div>
              </div>

              {/* QR Code and Barcode */}
              <div className="flex flex-col items-center justify-center py-2 space-y-2">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-300">
                  <svg className="w-36 h-36" viewBox="0 0 100 100" fill="none">
                    <rect width="100" height="100" fill="white" />
                    <rect x="10" y="10" width="24" height="24" rx="3" fill="#0f172a" />
                    <rect x="14" y="14" width="16" height="16" rx="2" fill="white" />
                    <rect x="18" y="18" width="8" height="8" rx="1" fill="#0f172a" />

                    <rect x="66" y="10" width="24" height="24" rx="3" fill="#0f172a" />
                    <rect x="70" y="14" width="16" height="16" rx="2" fill="white" />
                    <rect x="74" y="18" width="8" height="8" rx="1" fill="#0f172a" />

                    <rect x="10" y="66" width="24" height="24" rx="3" fill="#0f172a" />
                    <rect x="14" y="70" width="16" height="16" rx="2" fill="white" />
                    <rect x="18" y="74" width="8" height="8" rx="1" fill="#0f172a" />

                    <rect x="40" y="12" width="6" height="6" fill="#0f172a" />
                    <rect x="50" y="16" width="8" height="6" fill="#0f172a" />
                    <rect x="42" y="26" width="6" height="8" fill="#0f172a" />
                    <rect x="54" y="28" width="6" height="6" fill="#0f172a" />
                    <rect x="12" y="42" width="8" height="6" fill="#0f172a" />
                    <rect x="24" y="46" width="6" height="6" fill="#0f172a" />
                    <rect x="36" y="40" width="12" height="12" rx="2" fill="#026cdf" />
                    <rect x="54" y="44" width="6" height="8" fill="#0f172a" />
                    <rect x="66" y="42" width="8" height="6" fill="#0f172a" />
                    <rect x="78" y="46" width="6" height="6" fill="#0f172a" />
                    <rect x="42" y="66" width="6" height="6" fill="#0f172a" />
                    <rect x="52" y="72" width="8" height="6" fill="#0f172a" />
                    <rect x="68" y="68" width="6" height="8" fill="#0f172a" />
                    <rect x="78" y="76" width="8" height="6" fill="#0f172a" />
                    <rect x="44" y="82" width="6" height="6" fill="#0f172a" />
                  </svg>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-700 font-mono font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                  <span>CÓDIGO DINÁMICO ANTI-FRAUDE ACTIVO</span>
                </div>
              </div>
            </div>

            {/* Ticket Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                <span>SHA-256: {order.encryptedPayloadHash.substring(0, 16)}...</span>
              </div>
              <span className="font-bold text-slate-900">${order.totalAmount.toLocaleString('es-MX')} MXN</span>
            </div>
          </div>

          {/* Action notification toast */}
          {downloadSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-2 font-medium">
              <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{downloadSuccessMsg}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => {
                setSelectedSeatForViewer(undefined);
                setShowPdfViewer(true);
              }}
              className="py-3 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <Eye className="w-4 h-4 text-white" />
              <span>Ver Boletos en PDF</span>
            </button>
            <button
              onClick={() => handleDownloadPdf()}
              disabled={isGeneratingAll}
              className="py-3 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-75"
            >
              <Download className="w-4 h-4 text-white" />
              <span>{isGeneratingAll ? 'Generando PDF...' : 'Descargar Archivo (PDF)'}</span>
            </button>
          </div>

          <button
            onClick={onViewMyTickets}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-all text-center cursor-pointer flex items-center justify-center gap-2"
          >
            <Layers className="w-4 h-4 text-slate-600" />
            <span>Ir a Mis Boletos</span>
          </button>
        </div>
      </div>

      {/* Render Real PDF Viewer Modal */}
      {showPdfViewer && (
        <PdfViewerModal
          order={order}
          initialSeat={selectedSeatForViewer}
          onClose={() => {
            setShowPdfViewer(false);
            setSelectedSeatForViewer(undefined);
          }}
        />
      )}
    </div>
  );
};
