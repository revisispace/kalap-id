const TRACKER_STORAGE_KEY = 'kalap-v1'

const foodSteps = [
  ['Pesanan dibuat', 'Pesanan simulasi sudah masuk'],
  ['Restoran menerima pesanan', 'Dapur mulai menyiapkan makanan'],
  ['Makanan sedang disiapkan', 'Pesanan lagi dimasak'],
  ['Driver menuju restoran', 'Driver simulasi sedang mengambil pesanan'],
  ['Pesanan dalam perjalanan', 'Driver simulasi menuju alamat kamu'],
  ['Pesanan tiba', 'Makanan simulasi sudah sampai'],
]

const goodsSteps = [
  ['Pesanan dibuat', 'Checkout simulasi berhasil'],
  ['Penjual memproses pesanan', 'Barang sedang disiapkan'],
  ['Pesanan dikemas', 'Paket simulasi sudah dibungkus'],
  ['Paket diserahkan ke kurir', 'Kurir simulasi menerima paket'],
  ['Paket di pusat sortir', 'Paket simulasi sedang diproses'],
  ['Paket menuju alamatmu', 'Kurir simulasi sedang mengantar'],
  ['Pesanan diterima', 'Paket simulasi sudah sampai'],
]

const storeMeta = {
  makanan: { icon: '🍜', label: 'Makanan' },
  pakaian: { icon: '👕', label: 'Pakaian' },
  sepatu: { icon: '👟', label: 'Sepatu' },
  tumbler: { icon: '🥤', label: 'Tumbler' },
  tas: { icon: '👜', label: 'Tas' },
}

let trackerTab = 'food'
let selectedOrderId = null

function money(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function trackerState() {
  try {
    const state = JSON.parse(localStorage.getItem(TRACKER_STORAGE_KEY) || '{}')
    return Array.isArray(state.transactionHistory) ? state.transactionHistory : []
  } catch {
    return []
  }
}

function isFood(order) { return order.store === 'makanan' }

function elapsedSeconds(order) {
  return Math.max(0, Math.floor((Date.now() - new Date(order.date).getTime()) / 1000))
}

function trackerProgress(order) {
  const food = isFood(order)
  const steps = food ? foodSteps : goodsSteps
  const elapsed = elapsedSeconds(order)
  const thresholds = food
    ? [0, 12, 30, 50, 75, 105]
    : [0, 20, 45, 75, 110, 150, 200]

  let active = 0
  thresholds.forEach((seconds, index) => { if (elapsed >= seconds) active = index })
  return { steps, active, completed: active === steps.length - 1 }
}

function orderCode(order) {
  const stamp = new Date(order.date).getTime().toString().slice(-7)
  return `${isFood(order) ? 'KF' : 'KB'}-${stamp}`
}

function statusText(order) {
  const progress = trackerProgress(order)
  return progress.steps[progress.active][0]
}

function etaText(order) {
  const progress = trackerProgress(order)
  if (progress.completed) return 'Selesai'
  if (isFood(order)) return 'Estimasi tiba 2–4 menit'
  return 'Estimasi tiba beberapa menit lagi'
}

function injectTrackerButton() {
  const actions = document.querySelector('.top-actions')
  if (!actions || actions.querySelector('[data-kalap-tracker]')) return

  const activeCount = trackerState().filter(order => !trackerProgress(order).completed).length
  const button = document.createElement('button')
  button.className = 'utility-button tracker-header-button'
  button.dataset.kalapTracker = 'true'
  button.innerHTML = `📦 Pesanan${activeCount ? `<span class="tracker-badge">${activeCount}</span>` : ''}`
  button.addEventListener('click', openTracker)
  actions.prepend(button)
}

function openTracker() {
  document.querySelector('#kalap-tracker-overlay')?.remove()
  selectedOrderId = null
  renderTrackerOverlay()
}

function closeTracker() {
  document.querySelector('#kalap-tracker-overlay')?.remove()
  selectedOrderId = null
}

function filteredOrders() {
  return trackerState().filter(order => trackerTab === 'food' ? isFood(order) : !isFood(order))
}

function renderTrackerOverlay() {
  const existing = document.querySelector('#kalap-tracker-overlay')
  if (existing) existing.remove()

  const overlay = document.createElement('div')
  overlay.id = 'kalap-tracker-overlay'
  overlay.className = 'tracker-overlay'
  overlay.addEventListener('click', event => { if (event.target === overlay) closeTracker() })

  overlay.innerHTML = selectedOrderId ? renderOrderDetail(selectedOrderId) : renderOrderList()
  document.body.appendChild(overlay)

  overlay.querySelectorAll('[data-tracker-tab]').forEach(button => {
    button.addEventListener('click', () => {
      trackerTab = button.dataset.trackerTab
      selectedOrderId = null
      renderTrackerOverlay()
    })
  })

  overlay.querySelectorAll('[data-track-order]').forEach(button => {
    button.addEventListener('click', () => {
      selectedOrderId = button.dataset.trackOrder
      renderTrackerOverlay()
    })
  })

  overlay.querySelector('[data-tracker-close]')?.addEventListener('click', closeTracker)
  overlay.querySelector('[data-tracker-back]')?.addEventListener('click', () => {
    selectedOrderId = null
    renderTrackerOverlay()
  })
}

function renderOrderList() {
  const orders = filteredOrders()
  const foodCount = trackerState().filter(isFood).length
  const goodsCount = trackerState().filter(order => !isFood(order)).length

  return `<section class="tracker-sheet">
    <div class="tracker-sheet-head">
      <div><span class="tracker-kicker">KALAP ORDER TRACKER</span><h2>Pesanan Simulasi</h2><p>Makanan dan barang punya alur pengiriman yang berbeda.</p></div>
      <button class="tracker-close" data-tracker-close>×</button>
    </div>

    <div class="tracker-tabs">
      <button class="tracker-tab food ${trackerTab === 'food' ? 'active' : ''}" data-tracker-tab="food">🍜 Makanan <b>${foodCount}</b></button>
      <button class="tracker-tab goods ${trackerTab === 'goods' ? 'active' : ''}" data-tracker-tab="goods">📦 Barang <b>${goodsCount}</b></button>
    </div>

    <div class="tracker-list ${trackerTab}">
      ${orders.length ? orders.map(renderOrderCard).join('') : `<div class="tracker-empty"><span>${trackerTab === 'food' ? '🍜' : '📦'}</span><strong>Belum ada pesanan ${trackerTab === 'food' ? 'makanan' : 'barang'}.</strong><p>Checkout dulu pakai KALAP Wallet, nanti tracker muncul di sini.</p></div>`}
    </div>
  </section>`
}

function renderOrderCard(order) {
  const meta = storeMeta[order.store] || { icon: '📦', label: order.store }
  const progress = trackerProgress(order)
  const date = new Date(order.date)
  const pct = (progress.active / (progress.steps.length - 1)) * 100

  return `<article class="tracker-order-card ${isFood(order) ? 'food-order' : 'goods-order'}">
    <div class="tracker-order-top">
      <div class="tracker-order-icon">${meta.icon}</div>
      <div><small>${orderCode(order)}</small><strong>${meta.label}</strong><span>${date.toLocaleDateString('id-ID')} · ${date.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })}</span></div>
      <div class="tracker-order-price"><strong>${money(order.amount)}</strong><small>${order.items || 0} item</small></div>
    </div>
    <div class="tracker-status-row"><div><small>Status sekarang</small><strong>${statusText(order)}</strong><span>${etaText(order)}</span></div><div class="tracker-status-icon">${progress.completed ? '✅' : isFood(order) ? '🛵' : '🚚'}</div></div>
    <div class="tracker-mini-progress"><i style="width:${pct}%"></i></div>
    <button class="tracker-detail-button" data-track-order="${order.id}">Lacak Pesanan →</button>
  </article>`
}

function renderOrderDetail(id) {
  const order = trackerState().find(item => item.id === id)
  if (!order) return renderOrderList()

  const meta = storeMeta[order.store] || { icon:'📦', label:order.store }
  const progress = trackerProgress(order)
  const food = isFood(order)

  return `<section class="tracker-sheet tracker-detail-sheet ${food ? 'food-detail' : 'goods-detail'}">
    <div class="tracker-detail-nav">
      <button data-tracker-back>←</button>
      <strong>${food ? 'Lacak Makanan' : 'Lacak Paket'}</strong>
      <button data-tracker-close>×</button>
    </div>

    <div class="tracker-detail-hero">
      <span class="tracker-detail-emoji">${progress.completed ? '✅' : food ? '🛵' : '🚚'}</span>
      <small>${orderCode(order)}</small>
      <h2>${statusText(order)}</h2>
      <p>${progress.steps[progress.active][1]}</p>
      <div class="tracker-eta">${etaText(order)}</div>
    </div>

    ${food ? `<div class="food-map-sim"><div class="map-road road-a"></div><div class="map-road road-b"></div><span class="map-store">🍜</span><span class="map-driver" style="left:${20 + progress.active * 12}%">🛵</span><span class="map-home">🏠</span><div class="map-label">Peta simulasi · bukan lokasi nyata</div></div>` : ''}

    <div class="tracker-order-summary"><div><span>${meta.icon}</span><div><small>${meta.label}</small><strong>${order.items || 0} item</strong></div></div><strong>${money(order.amount)}</strong></div>

    <div class="tracker-timeline">
      ${progress.steps.map((step, index) => `<div class="tracker-step ${index < progress.active ? 'done' : index === progress.active ? 'current' : ''}"><div class="tracker-step-dot">${index < progress.active ? '✓' : index === progress.active ? '●' : ''}</div><div><strong>${step[0]}</strong><p>${step[1]}</p>${index === progress.active ? `<small>${new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</small>` : ''}</div></div>`).join('')}
    </div>

    <div class="tracker-disclaimer">${food ? 'Tracker makanan terinspirasi pola aplikasi delivery: restoran → driver → perjalanan → tiba.' : 'Tracker barang terinspirasi pola marketplace: diproses → dikemas → kurir → sortir → diterima.'} Semua status adalah simulasi lokal.</div>
  </section>`
}

const observer = new MutationObserver(() => injectTrackerButton())
observer.observe(document.documentElement, { childList: true, subtree: true })
injectTrackerButton()

setInterval(() => {
  injectTrackerButton()
  if (document.querySelector('#kalap-tracker-overlay')) renderTrackerOverlay()
}, 3000)

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.querySelector('#kalap-tracker-overlay')) closeTracker()
})
