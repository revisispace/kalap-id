import { catalog, storefronts } from './data/catalog.js'

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

const DAILY_WALLET = 20_000_000
const storageKey = 'kalap-v1'
const root = document.querySelector('#root')
const storeKeys = storefronts.map(store => store.key)
const fallbackImage = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
    <rect width="900" height="900" fill="#f0e9e4"/>
    <text x="450" y="430" text-anchor="middle" font-family="Arial,sans-serif" font-size="82" font-weight="700" fill="#191614">KALAP!</text>
    <text x="450" y="505" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" fill="#726a65">gambar eksternal tidak tersedia</text>
  </svg>
`)}`

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dayDifference(fromKey, toKey) {
  if (!fromKey || !toKey) return null
  const [fy, fm, fd] = fromKey.split('-').map(Number)
  const [ty, tm, td] = toKey.split('-').map(Number)
  if (![fy, fm, fd, ty, tm, td].every(Number.isFinite)) return null
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000)
}

function defaultState() {
  return {
    activeStore: 'makanan',
    query: '',
    visibleCount: 20,
    carts: Object.fromEntries(storeKeys.map(key => [key, []])),
    walletDate: localDateKey(),
    walletBalance: DAILY_WALLET,
    dailySpent: 0,
    dailyItems: 0,
    dailyOrders: 0,
    lifetimeSpent: 0,
    streak: 0,
    lastPlayedDate: null,
    transactionHistory: [],
  }
}

function currentProduct(storeKey, id) {
  return (catalog[storeKey] || []).find(item => item.id === id)
}

function hydrateSavedCarts(savedCarts = {}) {
  return Object.fromEntries(storeKeys.map(key => {
    const lines = Array.isArray(savedCarts[key]) ? savedCarts[key] : []
    const hydrated = lines
      .map(line => {
        const fresh = currentProduct(key, line.id)
        return fresh ? { ...fresh, qty: Math.max(1, Number(line.qty) || 1) } : null
      })
      .filter(Boolean)
    return [key, hydrated]
  }))
}

function normalizeDailyState(loaded) {
  const today = localDateKey()
  if (loaded.walletDate === today) return loaded

  return {
    ...loaded,
    walletDate: today,
    walletBalance: DAILY_WALLET,
    dailySpent: 0,
    dailyItems: 0,
    dailyOrders: 0,
  }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}')
    const defaults = defaultState()
    const loaded = {
      ...defaults,
      ...saved,
      carts: hydrateSavedCarts(saved.carts),
      transactionHistory: Array.isArray(saved.transactionHistory) ? saved.transactionHistory.slice(0, 50) : [],
      activeStore: 'makanan',
      query: '',
      visibleCount: 20,
    }

    if (!Number.isFinite(Number(loaded.walletBalance))) loaded.walletBalance = DAILY_WALLET
    if (!Number.isFinite(Number(loaded.dailySpent))) loaded.dailySpent = 0
    if (!Number.isFinite(Number(loaded.dailyItems))) loaded.dailyItems = 0
    if (!Number.isFinite(Number(loaded.dailyOrders))) loaded.dailyOrders = 0
    if (!Number.isFinite(Number(loaded.lifetimeSpent))) loaded.lifetimeSpent = 0
    if (!Number.isFinite(Number(loaded.streak))) loaded.streak = 0

    return normalizeDailyState(loaded)
  } catch {
    return defaultState()
  }
}

let state = loadState()
let cartOpen = false
let checkoutStage = null
let checkoutAmount = 0
let checkoutStore = null
let toastTimer = null

function persist() {
  const { activeStore, query, visibleCount, ...persisted } = state
  localStorage.setItem(storageKey, JSON.stringify(persisted))
}

persist()

function storeInfo(key = state.activeStore) {
  return storefronts.find(item => item.key === key) || storefronts[0]
}

function cart(key = state.activeStore) {
  return state.carts[key] || []
}

function subtotal(key = state.activeStore) {
  return cart(key).reduce((sum, line) => sum + line.price * line.qty, 0)
}

function cartCountFor(key = state.activeStore) {
  return cart(key).reduce((sum, line) => sum + line.qty, 0)
}

function filteredProducts() {
  const q = state.query.trim().toLowerCase()
  return (catalog[state.activeStore] || []).filter(item => !q || item.name.toLowerCase().includes(q))
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function productImage(product, compact = false) {
  return `
    <a
      href="${product.imageSearch}"
      target="_blank"
      rel="noopener noreferrer"
      title="Buka Google Images: ${htmlEscape(product.name)}"
      ${compact ? '' : 'aria-label="Buka gambar produk di Google Images"'}
    >
      <img
        src="${product.image}"
        alt="${htmlEscape(product.name)}"
        loading="lazy"
        referrerpolicy="no-referrer"
        data-product-image
      >
    </a>
  `
}

function walletPercent() {
  return Math.min(100, Math.max(0, (state.dailySpent / DAILY_WALLET) * 100))
}

function countdownText() {
  const now = new Date()
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const seconds = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000))
  const hours = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')
  return `${hours}:${minutes}:${secs}`
}

function updateCountdown() {
  document.querySelectorAll('[data-wallet-countdown]').forEach(node => {
    node.textContent = countdownText()
  })
}

function resetDailyIfNeeded() {
  const today = localDateKey()
  if (state.walletDate === today) return false

  state.walletDate = today
  state.walletBalance = DAILY_WALLET
  state.dailySpent = 0
  state.dailyItems = 0
  state.dailyOrders = 0
  persist()
  return true
}

function render() {
  const info = storeInfo()
  const filtered = filteredProducts()
  const shown = filtered.slice(0, state.visibleCount)
  const activeCart = cart()
  const currentSubtotal = subtotal()
  const currentCartCount = cartCountFor()
  const percent = walletPercent()

  root.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand-wrap">
          <div class="brand-mark">K!</div>
          <div>
            <div class="brand">KALAP!</div>
            <div class="brand-sub">the dopamine marketplace</div>
          </div>
        </div>
        <div class="top-actions">
          <div class="wallet-pill">
            <span class="wallet-pill-icon">💳</span>
            <span>
              <small>KALAP WALLET</small>
              <strong>${currency.format(state.walletBalance)}</strong>
              <em>reset <b data-wallet-countdown>${countdownText()}</b></em>
            </span>
          </div>
          <button class="cart-button" data-action="open-cart">
            🛒 Keranjang ${info.label}
            ${currentCartCount > 0 ? `<span class="cart-count">${currentCartCount}</span>` : ''}
          </button>
        </div>
      </header>

      <main>
        <section class="hero">
          <div class="hero-copy">
            <span class="eyebrow">Rp20 JUTA SETIAP HARI • 100% SIMULASI</span>
            <h1>Boleh kalap.<br><em>Pakai duit bohongan.</em></h1>
            <p>Setiap device dapat KALAP Wallet Rp20.000.000 per hari. Fake checkout mengurangi saldo ini, lalu saldo otomatis kembali penuh saat tanggal lokal berganti.</p>
          </div>
          <div class="hero-wallet">
            <div class="hero-wallet-head">
              <span>💳 KALAP WALLET</span>
              <b>🔥 ${state.streak} day streak</b>
            </div>
            <strong>${currency.format(state.walletBalance)}</strong>
            <div class="wallet-track"><i style="width:${percent}%"></i></div>
            <div class="wallet-meta">
              <span>Terpakai ${currency.format(state.dailySpent)}</span>
              <span>${state.dailyOrders} checkout • ${state.dailyItems} item</span>
            </div>
            <div class="wallet-reset">Saldo kembali ${currency.format(DAILY_WALLET)} dalam <b data-wallet-countdown>${countdownText()}</b></div>
            <div class="active-store-mini"><span>${info.icon}</span><small>Toko aktif</small><strong>${info.label}</strong></div>
          </div>
        </section>

        <section class="daily-strip">
          <div><small>Budget harian</small><strong>${currency.format(DAILY_WALLET)}</strong></div>
          <div><small>Dibakar hari ini</small><strong>${currency.format(state.dailySpent)}</strong></div>
          <div><small>Sisa saldo</small><strong>${currency.format(state.walletBalance)}</strong></div>
          <div><small>Total sepanjang masa</small><strong>${currency.format(state.lifetimeSpent)}</strong></div>
        </section>

        <section class="store-switcher-wrap">
          <div class="section-heading compact">
            <div>
              <span class="eyebrow dark">PILIH TOKO</span>
              <h2>Satu mood, satu storefront</h2>
            </div>
            <p>Makanan, pakaian, sepatu, tumbler, dan tas punya keranjang masing-masing. KALAP Wallet dipakai bersama untuk semua kategori.</p>
          </div>

          <div class="store-switcher">
            ${storefronts.map(store => `
              <button class="store-tab ${state.activeStore === store.key ? 'active' : ''}" data-action="switch-store" data-store="${store.key}">
                <span class="store-icon">${store.icon}</span>
                <span><strong>${store.label}</strong><small>${store.subtitle}</small></span>
                ${cartCountFor(store.key) > 0 ? `<b>${cartCountFor(store.key)}</b>` : ''}
              </button>
            `).join('')}
          </div>
        </section>

        <section class="marketplace">
          <div class="market-header">
            <div>
              <span class="eyebrow dark">🔥 TRENDING SEKARANG</span>
              <h2>${info.icon} ${info.label} — 100 pilihan</h2>
              <p>Semua yang tampil hanya kategori <strong>${info.label}</strong>. Klik gambar untuk membuka pencarian Google Images produk tersebut.</p>
            </div>
            <label class="search-box">
              <span>⌕</span>
              <input id="search-input" value="${htmlEscape(state.query)}" placeholder="Cari ${info.label.toLowerCase()}..." autocomplete="off">
            </label>
          </div>

          <div class="result-meta">
            <span>Menampilkan ${shown.length} dari ${filtered.length} item</span>
            <span>💳 Sisa KALAP Wallet: <strong>${currency.format(state.walletBalance)}</strong></span>
          </div>

          <div class="product-grid">
            ${shown.map(product => `
              <article class="product-card">
                <div class="product-image-wrap">
                  ${productImage(product)}
                  <span class="badge badge-${product.badge.toLowerCase()}">${product.badge}</span>
                  <span class="fake-label">SIMULASI</span>
                </div>
                <div class="product-body">
                  <h3>${htmlEscape(product.name)}</h3>
                  <div class="rating-row"><span>★ ${product.rating}</span><small>(${product.reviewCount.toLocaleString('id-ID')})</small></div>
                  <div class="price">${currency.format(product.price)}</div>
                  <button data-action="add" data-id="${product.id}">+ Gue Pengen</button>
                </div>
              </article>
            `).join('')}
          </div>

          ${filtered.length === 0 ? `
            <div class="empty-state"><div>🔎</div><h3>Tidak ada hasil</h3><p>Coba kata pencarian lain di toko ${info.label}.</p></div>
          ` : ''}

          ${state.visibleCount < filtered.length ? `
            <div class="load-more-wrap">
              <button class="load-more" data-action="load-more">Tampilkan 20 lagi</button>
              <small>${filtered.length - state.visibleCount} item tersisa</small>
            </div>
          ` : ''}
        </section>
      </main>

      <footer>
        <strong>KALAP!</strong>
        <span>Saldo, checkout, harga, dan rating adalah simulasi lokal di device. Tidak ada pembayaran, penjual, atau pengiriman nyata.</span>
      </footer>

      ${cartOpen ? renderCart(activeCart, info, currentSubtotal) : ''}
      ${checkoutStage ? renderCheckout() : ''}
    </div>
  `

  const search = document.querySelector('#search-input')
  if (search) {
    search.addEventListener('input', event => {
      state.query = event.target.value
      state.visibleCount = 20
      render()
      const next = document.querySelector('#search-input')
      if (next) {
        next.focus()
        next.setSelectionRange(next.value.length, next.value.length)
      }
    })
  }

  updateCountdown()
}

function renderCart(activeCart, info, currentSubtotal) {
  const canAfford = currentSubtotal <= state.walletBalance
  return `
    <div class="overlay" data-action="close-cart-bg">
      <aside class="cart-drawer" role="dialog" aria-modal="true" aria-label="Keranjang ${info.label}">
        <div class="drawer-head">
          <div><span class="eyebrow dark">KERANJANG TERPISAH</span><h2>${info.icon} ${info.label}</h2></div>
          <button class="icon-button" data-action="close-cart" aria-label="Tutup keranjang">×</button>
        </div>
        <div class="drawer-note">💳 Saldo KALAP Wallet kamu saat ini <strong>${currency.format(state.walletBalance)}</strong>.</div>
        <div class="cart-lines">
          ${activeCart.map(item => `
            <div class="cart-line">
              ${productImage(item, true)}
              <div class="line-copy"><strong>${htmlEscape(item.name)}</strong><span>${currency.format(item.price)}</span></div>
              <div class="qty-control">
                <button data-action="qty" data-id="${item.id}" data-delta="-1" aria-label="Kurangi jumlah">−</button>
                <b>${item.qty}</b>
                <button data-action="qty" data-id="${item.id}" data-delta="1" aria-label="Tambah jumlah">+</button>
              </div>
            </div>
          `).join('')}
          ${activeCart.length === 0 ? `<div class="empty-cart">🛒<strong>Keranjang masih kosong.</strong><span>Pilih produk ${info.label.toLowerCase()} yang bikin kamu kalap.</span></div>` : ''}
        </div>
        <div class="cart-summary">
          <div><span>Total checkout</span><strong>${currency.format(currentSubtotal)}</strong></div>
          ${activeCart.length && !canAfford ? `<div class="wallet-warning">Kurang ${currency.format(currentSubtotal - state.walletBalance)} dari saldo KALAP Wallet.</div>` : ''}
          <div class="modal-actions">
            <button class="ghost" data-action="close-cart">← Kembali Belanja</button>
            <button ${activeCart.length ? '' : 'disabled'} data-action="checkout">Gas Checkout →</button>
          </div>
        </div>
      </aside>
    </div>
  `
}

function renderCheckout() {
  const info = storeInfo(checkoutStore || state.activeStore)
  const amount = checkoutAmount || subtotal(checkoutStore || state.activeStore)

  if (checkoutStage === 'review') {
    const after = Math.max(0, state.walletBalance - amount)
    return `
      <div class="overlay modal-overlay" data-action="close-modal-bg">
        <div class="checkout-modal" role="dialog" aria-modal="true">
          <button class="icon-button" data-action="close-checkout" aria-label="Tutup checkout">×</button>
          <span class="big-emoji">💳</span>
          <span class="eyebrow dark">KALAP CHECKOUT</span>
          <h2>Gas beli ${info.label.toLowerCase()} pakai duit bohongan?</h2>
          <p>Tidak ada uang nyata yang ditarik. Checkout ini hanya mengurangi saldo KALAP Wallet yang tersimpan di browser device ini.</p>
          <div class="checkout-wallet-breakdown">
            <div><small>Saldo sekarang</small><strong>${currency.format(state.walletBalance)}</strong></div>
            <div><small>Total checkout</small><strong>− ${currency.format(amount)}</strong></div>
            <div class="after"><small>Sisa setelah checkout</small><strong>${currency.format(after)}</strong></div>
          </div>
          <div class="modal-actions">
            <button class="ghost" data-action="back-to-cart">← Kembali ke Keranjang</button>
            <button data-action="spend-wallet">Bayar ${currency.format(amount)}</button>
          </div>
        </div>
      </div>
    `
  }

  if (checkoutStage === 'insufficient') {
    const shortage = Math.max(0, amount - state.walletBalance)
    return `
      <div class="overlay modal-overlay" data-action="close-modal-bg">
        <div class="checkout-modal" role="dialog" aria-modal="true">
          <button class="icon-button" data-action="close-checkout" aria-label="Tutup checkout">×</button>
          <span class="big-emoji">😭</span>
          <span class="eyebrow dark">SALDO KALAP KURANG</span>
          <h2>Kalapnya kelewatan.</h2>
          <p>Total keranjang ${info.label.toLowerCase()} lebih besar dari saldo KALAP Wallet hari ini.</p>
          <div class="checkout-wallet-breakdown danger">
            <div><small>Total checkout</small><strong>${currency.format(amount)}</strong></div>
            <div><small>Saldo kamu</small><strong>${currency.format(state.walletBalance)}</strong></div>
            <div class="after"><small>Masih kurang</small><strong>${currency.format(shortage)}</strong></div>
          </div>
          <div class="reset-callout">Balik lagi setelah <b data-wallet-countdown>${countdownText()}</b> untuk dapat saldo ${currency.format(DAILY_WALLET)} lagi.</div>
          <div class="modal-actions">
            <button class="ghost" data-action="close-checkout">Tutup</button>
            <button data-action="back-to-cart">Kurangi Keranjang</button>
          </div>
        </div>
      </div>
    `
  }

  if (checkoutStage === 'processing') {
    return `
      <div class="overlay modal-overlay">
        <div class="checkout-modal" role="dialog" aria-modal="true">
          <div class="processing"><div class="spinner"></div><h2>Membakar saldo KALAP...</h2><p>Memproses transaksi imajiner • tidak ada uang nyata yang bergerak</p></div>
        </div>
      </div>
    `
  }

  return `
    <div class="overlay modal-overlay" data-action="close-modal-bg">
      <div class="checkout-modal" role="dialog" aria-modal="true">
        <button class="icon-button" data-action="close-checkout" aria-label="Tutup hasil checkout">×</button>
        <span class="big-emoji">🔥</span>
        <span class="eyebrow dark">KALAP BERHASIL</span>
        <h2>Saldo bohongan sukses dibakar.</h2>
        <div class="success-amount spend">− ${currency.format(amount)}</div>
        <p>${info.icon} Checkout ${info.label} berhasil disimulasikan. Tidak ada transaksi nyata.</p>
        <div class="success-wallet">
          <small>Sisa KALAP Wallet hari ini</small>
          <strong>${currency.format(state.walletBalance)}</strong>
          <span>🔥 ${state.streak} day streak • reset <b data-wallet-countdown>${countdownText()}</b></span>
        </div>
        <button data-action="close-checkout">Lanjut Kalap</button>
      </div>
    </div>
  `
}

function showToast(text) {
  document.querySelector('.toast')?.remove()
  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.textContent = `✓ ${text}`
  document.body.appendChild(toast)
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toast.remove(), 1800)
}

function addProduct(id) {
  const product = currentProduct(state.activeStore, id)
  if (!product) return

  const current = cart()
  const existing = current.find(item => item.id === id)
  state.carts[state.activeStore] = existing
    ? current.map(item => item.id === id ? { ...item, qty: item.qty + 1 } : item)
    : [...current, { ...product, qty: 1 }]

  persist()
  render()
  showToast(`${product.name} masuk keranjang ${storeInfo().label.toLowerCase()}`)
}

function changeQty(id, delta) {
  state.carts[state.activeStore] = cart()
    .map(item => item.id === id ? { ...item, qty: item.qty + delta } : item)
    .filter(item => item.qty > 0)
  persist()
  render()
}

function openCheckout() {
  const amount = subtotal()
  if (!cart().length || !amount) return

  checkoutStore = state.activeStore
  checkoutAmount = amount
  cartOpen = false
  checkoutStage = amount > state.walletBalance ? 'insufficient' : 'review'
  render()
}

function backToCart() {
  checkoutStage = null
  checkoutAmount = 0
  checkoutStore = null
  cartOpen = true
  render()
}

function closeCheckout() {
  if (checkoutStage === 'processing') return
  checkoutStage = null
  checkoutAmount = 0
  checkoutStore = null
  render()
}

function updateStreakForToday() {
  const today = localDateKey()
  if (state.lastPlayedDate === today) return

  const gap = dayDifference(state.lastPlayedDate, today)
  state.streak = gap === 1 ? Math.max(1, state.streak + 1) : 1
  state.lastPlayedDate = today
}

function spendWallet() {
  const storeKey = checkoutStore || state.activeStore
  const amount = checkoutAmount || subtotal(storeKey)
  const lines = cart(storeKey)
  if (!amount || !lines.length) return

  if (amount > state.walletBalance) {
    checkoutStage = 'insufficient'
    render()
    return
  }

  checkoutStage = 'processing'
  render()

  setTimeout(() => {
    const itemCount = lines.reduce((sum, line) => sum + line.qty, 0)
    state.walletBalance -= amount
    state.dailySpent += amount
    state.dailyItems += itemCount
    state.dailyOrders += 1
    state.lifetimeSpent += amount
    updateStreakForToday()
    state.transactionHistory = [
      {
        id: `${Date.now()}-${storeKey}`,
        date: new Date().toISOString(),
        localDate: localDateKey(),
        store: storeKey,
        amount,
        items: itemCount,
      },
      ...state.transactionHistory,
    ].slice(0, 50)
    state.carts[storeKey] = []
    persist()
    checkoutStage = 'success'
    render()
  }, 850)
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]')
  if (!button) return

  const action = button.dataset.action

  if (action === 'switch-store') {
    state.activeStore = button.dataset.store
    state.query = ''
    state.visibleCount = 20
    cartOpen = false
    checkoutStage = null
    checkoutAmount = 0
    checkoutStore = null
    render()
    return
  }

  if (action === 'add') {
    addProduct(button.dataset.id)
    return
  }

  if (action === 'open-cart') {
    cartOpen = true
    checkoutStage = null
    checkoutAmount = 0
    checkoutStore = null
    render()
    return
  }

  if (action === 'close-cart') {
    cartOpen = false
    render()
    return
  }

  if (action === 'close-cart-bg') {
    if (event.target === button) {
      cartOpen = false
      render()
    }
    return
  }

  if (action === 'qty') {
    changeQty(button.dataset.id, Number(button.dataset.delta))
    return
  }

  if (action === 'load-more') {
    state.visibleCount += 20
    render()
    return
  }

  if (action === 'checkout') {
    openCheckout()
    return
  }

  if (action === 'back-to-cart') {
    backToCart()
    return
  }

  if (action === 'close-checkout') {
    closeCheckout()
    return
  }

  if (action === 'close-modal-bg') {
    if (event.target === button) closeCheckout()
    return
  }

  if (action === 'spend-wallet') spendWallet()
})

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return
  if (checkoutStage && checkoutStage !== 'processing') {
    closeCheckout()
    return
  }
  if (cartOpen) {
    cartOpen = false
    render()
  }
})

document.addEventListener('error', event => {
  const image = event.target
  if (!(image instanceof HTMLImageElement)) return
  if (!image.matches('[data-product-image]')) return
  if (image.dataset.fallbackApplied) return
  image.dataset.fallbackApplied = 'true'
  image.src = fallbackImage
}, true)

setInterval(() => {
  if (resetDailyIfNeeded()) {
    checkoutStage = null
    checkoutAmount = 0
    checkoutStore = null
    cartOpen = false
    render()
    showToast(`Saldo KALAP Wallet reset jadi ${currency.format(DAILY_WALLET)}`)
    return
  }
  updateCountdown()
}, 1000)

render()
