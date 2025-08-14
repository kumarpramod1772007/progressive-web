// ======== App.js ========

// DOM elements
const productsEl = document.getElementById('products');
const offlineBanner = document.getElementById('offline-banner');
const pushBtn = document.getElementById('btn-enable-push');

// ======== Sample Products ========
const products = [
  { id: 1, title: 'Blue Shirt', price: '₹499', img: '/assets/p1.jpg' },
  { id: 2, title: 'Sneakers', price: '₹1299', img: '/assets/p2.jpg' },
  { id: 3, title: 'Backpack', price: '₹799', img: '/assets/p3.jpg' }
];

// ======== Render Products ========
const renderProducts = (items) => {
  productsEl.innerHTML = items
    .map(
      ({ id, title, price, img }) => `
      <article class="card">
        <img loading="lazy" src="${img}" alt="${title}" />
        <h3>${title}</h3>
        <p>${price}</p>
        <button class="buy" data-id="${id}">Buy</button>
      </article>
    `
    )
    .join('');
};

// Initial render
renderProducts(products);

// ======== Offline/Online Handling ========
const updateOfflineBanner = () => {
  offlineBanner.classList.toggle('show', !navigator.onLine);
};

window.addEventListener('online', updateOfflineBanner);
window.addEventListener('offline', updateOfflineBanner);
updateOfflineBanner(); // Initial check

// ======== Push Notifications ========
const enablePushNotifications = async () => {
  pushBtn.disabled = true;

  try {
    const registration = await navigator.serviceWorker.ready;

    // Fetch server VAPID public key
    const response = await fetch('/vapidPublicKey');
    if (!response.ok) throw new Error('Failed to fetch VAPID key');
    const vapidPublicKey = await response.text();

    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    // Subscribe for push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    // Send subscription to server
    const res = await fetch('/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });

    if (!res.ok) throw new Error('Failed to register subscription on server');

    alert('Subscribed to push notifications! 🎉');
  } catch (err) {
    console.error('Push subscription error:', err);
    alert(`Push subscription failed: ${err.message}`);
  } finally {
    pushBtn.disabled = false;
  }
};

// Show push button if supported
if ('serviceWorker' in navigator && 'PushManager' in window) {
  pushBtn.hidden = false;
  pushBtn.addEventListener('click', enablePushNotifications);
}

// ======== Helpers ========
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}
