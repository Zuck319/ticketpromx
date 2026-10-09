import React, { useState } from 'react';
import {
  Ticket,
  Search,
  Bell,
  User,
  ShieldCheck,
  Code2,
  LogOut,
  MapPin,
  Sparkles,
  Menu,
} from 'lucide-react';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  currentView: 'catalog' | 'tickets' | 'admin' | 'api-docs';
  onNavigate: (view: 'catalog' | 'tickets' | 'admin' | 'api-docs') => void;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  } | null;
  isAdmin: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onDevLogin?: () => void;
}

const CATEGORIES: { label: string; value: string }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Conciertos', value: 'Conciertos' },
  { label: 'Deportes', value: 'Deportes' },
  { label: 'Teatro', value: 'Teatro' },
  { label: 'Festivales', value: 'Festivales' },
  { label: 'Comedia', value: 'Comedia' },
];

const CITIES = ['Todas las Ciudades', 'Ciudad de México', 'Monterrey', 'Guadalajara'];

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  selectedCity,
  onSelectCity,
  currentView,
  onNavigate,
  unreadNotificationsCount,
  onOpenNotifications,
  user,
  isAdmin,
  onSignIn,
  onSignOut,
  onDevLogin,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 text-slate-800 transition-colors">
      {/* Top Banner with refined medium-dark contrast */}
      <div className="bg-slate-950 text-slate-200 text-xs py-1.5 px-4 text-center font-medium flex items-center justify-center gap-2 tracking-wide">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[11px] sm:text-xs text-slate-300">
          Garantía Oficial TicketsMX: Asientos en tiempo real &middot; Cifrado bancario AES-256 &middot; Boletos 100% verificados
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-2.5 cursor-pointer select-none group"
            onClick={() => onNavigate('catalog')}
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md shadow-slate-900/10 group-hover:scale-105 transition-transform">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-slate-900">
                  TicketsMX
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-300/80">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-600 font-medium hidden sm:block -mt-0.5">
                Boletería Oficial &middot; Recintos Nacionales
              </p>
            </div>
          </div>

          {/* Search bar & City filter (desktop) */}
          <div className="flex-1 max-w-lg mx-2 hidden md:flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
              <input
                type="text"
                placeholder="Buscar por artista, evento o recinto..."
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                className="w-full bg-slate-100/80 hover:bg-slate-100 border border-slate-200/90 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-600 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600 hover:text-slate-900"
                >
                  ✕
                </button>
              )}
            </div>

            {/* City selector */}
            <div className="relative">
              <select
                value={selectedCity}
                onChange={e => onSelectCity(e.target.value)}
                className="bg-slate-100/80 hover:bg-slate-100 border border-slate-200/90 text-slate-700 text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/15 appearance-none pr-8 cursor-pointer transition-colors"
              >
                {CITIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <MapPin className="w-3.5 h-3.5 text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>


          {/* Navigation Links & Action buttons — desktop */}
          <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => onNavigate('catalog')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'catalog'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Eventos
            </button>

            <button
              onClick={() => onNavigate('tickets')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                currentView === 'tickets'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Mis</span> Boletos
            </button>

            {isAdmin && (
              <button
                onClick={() => onNavigate('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  currentView === 'admin'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                <span>Admin</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </button>
            )}


            <button
              onClick={() => onNavigate('api-docs')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                currentView === 'api-docs'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Documentación API REST y Backend Python"
            >
              <Code2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">API REST & Python</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Notificaciones"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-[10px] font-bold text-white flex items-center justify-center shadow-xs">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* User Profile / Login */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold ring-2 ring-slate-200 overflow-hidden">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    (user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()
                  )}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-semibold text-slate-800 truncate max-w-[110px]">
                    {user.displayName || user.email?.split('@')[0]}
                  </p>
                  <p className="text-[10px] text-slate-600 truncate max-w-[110px]">
                    {isAdmin ? 'Administrador' : 'Cliente Verificado'}
                  </p>
                </div>
                <button
                  onClick={onSignOut}
                  title="Cerrar sesión"
                  className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-1">
                {import.meta.env.DEV && onDevLogin && (
                  <button
                    onClick={onDevLogin}
                    title="Dev: Forzar Admin (solo visible en localhost)"
                    className="px-2 py-1.5 border border-slate-300 text-slate-500 hover:text-slate-900 rounded-xl text-xs font-semibold"
                  >
                    DEV: Entrar como Admin
                  </button>
                )}
                <button
                  onClick={onSignIn}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <User className="w-3.5 h-3.5 text-slate-300" />
                  <span>Acceder</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile: Bell + Hamburger */}
          <div className="flex sm:hidden items-center gap-1">
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-rose-600 text-[9px] font-bold text-white flex items-center justify-center">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Menú"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-200 py-2 space-y-0.5">
            {[
              { label: 'Eventos', view: 'catalog' as const, icon: <Ticket className="w-4 h-4" /> },
              { label: 'Mis Boletos', view: 'tickets' as const, icon: <Ticket className="w-4 h-4" /> },
              ...(isAdmin ? [{ label: 'Admin', view: 'admin' as const, icon: <ShieldCheck className="w-4 h-4 text-indigo-500" /> }] : []),
              { label: 'API REST & Python', view: 'api-docs' as const, icon: <Code2 className="w-4 h-4 text-emerald-600" /> },
            ].map(item => (
              <button
                key={item.view}
                onClick={() => { onNavigate(item.view); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left ${
                  currentView === item.view
                    ? 'bg-slate-900 text-white rounded-xl mx-1 w-[calc(100%-8px)]'
                    : 'text-slate-700 hover:bg-slate-100 rounded-xl mx-1 w-[calc(100%-8px)]'
                }`}
              >
                {item.icon}
                {item.label}
                {item.view === 'admin' && isAdmin && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </button>
            ))}
            <div className="px-4 pt-2 border-t border-slate-100 mt-1">
              {user ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold overflow-hidden">
                      {user.photoURL
                        ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                        : (user.displayName?.[0] || 'U').toUpperCase()
                      }
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{user.displayName || user.email?.split('@')[0]}</p>
                      <p className="text-[10px] text-slate-500">{isAdmin ? 'Administrador' : 'Cliente'}</p>
                    </div>
                  </div>
                  <button onClick={onSignOut} className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { onSignIn(); setMobileMenuOpen(false); }}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Acceder
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mobile Search input */}
        <div className="md:hidden pb-3 pt-1">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              placeholder="Buscar evento, artista o recinto..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-600 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/15"
            />
          </div>
        </div>

        {/* Categories Segmented Filter Bar */}
        {currentView === 'catalog' && (
          <div className="py-2.5 border-t border-slate-100 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl">
              {CATEGORIES.map(cat => {
                const active = selectedCategory === cat.value;
                return (
                  <button
                    key={cat.value}
                    onClick={() => onSelectCategory(cat.value)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      active
                        ? 'bg-white text-slate-900 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] text-slate-600 hidden lg:block whitespace-nowrap font-medium">
              Mostrando eventos con disponibilidad oficial en tiempo real
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
