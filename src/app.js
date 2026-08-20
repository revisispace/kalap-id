import { catalog, storefronts } from './data/catalog.js'

const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
const DAILY_WALLET = 20_000_000
const storageKey = 'kalap-v1'
const root = document.querySelector('#root')
const storeKeys = storefronts.map(store => store.key)
const fallbackImage = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900"><rect width="900" height="900" fill="#f0e9e4"/><text x="450" y="430" text-anchor="middle" font-family="Arial" font-size="82" font-weight="700" fill="#191614">KALAP!</text><text x="450" y="505" text-anchor="middle" font-family="Arial" font-size="30" fill="#726a65">gambar eksternal tidak tersedia</text></svg>`)}`

const challenges = [
  { id: 'sneaker-5m', icon: '👟', title: 'Sneakerhead', text: 'Habiskan Rp5 juta hanya untuk sepatu.', check: s => (s.dailySpentByStore.sepatu || 0) >= 5_000_000 },
  { id: 'fashion-5m', icon: '👕', title: 'Fashion Victim', text: 'Habiskan Rp5 juta hanya untuk pakaian.', check: s => (s.dailySpentByStore.pakaian || 0) >= 5_000_000 },
  { id: 'bag-5m', icon: '👜', title: 'Bag Collector', text: 'Habiskan Rp5 juta hanya untuk tas.', check: s => (s.dailySpentByStore.tas || 0) >= 5_000_000 },
  { id: 'three-items', icon: '🛍️', title: 'Triple Threat', text: 'Checkout minimal 3 item dalam sehari.', check: s => s.dailyItems >= 3 },
  { id: 'three-orders', icon: '⚡', title: 'Checkout Combo', text: 'Lakukan 3 fake checkout dalam sehari.', check: s => s.dailyOrders >= 3 },
  { id: 'single-7m', icon: '💸', title: 'Sultan Speedrun', text: 'Satu checkout minimal Rp7 juta.', check: s => s.maxOrderAmount >= 7_000_000 },
  { id: 'burn-10m', icon: '🔥', title: 'Half Burn', text: 'Bakar Rp10 juta dari KALAP Wallet.', check: s => s.dailySpent >= 10_000_000 },
  { id: 'burn-15m', icon: '🌋', title: 'Almost Broke', text: 'Bakar Rp15 juta hari ini.', check: s => s.dailySpent >= 15_000_000 },
]

const foodTrackingSteps = [
  ['Pesanan dibuat', 'Pesanan simulasi masuk ke restoran'],
  ['Restoran menerima pesanan', 'Dapur menerima pesanan kamu'],
  ['Makanan sedang disiapkan', 'Pesanan simulasi sedang dimasak'],
  ['Driver menuju restoran', 'Driver simulasi menuju titik pickup'],
  ['Pesanan dalam perjalanan', 'Driver simulasi sedang menuju alamatmu'],
  ['Pesanan tiba', 'Makanan simulasi sudah sampai'],
]

const goodsTrackingSteps = [
  ['Pesanan dibuat', 'Checkout simulasi berhasil'],
  ['Penjual memproses pesanan', 'Barang sedang disiapkan penjual'],
  ['Pesanan dikemas', 'Paket simulasi sudah dibungkus'],
  ['Diserahkan ke kurir', 'Kurir simulasi menerima paket'],
  ['Paket di pusat sortir', 'Paket simulasi sedang diproses'],
  ['Paket menuju alamatmu', 'Kurir simulasi sedang mengantar'],
  ['Pesanan diterima', 'Paket simulasi sudah sampai'],
]

function localDateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function dateHash(key) { return [...key].reduce((sum, ch) => ((sum * 31) + ch.charCodeAt(0)) >>> 0, 7) }
function todayChallenge() { return challenges[dateHash(localDateKey()) % challenges.length] }
function dayDifference(fromKey, toKey) {
  if (!fromKey || !toKey) return null
  const [fy, fm, fd] = fromKey.split('-').map(Number)
  const [ty, tm, td] = toKey.split('-').map(Number)
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000)
}

function blankSpendByStore() { return Object.fromEntries(storeKeys.map(key => [key, 0])) }
function defaultState() {
  return {
    activeStore: 'makanan', query: '', visibleCount: 20,
    carts: Object.fromEntries(storeKeys.map(key => [key, []])),
    walletDate: localDateKey(), walletBalance: DAILY_WALLET,
    dailySpent: 0, dailyItems: 0, dailyOrders: 0, dailySpentByStore: blankSpendByStore(), maxOrderAmount: 0,
    lifetimeSpent: 0, streak: 0, lastPlayedDate: null,
    transactionHistory: [], achievements: [], completedChallenges: [],
  }
}

function currentProduct(storeKey, id) { return (catalog[storeKey] || []).find(item => item.id === id) }
function hydrateSavedCarts(savedCarts = {}) {
  return Object.fromEntries(storeKeys.map(key => [key, (Array.isArray(savedCarts[key]) ? savedCarts[key] : []).map(line => {
    const fresh = currentProduct(key, line.id)
    return fresh ? { ...fresh, qty: Math.max(1, Number(line.qty) || 1) } : null
  }).filter(Boolean)]))
}

function normalizeDailyState(loaded) {
  const today = localDateKey()
  if (loaded.walletDate === today) return loaded
  return { ...loaded, walletDate: today, walletBalance: DAILY_WALLET, dailySpent: 0, dailyItems: 0, dailyOrders: 0, dailySpentByStore: blankSpendByStore(), maxOrderAmount: 0 }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}')
    const defaults = defaultState()
    return normalizeDailyState({
      ...defaults, ...saved,
      carts: hydrateSavedCarts(saved.carts),
      dailySpentByStore: { ...defaults.dailySpentByStore, ...(saved.dailySpentByStore || {}) },
      transactionHistory: Array.isArray(saved.transactionHistory) ? saved.transactionHistory.slice(0, 50) : [],
      achievements: Array.isArray(saved.achievements) ? saved.achievements : [],
      completedChallenges: Array.isArray(saved.completedChallenges) ? saved.completedChallenges : [],
      activeStore: 'makanan', query: '', visibleCount: 20,
    })
  } catch { return defaultState() }
}

let state = loadState()
let cartOpen = false
let checkoutStage = null
let checkoutAmount = 0
let checkoutStore = null
let panelOpen = null
let trackerTab = 'food'
let selectedOrderId = null
let toastTimer = null

function persist() {
  const { activeStore, query, visibleCount, ...saved } = state
  localStorage.setItem(storageKey, JSON.stringify(saved))
}
persist()

function storeInfo(key = state.activeStore) { return storefronts.find(item => item.key === key) || storefronts[0] }
function cart(key = state.activeStore) { return state.carts[key] || [] }
function subtotal(key = state.activeStore) { return cart(key).reduce((sum, line) => sum + line.price * line.qty, 0) }
function cartCountFor(key = state.activeStore) { return cart(key).reduce((sum, line) => sum + line.qty, 0) }
function filteredProducts() {
  const q = state.query.trim().toLowerCase()
  return (catalog[state.activeStore] || []).filter(item => !q || item.name.toLowerCase().includes(q))
}
function htmlEscape(value) { return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;') }

function productImage(product, compact = false) {
  return `<a href="${product.imageSearch}" target="_blank" rel="noopener noreferrer" title="Buka Google Images: ${htmlEscape(product.name)}" ${compact ? '' : 'aria-label="Buka gambar produk di Google Images"'}><img src="${product.image}" alt="${htmlEscape(product.name)}" loading="lazy" referrerpolicy="no-referrer" data-product-image></a>`
}

function walletPercent() { return Math.min(100, Math.max(0, (state.dailySpent / DAILY_WALLET) * 100)) }
function kalapRank() {
  const p = walletPercent()
  if (p >= 100) return { icon:'💀', name:'DOMPET GOSONG', note:'Rp20 juta habis hari ini' }
  if (p >= 75) return { icon:'👑', name:'SULTAN KALAP', note:'Sulit dihentikan' }
  if (p >= 50) return { icon:'🔥', name:'KALAP', note:'Dopamine mulai mengambil alih' }
  if (p >= 25) return { icon:'😈', name:'MULAI KALAP', note:'Sudah mulai panas' }
  return { icon:'😇', name:'MASIH SANTUY', note:'Saldo masih aman' }
}
function countdownText() {
  const now = new Date(), midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const seconds = Math.max(0, Math.floor((midnight - now) / 1000))
  return [Math.floor(seconds/3600), Math.floor((seconds%3600)/60), seconds%60].map(v => String(v).padStart(2,'0')).join(':')
}
function updateCountdown() { document.querySelectorAll('[data-wallet-countdown]').forEach(node => node.textContent = countdownText()) }

function isFoodOrder(order) { return order.store === 'makanan' }
function trackerProgress(order) {
  const food = isFoodOrder(order)
  const steps = food ? foodTrackingSteps : goodsTrackingSteps
  const thresholds = food ? [0, 12, 30, 50, 75, 105] : [0, 20, 45, 75, 110, 150, 200]
  const created = new Date(order.date).getTime()
  const elapsed = Number.isFinite(created) ? Math.max(0, Math.floor((Date.now() - created) / 1000)) : 0
  let active = 0
  thresholds.forEach((threshold, index) => { if (elapsed >= threshold) active = index })
  return { steps, active, completed: active === steps.length - 1 }
}
function orderCode(order) {
  const created = new Date(order.date).getTime()
  const suffix = Number.isFinite(created) ? String(created).slice(-7) : String(order.id || '').slice(-7)
  return `${isFoodOrder(order) ? 'KF' : 'KB'}-${suffix}`
}
function activeOrderCount() { return state.transactionHistory.filter(order => !trackerProgress(order).completed).length }
function filteredOrders() { return state.transactionHistory.filter(order => trackerTab === 'food' ? isFoodOrder(order) : !isFoodOrder(order)) }
function orderStatus(order) { const progress = trackerProgress(order); return progress.steps[progress.active][0] }
function orderEta(order) {
  const progress = trackerProgress(order)
  if (progress.completed) return 'Selesai'
  return isFoodOrder(order) ? 'Estimasi tiba 2–4 menit' : 'Paket simulasi sedang bergerak'
}

function evaluateAchievements() {
  const earned = new Set(state.achievements)
  const add = id => earned.add(id)
  if (state.lifetimeSpent > 0) add('first-checkout')
  if (state.dailySpent >= 10_000_000) add('half-burn')
  if (state.dailySpent >= DAILY_WALLET) add('wallet-zero')
  if (state.streak >= 3) add('streak-3')
  if (state.streak >= 7) add('streak-7')
  if (state.dailyOrders >= 5) add('checkout-5')
  state.achievements = [...earned]
  const ch = todayChallenge()
  const dailyKey = `${localDateKey()}:${ch.id}`
  if (ch.check(state) && !state.completedChallenges.includes(dailyKey)) state.completedChallenges = [dailyKey, ...state.completedChallenges].slice(0, 60)
}

const achievementMeta = {
  'first-checkout': ['🛒','First Kalap','Fake checkout pertama'],
  'half-burn': ['🔥','Half Burn','Bakar Rp10 juta dalam sehari'],
  'wallet-zero': ['💀','Dompet Gosong','Habiskan seluruh Rp20 juta'],
  'streak-3': ['⚡','3 Day Streak','Kalap 3 hari berturut-turut'],
  'streak-7': ['👑','Weekly Kalap','Kalap 7 hari berturut-turut'],
  'checkout-5': ['🧾','Receipt Machine','5 checkout dalam sehari'],
}

function resetDailyIfNeeded() {
  const today = localDateKey()
  if (state.walletDate === today) return false
  state.walletDate = today; state.walletBalance = DAILY_WALLET; state.dailySpent = 0; state.dailyItems = 0; state.dailyOrders = 0; state.dailySpentByStore = blankSpendByStore(); state.maxOrderAmount = 0
  persist(); return true
}

function render() {
  const info = storeInfo(), filtered = filteredProducts(), shown = filtered.slice(0, state.visibleCount)
  const activeCart = cart(), currentSubtotal = subtotal(), currentCartCount = cartCountFor(), percent = walletPercent(), rank = kalapRank(), challenge = todayChallenge()
  const challengeDone = challenge.check(state)
  const activeOrders = activeOrderCount()

  root.innerHTML = `<div class="app-shell">
    <header class="topbar">
      <div class="brand-wrap"><div class="brand-mark">K!</div><div><div class="brand">KALAP!</div><div class="brand-sub">v1.1 · dopamine</div></div></div>
      <div class="top-actions">
        <button class="order-button" data-action="open-orders">📦 <span>Pesanan</span>${activeOrders ? `<b>${activeOrders}</b>` : ''}</button>
        <button class="utility-button" data-action="open-history">🧾 Riwayat</button>
        <button class="utility-button" data-action="open-badges">🏆 Badge</button>
        <div class="wallet-pill"><span class="wallet-pill-icon">💳</span><span><small>KALAP WALLET</small><strong>${currency.format(state.walletBalance)}</strong><em>reset <b data-wallet-countdown>${countdownText()}</b></em></span></div>
        <button class="cart-button" data-action="open-cart">🛒 ${info.label}${currentCartCount ? `<span class="cart-count">${currentCartCount}</span>` : ''}</button>
      </div>
    </header>

    <main>
      <section class="hero">
        <div class="hero-copy"><span class="eyebrow">V1.1 · DOPAMINE MODE</span><h1>Boleh kalap.<br><em>Pakai duit bohongan.</em></h1><p>Rp20 juta setiap hari, daily challenge, streak, rank, badge, tracker pesanan, dan riwayat checkout — semuanya tetap lokal di device.</p></div>
        <div class="hero-wallet">
          <div class="hero-wallet-head"><span>💳 KALAP WALLET</span><b>🔥 ${state.streak} day streak</b></div>
          <strong>${currency.format(state.walletBalance)}</strong>
          <div class="wallet-track"><i style="width:${percent}%"></i></div>
          <div class="wallet-meta"><span>Terpakai ${currency.format(state.dailySpent)}</span><span>${state.dailyOrders} checkout • ${state.dailyItems} item</span></div>
          <div class="wallet-reset">Reset ke ${currency.format(DAILY_WALLET)} dalam <b data-wallet-countdown>${countdownText()}</b></div>
          <div class="rank-chip"><span>${rank.icon}</span><div><small>LEVEL KALAP</small><strong>${rank.name}</strong><em>${rank.note}</em></div></div>
        </div>
      </section>

      <section class="v11-grid">
        <article class="challenge-card ${challengeDone ? 'done' : ''}"><div class="challenge-icon">${challengeDone ? '✅' : challenge.icon}</div><div><span class="eyebrow dark">TODAY'S CHALLENGE</span><h3>${challenge.title}</h3><p>${challenge.text}</p><strong>${challengeDone ? 'Challenge selesai. Flex dikit boleh.' : 'Reset bersama wallet tengah malam.'}</strong></div></article>
        <article class="rank-card"><span class="rank-giant">${rank.icon}</span><div><span class="eyebrow dark">KALAP RANK</span><h3>${rank.name}</h3><p>${rank.note}</p><div class="rank-meter"><i style="width:${percent}%"></i></div><small>${Math.round(percent)}% wallet sudah dibakar</small></div></article>
      </section>

      <section class="daily-strip"><div><small>Budget harian</small><strong>${currency.format(DAILY_WALLET)}</strong></div><div><small>Dibakar hari ini</small><strong>${currency.format(state.dailySpent)}</strong></div><div><small>Sisa saldo</small><strong>${currency.format(state.walletBalance)}</strong></div><div><small>Total sepanjang masa</small><strong>${currency.format(state.lifetimeSpent)}</strong></div></section>

      <section class="store-switcher-wrap"><div class="section-heading compact"><div><span class="eyebrow dark">PILIH TOKO</span><h2>Satu mood, satu storefront</h2></div><p>Keranjang tetap terpisah per kategori, tapi satu KALAP Wallet dipakai bersama.</p></div><div class="store-switcher">${storefronts.map(store => `<button class="store-tab ${state.activeStore === store.key ? 'active' : ''}" data-action="switch-store" data-store="${store.key}"><span class="store-icon">${store.icon}</span><span><strong>${store.label}</strong><small>${store.subtitle}</small></span>${cartCountFor(store.key) ? `<b>${cartCountFor(store.key)}</b>` : ''}</button>`).join('')}</div></section>

      <section class="marketplace"><div class="market-header"><div><span class="eyebrow dark">🔥 TRENDING SEKARANG</span><h2>${info.icon} ${info.label} — 100 pilihan</h2><p>Klik gambar untuk membuka pencarian Google Images produk tersebut.</p></div><label class="search-box"><span>⌕</span><input id="search-input" value="${htmlEscape(state.query)}" placeholder="Cari ${info.label.toLowerCase()}..." autocomplete="off"></label></div>
      <div class="result-meta"><span>Menampilkan ${shown.length} dari ${filtered.length} item</span><span>💳 Sisa: <strong>${currency.format(state.walletBalance)}</strong></span></div>
      <div class="product-grid">${shown.map(product => `<article class="product-card"><div class="product-image-wrap">${productImage(product)}<span class="badge badge-${product.badge.toLowerCase()}">${product.badge}</span><span class="fake-label">SIMULASI</span></div><div class="product-body"><h3>${htmlEscape(product.name)}</h3><div class="rating-row"><span>★ ${product.rating}</span><small>(${product.reviewCount.toLocaleString('id-ID')})</small></div><div class="price">${currency.format(product.price)}</div><button data-action="add" data-id="${product.id}">+ Gue Pengen</button></div></article>`).join('')}</div>
      ${!filtered.length ? `<div class="empty-state"><div>🔎</div><h3>Tidak ada hasil</h3></div>` : ''}
      ${state.visibleCount < filtered.length ? `<div class="load-more-wrap"><button class="load-more" data-action="load-more">Tampilkan 20 lagi</button><small>${filtered.length - state.visibleCount} item tersisa</small></div>` : ''}</section>
    </main>

    <footer><strong>KALAP! v1.1</strong><span>Semua saldo, streak, badge, tracker, dan riwayat tersimpan hanya di localStorage device ini.</span></footer>
    ${cartOpen ? renderCart(activeCart, info, currentSubtotal) : ''}${checkoutStage ? renderCheckout() : ''}${panelOpen ? renderPanel() : ''}
  </div>`

  const search = document.querySelector('#search-input')
  if (search) search.addEventListener('input', event => { state.query = event.target.value; state.visibleCount = 20; render(); const next = document.querySelector('#search-input'); if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length) } })
  updateCountdown()
}

function renderCart(activeCart, info, currentSubtotal) {
  return `<div class="overlay" data-action="close-cart-bg"><aside class="cart-drawer" role="dialog" aria-modal="true"><div class="drawer-head"><div><span class="eyebrow dark">KERANJANG TERPISAH</span><h2>${info.icon} ${info.label}</h2></div><button class="icon-button" data-action="close-cart">×</button></div><div class="drawer-note">💳 Saldo KALAP Wallet: <strong>${currency.format(state.walletBalance)}</strong>.</div><div class="cart-lines">${activeCart.map(item => `<div class="cart-line">${productImage(item,true)}<div class="line-copy"><strong>${htmlEscape(item.name)}</strong><span>${currency.format(item.price)}</span></div><div class="qty-control"><button data-action="qty" data-id="${item.id}" data-delta="-1">−</button><b>${item.qty}</b><button data-action="qty" data-id="${item.id}" data-delta="1">+</button></div></div>`).join('')}${!activeCart.length ? `<div class="empty-cart">🛒<strong>Keranjang masih kosong.</strong><span>Pilih produk yang bikin kamu kalap.</span></div>` : ''}</div><div class="cart-summary"><div><span>Total checkout</span><strong>${currency.format(currentSubtotal)}</strong></div>${activeCart.length && currentSubtotal > state.walletBalance ? `<div class="wallet-warning">Kurang ${currency.format(currentSubtotal-state.walletBalance)} dari saldo.</div>` : ''}<div class="modal-actions"><button class="ghost" data-action="close-cart">← Kembali</button><button ${activeCart.length ? '' : 'disabled'} data-action="checkout">Gas Checkout →</button></div></div></aside></div>`
}

function renderCheckout() {
  const info = storeInfo(checkoutStore || state.activeStore), amount = checkoutAmount || subtotal(checkoutStore || state.activeStore)
  if (checkoutStage === 'review') return `<div class="overlay modal-overlay" data-action="close-modal-bg"><div class="checkout-modal"><button class="icon-button" data-action="close-checkout">×</button><span class="big-emoji">💳</span><span class="eyebrow dark">KALAP CHECKOUT</span><h2>Gas beli ${info.label.toLowerCase()}?</h2><p>Checkout ini hanya mengurangi saldo simulasi di device ini.</p><div class="checkout-wallet-breakdown"><div><small>Saldo sekarang</small><strong>${currency.format(state.walletBalance)}</strong></div><div><small>Total checkout</small><strong>− ${currency.format(amount)}</strong></div><div class="after"><small>Sisa</small><strong>${currency.format(Math.max(0,state.walletBalance-amount))}</strong></div></div><div class="modal-actions"><button class="ghost" data-action="back-to-cart">← Keranjang</button><button data-action="spend-wallet">Bayar ${currency.format(amount)}</button></div></div></div>`
  if (checkoutStage === 'insufficient') return `<div class="overlay modal-overlay" data-action="close-modal-bg"><div class="checkout-modal"><button class="icon-button" data-action="close-checkout">×</button><span class="big-emoji">😭</span><span class="eyebrow dark">SALDO KALAP KURANG</span><h2>Kalapnya kelewatan.</h2><div class="checkout-wallet-breakdown danger"><div><small>Total</small><strong>${currency.format(amount)}</strong></div><div><small>Saldo</small><strong>${currency.format(state.walletBalance)}</strong></div><div class="after"><small>Kurang</small><strong>${currency.format(Math.max(0,amount-state.walletBalance))}</strong></div></div><div class="reset-callout">Saldo Rp20 juta balik dalam <b data-wallet-countdown>${countdownText()}</b>.</div><div class="modal-actions"><button class="ghost" data-action="close-checkout">Tutup</button><button data-action="back-to-cart">Kurangi Keranjang</button></div></div></div>`
  if (checkoutStage === 'processing') return `<div class="overlay modal-overlay"><div class="checkout-modal"><div class="processing"><div class="spinner"></div><h2>Membakar saldo KALAP...</h2><p>Transaksi imajiner sedang diproses.</p></div></div></div>`
  const rank = kalapRank(), challenge = todayChallenge(), done = challenge.check(state)
  return `<div class="overlay modal-overlay" data-action="close-modal-bg"><div class="checkout-modal"><button class="icon-button" data-action="close-checkout">×</button><span class="big-emoji">🔥</span><span class="eyebrow dark">KALAP BERHASIL</span><h2>Saldo bohongan sukses dibakar.</h2><div class="success-amount spend">− ${currency.format(amount)}</div><div class="success-wallet"><small>Sisa KALAP Wallet</small><strong>${currency.format(state.walletBalance)}</strong><span>${rank.icon} ${rank.name} • 🔥 ${state.streak} day streak</span></div>${done ? `<div class="challenge-complete-mini">✅ Today's Challenge selesai: <strong>${challenge.title}</strong></div>` : ''}<button data-action="close-checkout">Lanjut Kalap</button></div></div>`
}

function renderOrderTracker() {
  if (selectedOrderId) {
    const order = state.transactionHistory.find(item => item.id === selectedOrderId)
    if (order) return renderOrderDetail(order)
    selectedOrderId = null
  }

  const orders = filteredOrders()
  const foodCount = state.transactionHistory.filter(isFoodOrder).length
  const goodsCount = state.transactionHistory.length - foodCount
  return `<div class="overlay modal-overlay" data-action="close-panel-bg"><div class="panel-modal order-panel ${trackerTab}"><button class="icon-button" data-action="close-panel">×</button><span class="eyebrow dark">KALAP ORDER TRACKER</span><h2>📦 Pesanan Simulasi</h2><p>Makanan dan barang punya alur tracking yang berbeda.</p><div class="tracker-tabs"><button class="tracker-tab food ${trackerTab==='food'?'active':''}" data-action="tracker-tab" data-tab="food">🍜 Makanan <b>${foodCount}</b></button><button class="tracker-tab goods ${trackerTab==='goods'?'active':''}" data-action="tracker-tab" data-tab="goods">📦 Barang <b>${goodsCount}</b></button></div><div class="tracker-list">${orders.length ? orders.map(renderOrderCard).join('') : `<div class="tracker-empty"><span>${trackerTab==='food'?'🍜':'📦'}</span><strong>Belum ada pesanan ${trackerTab==='food'?'makanan':'barang'}.</strong><p>Fake checkout dulu, lalu statusnya akan muncul di sini.</p></div>`}</div></div></div>`
}

function renderOrderCard(order) {
  const meta = storeInfo(order.store)
  const progress = trackerProgress(order)
  const date = new Date(order.date)
  const pct = progress.active / Math.max(1, progress.steps.length - 1) * 100
  return `<article class="tracker-order-card ${isFoodOrder(order)?'food-order':'goods-order'}"><div class="tracker-order-top"><div class="tracker-order-icon">${meta.icon}</div><div><small>${orderCode(order)}</small><strong>${meta.label}</strong><span>${date.toLocaleDateString('id-ID')} · ${date.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</span></div><div class="tracker-order-price"><strong>${currency.format(order.amount)}</strong><small>${order.items || 0} item</small></div></div><div class="tracker-status-row"><div><small>Status sekarang</small><strong>${orderStatus(order)}</strong><span>${orderEta(order)}</span></div><div class="tracker-status-icon">${progress.completed?'✅':isFoodOrder(order)?'🛵':'🚚'}</div></div><div class="tracker-mini-progress"><i style="width:${pct}%"></i></div><button class="tracker-detail-button" data-action="tracker-detail" data-id="${order.id}">Lacak Pesanan →</button></article>`
}

function renderOrderDetail(order) {
  const progress = trackerProgress(order)
  const food = isFoodOrder(order)
  const meta = storeInfo(order.store)
  return `<div class="overlay modal-overlay" data-action="close-panel-bg"><div class="panel-modal order-panel order-detail ${food?'food':'goods'}"><div class="tracker-detail-nav"><button class="tracker-back" data-action="tracker-back">←</button><strong>${food?'Lacak Makanan':'Lacak Paket'}</strong><button class="icon-button" data-action="close-panel">×</button></div><div class="tracker-detail-hero"><span>${progress.completed?'✅':food?'🛵':'🚚'}</span><small>${orderCode(order)}</small><h2>${orderStatus(order)}</h2><p>${progress.steps[progress.active][1]}</p><b>${orderEta(order)}</b></div>${food ? `<div class="food-map-sim"><span class="map-store">🍜</span><span class="map-driver" style="left:${18 + progress.active * 12}%">🛵</span><span class="map-home">🏠</span><i class="map-road road-a"></i><i class="map-road road-b"></i><small>Peta simulasi · bukan lokasi nyata</small></div>` : `<div class="goods-route"><span>🏬 Penjual</span><i></i><span>📦 Sortir</span><i></i><span>🏠 Kamu</span></div>`}<div class="tracker-order-summary"><div><span>${meta.icon}</span><div><small>${meta.label}</small><strong>${order.items || 0} item</strong></div></div><strong>${currency.format(order.amount)}</strong></div><div class="tracker-timeline">${progress.steps.map((step,index)=>`<div class="tracker-step ${index<progress.active?'done':index===progress.active?'current':''}"><div class="tracker-step-dot">${index<progress.active?'✓':index===progress.active?'●':''}</div><div><strong>${step[0]}</strong><p>${step[1]}</p></div></div>`).join('')}</div><div class="tracker-disclaimer">${food?'Alur dibuat seperti tracker layanan food-delivery: restoran → driver → perjalanan → tiba.':'Alur dibuat seperti tracker marketplace: diproses → dikemas → kurir → sortir → diterima.'} Semua status sepenuhnya simulasi dan hanya tersimpan di device ini.</div></div></div>`
}

function renderPanel() {
  if (panelOpen === 'orders') return renderOrderTracker()
  if (panelOpen === 'history') {
    const rows = state.transactionHistory.length ? state.transactionHistory.map(tx => { const dt = new Date(tx.date); return `<div class="history-row"><div><span>${storeInfo(tx.store).icon}</span><div><strong>${storeInfo(tx.store).label}</strong><small>${dt.toLocaleDateString('id-ID')} · ${dt.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</small></div></div><div><strong>${currency.format(tx.amount)}</strong><small>${tx.items} item</small></div></div>` }).join('') : `<div class="panel-empty">Belum ada fake checkout.</div>`
    return `<div class="overlay modal-overlay" data-action="close-panel-bg"><div class="panel-modal"><button class="icon-button" data-action="close-panel">×</button><span class="eyebrow dark">LOCAL HISTORY</span><h2>🧾 Riwayat Kalap</h2><p>50 fake checkout terakhir di device ini.</p><div class="history-list">${rows}</div></div></div>`
  }
  const cards = Object.entries(achievementMeta).map(([id,[icon,title,text]]) => `<div class="achievement ${state.achievements.includes(id) ? 'unlocked' : ''}"><span>${state.achievements.includes(id) ? icon : '🔒'}</span><div><strong>${title}</strong><small>${text}</small></div></div>`).join('')
  return `<div class="overlay modal-overlay" data-action="close-panel-bg"><div class="panel-modal"><button class="icon-button" data-action="close-panel">×</button><span class="eyebrow dark">LOCAL ACHIEVEMENTS</span><h2>🏆 Badge KALAP</h2><p>${state.achievements.length} dari ${Object.keys(achievementMeta).length} badge terbuka.</p><div class="achievement-grid">${cards}</div></div></div>`
}

function showToast(text) { document.querySelector('.toast')?.remove(); const toast=document.createElement('div'); toast.className='toast'; toast.textContent=`✓ ${text}`; document.body.appendChild(toast); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.remove(),1800) }
function addProduct(id) { const product=currentProduct(state.activeStore,id); if(!product)return; const current=cart(), existing=current.find(item=>item.id===id); state.carts[state.activeStore]=existing?current.map(item=>item.id===id?{...item,qty:item.qty+1}:item):[...current,{...product,qty:1}]; persist(); render(); showToast(`${product.name} masuk keranjang`) }
function changeQty(id,delta) { state.carts[state.activeStore]=cart().map(item=>item.id===id?{...item,qty:item.qty+delta}:item).filter(item=>item.qty>0); persist(); render() }
function openCheckout() { const amount=subtotal(); if(!cart().length||!amount)return; checkoutStore=state.activeStore; checkoutAmount=amount; cartOpen=false; checkoutStage=amount>state.walletBalance?'insufficient':'review'; render() }
function backToCart() { checkoutStage=null; checkoutAmount=0; checkoutStore=null; cartOpen=true; render() }
function closeCheckout() { if(checkoutStage==='processing')return; checkoutStage=null; checkoutAmount=0; checkoutStore=null; render() }
function updateStreakForToday() { const today=localDateKey(); if(state.lastPlayedDate===today)return; const gap=dayDifference(state.lastPlayedDate,today); state.streak=gap===1?Math.max(1,state.streak+1):1; state.lastPlayedDate=today }
function spendWallet() {
  const storeKey=checkoutStore||state.activeStore, amount=checkoutAmount||subtotal(storeKey), lines=cart(storeKey)
  if(!amount||!lines.length)return
  if(amount>state.walletBalance){ checkoutStage='insufficient'; render(); return }
  checkoutStage='processing'; render()
  setTimeout(()=>{ const itemCount=lines.reduce((sum,line)=>sum+line.qty,0); state.walletBalance-=amount; state.dailySpent+=amount; state.dailyItems+=itemCount; state.dailyOrders+=1; state.dailySpentByStore[storeKey]=(state.dailySpentByStore[storeKey]||0)+amount; state.maxOrderAmount=Math.max(state.maxOrderAmount,amount); state.lifetimeSpent+=amount; updateStreakForToday(); state.transactionHistory=[{id:`${Date.now()}-${storeKey}`,date:new Date().toISOString(),localDate:localDateKey(),store:storeKey,amount,items:itemCount},...state.transactionHistory].slice(0,50); state.carts[storeKey]=[]; evaluateAchievements(); persist(); checkoutStage='success'; render() },850)
}

document.addEventListener('click', event => {
  const button=event.target.closest('[data-action]'); if(!button)return; const action=button.dataset.action
  if(action==='switch-store'){ state.activeStore=button.dataset.store; state.query=''; state.visibleCount=20; cartOpen=false; checkoutStage=null; panelOpen=null; selectedOrderId=null; render(); return }
  if(action==='add'){ addProduct(button.dataset.id); return }
  if(action==='open-cart'){ cartOpen=true; checkoutStage=null; panelOpen=null; selectedOrderId=null; render(); return }
  if(action==='close-cart'){ cartOpen=false; render(); return }
  if(action==='close-cart-bg'){ if(event.target===button){cartOpen=false;render()} return }
  if(action==='qty'){ changeQty(button.dataset.id,Number(button.dataset.delta)); return }
  if(action==='load-more'){ state.visibleCount+=20; render(); return }
  if(action==='checkout'){ openCheckout(); return }
  if(action==='back-to-cart'){ backToCart(); return }
  if(action==='close-checkout'){ closeCheckout(); return }
  if(action==='close-modal-bg'){ if(event.target===button)closeCheckout(); return }
  if(action==='spend-wallet'){ spendWallet(); return }
  if(action==='open-orders'){ panelOpen='orders'; trackerTab='food'; selectedOrderId=null; cartOpen=false; checkoutStage=null; render(); return }
  if(action==='open-history'){ panelOpen='history'; selectedOrderId=null; cartOpen=false; checkoutStage=null; render(); return }
  if(action==='open-badges'){ panelOpen='badges'; selectedOrderId=null; cartOpen=false; checkoutStage=null; render(); return }
  if(action==='tracker-tab'){ trackerTab=button.dataset.tab==='goods'?'goods':'food'; selectedOrderId=null; render(); return }
  if(action==='tracker-detail'){ selectedOrderId=button.dataset.id; render(); return }
  if(action==='tracker-back'){ selectedOrderId=null; render(); return }
  if(action==='close-panel'){ panelOpen=null; selectedOrderId=null; render(); return }
  if(action==='close-panel-bg'){ if(event.target===button){panelOpen=null;selectedOrderId=null;render()} }
})

document.addEventListener('keydown', event => { if(event.key!=='Escape')return; if(checkoutStage&&checkoutStage!=='processing'){closeCheckout();return} if(panelOpen){panelOpen=null;selectedOrderId=null;render();return} if(cartOpen){cartOpen=false;render()} })
document.addEventListener('error', event => { const image=event.target; if(!(image instanceof HTMLImageElement)||!image.matches('[data-product-image]')||image.dataset.fallbackApplied)return; image.dataset.fallbackApplied='true'; image.src=fallbackImage }, true)
setInterval(()=>{ if(resetDailyIfNeeded()){ checkoutStage=null; panelOpen=null; selectedOrderId=null; cartOpen=false; render(); showToast(`Saldo reset jadi ${currency.format(DAILY_WALLET)}`); return } updateCountdown() },1000)
setInterval(()=>{ if(panelOpen==='orders') render() },5000)

evaluateAchievements(); persist(); render()
