/**
 * Client-Side Cryptographic Utilities
 * Simulates PCI-DSS Level 1 compliant tokenization and AES-256-GCM data encryption.
 */

export async function computeSha256(text: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback simple hash for older environments
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(16).padStart(16, '0');
  }
}

export function maskCardNumber(cardNumber: string): string {
  const clean = cardNumber.replace(/\D/g, '');
  if (clean.length < 4) return '•••• •••• •••• ••••';
  const last4 = clean.slice(-4);
  const brand = getCardBrand(clean);
  return `${brand} •••• ${last4}`;
}

export function getCardBrand(cardNumber: string): string {
  const clean = cardNumber.replace(/\D/g, '');
  if (/^4/.test(clean)) return 'Visa';
  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(clean)) return 'Mastercard';
  if (/^3[47]/.test(clean)) return 'American Express';
  if (/^6(?:011|5)/.test(clean)) return 'Discover';
  return 'Tarjeta';
}

export interface EncryptedPackage {
  algorithm: 'AES-256-GCM';
  ivHex: string;
  ciphertextHex: string;
  authTagHex: string;
  sha256Hash: string;
  publicKeyFingerprint: string;
  timestamp: string;
}

export async function encryptPaymentPayload(payload: {
  cardNumber: string;
  cardHolder: string;
  cvv: string;
  expiryDate: string;
  amount: number;
}): Promise<EncryptedPackage> {
  const rawString = JSON.stringify(payload);
  const hash = await computeSha256(rawString);

  // Generate simulated realistic AES-GCM IV and ciphertext
  const ivArray = new Uint8Array(12);
  crypto.getRandomValues(ivArray);
  const ivHex = Array.from(ivArray).map(b => b.toString(16).padStart(2, '0')).join('');

  // Produce realistic ciphertext hex
  const cipherBytes = new Uint8Array(rawString.length + 16);
  crypto.getRandomValues(cipherBytes);
  const ciphertextHex = Array.from(cipherBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  const tagArray = new Uint8Array(16);
  crypto.getRandomValues(tagArray);
  const authTagHex = Array.from(tagArray).map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    algorithm: 'AES-256-GCM',
    ivHex,
    ciphertextHex,
    authTagHex,
    sha256Hash: hash,
    publicKeyFingerprint: 'RSA_4096_FP:9a:7f:3b:02:d4:1e:bb:5c:20:84',
    timestamp: new Date().toISOString(),
  };
}

export function generatePaymentToken(): string {
  const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
  const timePart = Date.now().toString(36).toUpperCase();
  return `PAY-SEC-${timePart}-${randomPart}`;
}

export function generateTicketQrData(orderId: string, seatCount: number): string {
  const salt = Math.random().toString(36).substring(2, 6);
  return `TICKETSMX_SECURE_V2::${orderId}::SEATS_${seatCount}::INTEGRITY_${salt}::${Date.now()}`;
}
