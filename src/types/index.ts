export type EventCategory = 'Conciertos' | 'Deportes' | 'Teatro' | 'Festivales' | 'Comedia';

export interface Seat {
  id: string; // e.g. "VIP-A-1"
  sectionId: string;
  sectionName: string;
  row: string;
  number: number;
  price: number;
  status: 'available' | 'reserved' | 'sold';
}

export interface VenueSection {
  id: string;
  name: string;
  tier: 'VIP' | 'Preferente' | 'Platea' | 'General';
  price: number;
  color: string;
  rows: number;
  seatsPerRow: number;
}

export interface EventItem {
  id: string;
  title: string;
  artist: string;
  description: string;
  venue: string;
  city: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  category: EventCategory;
  imageUrl: string;
  basePrice: number;
  totalSeats: number;
  availableSeats: number;
  isFeatured?: boolean;
  sections?: VenueSection[];
  seats?: Record<string, 'available' | 'reserved' | 'sold'>; // seatId -> status override
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderSeat {
  seatId: string;
  sectionId?: string;
  sectionName: string;
  row: string;
  number: number;
  price: number;
}

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  seats: OrderSeat[];
  subtotal: number;
  serviceFee: number;
  totalAmount: number;
  status: 'completed' | 'cancelled' | 'refunded';
  paymentMethodMasked: string;
  paymentRef: string;
  encryptedPayloadHash: string;
  qrCodeToken: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order_confirmation' | 'seat_reminder' | 'event_update' | 'promo';
  read: boolean;
  createdAt: string;
  eventId?: string;
}

export interface PaymentPayload {
  cardNumber: string;
  cardHolder: string;
  expiryDate: string;
  cvv: string;
  method: 'card' | 'apple_pay' | 'spei';
}

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  summary: string;
  description: string;
  tags: string[];
  parameters?: {
    name: string;
    in: 'query' | 'path' | 'header';
    required: boolean;
    description: string;
    example: string;
  }[];
  requestBody?: {
    contentType: string;
    example: Record<string, unknown>;
  };
  responseExample: {
    statusCode: number;
    body: Record<string, unknown>;
  };
}
