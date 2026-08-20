(() => {
  const CORE_KEY = 'kalap-v1'
  const META_KEY = 'kalap-v2-meta'
  const VERSION = 'v1.2'
  let enhanceQueued = false
  let lastOrderFingerprint = ''

  const money = value => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(Number(value) || 0)

  function localDateKey(date = new Date()) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  function readCore() {
    try { return JSON.parse(localStorage.getItem(CORE_KEY) || '{}') }
    catch { return {} }
  }

  function readMeta() {
    try {
      const saved = JSON.parse(localStorage.getItem(META_KEY) || '{}')
      return {
        favorites: Array.isArray(saved.favorites) ? saved.favorites : [],
        coins: Number(saved.coins) || 0,
        xp: Number(saved.xp) || 0,
        processedOrders: Array.isArray(saved.processedOrders) ? saved.processedOrders : [],
        dailyBonusDate: saved.dailyBonusDate || null,
      }
    } catch {
      return { favorites: [], coins: 0, xp: 0, processedOrders: [], dailyBonusDate: null }
    }
  }

  let meta = readMeta()

  function saveMeta() {
    localStorage.setItem(META_KEY, JSON.stringify(meta))
  }

  function toast(message) {
    document.querySelector('.v2-toast')?.remove()
    const node = document.createElement('div')
    node.className = 'v2-toast'
    node.textContent = message
    document.body.appendChild(node)
    setTimeout(() => node.remove(), 1800)
  }

  function awardDailyBonus() {
    const today = localDateKey()
    if (meta.dailyBonusDate === today) return
    meta.dailyBonusDate = today
    meta.coins += 100
    saveMeta()
    setTimeout(() => toast('🪙 Daily bonus +100 KALAP Coins'), 900)
  }

  function processCheckoutRewards() {
    const core = readCore()
    const orders = Array.isArray(core.transactionHistory) ? core.transactionHistory : []
    const known = new Set(meta.processedOrders)
    let changed = false

    orders.forEach(order => {
      if (!order?.id || known.has(order.id)) return
      const amount = Number(order.amount) || 0
      meta.xp += Math.max(20, Math.round(amount / 100000))
      meta.coins += Math.max(5, Math.round(amount / 250000))
      known.add(order.id)
      changed = true
    })

    if (changed) {
      meta.processedOrders = [...known].slice(-200)
      saveMeta()
    }
  }

  function levelInfo() {
    const xpPerLevel = 500
    const level = Math.floor(meta.xp / xpPerLevel) + 1
    const current = meta.xp % xpPerLevel
    return { level, current, target: xpPerLevel, percent: current / xpPerLevel * 100 }
  }

  function activeStore() {
    return document.querySelector('.store-tab.active')?.dataset.store || 'makanan'
  }

  function favoriteById(id) {
    return meta.favorites.find(item => item.id === id)
  }

  function toggleFavorite(card) {
    const add = card.querySelector('[data-action="add"]')
    if (!add?.dataset.id) return
    const id = add.dataset.id
    const existing = favoriteById(id)

    if (existing) {
      meta.favorites = meta.favorites.filter(item => item.id !== id)
      saveMeta()
      toast('♡ Dihapus dari Favorit')
    } else {
      const item = {
        id,
        name: card.querySelector('h3')?.textContent?.trim() || 'Produk KALAP',
        price: card.querySelector('.price')?.textContent?.trim() || '',
        image: card.querySelector('img')?.src || '',
        store: activeStore(),
      }
      meta.favorites = [item, ...meta.favorites].slice(0, 100)
      saveMeta()
      toast('♥ Masuk Favorit')
    }
    enhanceProductCards()
    updateNavBadges()
  }

  function enhanceProductCards() {
    document.querySelectorAll('.product-card').forEach(card => {
      const add = card.querySelector('[data-action="add"]')
      const id = add?.dataset.id
      if (!id) return

      let heart = card.querySelector('.favorite-button')
      if (!heart) {
        heart = document.createElement('button')
        heart.type = 'button'
        heart.className = 'favorite-button'
        heart.setAttribute('aria-label', 'Simpan ke Favorit')
        heart.addEventListener('click', event => {
          event.preventDefault()
          event.stopPropagation()
          toggleFavorite(card)
        })
        card.querySelector('.product-image-wrap')?.appendChild(heart)
      }
      const active = Boolean(favoriteById(id))
      heart.classList.toggle('active', active)
      heart.textContent = active ? '♥' : '♡'
    })
  }

  function parsePrice(card) {
    const text = card.querySelector('.price')?.textContent || ''
    return Number(text.replace(/[^0-9]/g, '')) || 0
  }

  function parseRating(card) {
    const text = card.querySelector('.rating-row span')?.textContent || ''
    return Number((text.match(/[0-9]+(?:[.,][0-9]+)?/) || ['0'])[0].replace(',', '.')) || 0
  }

  function applySort(mode) {
    const grid = document.querySelector('.product-grid')
    if (!grid) return
    const cards = [...grid.querySelectorAll('.product-card')]
    cards.sort((a, b) => {
      if (mode === 'low') return parsePrice(a) - parsePrice(b)
      if (mode === 'high') return parsePrice(b) - parsePrice(a)
      return parseRating(b) - parseRating(a)
    })
    cards.forEach(card => grid.appendChild(card))
    document.querySelectorAll('.v12-sort button').forEach(button => button.classList.toggle('active', button.dataset.sort === mode))
  }

  function injectSortControls() {
    const metaRow = document.querySelector('.result-meta')
    if (!metaRow || document.querySelector('.v12-sort')) return

    const bar = document.createElement('div')
    bar.className = 'v12-sort'
    bar.innerHTML = `
      <span>Urutkan</span>
      <button type="button" data-sort="popular" class="active">Populer</button>
      <button type="button" data-sort="low">Harga ↓</button>
      <button type="button" data-sort="high">Harga ↑</button>
    `
    bar.addEventListener('click', event => {
      const button = event.target.closest('[data-sort]')
      if (button) applySort(button.dataset.sort)
    })
    metaRow.insertAdjacentElement('afterend', bar)
  }

  function injectBottomNav() {
    if (document.querySelector('.kalap-bottom-nav')) return
    const nav = document.createElement('nav')
    nav.className = 'kalap-bottom-nav'
    nav.innerHTML = `
      <button type="button" data-v2-nav="home"><span>⌂</span><small>Home</small></button>
      <button type="button" data-v2-nav="orders"><span>▣</span><small>Pesanan</small><b data-order-count hidden></b></button>
      <button type="button" data-v2-nav="favorites"><span>♡</span><small>Favorit</small><b data-fav-count hidden></b></button>
      <button type="button" data-v2-nav="profile"><span>◉</span><small>Profil</small></button>
    `
    nav.addEventListener('click', event => {
      const button = event.target.closest('[data-v2-nav]')
      if (!button) return
      const target = button.dataset.v2Nav
      if (target === 'home') window.scrollTo({ top: 0, behavior: 'smooth' })
      if (target === 'orders') document.querySelector('[data-action="open-orders"]')?.click()
      if (target === 'favorites') openFavorites()
      if (target === 'profile') openProfile()
    })
    document.body.appendChild(nav)
    updateNavBadges()
  }

  function updateNavBadges() {
    const core = readCore()
    const orders = Array.isArray(core.transactionHistory) ? core.transactionHistory : []
    const orderBadge = document.querySelector('[data-order-count]')
    const favBadge = document.querySelector('[data-fav-count]')
    if (orderBadge) {
      orderBadge.hidden = !orders.length
      orderBadge.textContent = Math.min(99, orders.length)
    }
    if (favBadge) {
      favBadge.hidden = !meta.favorites.length
      favBadge.textContent = Math.min(99, meta.favorites.length)
    }
  }

  function closeOverlay() {
    document.querySelector('#v2-overlay')?.remove()
  }

  function overlayShell(content, mode = '') {
    closeOverlay()
    const overlay = document.createElement('div')
    overlay.id = 'v2-overlay'
    overlay.className = `v2-overlay ${mode}`
    overlay.innerHTML = `<section class="v2-sheet">${content}</section>`
    overlay.addEventListener('click', event => {
      if (event.target === overlay || event.target.closest('[data-v2-close]')) closeOverlay()
    })
    document.body.appendChild(overlay)
    return overlay
  }

  function openFavorites() {
    const cards = meta.favorites.length ? meta.favorites.map(item => `
      <article class="favorite-row" data-favorite-id="${item.id}">
        <img src="${item.image}" alt="${item.name}">
        <div><small>${item.store}</small><strong>${item.name}</strong><span>${item.price}</span></div>
        <div class="favorite-actions">
          <button type="button" data-find-favorite="${item.id}">Lihat</button>
          <button type="button" class="remove" data-remove-favorite="${item.id}">×</button>
        </div>
      </article>
    `).join('') : `<div class="v2-empty"><span>♡</span><strong>Favorit masih kosong</strong><p>Tap ikon hati di produk yang pengin kamu simpan.</p></div>`

    const overlay = overlayShell(`
      <header class="v2-sheet-head"><div><small>${VERSION}</small><h2>♥ Favorit Kamu</h2><p>${meta.favorites.length} produk tersimpan di device ini.</p></div><button data-v2-close>×</button></header>
      <div class="favorite-list">${cards}</div>
    `, 'favorites-mode')

    overlay.addEventListener('click', event => {
      const remove = event.target.closest('[data-remove-favorite]')
      if (remove) {
        meta.favorites = meta.favorites.filter(item => item.id !== remove.dataset.removeFavorite)
        saveMeta(); openFavorites(); enhanceProductCards(); updateNavBadges(); return
      }
      const find = event.target.closest('[data-find-favorite]')
      if (find) {
        const item = favoriteById(find.dataset.findFavorite)
        if (!item) return
        closeOverlay()
        document.querySelector(`.store-tab[data-store="${item.store}"]`)?.click()
        setTimeout(() => {
          const input = document.querySelector('#search-input')
          if (!input) return
          input.value = item.name
          input.dispatchEvent(new Event('input', { bubbles: true }))
          document.querySelector('.marketplace')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 120)
      }
    })
  }

  function openProfile() {
    processCheckoutRewards()
    const core = readCore()
    const lvl = levelInfo()
    const orders = Array.isArray(core.transactionHistory) ? core.transactionHistory.length : 0
    overlayShell(`
      <header class="v2-sheet-head"><div><small>V2 CORE</small><h2>◉ Profil KALAP</h2><p>Progress dan reward tersimpan di device ini.</p></div><button data-v2-close>×</button></header>
      <div class="profile-hero">
        <div class="profile-avatar">K!</div>
        <div><small>LEVEL ${lvl.level}</small><h3>KALAP Shopper</h3><span>🔥 ${Number(core.streak) || 0} day streak</span></div>
      </div>
      <div class="xp-card"><div><span>XP ${lvl.current}/${lvl.target}</span><strong>Level ${lvl.level}</strong></div><div class="xp-track"><i style="width:${lvl.percent}%"></i></div></div>
      <div class="profile-stats">
        <div><small>KALAP Coins</small><strong>🪙 ${meta.coins.toLocaleString('id-ID')}</strong></div>
        <div><small>Total checkout</small><strong>${orders}</strong></div>
        <div><small>Total dibelanjakan</small><strong>${money(core.lifetimeSpent)}</strong></div>
        <div><small>Favorit</small><strong>${meta.favorites.length}</strong></div>
      </div>
      <div class="v2-info-card"><strong>🎁 Reward system aktif</strong><p>Setiap checkout menambah XP dan KALAP Coins. Login harian juga memberi +100 Coins.</p></div>
    `, 'profile-mode')
  }

  function injectShareReceipt() {
    const success = document.querySelector('.checkout-modal .success-wallet')
    if (!success || document.querySelector('.v2-share-receipt')) return
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'v2-share-receipt'
    button.textContent = '↗ Bagikan Checkout'
    button.addEventListener('click', async () => {
      const core = readCore()
      const text = `KALAP! hari ini: ${money(core.dailySpent)} dibelanjakan, sisa wallet ${money(core.walletBalance)}. 🔥`
      try {
        if (navigator.share) await navigator.share({ title: 'KALAP!', text })
        else if (navigator.clipboard) { await navigator.clipboard.writeText(text); toast('Teks checkout disalin') }
      } catch {}
    })
    success.insertAdjacentElement('afterend', button)
  }

  function polishVersionLabel() {
    document.querySelectorAll('.brand-sub').forEach(node => { node.textContent = 'v1.2 · commerce' })
    document.querySelectorAll('.hero .eyebrow').forEach(node => {
      if (node.textContent.includes('V1.1')) node.textContent = 'V1.2 · COMMERCE MODE'
    })
    document.querySelectorAll('footer strong').forEach(node => {
      if (node.textContent.includes('KALAP!')) node.textContent = 'KALAP! v1.2'
    })
  }

  function enhance() {
    processCheckoutRewards()
    polishVersionLabel()
    enhanceProductCards()
    injectSortControls()
    injectBottomNav()
    injectShareReceipt()
    updateNavBadges()
  }

  function scheduleEnhance() {
    if (enhanceQueued) return
    enhanceQueued = true
    requestAnimationFrame(() => {
      enhanceQueued = false
      enhance()
    })
  }

  const observer = new MutationObserver(scheduleEnhance)
  observer.observe(document.documentElement, { childList: true, subtree: true })

  window.addEventListener('storage', scheduleEnhance)
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeOverlay() })

  setInterval(() => {
    const core = readCore()
    const orders = Array.isArray(core.transactionHistory) ? core.transactionHistory : []
    const fingerprint = orders.map(order => order.id).join('|')
    if (fingerprint !== lastOrderFingerprint) {
      lastOrderFingerprint = fingerprint
      processCheckoutRewards()
      scheduleEnhance()
    }
  }, 1500)

  awardDailyBonus()
  scheduleEnhance()
})()
