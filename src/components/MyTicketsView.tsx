import React, { useState } from 'react';
import {
  Ticket,
  Calendar,
  MapPin,
  Download,
  FileCheck2,
  Eye,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  Sparkles,
  Layers,
  X,
  Printer,
  Check,
} from 'lucide-react';
import { Order, OrderSeat } from '../types';
import { generateTicketPdf, cleanText } from '../services/ticketPdfService';
import { PdfViewerModal } from './PdfViewerModal';

interface MyTicketsViewProps {
  orders: Order[];
  onExploreEvents: () => void;
}

export const MyTicketsView: React.FC<MyTicketsViewProps> = ({
  orders,
  onExploreEvents,
}) => {
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [successKey, setSuccessKey] = useState<string | null>(null);
  const [pdfModalOrder, setPdfModalOrder] = useState<Order | null>(null);
  const [pdfModalSeat, setPdfModalSeat] = useState<OrderSeat | undefined>(undefined);

  const handleDownloadPdf = async (order: Order, seat?: OrderSeat) => {
    const key = seat ? `${order.id}-${seat.seatId}` : `${order.id}-all`;
    setDownloadingKey(key);
    try {
      await generateTicketPdf(order, seat);
      setSuccessKey(key);
      setTimeout(() => setSuccessKey(null), 3500);
    } catch (err) {
      console.error('Error generating PDF:', err);
      // Open in PDF modal if download had any issue
      setPdfModalOrder(order);
      setPdfModalSeat(seat);
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleOpenPdfViewer = (order: Order, seat?: OrderSeat) => {
    setPdfModalOrder(order);
    setPdfModalSeat(seat);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-900">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Mis Boletos Oficiales
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Generación y descarga de boletos PDF con validez oficial, código QR dinámico y firma criptográfica.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={onExploreEvents}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Explorar Cartelera</span>
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="py-20 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shadow-inner">
            <Ticket className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Aún no tienes boletos comprados</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Elige un evento del catálogo, selecciona tus asientos favoritos en el mapa y procesa tu pago seguro para emitir tus boletos en PDF.
            </p>
          </div>
          <button
            onClick={onExploreEvents}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all"
          >
            Ver Cartelera de Eventos
          </button>
        </div>
      ) : (
        <div className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {orders.map(order => {
              const allKey = `${order.id}-all`;
              const isDownloadingAll = downloadingKey === allKey;
              const isSuccessAll = successKey === allKey;

              return (
                <div
                  key={order.id}
                  className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs hover:shadow-xl hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header Strip */}
                    <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase">
                          Boleto Válido • Acceso Activo
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-300 bg-white/10 px-2 py-0.5 rounded border border-white/10">
                        {order.id}
                      </span>
                    </div>

                    {/* Content Body */}
                    <div className="p-5 sm:p-6 space-y-5">
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900">
                          {cleanText(order.eventTitle)}
                        </h3>
                        <div className="mt-2.5 space-y-1.5 text-xs text-slate-600">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="font-medium text-slate-700">{cleanText(order.venue)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="font-medium text-slate-700">{cleanText(order.eventDate)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Seats breakdown & per-seat PDF download */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-slate-500" />
                            Asientos Asignados ({order.seats.length})
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Descarga individual disponible
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {order.seats.map((seat, i) => {
                            const seatKey = `${order.id}-${seat.seatId}`;
                            const isDownloadingSeat = downloadingKey === seatKey;
                            const isSuccessSeat = successKey === seatKey;

                            return (
                              <div
                                key={i}
                                className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-2xs flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <div className="text-[11px] font-bold text-slate-900 truncate">
                                    {seat.sectionName}
                                  </div>
                                  <div className="text-[11px] text-blue-600 font-extrabold">
                                    Fila {seat.row} &middot; Asiento #{seat.number}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDownloadPdf(order, seat)}
                                  disabled={isDownloadingSeat}
                                  title={`Descargar PDF exclusivo para Fila ${seat.row} Asiento #${seat.number}`}
                                  className="shrink-0 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  {isSuccessSeat ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : isDownloadingSeat ? (
                                    <span className="w-3 h-3 border-2 border-slate-700 border-t-transparent rounded-full animate-spin"></span>
                                  ) : (
                                    <Download className="w-3.5 h-3.5" />
                                  )}
                                  <span>PDF</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Scannable Preview Bar */}
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-800 shadow-2xs shrink-0">
                            <Smartphone className="w-5 h-5 text-slate-700" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              Validez y Acceso con QR Digital
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              HASH: {order.encryptedPayloadHash.substring(0, 20)}...
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenPdfViewer(order)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>Ver en PDF</span>
                        </button>
                      </div>

                      {/* Status feedback message */}
                      {isSuccessAll && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs py-2 px-3 rounded-xl flex items-center gap-2 font-medium">
                          <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>¡Archivo PDF oficial generado y guardado en tu equipo!</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Download Full PDF */}
                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">Total Pagado: </span>
                      <span className="font-black text-slate-900 text-sm">
                        ${order.totalAmount.toLocaleString('es-MX')} MXN
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleOpenPdfViewer(order)}
                        className="px-3 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        title="Abrir visor completo de PDF con opción a imprimir"
                      >
                        <Printer className="w-4 h-4 text-slate-600" />
                        <span className="hidden sm:inline">Visor / Imprimir</span>
                      </button>

                      <button
                        onClick={() => handleDownloadPdf(order)}
                        disabled={isDownloadingAll}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-75"
                      >
                        {isDownloadingAll ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            <span>Generando PDF...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 text-white" />
                            <span>Descargar Boletos (PDF)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Real in-app interactive PDF Document Viewer */}
      {pdfModalOrder && (
        <PdfViewerModal
          order={pdfModalOrder}
          initialSeat={pdfModalSeat}
          onClose={() => {
            setPdfModalOrder(null);
            setPdfModalSeat(undefined);
          }}
        />
      )}
    </div>
  );
};
