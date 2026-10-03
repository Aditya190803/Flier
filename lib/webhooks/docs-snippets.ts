/** Sample JSON payload shown in the webhook documentation section. */
export const SAMPLE_WEBHOOK_PAYLOAD = `{
  "event": "campaign.sent",
  "timestamp": "2025-11-28T10:30:00Z",
  "webhook_id": "wh_abc123",
  "payload": {
    "campaign_id": "camp_xyz789",
    "subject": "November Newsletter",
    "content_preview": "Hello! Here's what's new...",
    "recipients_count": 1250,
    "sent_count": 1245,
    "failed_count": 5,
    "user_email": "you@example.com",
    "created_at": "2025-11-28T10:25:00Z"
  }
}`;

/** Sample Node.js signature-verification snippet shown in the docs section. */
export const SIGNATURE_VERIFICATION_CODE = `const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// In your webhook handler:
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-flier-signature'] ?? req.headers['x-echomail-signature'];
  const isValid = verifyWebhookSignature(req.body, signature, YOUR_SECRET);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process the webhook...
  console.log('Event:', req.body.event);
  res.status(200).json({ received: true });
});`;
