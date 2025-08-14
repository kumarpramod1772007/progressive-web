// ======== server.js ========
const express = require('express');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();

// ======== Middleware ========
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..'))); // Serve frontend static files

// ======== VAPID Keys ========
// Use environment variables or fallback placeholders
const VAPID_PUBLIC = process.env.VAPID_PUBLIC || 'REPLACE_WITH_YOUR_PUBLIC_KEY';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE || 'REPLACE_WITH_YOUR_PRIVATE_KEY';
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'mailto:you@example.com';

webpush.setVapidDetails(CONTACT_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);

// ======== Subscriptions Storage ========
// In production, store subscriptions in a database
const subscriptions = new Set();

// ======== Routes ========

// Return public VAPID key to client
app.get('/vapidPublicKey', (req, res) => {
  res.status(200).send(VAPID_PUBLIC);
});

// Add a new subscription
app.post('/subscribe', (req, res) => {
  const subscription = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ ok: false, error: 'Invalid subscription object' });
  }

  subscriptions.add(subscription);
  console.log(`[INFO] New subscription added: ${subscription.endpoint}`);
  res.status(201).json({ ok: true });
});

// Send push notification to all subscribers
app.post('/send-notification', async (req, res) => {
  const { title, body, url } = req.body;

  if (!title || !body) {
    return res.status(400).json({ ok: false, error: 'Title and body are required' });
  }

  const payload = JSON.stringify({ title, body, url: url || '/' });

  const sendResults = await Promise.allSettled(
    Array.from(subscriptions).map(sub =>
      webpush.sendNotification(sub, payload).catch(err => {
        console.error(`[ERROR] Failed to send notification to ${sub.endpoint}`, err);
      })
    )
  );

  const sentCount = sendResults.filter(r => r.status === 'fulfilled').length;
  res.status(200).json({ ok: true, sent: sentCount });
});

// ======== Health Check ========
app.get('/health', (req, res) => res.json({ ok: true, status: 'Server running' }));

// ======== Start Server ========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[INFO] Push server running at http://localhost:${PORT}`));
