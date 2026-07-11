const TO_EMAIL = 'robin@moosecargo.ca';
const FROM_EMAIL = 'MooseCargo Quotes <onboarding@resend.dev>';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { name, company, phone, email, freight, route, message, website } = req.body || {};

  // Honeypot: bots fill hidden fields, humans never see this one.
  if (website) {
    return res.status(200).json({ ok: true });
  }

  if (!name || !email) {
    return res.status(400).json({ ok: false, error: 'Name and email are required.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not configured');
    return res.status(500).json({ ok: false, error: 'Email service is not configured.' });
  }

  const text = [
    `Name: ${name}`,
    company ? `Company: ${company}` : null,
    phone ? `Phone: ${phone}` : null,
    `Email: ${email}`,
    freight ? `Freight Type: ${freight}` : null,
    route ? `Route: ${route}` : null,
    '',
    'Shipment Details:',
    message || '(none provided)'
  ].filter(Boolean).join('\n');

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        reply_to: email,
        subject: `Quote Request — ${freight || 'General'} — ${name}`,
        text
      })
    });

    if (!r.ok) {
      console.error('Resend error:', await r.text());
      return res.status(502).json({ ok: false, error: 'Failed to send message.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact form error:', err);
    return res.status(500).json({ ok: false, error: 'Unexpected error.' });
  }
};
