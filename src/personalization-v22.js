import { catalog, storefronts } from './data/catalog-v12.js'

(() => {
  const CORE_KEY = 'kalap-v1'
  const META_KEY = 'kalap-v2-meta'
  const RECENT_KEY = 'kalap-v21-recent'
  const SEARCH_KEY = 'kalap-v22-search-history'
  const COLLECTION_KEY = 'kalap-v22-collections'
  const NOTIF_KEY = 'kalap-v22-notifications'
  const NOTIF_SEEN_KEY = 'kalap-v22-notifications-seen'
  const MAX_SEARCH = 10
  let lastStore = null
  let lastHomeFingerprint = ''
  let lastNotifFingerprint = ''

  const money = value => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(Number(value) || 0)

  const esc = value => String(value ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;')

  function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) }
    catch { return fallback }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value))
  }

  function activeStore() {
    return document.querySelector('.store-tab.active')?.dataset.store || 'makanan'
  }

  function getProduct(store, id) {
    return (catalog[store] || []).find(product => product.id === id)
  }

  function storeInfo(key) {
    return storefronts.find(store => store.key === key) || { key, label:key, icon:'🛍️' }
  }

  function allProducts() {
    return storefronts.flatMap(store => (catalog[store.key] || []).map(product => ({ ...product, store:store.key })))
  }

  function hash(text) {
    return [...String(text)].reduce((sum, char) => ((sum * 31) + char.charCodeAt(0)) >>> 0, 17)
  }

  function toast(text) {
    document.querySelector('.v22-toast')?.remove()
    const node = document.createElement('div')
    node.className = 'v22-toast'
    node.textContent = text
    document.body.appendChild(node)
    setTimeout(() => node.remove(), 1800)
  }

  function defaultCollections() {
    return [
      { id:'incaran', name:'Incaran', icon:'🔥', items:[] },
      { id:'nanti', name:'Beli Nanti', icon:'⏰', items:[] },
      { id:'gift', name:'Gift Ideas', icon:'🎁', items:[] },
    ]
  }

  function collections() {
    const saved = readJSON(COLLECTION_KEY, null)
    if (Array.isArray(saved) && saved.length) return saved
    const initial = defaultCollections()
    writeJSON(COLLECTION_KEY, initial)
    return initial
  }

  function saveCollections(next) {
    writeJSON(COLLECTION_KEY, next)
    updateCollectionBadge()
  }

  function collectionItemCount() {
    return collections().reduce((sum, collection) => sum + (collection.items?.length || 0), 0)
  }

  function searchHistory() {
    return readJSON(SEARCH_KEY, [])
  }

  function rememberSearch(query) {
    const q = String(query || '').trim()
    if (q.length < 2) return
    const next = [q, ...searchHistory().filter(item => item.toLowerCase() !== q.toLowerCase())].slice(0, MAX_SEARCH)
    writeJSON(SEARCH_KEY, next)
    renderSearchHistory()
  }

  function clearSearchHistory() {
    writeJSON(SEARCH_KEY, [])
    renderSearchHistory()
  }

  function currentRecent() {
    return readJSON(RECENT_KEY, [])
  }

  function currentCore() {
    return readJSON(CORE_KEY, {})
  }

  function currentMeta() {
    return readJSON(META_KEY, {})
  }

  function scoreStores() {
    const scores = Object.fromEntries(storefronts.map(store => [store.key, 0]))
    const core = currentCore()
    const meta = currentMeta()
    const recent = currentRecent()

    ;(core.transactionHistory || []).forEach(order => {
      scores[order.store] = (scores[order.store] || 0) + 5
    })
    ;(meta.favorites || []).forEach(item => {
      scores[item.store] = (scores[item.store] || 0) + 3
    })
    recent.forEach((item, index) => {
      scores[item.store] = (scores[item.store] || 0) + Math.max(1, 4 - Math.floor(index / 3))
    })
    collections().forEach(collection => {
      ;(collection.items || []).forEach(item => {
        scores[item.store] = (scores[item.store] || 0) + 2
      })
    })
    return scores
  }

  function pickPersonalizedProducts(limit = 8) {
    const scores = scoreStores()
    const rankedStores = Object.entries(scores).sort((a,b) => b[1] - a[1]).map(([key]) => key)
    const recentIds = new Set(currentRecent().map(item => `${item.store}:${item.id}`))
    const selected = []

    rankedStores.forEach((store, storeIndex) => {
      if (selected.length >= limit) return
      const pool = (catalog[store] || []).filter(item => !recentIds.has(`${store}:${item.id}`))
      const seed = hash(`${store}-${new Date().toDateString()}-${storeIndex}`)
      const start = pool.length ? seed % pool.length : 0
      for (let offset = 0; offset < Math.min(3, pool.length) && selected.length < limit; offset += 1) {
        const item = pool[(start + offset) % pool.length]
        if (item && !selected.some(existing => existing.id === item.id && existing.store === store)) {
          selected.push({ ...item, store })
        }
      }
    })

    if (selected.length < limit) {
      allProducts().forEach(item => {
        if (selected.length >= limit) return
        if (!selected.some(existing => existing.id === item.id && existing.store === item.store)) selected.push(item)
      })
    }
    return selected.slice(0, limit)
  }

  function continueShoppingItems() {
    const core = currentCore()
    const result = []
    const seen = new Set()

    storefronts.forEach(store => {
      ;(core.carts?.[store.key] || []).forEach(item => {
        const key = `${store.key}:${item.id}`
        if (seen.has(key)) return
        seen.add(key)
        result.push({ ...item, store:store.key, reason:'Masih di keranjang' })
      })
    })

    currentRecent().forEach(item => {
      const key = `${item.store}:${item.id}`
      if (seen.has(key)) return
      const fresh = getProduct(item.store, item.id)
      if (!fresh) return
      seen.add(key)
      result.push({ ...fresh, store:item.store, reason:'Terakhir dilihat' })
    })

    return result.slice(0, 8)
  }

  function productCard(item, reason = '') {
    const info = storeInfo(item.store)
    return `<button class="v22-product-mini" data-v22-product="${item.store}:${item.id}">
      <div><img src="${item.image}" alt="${esc(item.name)}"><span>${info.icon}</span></div>
      ${reason ? `<small>${esc(reason)}</small>` : `<small>${esc(info.label)}</small>`}
      <strong>${esc(item.name)}</strong>
      <b>${money(item.price)}</b>
    </button>`
  }

  function renderPersonalizedHome() {
    const marketplace = document.querySelector('.marketplace')
    if (!marketplace) return

    const scores = scoreStores()
    const fingerprint = JSON.stringify({
      recent: currentRecent().map(item => `${item.store}:${item.id}`).slice(0,10),
      carts: Object.values(currentCore().carts || {}).flat().map(item => item.id),
      fav: (currentMeta().favorites || []).map(item => `${item.store}:${item.id}`),
      collections: collections().map(c => [c.id, c.items?.length || 0]),
      store: activeStore(),
    })
    if (fingerprint === lastHomeFingerprint && document.querySelector('.v22-personalized')) return
    lastHomeFingerprint = fingerprint

    document.querySelector('.v22-personalized')?.remove()
    document.querySelector('.v2-recommendations')?.remove()

    const continueItems = continueShoppingItems()
    const recommendations = pickPersonalizedProducts(8)
    const topStore = Object.entries(scores).sort((a,b) => b[1]-a[1])[0]?.[0] || 'makanan'
    const topInfo = storeInfo(topStore)

    const section = document.createElement('section')
    section.className = 'v22-personalized'
    section.innerHTML = `
      ${continueItems.length ? `<section class="v22-home-block continue"><div class="v22-block-head"><div><small>CONTINUE SHOPPING</small><h2>Lanjut dari tadi</h2><p>Produk dari keranjang dan yang terakhir kamu lihat.</p></div></div><div class="v22-product-strip">${continueItems.map(item => productCard(item,item.reason)).join('')}</div></section>` : ''}
      <section class="v22-home-block foryou"><div class="v22-block-head"><div><small>FOR YOU</small><h2>✨ Pilihan buat kamu</h2><p>Lebih banyak ${topInfo.label.toLowerCase()} berdasarkan aktivitas di device ini.</p></div><button type="button" data-v22-refresh-rec>Acak ulang</button></div><div class="v22-product-strip">${recommendations.map(item => productCard(item)).join('')}</div></section>
    `
    marketplace.insertAdjacentElement('beforebegin', section)
  }

  function dispatchOpenProduct(store, id) {
    const storeButton = document.querySelector(`.store-tab[data-store="${store}"]`)
    if (storeButton && !storeButton.classList.contains('active')) storeButton.click()
    setTimeout(() => {
      const input = document.querySelector('#search-input')
      const product = getProduct(store,id)
      if (!product || !input) return
      input.value = product.name
      input.dispatchEvent(new Event('input', { bubbles:true }))
      setTimeout(() => {
        const card = [...document.querySelectorAll('.product-card')].find(card => card.querySelector('[data-action="add"]')?.dataset.id === id)
        card?.click()
      }, 100)
    }, 100)
  }

  function renderSearchHistory() {
    const searchBox = document.querySelector('.search-box')
    const input = document.querySelector('#search-input')
    if (!searchBox || !input) return

    let panel = searchBox.querySelector('.v22-search-history')
    if (!panel) {
      panel = document.createElement('div')
      panel.className = 'v22-search-history'
      searchBox.appendChild(panel)
    }

    const history = searchHistory()
    panel.innerHTML = history.length ? `
      <div class="v22-search-head"><strong>Pencarian terakhir</strong><button type="button" data-v22-clear-search>Hapus</button></div>
      <div class="v22-search-chips">${history.map(query => `<button type="button" data-v22-search-query="${esc(query)}">↗ ${esc(query)}</button>`).join('')}</div>
    ` : `<div class="v22-search-empty">Cari produk, brand, atau menu favoritmu.</div>`
    panel.hidden = true
  }

  function enhanceSearch() {
    const input = document.querySelector('#search-input')
    if (!input || input.dataset.v22Search) return
    input.dataset.v22Search = 'true'
    renderSearchHistory()

    input.addEventListener('focus', () => {
      const panel = document.querySelector('.v22-search-history')
      if (panel && !input.value.trim()) panel.hidden = false
    })
    input.addEventListener('blur', () => {
      setTimeout(() => {
        const panel = document.querySelector('.v22-search-history')
        if (panel) panel.hidden = true
      }, 160)
    })
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        rememberSearch(input.value)
        document.querySelector('.v22-search-history')?.setAttribute('hidden','')
      }
    })
  }

  function ensureCollectionsButton() {
    const topActions = document.querySelector('.top-actions')
    if (!topActions || topActions.querySelector('[data-v22-collections]')) return
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'utility-button v22-collection-button'
    button.dataset.v22Collections = 'true'
    button.innerHTML = `🔖 <span>Koleksi</span><b data-v22-collection-count hidden></b>`
    topActions.insertBefore(button, topActions.firstChild)
    updateCollectionBadge()
  }

  function ensureNotificationButton() {
    const topActions = document.querySelector('.top-actions')
    if (!topActions || topActions.querySelector('[data-v22-notifications]')) return
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'utility-button v22-notification-button'
    button.dataset.v22Notifications = 'true'
    button.innerHTML = `🔔 <span>Inbox</span><b data-v22-notification-count hidden></b>`
    topActions.insertBefore(button, topActions.firstChild)
    updateNotificationBadge()
  }

  function updateCollectionBadge() {
    const count = collectionItemCount()
    document.querySelectorAll('[data-v22-collection-count]').forEach(node => {
      node.hidden = count === 0
      node.textContent = Math.min(99,count)
    })
  }

  function notificationCandidates() {
    const core = currentCore()
    const meta = currentMeta()
    const now = Date.now()
    const items = []
    const activeOrders = (core.transactionHistory || []).filter(order => {
      if (order.cancelledAt) return false
      const elapsed = (now - new Date(order.date).getTime()) / 1000
      return elapsed < (order.store === 'makanan' ? 105 : 200)
    })

    activeOrders.slice(0,3).forEach(order => {
      items.push({
        id:`order:${order.id}`,
        icon:order.store === 'makanan' ? '🛵' : '🚚',
        title:order.store === 'makanan' ? 'Pesanan makanan sedang berjalan' : 'Paketmu sedang diproses',
        text:`${storeInfo(order.store).label} · ${money(order.amount)}`,
        type:'orders',
        created:new Date(order.date).getTime(),
      })
    })

    if ((core.walletBalance || 0) < 5_000_000) {
      items.push({ id:`wallet:${core.walletDate}`, icon:'💳', title:'KALAP Wallet mulai tipis', text:`Sisa ${money(core.walletBalance)} hari ini.`, type:'wallet', created:now-1000 })
    }

    const missionReady = document.querySelector('[data-mission-dot]')?.textContent?.includes('reward siap')
    if (missionReady) items.push({ id:`mission:${new Date().toDateString()}`, icon:'✅', title:'Daily Mission siap diklaim', text:'Ada KALAP Coins yang menunggu.', type:'rewards', created:now-2000 })

    const flashBlock = Math.floor(new Date().getHours()/3)
    items.push({ id:`flash:${new Date().toDateString()}:${flashBlock}`, icon:'⚡', title:'Flash Picks baru tersedia', text:'Cek pilihan baru sebelum time window berganti.', type:'flash', created:now-3000 })

    if ((meta.coins || 0) >= 300) items.push({ id:`mystery:${Math.floor((meta.coins||0)/300)}`, icon:'🎁', title:'Mystery Box bisa dibuka', text:`Kamu punya ${(meta.coins||0).toLocaleString('id-ID')} KALAP Coins.`, type:'mystery', created:now-4000 })

    return items.sort((a,b)=>b.created-a.created).slice(0,12)
  }

  function notifications() {
    const dynamic = notificationCandidates()
    writeJSON(NOTIF_KEY,dynamic)
    return dynamic
  }

  function seenNotifications() {
    return new Set(readJSON(NOTIF_SEEN_KEY, []))
  }

  function markAllNotificationsRead() {
    writeJSON(NOTIF_SEEN_KEY, notifications().map(item=>item.id))
    updateNotificationBadge()
  }

  function updateNotificationBadge() {
    const list = notifications()
    const seen = seenNotifications()
    const unread = list.filter(item=>!seen.has(item.id)).length
    document.querySelectorAll('[data-v22-notification-count]').forEach(node => {
      node.hidden = unread === 0
      node.textContent = Math.min(99, unread)
    })
  }

  function closeV22Overlay() {
    document.querySelector('#v22-overlay')?.remove()
  }

  function createV22Overlay(content, mode='') {
    closeV22Overlay()
    const overlay = document.createElement('div')
    overlay.id = 'v22-overlay'
    overlay.className = `v22-overlay ${mode}`
    overlay.innerHTML = `<section class="v22-sheet">${content}</section>`
    overlay.addEventListener('click', event => {
      if (event.target === overlay || event.target.closest('[data-v22-close]')) closeV22Overlay()
    })
    document.body.appendChild(overlay)
    return overlay
  }

  function openNotifications() {
    const list = notifications()
    const seen = seenNotifications()
    const overlay = createV22Overlay(`
      <header class="v22-sheet-head"><div><small>V2.2 · INBOX</small><h2>🔔 Notifikasi</h2><p>Update lokal dari aktivitas KALAP di device ini.</p></div><button data-v22-close>×</button></header>
      <div class="v22-inbox-tools"><span>${list.filter(item=>!seen.has(item.id)).length} belum dibaca</span><button type="button" data-v22-read-all>Tandai dibaca</button></div>
      <div class="v22-inbox-list">${list.length ? list.map(item=>`<button class="v22-inbox-item ${seen.has(item.id)?'read':'unread'}" data-v22-notif-type="${item.type}"><span>${item.icon}</span><div><strong>${esc(item.title)}</strong><p>${esc(item.text)}</p></div><i></i></button>`).join('') : '<div class="v22-empty"><span>🔔</span><strong>Inbox kosong</strong><p>Update baru akan muncul di sini.</p></div>'}</div>
    `,'inbox')
    overlay.addEventListener('click', event => {
      if (event.target.closest('[data-v22-read-all]')) {
        markAllNotificationsRead(); openNotifications(); return
      }
      const item = event.target.closest('[data-v22-notif-type]')
      if (!item) return
      markAllNotificationsRead()
      const type = item.dataset.v22NotifType
      closeV22Overlay()
      if (type === 'orders') document.querySelector('[data-action="open-orders"]')?.click()
      if (type === 'rewards') document.querySelector('[data-v2-nav="rewards"]')?.click()
      if (type === 'flash') document.querySelector('[data-v2-feature="flash"]')?.click()
      if (type === 'mystery') document.querySelector('[data-v2-feature="mystery"]')?.click()
    })
    markAllNotificationsRead()
  }

  function openCollections() {
    const list = collections()
    const overlay = createV22Overlay(`
      <header class="v22-sheet-head"><div><small>V2.2 · WISHLIST</small><h2>🔖 Koleksi</h2><p>Simpan produk ke wishlist yang berbeda.</p></div><button data-v22-close>×</button></header>
      <div class="v22-collection-create"><input data-v22-new-collection maxlength="22" placeholder="Nama koleksi baru"><button type="button" data-v22-create-collection>+ Buat</button></div>
      <div class="v22-collection-list">${list.map(collection=>`<button class="v22-collection-card" data-v22-open-collection="${collection.id}"><span>${collection.icon || '🔖'}</span><div><strong>${esc(collection.name)}</strong><small>${collection.items?.length || 0} produk</small></div><b>›</b></button>`).join('')}</div>
    `,'collections')
    overlay.addEventListener('click', event => {
      if (event.target.closest('[data-v22-create-collection]')) {
        const input = overlay.querySelector('[data-v22-new-collection]')
        const name = input.value.trim()
        if (!name) return
        const next = collections()
        next.push({ id:`custom-${Date.now()}`, name, icon:'🔖', items:[] })
        saveCollections(next)
        openCollections(); return
      }
      const card = event.target.closest('[data-v22-open-collection]')
      if (card) openCollectionDetail(card.dataset.v22OpenCollection)
    })
  }

  function openCollectionDetail(id) {
    const collection = collections().find(item=>item.id===id)
    if (!collection) return openCollections()
    const overlay = createV22Overlay(`
      <header class="v22-sheet-head"><div><small>WISHLIST</small><h2>${collection.icon || '🔖'} ${esc(collection.name)}</h2><p>${collection.items?.length || 0} produk tersimpan.</p></div><button data-v22-close>×</button></header>
      <div class="v22-collection-detail">${collection.items?.length ? collection.items.map(item=>`<article><img src="${item.image}" alt=""><div><small>${esc(storeInfo(item.store).label)}</small><strong>${esc(item.name)}</strong><span>${money(item.price)}</span></div><div><button data-v22-view-col="${item.store}:${item.id}">Lihat</button><button class="remove" data-v22-remove-col="${item.store}:${item.id}">×</button></div></article>`).join('') : '<div class="v22-empty"><span>🔖</span><strong>Koleksi masih kosong</strong><p>Buka detail produk lalu pilih “Simpan ke Koleksi”.</p></div>'}</div>
    `,'collection-detail')
    overlay.addEventListener('click', event => {
      const view = event.target.closest('[data-v22-view-col]')
      if (view) {
        const [store,pid] = view.dataset.v22ViewCol.split(':')
        closeV22Overlay(); dispatchOpenProduct(store,pid); return
      }
      const remove = event.target.closest('[data-v22-remove-col]')
      if (remove) {
        const [store,pid] = remove.dataset.v22RemoveCol.split(':')
        const next = collections().map(item => item.id===id ? { ...item, items:(item.items||[]).filter(product=>!(product.store===store&&product.id===pid)) } : item)
        saveCollections(next); openCollectionDetail(id)
      }
    })
  }

  function currentDetailProduct() {
    const overlay = document.querySelector('#v21-product-overlay')
    const name = overlay?.querySelector('.v21-title-block h1')?.textContent?.trim()
    if (!name) return null
    for (const store of storefronts) {
      const product = (catalog[store.key] || []).find(item=>item.name===name)
      if (product) return { ...product, store:store.key }
    }
    return null
  }

  function enhanceProductDetail() {
    const detail = document.querySelector('#v21-product-overlay')
    if (!detail || detail.querySelector('[data-v22-save-collection]')) return
    const seller = detail.querySelector('.v21-seller')
    if (!seller) return
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'v22-save-collection'
    button.dataset.v22SaveCollection = 'true'
    button.innerHTML = '🔖 <span>Simpan ke Koleksi</span>'
    seller.insertAdjacentElement('afterend',button)
  }

  function openSaveToCollection(product) {
    if (!product) return
    const list = collections()
    const overlay = createV22Overlay(`
      <header class="v22-sheet-head"><div><small>SIMPAN PRODUK</small><h2>🔖 Pilih Koleksi</h2><p>${esc(product.name)}</p></div><button data-v22-close>×</button></header>
      <div class="v22-save-list">${list.map(collection=>{
        const saved = (collection.items||[]).some(item=>item.id===product.id&&item.store===product.store)
        return `<button data-v22-save-to="${collection.id}" class="${saved?'saved':''}"><span>${collection.icon || '🔖'}</span><div><strong>${esc(collection.name)}</strong><small>${collection.items?.length || 0} produk</small></div><b>${saved?'✓':'+'}</b></button>`
      }).join('')}</div>
    `,'save-collection')
    overlay.addEventListener('click', event => {
      const target = event.target.closest('[data-v22-save-to]')
      if (!target) return
      const next = collections().map(collection => {
        if (collection.id !== target.dataset.v22SaveTo) return collection
        const exists = (collection.items||[]).some(item=>item.id===product.id&&item.store===product.store)
        return {
          ...collection,
          items: exists
            ? collection.items.filter(item=>!(item.id===product.id&&item.store===product.store))
            : [{ id:product.id, store:product.store, name:product.name, image:product.image, price:product.price }, ...(collection.items||[])].slice(0,60),
        }
      })
      saveCollections(next)
      toast(target.classList.contains('saved') ? 'Dihapus dari koleksi' : 'Disimpan ke koleksi')
      openSaveToCollection(product)
    })
  }

  document.addEventListener('click', event => {
    if (event.target.closest('[data-v22-notifications]')) { openNotifications(); return }
    if (event.target.closest('[data-v22-collections]')) { openCollections(); return }
    if (event.target.closest('[data-v22-save-collection]')) { openSaveToCollection(currentDetailProduct()); return }

    const product = event.target.closest('[data-v22-product]')
    if (product) {
      const [store,id] = product.dataset.v22Product.split(':')
      dispatchOpenProduct(store,id); return
    }

    const query = event.target.closest('[data-v22-search-query]')
    if (query) {
      const input = document.querySelector('#search-input')
      if (input) {
        input.value = query.dataset.v22SearchQuery
        input.dispatchEvent(new Event('input',{bubbles:true}))
        rememberSearch(query.dataset.v22SearchQuery)
        input.focus()
      }
      return
    }

    if (event.target.closest('[data-v22-clear-search]')) { clearSearchHistory(); return }
    if (event.target.closest('[data-v22-refresh-rec]')) {
      lastHomeFingerprint = ''
      renderPersonalizedHome(); return
    }
  }, true)

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeV22Overlay()
  })

  function updateVersion() {
    document.title = 'KALAP! V2.2 — Personalized Commerce'
    document.querySelectorAll('.brand-sub').forEach(node => node.textContent = 'V2.2 · personalized')
    document.querySelectorAll('footer strong').forEach(node => { if (node.textContent.includes('KALAP!')) node.textContent = 'KALAP! V2.2' })
  }

  function enhance() {
    updateVersion()
    ensureNotificationButton()
    ensureCollectionsButton()
    enhanceSearch()
    enhanceProductDetail()
    renderPersonalizedHome()
    updateCollectionBadge()

    const notifFingerprint = JSON.stringify(notificationCandidates().map(item=>item.id))
    if (notifFingerprint !== lastNotifFingerprint) {
      lastNotifFingerprint = notifFingerprint
      updateNotificationBadge()
    }

    const store = activeStore()
    if (store !== lastStore) {
      lastStore = store
      setTimeout(renderSearchHistory,80)
    }
  }

  setInterval(enhance,600)
  enhance()
})()
