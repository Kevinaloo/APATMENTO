import test from 'node:test';
import assert from 'node:assert/strict';
import { sendBookingReceipt } from '../api/lib/_mail.js';

test('sendBookingReceipt requires booking data', async () => {
  const res = await sendBookingReceipt();
  assert.equal(res.ok, false);
  assert.equal(res.error, 'booking_required');
});

test('sendBookingReceipt aborts safely if recipient email cannot be resolved', async () => {
  const res = await sendBookingReceipt({
    booking: {
      reference: 'APT-TEST-001',
      total: 10000,
      amount_paid: 10000,
    },
  });
  assert.equal(res.ok, false);
  assert.equal(res.error, 'missing_user_email');
});

test('sendBookingReceipt formats payload and attempts Resend dispatch', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, opts) => {
    calls.push({ url: String(url), opts });
    if (String(url).includes('api.resend.com')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'resend_msg_test_123' }),
      };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };

  const originalKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = 're_test_dummy_key';

  try {
    const res = await sendBookingReceipt({
      booking: {
        payment_reference: 'APT-20260901-XYZ',
        grand_total: 15000,
        amount_paid: 5000,
        apartment_name: 'Sunset Penthouse, Kilimani',
        checkin_date: '2026-09-10',
        checkout_date: '2026-09-15',
        num_guests: 2,
        guest_name: 'John Doe',
        guest_email: 'johndoe@example.com',
      },
      user: {
        email: 'johndoe@example.com',
        name: 'John Doe',
      },
    });

    assert.equal(res.ok, true);
    assert.equal(res.id, 'resend_msg_test_123');

    const resendCall = calls.find(c => c.url.includes('api.resend.com/emails'));
    assert.ok(resendCall, 'Resend API was called');
    const body = JSON.parse(resendCall.opts.body);
    assert.deepEqual(body.to, ['johndoe@example.com']);
    assert.match(body.subject, /Booking confirmed/i);
    assert.match(body.html, /Sunset Penthouse/);
    assert.match(body.html, /KES\s?5,000/);
    assert.match(body.html, /APT-20260901-XYZ/);
    assert.equal(resendCall.opts.headers['Idempotency-Key'], 'receipt:APT-20260901-XYZ:5000');
  } finally {
    globalThis.fetch = originalFetch;
    process.env.RESEND_API_KEY = originalKey;
  }
});

test('sendBookingReceipt falls back to profiles table lookup when user email is absent', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, opts) => {
    calls.push({ url: String(url), opts });
    if (String(url).includes('profiles')) {
      return {
        ok: true,
        status: 200,
        json: async () => ([{ email: 'registered_guest@example.com', first_name: 'Wanjiru', last_name: 'Kariuki' }]),
      };
    }
    if (String(url).includes('api.resend.com')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'resend_msg_profile_456' }),
      };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };

  const originalKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = 're_test_dummy_key';

  try {
    const res = await sendBookingReceipt({
      booking: {
        payment_reference: 'APT-PROFILE-LOOKUP',
        grand_total: 20000,
        amount_paid: 20000,
        guest_id: 'usr-uuid-789',
        apartment_name: 'Diani Beachfront Villa',
      },
      supabaseUrl: 'https://mock.supabase.co',
      serviceKey: 'mock-service-key',
    });

    assert.equal(res.ok, true);
    assert.equal(res.id, 'resend_msg_profile_456');

    const resendCall = calls.find(c => c.url.includes('api.resend.com/emails'));
    assert.ok(resendCall, 'Resend API was called');
    const body = JSON.parse(resendCall.opts.body);
    assert.deepEqual(body.to, ['registered_guest@example.com']);
    assert.match(body.html, /Wanjiru/);
    assert.match(body.html, /Diani Beachfront Villa/);
  } finally {
    globalThis.fetch = originalFetch;
    process.env.RESEND_API_KEY = originalKey;
  }
});
