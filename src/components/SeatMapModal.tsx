import React, { useState, useEffect } from 'react';
import {
  X,
  Ticket,
  ShieldCheck,
  Clock,
  Sparkles,
  Info,
  ChevronRight,
  Trash2,
  Lock,
} from 'lucide-react';
import { EventItem, VenueSection, OrderSeat } from '../types';
import { DEFAULT_VENUE_SECTIONS } from '../data/mockEvents';

interface SeatMapModalProps {
  event: EventItem;
  onClose: () => void;
  onProceedToCheckout: (seats: OrderSeat[], subtotal: number, serviceFee: number, total: number) => void;
}

export const SeatMapModal: React.FC<SeatMapModalProps> = ({
  event,
  onClose,
  onProceedToCheckout,
}) => {
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const sections = event.sections || DEFAULT_VENUE_SECTIONS;
  const [activeSectionId, setActiveSectionId] = useState<string>(sections[0].id);
  const [selectedSeats, setSelectedSeats] = useState<OrderSeat[]>([]);
  const [hoveredSeat, setHoveredSeat] = useState<{
    sectionName: string;
    row: string;
    number: number;
    price: number;
  } | null>(null);

  const [secondsLeft, setSecondsLeft] = useState<number>(600);

  useEffect(() => {
    if (selectedSeats.length === 0) return;
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setSelectedSeats([]);
          return 600;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedSeats.length]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const activeSection = sections.find(s => s.id === activeSectionId) || sections[0];

  const handleSeatClick = (section: VenueSection, rowLetter: string, seatNum: number, seatId: string, isSold: boolean) => {
    if (isSold) return;

    const isAlreadySelected = selectedSeats.some(s => s.seatId === seatId);

    if (isAlreadySelected) {
      setSelectedSeats(prev => prev.filter(s => s.seatId !== seatId));
    } else {
      if (selectedSeats.length >= 6) {
        alert('Límite de compra alcanzado: Máximo 6 boletos por transacción.');
        return;
      }
      setSelectedSeats(prev => [
        ...prev,
        {
          seatId,
          sectionId: section.id,
          sectionName: section.name,
          row: rowLetter,
          number: seatNum,
          price: section.price,
        },
      ]);
    }
  };

  const removeSeat = (seatId: string) => {
    setSelectedSeats(prev => prev.filter(s => s.seatId !== seatId));
  };

  const subtotal = selectedSeats.reduce((acc, curr) => acc + curr.price, 0);
  const serviceFee = Math.round(subtotal * 0.14);
  const totalAmount = subtotal + serviceFee;

  const rowLetters = Array.from({ length: activeSection.rows }, (_, i) => String.fromCharCode(65 + i));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-900">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{event.category}</span>
              <span className="text-slate-300">&bull;</span>
              <span className="text-xs text-slate-500">{event.venue}, {event.city}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">{event.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout: Left = Seat Map, Right = Cart & Summary */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Main Visual Arena & Seat Map */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col items-center justify-between bg-white">
            {/* Section tabs */}
            <div className="w-full flex items-center justify-center gap-2 flex-wrap mb-4">
              {sections.map(sec => {
                const isActive = sec.id === activeSectionId;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSectionId(sec.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-100/90 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-200/80'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sec.color }} />
                    <span>{sec.name}</span>
                    <span className={`text-[11px] font-normal ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                      (${sec.price.toLocaleString('es-MX')})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Stage Visual in Sleek Charcoal */}
            <div className="w-full max-w-2xl my-2">
              <div className="relative py-3 px-6 rounded-2xl bg-slate-900 border border-slate-800 text-center shadow-md">
                <span className="text-xs font-black tracking-widest text-slate-100 uppercase flex items-center justify-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  ESCENARIO PRINCIPAL / STAGE
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">Visión directa al escenario</p>
              </div>
            </div>

            {/* Interactive Grid of Seats */}
            <div className="w-full max-w-3xl my-4 p-4 sm:p-6 bg-slate-50 border border-slate-200/90 rounded-2xl shadow-inner overflow-x-auto flex flex-col items-center">
              <div className="min-w-fit space-y-2.5">
                {rowLetters.map(rowLetter => {
                  return (
                    <div key={rowLetter} className="flex items-center gap-2">
                      {/* Row Label Left */}
                      <span className="w-6 text-center text-xs font-bold text-slate-400">{rowLetter}</span>

                      {/* Seats in Row */}
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {Array.from({ length: activeSection.seatsPerRow }, (_, idx) => {
                          const seatNum = idx + 1;
                          const seatId = `${activeSection.id}-${rowLetter}-${seatNum}`;
                          const isSold = event.seats?.[seatId] === 'sold' || (rowLetter === 'A' && seatNum % 5 === 0);
                          const isSelected = selectedSeats.some(s => s.seatId === seatId);

                          return (
                            <button
                              key={seatId}
                              disabled={isSold}
                              onClick={() => handleSeatClick(activeSection, rowLetter, seatNum, seatId, isSold)}
                              onMouseEnter={() =>
                                setHoveredSeat({
                                  sectionName: activeSection.name,
                                  row: rowLetter,
                                  number: seatNum,
                                  price: activeSection.price,
                                })
                              }
                              onMouseLeave={() => setHoveredSeat(null)}
                              className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                                isSold
                                  ? 'bg-slate-200/70 text-slate-400 border border-slate-200 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-300 scale-110 shadow-sm z-10'
                                  : 'bg-white hover:scale-105 hover:border-slate-800 text-slate-800 border border-slate-300 shadow-xs'
                              }`}
                              style={
                                !isSold && !isSelected
                                  ? { borderTopColor: activeSection.color, borderTopWidth: '3px' }
                                  : {}
                              }
                              title={`Fila ${rowLetter} - Asiento ${seatNum}`}
                            >
                              {isSold ? (
                                <Lock className="w-2.5 h-2.5 text-slate-400" />
                              ) : isSelected ? (
                                '✓'
                              ) : (
                                seatNum
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Row Label Right */}
                      <span className="w-6 text-center text-xs font-bold text-slate-400">{rowLetter}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hover tooltip / info bar */}
            <div className="h-8 flex items-center justify-center text-xs text-slate-600">
              {hoveredSeat ? (
                <div className="bg-slate-900 text-white px-3 py-1 rounded-full flex items-center gap-2 shadow-sm">
                  <span className="font-semibold text-blue-300">{hoveredSeat.sectionName}</span>
                  <span className="text-slate-500">&bull;</span>
                  <span>Fila {hoveredSeat.row}, Asiento {hoveredSeat.number}</span>
                  <span className="text-slate-500">&bull;</span>
                  <span className="font-bold text-emerald-400">${hoveredSeat.price.toLocaleString('es-MX')} MXN</span>
                </div>
              ) : (
                <span className="text-slate-500 text-xs">Pasa el cursor sobre un asiento para ver precio y localidad</span>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-5 text-xs text-slate-500 flex-wrap justify-center pt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-white border border-slate-300 shadow-xs"></span>
                <span>Disponible</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-emerald-600"></span>
                <span className="text-slate-800 font-semibold">Tu Selección</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-slate-200 border border-slate-200 flex items-center justify-center">
                  <Lock className="w-2 h-2 text-slate-400" />
                </span>
                <span>Ocupado / Vendido</span>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Cart & Price Breakdown — hidden on mobile (shown in bottom sheet) */}
          <div className="hidden lg:flex w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-200 bg-slate-50 p-4 sm:p-6 flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-blue-600" />
                  Boletos Seleccionados
                </h3>
                <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                  {selectedSeats.length} / 6 máx
                </span>
              </div>

              {/* Hold timer alert */}
              {selectedSeats.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center gap-2.5 text-xs text-amber-900">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                  <div>
                    <span className="font-bold">Asientos bloqueados temporalmente:</span>
                    <p className="text-[11px] text-amber-800 font-mono font-bold">
                      {formatTimer(secondsLeft)} restantes para pagar
                    </p>
                  </div>
                </div>
              )}

              {/* Selected seats list */}
              {selectedSeats.length === 0 ? (
                <div className="py-10 text-center text-slate-400 space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-200/60 flex items-center justify-center text-slate-400">
                    <Ticket className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-medium text-slate-500">No has seleccionado ningún asiento.</p>
                  <p className="text-[11px] text-slate-400">Haz clic en los asientos disponibles del mapa para agregarlos.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {selectedSeats.map(seat => (
                    <div
                      key={seat.seatId}
                      className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs shadow-xs hover:border-slate-300 transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{seat.sectionName}</div>
                        <div className="text-[11px] text-slate-500">
                          Fila <span className="font-bold text-slate-700">{seat.row}</span> &middot; Asiento <span className="font-bold text-slate-700">{seat.number}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">
                          ${seat.price.toLocaleString('es-MX')}
                        </span>
                        <button
                          onClick={() => removeSeat(seat.seatId)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                          title="Eliminar asiento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary & Checkout Button */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal ({selectedSeats.length} boletos)</span>
                  <span className="font-semibold text-slate-800">${subtotal.toLocaleString('es-MX')} MXN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    Cargo por servicio TicketsMX (14%)
                    <span title="Procesamiento y seguridad">
                      <Info className="w-3 h-3 text-slate-400" />
                    </span>
                  </span>
                  <span className="font-semibold text-slate-800">${serviceFee.toLocaleString('es-MX')} MXN</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total</span>
                  <span className="text-slate-900">${totalAmount.toLocaleString('es-MX')} MXN</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 justify-center py-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cifrado bancario seguro de extremo a extremo</span>
              </div>

              <button
                disabled={selectedSeats.length === 0}
                onClick={() => onProceedToCheckout(selectedSeats, subtotal, serviceFee, totalAmount)}
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  selectedSeats.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md hover:scale-[1.01]'
                }`}
              >
                <span>Continuar al Pago Seguro</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── MOBILE ONLY: Floating cart button ── */}
        <div className="lg:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={() => setMobileCartOpen(true)}
            className="flex items-center gap-3 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-xl transition-all active:scale-95 cursor-pointer"
          >
            <Ticket className="w-4 h-4 text-blue-300" />
            <span className="text-sm font-bold">
              {selectedSeats.length === 0
                ? 'Ver carrito'
                : `${selectedSeats.length} boleto${selectedSeats.length > 1 ? 's' : ''} · $${totalAmount.toLocaleString('es-MX')} MXN`}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* ── MOBILE ONLY: Bottom sheet cart ── */}
        {mobileCartOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-t-3xl p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Sheet handle */}
              <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto" />
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-blue-600" />
                  Boletos seleccionados
                </h3>
                <button onClick={() => setMobileCartOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedSeats.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-6">No has seleccionado ningún asiento aún.</p>
              ) : (
                <div className="space-y-2">
                  {selectedSeats.map(seat => (
                    <div key={seat.seatId} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm">
                      <div>
                        <div className="font-semibold text-slate-900">{seat.sectionName}</div>
                        <div className="text-xs text-slate-500">Fila {seat.row} · Asiento {seat.number}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">${seat.price.toLocaleString('es-MX')}</span>
                        <button onClick={() => removeSeat(seat.seatId)} className="text-slate-400 hover:text-rose-500 cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>${subtotal.toLocaleString('es-MX')} MXN</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Cargo por servicio (14%)</span>
                  <span>${serviceFee.toLocaleString('es-MX')} MXN</span>
                </div>
                <div className="flex justify-between font-black text-base text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total</span>
                  <span>${totalAmount.toLocaleString('es-MX')} MXN</span>
                </div>
              </div>

              <button
                disabled={selectedSeats.length === 0}
                onClick={() => {
                  setMobileCartOpen(false);
                  onProceedToCheckout(selectedSeats, subtotal, serviceFee, totalAmount);
                }}
                className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  selectedSeats.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md'
                }`}
              >
                <span>Continuar al Pago Seguro</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
