import React, { useState } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Ticket,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Sliders,
  Send,
  CheckCircle,
  X,
  Lock,
  Star,
  Download,
} from 'lucide-react';
import { EventItem, Order, EventCategory } from '../types';
import { DEFAULT_VENUE_SECTIONS } from '../data/mockEvents';
import { generateTicketPdf } from '../services/ticketPdfService';

interface AdminDashboardProps {
  events: EventItem[];
  orders: Order[];
  onAddEvent: (eventData: Omit<EventItem, 'id'>) => Promise<void>;
  onUpdateEvent: (id: string, updates: Partial<EventItem>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onRefundOrder: (orderId: string) => Promise<void>;
  onBroadcastNotification: (title: string, message: string) => Promise<void>;
  isAdmin: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  events,
  orders,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onRefundOrder,
  onBroadcastNotification,
  isAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'kpi' | 'events' | 'inventory' | 'orders'>('kpi');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formArtist, setFormArtist] = useState('');
  const [formVenue, setFormVenue] = useState('Estadio GNP Seguros');
  const [formCity, setFormCity] = useState('Ciudad de México');
  const [formDate, setFormDate] = useState('2026-12-15');
  const [formTime, setFormTime] = useState('20:00');
  const [formCategory, setFormCategory] = useState<EventCategory>('Conciertos');
  const [formBasePrice, setFormBasePrice] = useState(900);
  const [formTotalSeats, setFormTotalSeats] = useState(250);
  const [formImageUrl, setFormImageUrl] = useState('https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1200&q=80');
  const [formDesc, setFormDesc] = useState('');
  const [formIsFeatured, setFormIsFeatured] = useState(false);

  const [selectedInventoryEventId, setSelectedInventoryEventId] = useState<string>(events[0]?.id || '');
  const selectedEvent = events.find(e => e.id === selectedInventoryEventId) || events[0];

  const [broadcastTitle, setBroadcastTitle] = useState('¡Nuevas localidades liberadas!');
  const [broadcastMessage, setBroadcastMessage] = useState('Se han abierto 50 asientos adicionales en Zona VIP.');
  const [broadcastSent, setBroadcastSent] = useState(false);

  const totalRevenue = orders.reduce((sum, o) => o.status === 'completed' ? sum + o.totalAmount : sum, 0);
  const totalTicketsSold = orders.reduce((sum, o) => o.status === 'completed' ? sum + o.seats.length : sum, 0);
  const activeEventsCount = events.length;
  const avgOrderValue = orders.length > 0 ? Math.round(totalRevenue / (orders.length || 1)) : 0;

  const handleOpenCreate = () => {
    if (!isAdmin) return;
    setEditingEvent(null);
    setFormTitle('');
    setFormArtist('');
    setFormVenue('Arena CDMX');
    setFormCity('Ciudad de México');
    setFormDate('2026-12-20');
    setFormTime('20:30');
    setFormCategory('Conciertos');
    setFormBasePrice(850);
    setFormTotalSeats(250);
    setFormImageUrl('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80');
    setFormDesc('Espectacular presentación en vivo con escenografía de primer nivel.');
    setFormIsFeatured(false);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (evt: EventItem) => {
    if (!isAdmin) return;
    setEditingEvent(evt);
    setFormTitle(evt.title);
    setFormArtist(evt.artist);
    setFormVenue(evt.venue);
    setFormCity(evt.city);
    setFormDate(evt.date);
    setFormTime(evt.time);
    setFormCategory(evt.category);
    setFormBasePrice(evt.basePrice);
    setFormTotalSeats(evt.totalSeats);
    setFormImageUrl(evt.imageUrl);
    setFormDesc(evt.description);
    setFormIsFeatured(!!evt.isFeatured);
    setIsCreateModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
    if (editingEvent) {
      await onUpdateEvent(editingEvent.id, {
        title: formTitle,
        artist: formArtist,
        venue: formVenue,
        city: formCity,
        date: formDate,
        time: formTime,
        category: formCategory,
        basePrice: Number(formBasePrice),
        totalSeats: Number(formTotalSeats),
        imageUrl: formImageUrl,
        description: formDesc,
        isFeatured: formIsFeatured,
      });
    } else {
      const base = Number(formBasePrice) || 10;
      const customSections = [
        { ...DEFAULT_VENUE_SECTIONS[0], price: base * 10 }, // VIP (100 if base=10)
        { ...DEFAULT_VENUE_SECTIONS[1], price: base * 6 },  // Preferente (60 if base=10)
        { ...DEFAULT_VENUE_SECTIONS[2], price: base * 3 },  // Platea (30 if base=10)
        { ...DEFAULT_VENUE_SECTIONS[3], price: base * 1 },  // General (10 if base=10)
      ];

      await onAddEvent({
        title: formTitle,
        artist: formArtist,
        venue: formVenue,
        city: formCity,
        date: formDate,
        time: formTime,
        category: formCategory,
        basePrice: base,
        totalSeats: Number(formTotalSeats),
        availableSeats: Number(formTotalSeats),
        imageUrl: formImageUrl,
        description: formDesc,
        isFeatured: formIsFeatured,
        sections: customSections,
      });
    }
    setIsCreateModalOpen(false);
    } catch (err) {
      console.error('Error guardando evento:', err);
      alert('No se pudo guardar el evento. Revisa la consola para más detalles.');
    }
  };

  const handleSendBroadcast = async () => {
    await onBroadcastNotification(broadcastTitle, broadcastMessage);
    setBroadcastSent(true);
    setTimeout(() => setBroadcastSent(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-slate-900">
      {/* Top Banner / Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">Panel de Control de Boletería</h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isAdmin ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                {isAdmin ? 'ADMIN AUTORIZADO' : 'MODO AUDITOR'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Control de disponibilidad, asignación de aforo, métricas de venta en tiempo real y notificaciones masivas.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('kpi')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'kpi'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Métricas & KPIs</span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'events'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Gestión de Eventos ({events.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'inventory'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Disponibilidad & Aforo</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Ventas & Reembolsos ({orders.length})</span>
        </button>
      </div>

      {/* TAB 1: KPIs & Metrics */}
      {activeTab === 'kpi' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Ingresos Brutos</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                ${totalRevenue.toLocaleString('es-MX')} <span className="text-xs text-slate-400">MXN</span>
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                +18.4% vs mes anterior
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Boletos Vendidos</span>
                <Ticket className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {totalTicketsSold} <span className="text-xs text-slate-400">boletos</span>
              </div>
              <div className="text-[11px] text-blue-700 font-semibold mt-1">
                Transacciones verificadas
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Eventos Activos</span>
                <Calendar className="w-4 h-4 text-slate-700" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {activeEventsCount}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1">
                En cartelera nacional
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Ticket Promedio</span>
                <TrendingUp className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                ${avgOrderValue.toLocaleString('es-MX')} <span className="text-xs text-slate-400">MXN</span>
              </div>
              <div className="text-[11px] text-amber-700 font-semibold mt-1">
                Por orden de compra
              </div>
            </div>
          </div>

          {/* Broadcast Notification Module */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-xs">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Send className="w-4 h-4 text-blue-600" />
              <span>Notificaciones Automáticas & Broadcast a Usuarios</span>
            </div>
            <p className="text-xs text-slate-500">
              Dispara alertas en tiempo real a los compradores de la plataforma (liberación de boletos, aviso de apertura de puertas, cambios de horario).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Título de la Alerta</label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={e => setBroadcastTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mensaje para el Usuario</label>
                <input
                  type="text"
                  value={broadcastMessage}
                  onChange={e => setBroadcastMessage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {broadcastSent ? (
                <div className="text-emerald-700 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>¡Notificación enviada a todos los usuarios activos!</span>
                </div>
              ) : <div />}

              <button
                onClick={handleSendBroadcast}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar Notificación Automática</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Events Management */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <h2 className="text-base font-bold text-slate-900">Catálogo de Eventos</h2>
            {isAdmin ? (
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Nuevo Evento</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Activa el Modo Admin para crear o editar eventos</span>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Evento & Artista</th>
                    <th className="p-3.5">Recinto & Ciudad</th>
                    <th className="p-3.5">Fecha & Hora</th>
                    <th className="p-3.5">Categoría</th>
                    <th className="p-3.5">Precio Base</th>
                    <th className="p-3.5">Disponibilidad</th>
                    <th className="p-3.5 text-center">Destacado</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map(evt => (
                    <tr key={evt.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          {evt.isFeatured && (
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                          <span>{evt.title}</span>
                        </div>
                        <div className="text-[11px] text-blue-600 font-normal">{evt.artist}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-slate-800">{evt.venue}</div>
                        <div className="text-[11px] text-slate-500">{evt.city}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-slate-800">{evt.date}</div>
                        <div className="text-[11px] text-slate-500">{evt.time} hrs</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {evt.category}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        ${evt.basePrice.toLocaleString('es-MX')} MXN
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-900">{evt.availableSeats}</span> / {evt.totalSeats}
                        <div className="w-20 bg-slate-200 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            className="bg-slate-900 h-full rounded-full"
                            style={{ width: `${Math.round((evt.availableSeats / evt.totalSeats) * 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => onUpdateEvent(evt.id, { isFeatured: !evt.isFeatured })}
                          className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                            evt.isFeatured
                              ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-xs'
                              : 'bg-white text-slate-400 border-slate-200 hover:text-amber-500 hover:border-slate-300'
                          }`}
                          title={evt.isFeatured ? 'Quitar de destacados' : 'Marcar como evento destacado'}
                        >
                          <Star className={`w-4 h-4 ${evt.isFeatured ? 'fill-amber-400 text-amber-500' : ''}`} />
                        </button>
                      </td>
                      <td className="p-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenEdit(evt)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Editar evento"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`¿Estás seguro de eliminar el evento "${evt.title}"?`)) {
                              onDeleteEvent(evt.id);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar evento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Inventory & Availability */}
      {activeTab === 'inventory' && selectedEvent && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Gestor de Disponibilidad & Capacidad</h2>
              <p className="text-xs text-slate-500">Modifica la asignación de aforo y precios por sección en vivo.</p>
            </div>
            <select
              value={selectedInventoryEventId}
              onChange={e => setSelectedInventoryEventId(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-2 cursor-pointer"
            >
              {events.map(e => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(selectedEvent.sections || DEFAULT_VENUE_SECTIONS).map(sec => (
              <div key={sec.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">{sec.name}</span>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sec.color }} />
                </div>
                <div className="text-xs text-slate-600">
                  Capacidad: <span className="text-slate-900 font-bold">{sec.rows * sec.seatsPerRow} asientos</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Precio boleto:</span>
                  <span className="font-bold text-slate-900">${sec.price.toLocaleString('es-MX')} MXN</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex gap-2">
                  <button
                    onClick={() => {
                      const newCount = Math.min(selectedEvent.totalSeats, selectedEvent.availableSeats + 10);
                      onUpdateEvent(selectedEvent.id, { availableSeats: newCount });
                    }}
                    className="flex-1 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    +10 Asientos
                  </button>
                  <button
                    onClick={() => {
                      const newCount = Math.max(0, selectedEvent.availableSeats - 10);
                      onUpdateEvent(selectedEvent.id, { availableSeats: newCount });
                    }}
                    className="flex-1 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    -10 Asientos
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Orders & Transactions */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">Transacciones & Auditoría de Ventas</h2>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">ID Orden</th>
                    <th className="p-3.5">Comprador</th>
                    <th className="p-3.5">Evento</th>
                    <th className="p-3.5">Asientos</th>
                    <th className="p-3.5">Monto Total</th>
                    <th className="p-3.5">Hash Criptográfico</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No hay órdenes registradas aún. Las compras realizadas aparecerán aquí en tiempo real.
                      </td>
                    </tr>
                  ) : (
                    orders.map(order => (
                      <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-mono text-[11px] text-blue-600 font-bold">{order.id}</td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-900">{order.userName}</div>
                          <div className="text-[11px] text-slate-500">{order.userEmail}</div>
                        </td>
                        <td className="p-3.5 font-medium text-slate-900">{order.eventTitle}</td>
                        <td className="p-3.5 font-mono text-xs">
                          {order.seats.map(s => `${s.row}-${s.number}`).join(', ')}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">
                          ${order.totalAmount.toLocaleString('es-MX')} MXN
                        </td>
                        <td className="p-3.5 font-mono text-[10px] text-slate-500">
                          {order.encryptedPayloadHash.substring(0, 12)}...
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            order.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {order.status === 'completed' ? 'PAGADO' : 'REEMBOLSADO'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => generateTicketPdf(order)}
                            title="Descargar Boletos en PDF"
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Download className="w-3 h-3 text-slate-600" />
                            <span>PDF</span>
                          </button>
                          {order.status === 'completed' && (
                            <button
                              onClick={() => {
                                if (confirm(`¿Reembolsar orden ${order.id} por $${order.totalAmount} MXN?`)) {
                                  onRefundOrder(order.id);
                                }
                              }}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Reembolsar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create or Edit Event */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl text-slate-900">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {editingEvent ? 'Editar Evento' : 'Crear Nuevo Evento'}
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Título del Evento</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Artista o Elenco</label>
                  <input
                    type="text"
                    required
                    value={formArtist}
                    onChange={e => setFormArtist(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Recinto (Venue)</label>
                  <input
                    type="text"
                    required
                    value={formVenue}
                    onChange={e => setFormVenue(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ciudad</label>
                  <input
                    type="text"
                    required
                    value={formCity}
                    onChange={e => setFormCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hora</label>
                  <input
                    type="text"
                    required
                    placeholder="20:30"
                    value={formTime}
                    onChange={e => setFormTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Categoría</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as EventCategory)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white cursor-pointer"
                  >
                    <option value="Conciertos">Conciertos</option>
                    <option value="Deportes">Deportes</option>
                    <option value="Teatro">Teatro</option>
                    <option value="Festivales">Festivales</option>
                    <option value="Comedia">Comedia</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Precio Base ($ MXN)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formBasePrice}
                    onChange={e => setFormBasePrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Aforo / Asientos Totales</label>
                  <input
                    type="number"
                    required
                    min={10}
                    value={formTotalSeats}
                    onChange={e => setFormTotalSeats(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">URL Imagen de Portada</label>
                <input
                  type="url"
                  required
                  value={formImageUrl}
                  onChange={e => setFormImageUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descripción</label>
                <textarea
                  rows={3}
                  required
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white"
                />
              </div>

              <label className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={formIsFeatured}
                  onChange={e => setFormIsFeatured(e.target.checked)}
                  className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                />
                <div>
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    Marcar como Evento Destacado
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Se exhibirá prominentemente en el carrusel superior de la página de inicio.
                  </span>
                </div>
              </label>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  Guardar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
