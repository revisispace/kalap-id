import { catalog, storefronts } from './data/catalog.js'

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

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

const defaultState = () => ({
  activeStore: 'makanan',
  query: '',
  visibleCount: 20,
  carts: Object.fromEntries(storeKeys.map(key => [key, []])),
  savedByStore: Object.fromEntries(storeKeys.map(key => [key, 0])),
  lifetimeSaved: 0,
})

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

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}')
    const defaults = defaultState()
    return {
      ...defaults,
      ...saved,
      carts: hydrateSavedCarts(saved.carts),
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
let successStore = null
let toastTimer = null

function persist() {
  const { activeStore, query, visibleCount, ...persisted } = state
  localStorage.setItem(storageKey, JSON.stringify(persisted))
}

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
            <p>Nama produk dan merek dipakai sebagai referensi simulasi. KALAP! tidak berafiliasi dengan merek yang tampil dan harga/rating di sini bukan harga/rating resmi.</p>
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
              <p>Semua yang tampil di halaman ini hanya kategori <strong>${info.label}</strong>. Klik gambar untuk membuka pencarian Google Images produk tersebut.</p>
            </div>
            <label class="search-box">
              <span>⌕</span>
              <input id="search-input" value="${htmlEscape(state.query)}" placeholder="Cari ${info.label.toLowerCase()}..." autocomplete="off">
            </label>
          </div>

          <div class="result-meta">
            <span>Menampilkan ${shown.length} dari ${filtered.length} item</span>
            <span>⭐ Rating & harga simulasi • foto dimuat dari web</span>
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
        <span>Simulasi saja. Merek dan foto produk adalah referensi eksternal; tidak ada afiliasi, pembayaran, penjual, atau pengiriman nyata.</span>
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
      <aside class="cart-drawer" role="dialog" aria-modal="true" aria-label="Keranjang ${info.label}">
        <div class="drawer-head">
          <div><span class="eyebrow dark">KERANJANG TERPISAH</span><h2>${info.icon} ${info.label}</h2></div>
          <button class="icon-button" data-action="close-cart" aria-label="Tutup keranjang">×</button>
        </div>
        <div class="drawer-note">Keranjang ini hanya menyimpan produk ${info.label.toLowerCase()}.</div>
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
          ${activeCart.length === 0 ? `<div class="empty-cart">🛒<strong>Keranjang masih kosong.</strong><span>Pilih produk ${info.label.toLowerCase()} yang bikin kamu hampir khilaf.</span></div>` : ''}
        </div>
        <div class="cart-summary">
          <div><span>Total kalap</span><strong>${currency.format(currentSubtotal)}</strong></div>
          <div class="modal-actions">
            <button class="ghost" data-action="close-cart">← Kembali Belanja</button>
            <button ${activeCart.length ? '' : 'disabled'} data-action="checkout">Gas Checkout →</button>
          </div>
        </div>
      </aside>
    </div>
  `
}

function renderCheckout(info, currentSubtotal) {
  if (checkoutStage === 'review') {
    return `
      <div class="overlay modal-overlay" data-action="close-modal-bg">
        <div class="checkout-modal" role="dialog" aria-modal="true">
          <button class="icon-button" data-action="close-checkout" aria-label="Tutup checkout">×</button>
          <span class="big-emoji">🧠</span>
          <span class="eyebrow dark">KALAP CHECKPOINT</span>
          <h2>Yakin mau “checkout” ${info.label.toLowerCase()} ini?</h2>
          <p>Kamu sedang mensimulasikan pembelian senilai <strong>${currency.format(currentSubtotal)}</strong>. Tidak ada uang yang akan ditarik.</p>
          <div class="decision-card"><small>Kalau kamu berhenti sekarang</small><strong>${currency.format(currentSubtotal)}</strong><span>tetap aman di dompet.</span></div>
          <div class="modal-actions">
            <button class="ghost" data-action="back-to-cart">← Kembali ke Keranjang</button>
            <button data-action="save-money">Amankan ${currency.format(currentSubtotal)}</button>
          </div>
        </div>
      </div>
    `
  }

  if (checkoutStage === 'processing') {
    return `
      <div class="overlay modal-overlay">
        <div class="checkout-modal" role="dialog" aria-modal="true">
          <div class="processing"><div class="spinner"></div><h2>Membatalkan impuls belanja...</h2><p>Memeriksa saldo imajiner • menenangkan dopamine • menyelamatkan dompet</p></div>
        </div>
      </div>
    `
  }

  const infoForSuccess = storeInfo(successStore || state.activeStore)
  return `
    <div class="overlay modal-overlay" data-action="close-modal-bg">
      <div class="checkout-modal" role="dialog" aria-modal="true">
        <button class="icon-button" data-action="close-checkout" aria-label="Tutup hasil checkout">×</button>
        <span class="big-emoji">🎉</span>
        <span class="eyebrow dark">TRANSAKSI BERHASIL TIDAK TERJADI</span>
        <h2>Dompet kamu selamat.</h2>
        <div class="success-amount">+ ${currency.format(successAmount)}</div>
        <p>Nilai simulasi dari keranjang ${infoForSuccess.label.toLowerCase()} sudah ditambahkan ke total uang terselamatkan.</p>
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
  if (!cart().length) return
  cartOpen = false
  checkoutStage = 'review'
  render()
}

function backToCart() {
  checkoutStage = null
  cartOpen = true
  render()
}

function closeCheckout() {
  if (checkoutStage === 'processing') return
  checkoutStage = null
  successStore = null
  render()
}

function saveMoney() {
  const checkoutStore = state.activeStore
  const amount = subtotal(checkoutStore)
  if (!amount) return

  successAmount = amount
  successStore = checkoutStore
  checkoutStage = 'processing'
  render()

  setTimeout(() => {
    state.savedByStore[checkoutStore] = (state.savedByStore[checkoutStore] || 0) + amount
    state.lifetimeSaved += amount
    state.carts[checkoutStore] = []
    persist()
    checkoutStage = 'success'
    render()
  }, 900)
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

  if (action === 'save-money') saveMoney()
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

render()
