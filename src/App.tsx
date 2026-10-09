/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut, User as FirebaseUser } from 'firebase/auth';
import {
  Ticket,
  ShieldCheck,
  Sparkles,
  Lock,
  ArrowRight,
  TrendingUp,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import { auth, googleProvider } from './firebase/config';
import { EventItem, Order, OrderSeat, AppNotification } from './types';
import { generatePaymentToken, generateTicketQrData } from './services/cryptoService';
import { verifyMpPayment, consumePendingOrder } from './services/mercadoPagoService';
import {

  fetchEvents,
  saveOrder,
  fetchUserOrders,
  fetchAllOrders,
  createEvent,
  updateEvent,
  deleteEvent,
  updateOrderStatus,
} from './services/eventService';
import {
  fetchUserNotifications,
  sendNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from './services/notificationService';

import { Navbar } from './components/Navbar';
import { FeaturedEventsSection } from './components/FeaturedEventsSection';
import { EventCard } from './components/EventCard';
import { SeatMapModal } from './components/SeatMapModal';
import { CheckoutModal } from './components/CheckoutModal';
import { TicketSuccessModal } from './components/TicketSuccessModal';
import { MyTicketsView } from './components/MyTicketsView';
import { AdminDashboard } from './components/AdminDashboard';
import { ApiDocsView } from './components/ApiDocsView';
import { NotificationDrawer } from './components/NotificationDrawer';

// Correos con permisos de administrador. Debe coincidir con isAdmin() en firestore.rules.
const ADMIN_EMAILS = ['espinosadylan616@gmail.com', 'angel.solis.hdz.mxn@gmail.com'];

export default function App() {
  // Navigation & view state
  const [currentView, setCurrentView] = useState<'catalog' | 'tickets' | 'admin' | 'api-docs'>('catalog');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCity, setSelectedCity] = useState('Todas las Ciudades');

  // Data state
  const [events, setEvents] = useState<EventItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Auth state
  const [user, setUser] = useState<{
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  } | null>(null);
  // Admin = solo correos autorizados con sesión real de Google (ver ADMIN_EMAILS)

  // Modals state
  const [selectedEventForSeats, setSelectedEventForSeats] = useState<EventItem | null>(null);
  const [checkoutData, setCheckoutData] = useState<{
    event: EventItem;
    seats: OrderSeat[];
    subtotal: number;
    serviceFee: number;
    totalAmount: number;
  } | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  // Check admin rights
  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser: FirebaseUser | null) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
        });
        // Load user orders and notifications
        const userOrders = await fetchUserOrders(currentUser.uid);
        setOrders(userOrders);
        const userNotifs = await fetchUserNotifications(currentUser.uid);
        setNotifications(userNotifs);
      } else {
        setUser(null);
        // Load guest orders and notifications
        const guestOrders = await fetchUserOrders('guest');
        setOrders(guestOrders);
        const guestNotifs = await fetchUserNotifications('guest');
        setNotifications(guestNotifs);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load events
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const evts = await fetchEvents();
        setEvents(evts);

        // Also fetch all orders if user is admin
        if (isAdmin) {
          const allOrd = await fetchAllOrders();
          setOrders(allOrd);
        } else {
          const defaultOrders = await fetchUserOrders(user?.uid || 'guest');
          if (defaultOrders.length > 0) {
            setOrders(defaultOrders);
          }
        }
      } catch (err) {
        console.warn('Error loading initial data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [isAdmin]);

  // Intercepta el retorno de Mercado Pago desde la URL
  // Parámetros que MP envía al redirigir: payment_id (o collection_id), status, external_reference
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get('payment_id') || params.get('collection_id');
    const mpStatus = params.get('status') || params.get('mp_status');

    if (!paymentId) return;

    // Limpia los query params de la barra de direcciones para que no se reejecute al recargar
    window.history.replaceState({}, '', window.location.pathname);

    const verifyAndCompleteOrder = async () => {
      try {
        console.log(`[MP Return] Verificando pago ${paymentId}...`);
        const verification = await verifyMpPayment(paymentId);

        if (verification.status === 'approved') {
          // Recuperar la orden pendiente que se guardó antes de ir a MP
          const pending = consumePendingOrder();

          if (pending) {
            const qrToken = generateTicketQrData(pending.orderId, pending.seats.length);
            const verifiedOrder: Order = {
              id: pending.orderId,
              userId: pending.userId,
              userEmail: pending.userEmail,
              userName: pending.userName,
              eventId: pending.event.id,
              eventTitle: pending.event.title,
              eventDate: `${pending.event.date} · ${pending.event.time} hrs`,
              venue: `${pending.event.venue}, ${pending.event.city}`,
              seats: pending.seats,
              subtotal: pending.subtotal,
              serviceFee: pending.serviceFee,
              totalAmount: pending.totalAmount,
              status: 'completed',
              paymentMethodMasked: `Mercado Pago · ${verification.payment_method_id.toUpperCase()}`,
              paymentRef: `MP-${paymentId}`,
              encryptedPayloadHash: `MP_VERIFIED_${paymentId}_${verification.external_reference}`,
              qrCodeToken: qrToken,
              createdAt: new Date().toISOString(),
            };

            await handlePaymentSuccess(verifiedOrder);
          } else {
            console.warn('[MP Return] Pago aprobado pero no se encontró la orden pendiente en caché.');
          }
        } else {
          alert(`El pago no fue aprobado. Estado: ${verification.status}. Intenta de nuevo.`);
        }
      } catch (err) {
        console.error('[MP Return] Error al verificar el pago:', err);
        alert('No se pudo verificar el pago con Mercado Pago. Si ya pagaste, contacta a soporte con tu comprobante.');
      }
    };

    verifyAndCompleteOrder();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.warn('Google Sign-In popup closed or cancelled:', err);
      if (err?.code === 'auth/unauthorized-domain') {
        alert('FIREBASE BLOQUEÓ EL ACCESO: Tu dominio/IP actual no está autorizado en tu consola de Firebase. \n\nVe a Firebase > Authentication > Settings > Authorized Domains y agrega la dirección desde donde estás abriendo la página (ej. localhost o tu IP).');
      } else {
        alert('No se pudo iniciar sesión con Google. Revisa que el navegador permita ventanas emergentes e inténtalo de nuevo.');
      }
    }
  };

  // Solo para desarrollo: forzar inicio de sesión local si Firebase falla por dominios
  const handleDevLogin = () => {
    setUser({
      uid: 'local-dev-admin',
      email: 'espinosadylan616@gmail.com',
      displayName: 'Dylan (Dev Admin)',
      photoURL: null,
    });
  };

  const handleSignOut = async () => {
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    setUser(null);
    setCurrentView('catalog');
  };


  // Seat selection -> Proceed to Checkout
  const handleProceedToCheckout = (
    seats: OrderSeat[],
    subtotal: number,
    serviceFee: number,
    totalAmount: number
  ) => {
    if (!selectedEventForSeats) return;
    const currentEvt = selectedEventForSeats;
    setSelectedEventForSeats(null);
    setCheckoutData({
      event: currentEvt,
      seats,
      subtotal,
      serviceFee,
      totalAmount,
    });
  };

  // Payment completed -> Save order, trigger automated notification, update event inventory
  const handlePaymentSuccess = async (order: Order) => {
    setCheckoutData(null);
    setCompletedOrder(order);

    // Save order in Firestore / cache
    await saveOrder(order);

    // Update local orders list
    setOrders(prev => [order, ...prev]);

    // Update local event availableSeats count
    setEvents(prev =>
      prev.map(e => {
        if (e.id === order.eventId) {
          const updatedSeats = { ...(e.seats || {}) };
          order.seats.forEach(s => {
            updatedSeats[s.seatId] = 'sold';
          });
          return {
            ...e,
            availableSeats: Math.max(0, e.availableSeats - order.seats.length),
            seats: updatedSeats,
          };
        }
        return e;
      })
    );

    // Trigger automated notification for user
    const newNotif = await sendNotification(user?.uid || 'guest', {
      title: '¡Compra confirmada! Boletos emitidos',
      message: `Tus ${order.seats.length} boletos para "${order.eventTitle}" en ${order.venue} ya están disponibles en tu sección Mis Boletos.`,
      type: 'order_confirmation',
      eventId: order.eventId,
    });

    setNotifications(prev => [newNotif, ...prev]);
  };

  // Admin Actions
  const handleAddEvent = async (eventData: Omit<EventItem, 'id'>) => {
    const created = await createEvent(eventData);
    setEvents(prev => [created, ...prev]);
  };

  const handleUpdateEvent = async (id: string, updates: Partial<EventItem>) => {
    const updated = await updateEvent(id, updates);
    setEvents(prev => prev.map(e => e.id === id ? updated : e));
  };

  const handleDeleteEvent = async (id: string) => {
    await deleteEvent(id);
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const handleRefundOrder = async (orderId: string) => {
    await updateOrderStatus(orderId, 'refunded');
    setOrders(prev =>
      prev.map(o => o.id === orderId ? { ...o, status: 'refunded' } : o)
    );
  };

  const handleBroadcastNotification = async (title: string, message: string) => {
    const notif = await sendNotification('guest', {
      title,
      message,
      type: 'event_update',
    });
    setNotifications(prev => [notif, ...prev]);
  };

  // Notification actions
  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(user?.uid || 'guest', id);
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead(user?.uid || 'guest');
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Filter events
  const filteredEvents = events.filter(e => {
    const matchesSearch =
      searchQuery === '' ||
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.venue.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || e.category === selectedCategory;

    const matchesCity =
      selectedCity === 'Todas las Ciudades' || e.city === selectedCity;

    return matchesSearch && matchesCategory && matchesCity;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedCity={selectedCity}
        onSelectCity={setSelectedCity}
        currentView={currentView}
        onNavigate={setCurrentView}
        unreadNotificationsCount={unreadCount}
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
        user={user}
        isAdmin={isAdmin}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onDevLogin={handleDevLogin}
      />

      {/* Main Body */}
      <main className="flex-1">
        {/* VIEW 1: CATALOG OF EVENTS */}
        {currentView === 'catalog' && (
          <div>
            {/* Hero Banner - Solo visible en la sección "Todos" */}
            {selectedCategory === 'all' && !searchQuery.trim() && (
              <div className="relative overflow-hidden bg-white border-b border-slate-200 py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(15,23,42,0.03),transparent_50%)] pointer-events-none" />
                <div className="max-w-7xl mx-auto text-center space-y-4 relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Temporada 2026 &middot; Asientos en Tiempo Real & Pagos Encriptados</span>
                  </div>

                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 max-w-4xl mx-auto leading-tight">
                    Tus Boletos Oficiales al{' '}
                    <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 bg-clip-text text-transparent">
                      Mejor Precio y Seguridad
                    </span>
                  </h1>

                  <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
                    Elige tus butacas favoritas en el mapa en vivo de los recintos más icónicos. Compra con cifrado bancario AES-256 y recibe tus boletos oficiales con código QR dinámico.
                  </p>

                  {/* Trust Badges Bar */}
                  <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Boletos 100% Auténticos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-slate-700" />
                      <span>Encriptación AES-256-GCM</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>Selección de Asientos 3D</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Curated Featured Events Spotlight */}
            <FeaturedEventsSection
              events={
                selectedCategory === 'all'
                  ? events
                  : events.filter(e => e.category === selectedCategory)
              }
              onSelectEvent={event => setSelectedEventForSeats(event)}
            />

            {/* Events Grid Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                    <span>{selectedCategory === 'all' ? 'Cartelera Completa' : `Eventos de ${selectedCategory}`}</span>
                    <span className="text-xs bg-slate-200 text-slate-800 px-2.5 py-0.5 rounded-full font-bold">
                      {filteredEvents.length} eventos
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedCategory === 'all'
                      ? 'Explora y filtra conciertos, deportes, teatro y festivales con disponibilidad en vivo.'
                      : `Cartelera exclusiva de ${selectedCategory.toLowerCase()} con selección de asientos en vivo.`}
                  </p>
                </div>

                {/* Quick Shortcuts */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentView('tickets')}
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-xs font-semibold text-slate-800 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Ticket className="w-3.5 h-3.5 text-slate-700" />
                    <span>Mis Boletos Comprados</span>
                  </button>
                </div>
              </div>

              {/* Events Cards Grid */}
              {isLoading ? (
                <div className="py-24 text-center space-y-3">
                  <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500">Cargando disponibilidad y recintos...</p>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-slate-200 shadow-xs">
                  <Search className="w-10 h-10 text-slate-400 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-900">No encontramos eventos con estos filtros</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Intenta cambiar la categoría, buscar otra ciudad o limpiar la barra de búsqueda.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setSelectedCity('Todas las Ciudades');
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Restablecer Filtros
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEvents.map(evt => (
                    <EventCard
                      key={evt.id}
                      event={evt}
                      onSelect={event => setSelectedEventForSeats(event)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: MY TICKETS */}
        {currentView === 'tickets' && (
          <MyTicketsView
            orders={orders}
            onExploreEvents={() => setCurrentView('catalog')}
          />
        )}

        {/* VIEW 3: ADMIN DASHBOARD — solo admins reales */}
        {currentView === 'admin' && isAdmin && (
          <AdminDashboard
            events={events}
            orders={orders}
            onAddEvent={handleAddEvent}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
            onRefundOrder={handleRefundOrder}
            onBroadcastNotification={handleBroadcastNotification}
            isAdmin={isAdmin}
          />
        )}
        {currentView === 'admin' && !isAdmin && (
          <div className="max-w-md mx-auto my-16 p-8 text-center bg-white border border-slate-200 rounded-3xl shadow-sm space-y-3">
            <ShieldCheck className="w-10 h-10 mx-auto text-slate-400" />
            <h2 className="text-lg font-bold text-slate-900">Acceso restringido</h2>
            <p className="text-sm text-slate-500">
              {user ? 'Tu cuenta no tiene permisos de administrador.' : 'Inicia sesión con una cuenta de administrador para continuar.'}
            </p>
            {!user && (
              <button
                onClick={handleSignIn}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl cursor-pointer"
              >
                Iniciar sesión con Google
              </button>
            )}
          </div>
        )}

        {/* VIEW 4: API REST & PYTHON BACKEND DOCS */}
        {currentView === 'api-docs' && (
          <ApiDocsView events={events} orders={orders} />
        )}
      </main>

      {/* Interactive Modals */}
      {selectedEventForSeats && (
        <SeatMapModal
          event={selectedEventForSeats}
          onClose={() => setSelectedEventForSeats(null)}
          onProceedToCheckout={handleProceedToCheckout}
        />
      )}

      {checkoutData && (
        <CheckoutModal
          event={checkoutData.event}
          seats={checkoutData.seats}
          subtotal={checkoutData.subtotal}
          serviceFee={checkoutData.serviceFee}
          totalAmount={checkoutData.totalAmount}
          user={user}
          onClose={() => setCheckoutData(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {completedOrder && (
        <TicketSuccessModal
          order={completedOrder}
          onClose={() => setCompletedOrder(null)}
          onViewMyTickets={() => {
            setCompletedOrder(null);
            setCurrentView('tickets');
          }}
        />
      )}

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-slate-900" />
            <span className="font-bold text-slate-800">TicketsMX Pro &copy; 2026</span>
            <span>&middot; Todos los derechos reservados</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Encriptación AES-256 Activa
            </span>
            <button
              onClick={() => setCurrentView('api-docs')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Documentación API
            </button>
            <button
              onClick={() => setCurrentView('admin')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Panel Administrador
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
