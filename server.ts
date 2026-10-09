/**
 * TicketsMX — Backend API Server
 * Maneja creación de preferencias y verificación de pagos con Mercado Pago.
 * El Access Token NUNCA va en el frontend — vive solo aquí.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const PORT = Number(process.env.API_PORT) || 3001;

if (!MP_ACCESS_TOKEN) {
  console.error('❌  MP_ACCESS_TOKEN no configurado en .env — los pagos no funcionarán.');
} else {
  console.log('✅  MP_ACCESS_TOKEN cargado correctamente.');
}

// ─────────────────────────────────────────
// GET /api/health — Status del servidor
// ─────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mp_configured: !!MP_ACCESS_TOKEN,
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────
// POST /api/mp/preference
// Crea una preferencia de pago en Mercado Pago con back_urls configuradas.
// Devuelve: { id, init_point, sandbox_init_point }
// ─────────────────────────────────────────
app.post('/api/mp/preference', async (req, res) => {
  if (!MP_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'Access Token no configurado en el servidor.' });
  }

  const { items, external_reference, payer } = req.body as {
    items: { title: string; quantity: number; unit_price: number; currency_id?: string }[];
    external_reference: string;
    payer?: { email?: string };
  };

  if (!items?.length || !external_reference) {
    return res.status(400).json({ error: 'items y external_reference son requeridos.' });
  }

  try {
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': external_reference,
      },
      body: JSON.stringify({
        items: items.map(item => ({
          ...item,
          currency_id: item.currency_id || 'MXN',
        })),
        external_reference,
        payer: payer?.email ? { email: payer.email } : undefined,
        // Mercado Pago solo permite auto_return con URLs HTTPS
        // En localhost/HTTP no se envía auto_return para evitar error de MP
        ...(APP_URL.startsWith('https://')
          ? {
              back_urls: {
                success: `${APP_URL}/?mp_status=approved`,
                failure: `${APP_URL}/?mp_status=rejected`,
                pending: `${APP_URL}/?mp_status=pending`,
              },
              auto_return: 'approved',
            }
          : {}),
        statement_descriptor: 'TicketsMX',
        binary_mode: false,
      }),
    });


    const data = await mpResponse.json() as {
      id?: string;
      init_point?: string;
      sandbox_init_point?: string;
      message?: string;
    };

    if (!mpResponse.ok) {
      console.error('[MP] Error creando preferencia:', data);
      return res.status(mpResponse.status).json({ error: data.message || 'Error al crear preferencia MP.' });
    }

    console.log(`[MP] Preferencia creada: ${data.id} | ref: ${external_reference}`);

    res.json({
      id: data.id,
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point,
    });
  } catch (err) {
    console.error('[MP] Error en /api/mp/preference:', err);
    res.status(500).json({ error: 'Error interno al conectar con Mercado Pago.' });
  }
});

// ─────────────────────────────────────────
// GET /api/mp/verify/:paymentId
// Verifica el estado de un pago directamente con la API de MP.
// Devuelve: { id, status, status_detail, external_reference, transaction_amount, ... }
// ─────────────────────────────────────────
app.get('/api/mp/verify/:paymentId', async (req, res) => {
  if (!MP_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'Access Token no configurado en el servidor.' });
  }

  const { paymentId } = req.params;

  if (!paymentId || isNaN(Number(paymentId))) {
    return res.status(400).json({ error: 'paymentId inválido.' });
  }

  try {
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
    });

    const data = await mpResponse.json() as {
      id?: number;
      status?: string;
      status_detail?: string;
      external_reference?: string;
      transaction_amount?: number;
      currency_id?: string;
      payment_method_id?: string;
      payment_type_id?: string;
      date_approved?: string;
      payer?: { email?: string };
      message?: string;
    };

    if (!mpResponse.ok) {
      console.error(`[MP] Error verificando pago ${paymentId}:`, data);
      return res.status(mpResponse.status).json({ error: data.message || 'Pago no encontrado.' });
    }

    console.log(`[MP] Verificación de pago ${paymentId}: status=${data.status}`);

    res.json({
      id: data.id,
      status: data.status,                   // 'approved' | 'rejected' | 'pending' | 'cancelled'
      status_detail: data.status_detail,     // 'accredited', 'cc_rejected_insufficient_amount', etc.
      external_reference: data.external_reference,
      transaction_amount: data.transaction_amount,
      currency_id: data.currency_id,
      payment_method_id: data.payment_method_id,
      payment_type_id: data.payment_type_id,
      date_approved: data.date_approved,
    });
  } catch (err) {
    console.error(`[MP] Error en /api/mp/verify/${paymentId}:`, err);
    res.status(500).json({ error: 'Error interno al verificar el pago.' });
  }
});

// ─────────────────────────────────────────
// Iniciar servidor
// ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('🎟️  TicketsMX API Backend iniciado');
  console.log(`   → http://localhost:${PORT}/api/health`);
  console.log('');
});
