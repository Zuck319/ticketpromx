import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  ArrowRight,
  Smartphone,
  Building2,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { EventItem, Order, OrderSeat } from '../types';
import { generatePaymentToken, generateTicketQrData, maskCardNumber } from '../services/cryptoService';
import {
  buildPreferenceItems,
  createPaymentPreference,
  generateMpExternalReference,
  isMpSandbox,
  MP_CHECKOUT_LINK,
  savePendingOrder,
  verifyMpPayment,
} from '../services/mercadoPagoService';

interface CheckoutModalProps {
  event: EventItem;
  seats: OrderSeat[];
  subtotal: number;
  serviceFee: number;
  totalAmount: number;
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
  } | null;
  onClose: () => void;
  onSuccess: (order: Order) => void;
}

type PaymentMethod = 'mercadopago' | 'apple_pay' | 'spei';
type CheckoutStep = 'summary' | 'processing' | 'awaiting_mp' | 'spei_details';

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  event,
  seats,
  subtotal,
  serviceFee,
  totalAmount,
  user,
  onClose,
  onSuccess,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mercadopago');
  const [step, setStep] = useState<CheckoutStep>('summary');
  const [mpCheckoutUrl, setMpCheckoutUrl] = useState<string>(MP_CHECKOUT_LINK);
  const [isLoadingPreference, setIsLoadingPreference] = useState(false);
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const [orderId] = useState(() =>
    `TM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
  );
  const [manualPaymentId, setManualPaymentId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const isSandbox = isMpSandbox();

  // Pre-carga la preferencia de MP en cuanto se selecciona ese método
  useEffect(() => {
    if (paymentMethod !== 'mercadopago') return;

    let cancelled = false;
    setIsLoadingPreference(true);
    setPreferenceError(null);

    const items = buildPreferenceItems(event.title, seats, serviceFee);
    const externalRef = generateMpExternalReference(orderId);

    createPaymentPreference(items, externalRef, user?.email || undefined)
      .then(result => {
        if (!cancelled) {
          setMpCheckoutUrl(result.checkoutUrl);
          setIsLoadingPreference(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMpCheckoutUrl(MP_CHECKOUT_LINK);
          setIsLoadingPreference(false);
          setPreferenceError('No se pudo generar una preferencia dinámica. Se usará el link de pago directo.');
        }
      });

    return () => { cancelled = true; };
  }, [paymentMethod, event.title, seats, serviceFee, orderId, user?.email]);

  // Guarda la orden pendiente en localStorage y muestra el paso de pago
  const handlePayWithMP = () => {
    savePendingOrder({
      orderId,
      externalRef: externalRefToken,
      event: {
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        venue: event.venue,
        city: event.city,
      },
      seats,
      subtotal,
      serviceFee,
      totalAmount,
      userId: user?.uid || 'guest-user',
      userEmail: user?.email || '',
      userName: user?.displayName || 'Cliente',
      createdAt: new Date().toISOString(),
    });
    setStep('awaiting_mp');
  };


  // Verifica el pago con la API de Mercado Pago antes de emitir los boletos
  const handleConfirmMpReturn = async () => {
    const trimmedId = manualPaymentId.trim();

    if (!trimmedId) {
      setVerificationError('Ingresa el número de operación que te dio Mercado Pago para validar tu pago.');
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const verification = await verifyMpPayment(trimmedId);

      if (verification.status === 'approved') {
        setStep('processing');
        const qrToken = generateTicketQrData(orderId, seats.length);

        const completedOrder: Order = {
          id: orderId,
          userId: user?.uid || 'guest-user',
          userEmail: user?.email || '',
          userName: user?.displayName || 'Cliente',
          eventId: event.id,
          eventTitle: event.title,
          eventDate: `${event.date} · ${event.time} hrs`,
          venue: `${event.venue}, ${event.city}`,
          seats,
          subtotal,
          serviceFee,
          totalAmount,
          status: 'completed',
          paymentMethodMasked: `Mercado Pago · ${verification.payment_method_id?.toUpperCase() || 'APROBADO'}`,
          paymentRef: `MP-${verification.id}`,
          encryptedPayloadHash: `MP_VERIFIED_${verification.id}_${verification.external_reference}`,
          qrCodeToken: qrToken,
          createdAt: new Date().toISOString(),
        };

        onSuccess(completedOrder);
      } else {
        setVerificationError(
          `El pago no está aprobado aún (estado: ${verification.status}). Si acabas de pagar, espera unos segundos e intenta de nuevo.`
        );
      }
    } catch (err: any) {
      setVerificationError(
        err.message || 'No se pudo verificar el pago. Revisa que el número de operación sea correcto.'
      );
    } finally {
      setIsVerifying(false);
    }
  };


  // Token externo para referenciar la orden en MP
  const externalRefToken = generateMpExternalReference(orderId);

  // Acción para SPEI — igual que antes, confirma directo
  const handleConfirmSpei = () => {
    setStep('processing');
    setTimeout(() => {
      const paymentRef = generatePaymentToken();
      const qrToken = generateTicketQrData(orderId, seats.length);

      const completedOrder: Order = {
        id: orderId,
        userId: user?.uid || 'guest-user',
        userEmail: user?.email || '',
        userName: user?.displayName || 'Cliente',
        eventId: event.id,
        eventTitle: event.title,
        eventDate: `${event.date} · ${event.time} hrs`,
        venue: `${event.venue}, ${event.city}`,
        seats,
        subtotal,
        serviceFee,
        totalAmount,
        status: 'completed',
        paymentMethodMasked: 'Transferencia SPEI',
        paymentRef,
        encryptedPayloadHash: `SPEI_${paymentRef}`,
        qrCodeToken: qrToken,
        createdAt: new Date().toISOString(),
      };

      onSuccess(completedOrder);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-900">

        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#009ee3] text-white flex items-center justify-center shadow-sm">
              {/* Logo MP simplificado */}
              <svg viewBox="0 0 30 30" fill="none" className="w-6 h-6">
                <circle cx="15" cy="15" r="15" fill="#009ee3"/>
                <path d="M8 15.5c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="15" cy="17" r="2.5" fill="#fff"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Pago Seguro con Mercado Pago</h2>
              <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Procesado por Mercado Pago · SSL/TLS · PCI-DSS</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ============ STEP: PROCESSING ============ */}
        {step === 'processing' && (
          <div className="p-8 sm:p-12 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-[#009ee3] text-white flex items-center justify-center shadow-lg">
              <Loader2 className="w-10 h-10 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Confirmando tu pago...</h3>
              <p className="text-xs text-slate-500 mt-1">Estamos registrando tu orden y emitiendo los boletos.</p>
            </div>
          </div>
        )}


        {/* ============ STEP: PAGAR EN MP (nueva pestaña) ============ */}
        {step === 'awaiting_mp' && (
          <div className="p-6 sm:p-8 space-y-5">

            {/* Instrucciones */}
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#009ee3] flex items-center justify-center shadow-lg">
                <svg viewBox="0 0 40 40" fill="none" className="w-9 h-9">
                  <path d="M6 20a14 14 0 0 1 28 0" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"/>
                  <circle cx="20" cy="24" r="4.5" fill="#fff"/>
                </svg>
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Completa tu pago en Mercado Pago</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Haz clic en el botón de abajo. Se abrirá Mercado Pago en una nueva pestaña donde podrás pagar con tarjeta, débito, OXXO y más.
                </p>
              </div>
            </div>

            {/* Pasos visuales */}
            <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-slate-500">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5">
                <div className="w-7 h-7 rounded-full bg-[#009ee3] text-white font-bold text-xs flex items-center justify-center mx-auto">1</div>
                <p>Abre Mercado Pago</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5">
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center mx-auto">2</div>
                <p>Completa el pago</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 space-y-1.5">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mx-auto">3</div>
                <p className="text-emerald-700 font-semibold">Confirma aquí</p>
              </div>
            </div>

            {/* Botón principal — anchor tag (no window.open) para evitar bloqueadores */}
            <a
              href={mpCheckoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-4 bg-[#009ee3] hover:bg-[#0080c0] text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-3 transition-all hover:scale-[1.01] cursor-pointer"
              style={{ textDecoration: 'none' }}
            >
              <svg viewBox="0 0 26 26" fill="none" className="w-5 h-5 shrink-0">
                <path d="M4 13.5a9 9 0 0 1 18 0" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="13" cy="16" r="3" fill="#fff"/>
              </svg>
              <span>Abrir Mercado Pago · ${totalAmount.toLocaleString('es-MX')} MXN</span>
              <ExternalLink className="w-4 h-4 opacity-80" />
            </a>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Pago procesado por Mercado Pago · Encriptación SSL · PCI-DSS</span>
            </div>

            {/* Separador */}
            <div className="border-t border-slate-200" />

            {/* Validación del pago */}
            <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Validación de Pago Requerida</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Al terminar de pagar en Mercado Pago, ingresa tu <strong>Número de Operación</strong> (aparece en tu comprobante o correo de MP) para verificar el pago y emitir tus boletos:
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej. 12345678901 (Núm. de operación MP)"
                  value={manualPaymentId}
                  onChange={e => {
                    setManualPaymentId(e.target.value);
                    if (verificationError) setVerificationError(null);
                  }}
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#009ee3]"
                />
                <button
                  type="button"
                  disabled={isVerifying || !manualPaymentId.trim()}
                  onClick={handleConfirmMpReturn}
                  className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                    isVerifying || !manualPaymentId.trim()
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                  }`}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Validar y Emitir</span>
                    </>
                  )}
                </button>
              </div>

              {verificationError && (
                <div className="flex items-start gap-1.5 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-700 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{verificationError}</span>
                </div>
              )}

              <p className="text-[10px] text-slate-400 text-center">
                💡 Si el pago se completó en la ventana de MP y te redirigió automáticamente, los boletos se emitirán sin necesidad de escribir el número.
              </p>
            </div>


            <button
              type="button"
              onClick={() => setStep('summary')}
              className="w-full py-2 text-slate-500 hover:text-slate-700 text-xs font-medium transition-colors cursor-pointer"
            >
              ← Volver al resumen
            </button>
          </div>
        )}





        {/* ============ STEP: SPEI DETAILS ============ */}
        {step === 'spei_details' && (
          <div className="p-6 sm:p-8 space-y-5">
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3 text-xs">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>Transferencia SPEI Inmediata</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 font-mono space-y-1.5 text-slate-700">
                <div>BANCO: <span className="text-slate-900 font-bold">STP TicketsMX</span></div>
                <div>CLABE: <span className="text-blue-700 font-bold">646180157019284729</span></div>
                <div>BENEFICIARIO: <span className="text-slate-900">TicketsMX México S.A.</span></div>
                <div>MONTO EXACTO: <span className="text-emerald-700 font-bold">${totalAmount.toLocaleString('es-MX')} MXN</span></div>
                <div className="pt-1 border-t border-slate-100">CONCEPTO: <span className="text-slate-900">{orderId}</span></div>
              </div>
              <p className="text-[11px] text-slate-500">
                Usa el ID de orden como concepto de transferencia para que podamos identificar tu pago. Los boletos se emiten en menos de 5 minutos tras confirmación bancaria.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('summary')}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                ← Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmSpei}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Confirmar Pago SPEI
              </button>
            </div>
          </div>
        )}

        {/* ============ STEP: MAIN SUMMARY ============ */}
        {step === 'summary' && (
          <div className="p-4 sm:p-6 space-y-5">

            {/* Order Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">{event.title}</span>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {seats.length} boleto(s) · {seats.map(s => `${s.row}-${s.number}`).join(', ')}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{event.venue} · {event.city}</p>
                </div>
                <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4">
                  <span className="text-[11px] text-slate-500 block">Subtotal</span>
                  <span className="text-xs text-slate-700">${subtotal.toLocaleString('es-MX')} MXN</span>
                  <span className="text-[11px] text-slate-500 block mt-1">Cargo servicio</span>
                  <span className="text-xs text-slate-700">${serviceFee.toLocaleString('es-MX')} MXN</span>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Total a Pagar</span>
                <span className="text-xl font-black text-slate-900">
                  ${totalAmount.toLocaleString('es-MX')} <span className="text-xs text-slate-500 font-normal">MXN</span>
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">Método de Pago</p>
              <div className="grid grid-cols-3 gap-2">
                {/* Mercado Pago */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('mercadopago')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === 'mercadopago'
                      ? 'bg-[#009ee3] border-[#009ee3] text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-blue-50'
                  }`}
                >
                  {/* MP icon */}
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                    <rect width="24" height="24" rx="4" fill={paymentMethod === 'mercadopago' ? '#fff3' : '#009ee3'}/>
                    <path d="M4 12.5a8 8 0 0 1 16 0" stroke={paymentMethod === 'mercadopago' ? '#fff' : '#fff'} strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="14.5" r="2.5" fill={paymentMethod === 'mercadopago' ? '#fff' : '#fff'}/>
                  </svg>
                  <span>Mercado Pago</span>
                  <span className={`text-[10px] ${paymentMethod === 'mercadopago' ? 'text-blue-100' : 'text-slate-400'}`}>
                    Tarjeta / Débito
                  </span>
                </button>

                {/* Apple / Google Pay */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('apple_pay')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === 'apple_pay'
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                  <span>Apple / Google Pay</span>
                  <span className={`text-[10px] ${paymentMethod === 'apple_pay' ? 'text-slate-300' : 'text-slate-400'}`}>
                    Próximamente
                  </span>
                </button>

                {/* SPEI */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('spei')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === 'spei'
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Building2 className="w-5 h-5" />
                  <span>Transferencia SPEI</span>
                  <span className={`text-[10px] ${paymentMethod === 'spei' ? 'text-slate-300' : 'text-slate-400'}`}>
                    Inmediata
                  </span>
                </button>
              </div>
            </div>

            {/* Mercado Pago section */}
            {paymentMethod === 'mercadopago' && (
              <div className="space-y-3">
                {/* MP Brands accepted */}
                <div className="bg-[#f0f8ff] border border-[#009ee3]/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#009ee3] flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Pago 100% seguro con Mercado Pago</p>
                      <p className="text-[11px] text-slate-500">Acepta tarjetas de crédito, débito, saldo MP y más</p>
                    </div>
                  </div>

                  {/* Card logos */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {['VISA', 'MC', 'AMEX', 'SPEI', 'OXXO'].map(brand => (
                      <span
                        key={brand}
                        className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600 shadow-xs"
                      >
                        {brand}
                      </span>
                    ))}
                  </div>

                  {isSandbox && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-800">
                        <strong>Modo Pruebas activo.</strong> Configura <code className="font-mono bg-amber-100 px-1 rounded">VITE_MP_PUBLIC_KEY</code> con tu clave de producción para cobros reales.
                      </p>
                    </div>
                  )}

                  {preferenceError && (
                    <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                      <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-600">{preferenceError}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Apple Pay section */}
            {paymentMethod === 'apple_pay' && (
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-2">
                <Smartphone className="w-9 h-9 text-slate-800 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900">Pago biométrico — Próximamente</h4>
                <p className="text-xs text-slate-500">
                  Integración con Apple Pay y Google Wallet próximamente disponible. Por ahora usa Mercado Pago o SPEI.
                </p>
              </div>
            )}

            {/* Security Notice */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Tus datos están protegidos:</span>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  El pago es procesado directamente por Mercado Pago con encriptación SSL y cumplimiento PCI-DSS Nivel 1. TicketsMX nunca almacena datos de tu tarjeta.
                </p>
              </div>
            </div>

            {/* Action Button */}
            {paymentMethod === 'mercadopago' && (
              <button
                type="button"
                onClick={handlePayWithMP}
                disabled={isLoadingPreference}
                className="w-full py-3.5 px-4 bg-[#009ee3] hover:bg-[#0080c0] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2.5 transition-all cursor-pointer hover:scale-[1.01]"
              >
                {isLoadingPreference ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Preparando pago...</span>
                  </>
                ) : (
                  <>
                    {/* MP logo */}
                    <svg viewBox="0 0 22 22" fill="none" className="w-5 h-5">
                      <circle cx="11" cy="11" r="11" fill="#fff3"/>
                      <path d="M4 12a7 7 0 0 1 14 0" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
                      <circle cx="11" cy="14" r="2.5" fill="#fff"/>
                    </svg>
                    <span>Pagar ${totalAmount.toLocaleString('es-MX')} MXN con Mercado Pago</span>
                    <ExternalLink className="w-4 h-4 opacity-80" />
                  </>
                )}
              </button>
            )}

            {paymentMethod === 'spei' && (
              <button
                type="button"
                onClick={() => setStep('spei_details')}
                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.01]"
              >
                <Building2 className="w-4 h-4" />
                <span>Ver datos para Transferencia SPEI</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {paymentMethod === 'apple_pay' && (
              <button
                type="button"
                disabled
                className="w-full py-3.5 px-4 bg-slate-300 text-slate-500 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <Lock className="w-4 h-4" />
                <span>Apple / Google Pay — Próximamente</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
