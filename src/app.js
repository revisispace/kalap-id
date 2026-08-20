import { catalog, storefronts } from './data/catalog.js'

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

const storageKey = 'kalap-v1'
const root = document.querySelector('#root')

const defaultState = () => ({
  activeStore: 'makanan',
  query: '',
  visibleCount: 20,
  carts: { makanan: [], pakaian: [], sepatu: [], tumbler: [], tas: [] },
  savedByStore: { makanan: 0, pakaian: 0, sepatu: 0, tumbler: 0, tas: 0 },
  lifetimeSaved: 0,
})

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}')
    const defaults = defaultState()
    return {
      ...defaults,
      ...saved,
      carts: { ...defaults.carts, ...(saved.carts || {}) },
      savedByStore: { ...defaults.savedByStore, ...(saved.savedByStore || {}) },
      activeStore: 'makanan',
      query: '',
      visibleCount: 20,
    }
  } catch {
    return defaultState()
  }
}

let state = loadState()
let cartOpen = false
let checkoutStage = null
let successAmount = 0
let toastTimer = null

function persist() {
  const { activeStore, query, visibleCount, ...persisted } = state
  localStorage.setItem(storageKey, JSON.stringify(persisted))
}

function storeInfo() {
  return storefronts.find(item => item.key === state.activeStore)
}

function cart() {
  return state.carts[state.activeStore] || []
}

function subtotal() {
  return cart().reduce((sum, line) => sum + line.price * line.qty, 0)
}

function cartCountFor(key = state.activeStore) {
  return (state.carts[key] || []).reduce((sum, line) => sum + line.qty, 0)
}

function filteredProducts() {
  const q = state.query.trim().toLowerCase()
  return catalog[state.activeStore].filter(item => !q || item.name.toLowerCase().includes(q))
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function render() {
  const info = storeInfo()
  const filtered = filteredProducts()
  const shown = filtered.slice(0, state.visibleCount)
  const activeCart = cart()
  const currentSubtotal = subtotal()
  const currentCartCount = cartCountFor()

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
          <div class="saved-pill">
            <span>💰</span>
            <span><small>Lifetime terselamatkan</small><strong>${currency.format(state.lifetimeSaved)}</strong></span>
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
            <span class="eyebrow">SIMULASI BELANJA • TIDAK ADA TRANSAKSI NYATA</span>
            <h1>Boleh kalap.<br><em>Dompet jangan ikut kalap.</em></h1>
            <p>Pilih storefront, masukin yang bikin pengen, lalu checkout simulasi buat lihat berapa rupiah yang berhasil tetap aman.</p>
          </div>
          <div class="hero-stat">
            <span class="hero-stat-icon">${info.icon}</span>
            <div><small>Toko aktif</small><strong>${info.label}</strong><span>${catalog[state.activeStore].length} item, tidak dicampur kategori lain.</span></div>
          </div>
        </section>

        <section class="store-switcher-wrap">
          <div class="section-heading compact">
            <div>
              <span class="eyebrow dark">PILIH TOKO</span>
              <h2>Satu mood, satu storefront</h2>
            </div>
            <p>Makanan, pakaian, sepatu, tumbler, dan tas punya keranjang masing-masing. Tidak ada item lintas kategori.</p>
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
              <p>Semua yang tampil di halaman ini hanya kategori <strong>${info.label}</strong>.</p>
            </div>
            <label class="search-box">
              <span>⌕</span>
              <input id="search-input" value="${htmlEscape(state.query)}" placeholder="Cari ${info.label.toLowerCase()}..." autocomplete="off">
            </label>
          </div>

          <div class="result-meta">
            <span>Menampilkan ${shown.length} dari ${filtered.length} item</span>
            <span>⭐ Rating simulasi • harga dalam Rupiah</span>
          </div>

          <div class="product-grid">
            ${shown.map(product => `
              <article class="product-card">
                <div class="product-image-wrap">
                  <img src="${product.image}" alt="" loading="lazy">
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
        <span>Dopamine marketplace simulasi. Tidak ada pembayaran, penjual, atau pengiriman nyata.</span>
      </footer>

      ${cartOpen ? renderCart(activeCart, info, currentSubtotal) : ''}
      ${checkoutStage ? renderCheckout(info, currentSubtotal) : ''}
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
}

function renderCart(activeCart, info, currentSubtotal) {
  return `
    <div class="overlay" data-action="close-cart-bg">
      <aside class="cart-drawer" data-stop-close>
        <div class="drawer-head">
          <div><span class="eyebrow dark">KERANJANG TERPISAH</span><h2>${info.icon} ${info.label}</h2></div>
          <button class="icon-button" data-action="close-cart">×</button>
        </div>
        <div class="drawer-note">Keranjang ini hanya menyimpan produk ${info.label.toLowerCase()}.</div>
        <div class="cart-lines">
          ${activeCart.map(item => `
            <div class="cart-line">
              <img src="${item.image}" alt="">
              <div class="line-copy"><strong>${htmlEscape(item.name)}</strong><span>${currency.format(item.price)}</span></div>
              <div class="qty-control">
                <button data-action="qty" data-id="${item.id}" data-delta="-1">−</button>
                <b>${item.qty}</b>
                <button data-action="qty" data-id="${item.id}" data-delta="1">+</button>
              </div>
            </div>
          `).join('')}
          ${activeCart.length === 0 ? `<div class="empty-cart">🛒<strong>Keranjang masih kosong.</strong><span>Pilih produk ${info.label.toLowerCase()} yang bikin kamu hampir khilaf.</span></div>` : ''}
        </div>
        <div class="cart-summary">
          <div><span>Total kalap</span><strong>${currency.format(currentSubtotal)}</strong></div>
          <button ${activeCart.length ? '' : 'disabled'} data-action="checkout">Gas Checkout →</button>
        </div>
      </aside>
    </div>
  `
}

function renderCheckout(info, currentSubtotal) {
  if (checkoutStage === 'review') {
    return `
      <div class="overlay modal-overlay">
        <div class="checkout-modal">
          <span class="big-emoji">🧠</span>
          <span class="eyebrow dark">KALAP CHECKPOINT</span>
          <h2>Yakin mau “checkout” ${info.label.toLowerCase()} ini?</h2>
          <p>Kamu sedang mensimulasikan pembelian senilai <strong>${currency.format(currentSubtotal)}</strong>. Tidak ada uang yang akan ditarik.</p>
          <div class="decision-card"><small>Kalau kamu berhenti sekarang</small><strong>${currency.format(currentSubtotal)}</strong><span>tetap aman di dompet.</span></div>
          <div class="modal-actions">
            <button class="ghost" data-action="close-checkout">Belum Dulu</button>
            <button data-action="save-money">Amankan ${currency.format(currentSubtotal)}</button>
          </div>
        </div>
      </div>
    `
  }

  if (checkoutStage === 'processing') {
    return `
      <div class="overlay modal-overlay">
        <div class="checkout-modal"><div class="processing"><div class="spinner"></div><h2>Membatalkan impuls belanja...</h2><p>Memeriksa saldo imajiner • menenangkan dopamine • menyelamatkan dompet</p></div></div>
      </div>
    `
  }

  return `
    <div class="overlay modal-overlay">
      <div class="checkout-modal">
        <span class="big-emoji">🎉</span>
        <span class="eyebrow dark">TRANSAKSI BERHASIL TIDAK TERJADI</span>
        <h2>Dompet kamu selamat.</h2>
        <div class="success-amount">+ ${currency.format(successAmount)}</div>
        <p>Nilai simulasi dari keranjang ${info.label.toLowerCase()} sudah ditambahkan ke total uang terselamatkan.</p>
        <button data-action="close-checkout">Lanjut Cari Godaan</button>
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
  const product = catalog[state.activeStore].find(item => item.id === id)
  if (!product) return
  const current = state.carts[state.activeStore]
  const existing = current.find(item => item.id === id)
  state.carts[state.activeStore] = existing
    ? current.map(item => item.id === id ? { ...item, qty: item.qty + 1 } : item)
    : [...current, { ...product, qty: 1 }]
  persist()
  render()
  showToast(`${product.name} masuk keranjang ${storeInfo().label.toLowerCase()}`)
}

function changeQty(id, delta) {
  state.carts[state.activeStore] = state.carts[state.activeStore]
    .map(item => item.id === id ? { ...item, qty: item.qty + delta } : item)
    .filter(item => item.qty > 0)
  persist()
  render()
}

function saveMoney() {
  successAmount = subtotal()
  if (!successAmount) return
  checkoutStage = 'processing'
  render()
  setTimeout(() => {
    state.savedByStore[state.activeStore] += successAmount
    state.lifetimeSaved += successAmount
    state.carts[state.activeStore] = []
    persist()
    checkoutStage = 'success'
    render()
  }, 1200)
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
    render()
  }
  if (action === 'add') addProduct(button.dataset.id)
  if (action === 'open-cart') { cartOpen = true; render() }
  if (action === 'close-cart' || action === 'close-cart-bg') { cartOpen = false; render() }
  if (action === 'qty') changeQty(button.dataset.id, Number(button.dataset.delta))
  if (action === 'load-more') { state.visibleCount += 20; render() }
  if (action === 'checkout') { cartOpen = false; checkoutStage = 'review'; render() }
  if (action === 'close-checkout') { checkoutStage = null; render() }
  if (action === 'save-money') saveMoney()
})

document.addEventListener('click', event => {
  if (event.target.closest('[data-stop-close]')) event.stopPropagation()
}, true)

render()