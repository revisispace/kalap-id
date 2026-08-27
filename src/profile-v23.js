(() => {
  const CORE_KEY = 'kalap-v1'
  const META_KEY = 'kalap-v2-meta'
  const PROFILE_KEY = 'kalap-v23-profile'
  const RECENT_KEY = 'kalap-v21-recent'
  const COLLECTION_KEY = 'kalap-v22-collections'

  const money = value => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(Number(value) || 0)

  const readJSON = (key, fallback = {}) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) }
    catch { return fallback }
  }

  const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value))

  const esc = value => String(value ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;')

  function profileData() {
    const saved = readJSON(PROFILE_KEY, {})
    return {
      name: saved.name || 'KALAP Shopper',
      avatar: saved.avatar || '😎',
      bio: saved.bio || 'Belanja dulu. Nyesel belakangan.',
    }
  }

  function membership(spent) {
    if (spent >= 75_000_000) return { name:'KALAP BLACK', icon:'◆', min:75_000_000, next:null, multiplier:'1.5×' }
    if (spent >= 30_000_000) return { name:'KALAP GOLD', icon:'★', min:30_000_000, next:75_000_000, multiplier:'1.25×' }
    if (spent >= 10_000_000) return { name:'KALAP SILVER', icon:'◇', min:10_000_000, next:30_000_000, multiplier:'1.1×' }
    return { name:'KALAP STARTER', icon:'○', min:0, next:10_000_000, multiplier:'1×' }
  }

  function membershipProgress(spent, tier) {
    if (!tier.next) return 100
    return Math.max(0, Math.min(100, ((spent - tier.min) / (tier.next - tier.min)) * 100))
  }

  function categoryStats(orders) {
    const labels = {
      makanan:['🍜','Makanan'], pakaian:['👕','Pakaian'], sepatu:['👟','Sepatu'],
      tumbler:['🥤','Tumbler'], tas:['👜','Tas'], hp:['📱','HP'],
    }
    const totals = {}
    orders.forEach(order => {
      if (order.cancelledAt) return
      totals[order.store] = (totals[order.store] || 0) + (Number(order.amount) || 0)
    })
    return Object.entries(totals)
      .sort((a,b) => b[1] - a[1])
      .map(([key,value]) => ({ key, value, icon:labels[key]?.[0] || '🛍️', label:labels[key]?.[1] || key }))
  }

  function currentSnapshot() {
    const core = readJSON(CORE_KEY, {})
    const meta = readJSON(META_KEY, {})
    const profile = profileData()
    const orders = Array.isArray(core.transactionHistory) ? core.transactionHistory : []
    const favorites = Array.isArray(meta.favorites) ? meta.favorites : []
    const recent = readJSON(RECENT_KEY, [])
    const collections = readJSON(COLLECTION_KEY, [])
    const spent = Number(core.lifetimeSpent) || 0
    const xp = Number(meta.xp) || 0
    const levelTarget = 500
    const level = Math.floor(xp / levelTarget) + 1
    const levelCurrent = xp % levelTarget
    const tier = membership(spent)
    const categories = categoryStats(orders)
    const collectionItems = Array.isArray(collections)
      ? collections.reduce((sum, collection) => sum + (collection.items?.length || 0), 0)
      : 0
    const avgOrder = orders.length ? spent / orders.length : 0

    return {
      core, meta, profile, orders, favorites, recent, collections, spent, xp,
      level, levelCurrent, levelTarget, tier, categories, collectionItems, avgOrder,
    }
  }

  function closeLegacyProfile() {
    document.querySelector('#v2-overlay.profile-mode')?.remove()
  }

  function renderPage() {
    const data = currentSnapshot()
    const tierProgress = membershipProgress(data.spent, data.tier)
    const xpProgress = (data.levelCurrent / data.levelTarget) * 100
    const maxCategory = data.categories[0]?.value || 1
    const recent = data.recent.slice(0,6)
    const achievements = Array.isArray(data.core.achievements) ? data.core.achievements.length : 0
    const wallet = Number(data.core.walletBalance) || 0
    const dailySpent = Number(data.core.dailySpent) || 0
    const dailyLimit = 20_000_000

    const page = document.createElement('section')
    page.id = 'kalap-profile-page'
    page.className = 'kalap-profile-page'
    page.setAttribute('role','main')
    page.innerHTML = `
      <div class="kp-shell">
        <header class="kp-topbar">
          <button type="button" class="kp-back" data-kp-close aria-label="Kembali">←</button>
          <div><strong>Profil</strong><small>KALAP! V2.3</small></div>
          <button type="button" class="kp-edit" data-kp-edit>Edit profil</button>
        </header>

        <main class="kp-content">
          <section class="kp-identity-card">
            <div class="kp-avatar ${data.meta.activeFrame === 'inferno' ? 'inferno' : ''}">${esc(data.profile.avatar)}</div>
            <div class="kp-identity-copy">
              <small>LEVEL ${data.level}</small>
              <h1>${esc(data.profile.name)}</h1>
              <p>${esc(data.profile.bio)}</p>
              <div class="kp-tags"><span>🔥 ${Number(data.core.streak)||0} hari streak</span><span>${data.tier.icon} ${data.tier.name}</span></div>
            </div>
            <div class="kp-level-ring" style="--kp-progress:${xpProgress}%"><strong>${data.level}</strong><small>LVL</small></div>
          </section>

          <section class="kp-money-grid">
            <article class="kp-wallet-card">
              <div class="kp-card-label"><span>💳</span><small>KALAP WALLET</small></div>
              <strong>${money(wallet)}</strong>
              <p>Terpakai hari ini ${money(dailySpent)}</p>
              <div class="kp-progress"><i style="width:${Math.min(100,(dailySpent/dailyLimit)*100)}%"></i></div>
            </article>
            <article class="kp-coins-card">
              <div class="kp-card-label"><span>🪙</span><small>KALAP COINS</small></div>
              <strong>${(Number(data.meta.coins)||0).toLocaleString('id-ID')}</strong>
              <p>Dipakai untuk booster dan Reward Shop.</p>
              <button type="button" data-kp-feature="shop">Buka Reward Shop →</button>
            </article>
          </section>

          <section class="kp-quick-section">
            <div class="kp-section-head"><div><small>AKTIVITAS</small><h2>Akun kamu</h2></div></div>
            <div class="kp-quick-grid">
              <button type="button" data-kp-destination="orders"><span>📦</span><strong>Pesanan</strong><small>${data.orders.length} checkout</small></button>
              <button type="button" data-kp-destination="favorites"><span>♥</span><strong>Favorit</strong><small>${data.favorites.length} produk</small></button>
              <button type="button" data-kp-destination="collections"><span>🔖</span><strong>Koleksi</strong><small>${data.collectionItems} produk</small></button>
              <button type="button" data-kp-destination="rewards"><span>✦</span><strong>Rewards</strong><small>Missions & bonus</small></button>
            </div>
          </section>

          <div class="kp-dashboard-grid">
            <section class="kp-panel kp-progress-panel">
              <div class="kp-section-head"><div><small>PROGRESSION</small><h2>Level & membership</h2></div></div>
              <div class="kp-progress-row"><div><strong>Level ${data.level}</strong><small>${data.levelCurrent} / ${data.levelTarget} XP</small></div><div class="kp-progress"><i style="width:${xpProgress}%"></i></div></div>
              <div class="kp-tier-card"><div><small>MEMBERSHIP</small><strong>${data.tier.icon} ${data.tier.name}</strong><span>${data.tier.multiplier} base Coin multiplier</span></div><div class="kp-progress"><i style="width:${tierProgress}%"></i></div><small>${data.tier.next ? `${money(Math.max(0,data.tier.next-data.spent))} lagi ke tier berikutnya` : 'Tier tertinggi sudah tercapai'}</small></div>
              <div class="kp-mini-stats"><div><small>Badges</small><strong>${achievements}</strong></div><div><small>XP</small><strong>${data.xp.toLocaleString('id-ID')}</strong></div><div><small>Streak</small><strong>${Number(data.core.streak)||0}d</strong></div></div>
            </section>

            <section class="kp-panel kp-stats-panel">
              <div class="kp-section-head"><div><small>INSIGHT</small><h2>Statistik kalap</h2></div></div>
              <div class="kp-stat-list">
                <div><span>Total belanja</span><strong>${money(data.spent)}</strong></div>
                <div><span>Total checkout</span><strong>${data.orders.length}</strong></div>
                <div><span>Rata-rata checkout</span><strong>${money(data.avgOrder)}</strong></div>
                <div><span>Kategori favorit</span><strong>${data.categories[0] ? `${data.categories[0].icon} ${esc(data.categories[0].label)}` : '—'}</strong></div>
              </div>
              <div class="kp-category-bars">${data.categories.length ? data.categories.slice(0,5).map(item => `<div><div><span>${item.icon} ${esc(item.label)}</span><b>${money(item.value)}</b></div><div class="kp-bar"><i style="width:${Math.max(5,(item.value/maxCategory)*100)}%"></i></div></div>`).join('') : '<p class="kp-empty-copy">Belum ada data checkout untuk dianalisis.</p>'}</div>
            </section>
          </div>

          <section class="kp-panel kp-rewards-panel">
            <div class="kp-section-head"><div><small>REWARDS</small><h2>Dopamine perks</h2></div><button type="button" data-kp-destination="rewards">Lihat semua</button></div>
            <div class="kp-reward-actions">
              <button type="button" data-kp-feature="missions"><span>✅</span><div><strong>Daily Missions</strong><small>Kumpulkan Coins tiap hari</small></div><b>›</b></button>
              <button type="button" data-kp-feature="voucher"><span>🎟️</span><div><strong>Voucher</strong><small>${Array.isArray(data.meta.activeVouchers) ? data.meta.activeVouchers.length : 0} aktif</small></div><b>›</b></button>
              <button type="button" data-kp-feature="mystery"><span>🎁</span><div><strong>Mystery Box</strong><small>Coins, XP, dan booster</small></div><b>›</b></button>
              <button type="button" data-kp-feature="leader"><span>🏆</span><div><strong>Weekly League</strong><small>Lihat ranking lokal</small></div><b>›</b></button>
            </div>
          </section>

          <section class="kp-panel kp-recent-panel">
            <div class="kp-section-head"><div><small>RECENTLY VIEWED</small><h2>Terakhir kamu lihat</h2></div></div>
            ${recent.length ? `<div class="kp-recent-strip">${recent.map(item => `<button type="button" data-kp-product="${esc(item.store)}:${esc(item.id)}"><img src="${item.image}" alt=""><div><strong>${esc(item.name)}</strong><span>${money(item.price)}</span></div></button>`).join('')}</div>` : '<div class="kp-empty-state"><span>👀</span><strong>Belum ada produk terakhir dilihat</strong><p>Produk yang kamu buka akan muncul di sini.</p></div>'}
          </section>

          <section class="kp-panel kp-settings-panel">
            <div class="kp-section-head"><div><small>SETTINGS</small><h2>Preferensi lokal</h2></div></div>
            <button type="button" data-kp-edit><span>✏️</span><div><strong>Edit profil</strong><small>Nama, avatar, dan bio hanya tersimpan di device ini.</small></div><b>›</b></button>
            <div class="kp-storage-note"><span>🔒</span><p><strong>Local-first profile.</strong> Wallet, progress, pesanan, koleksi, dan profil KALAP disimpan di browser/device ini.</p></div>
          </section>
        </main>
      </div>`

    return page
  }

  function setProfileNavActive(active) {
    document.querySelectorAll('.kalap-bottom-nav [data-v2-nav]').forEach(button => {
      button.classList.toggle('kp-nav-active', active && button.dataset.v2Nav === 'profile')
    })
  }

  function openProfilePage() {
    closeLegacyProfile()
    document.querySelector('#kalap-profile-page')?.remove()
    const page = renderPage()
    document.body.appendChild(page)
    document.body.classList.add('kalap-profile-open')
    setProfileNavActive(true)
    requestAnimationFrame(() => page.classList.add('is-visible'))
  }

  function closeProfilePage() {
    const page = document.querySelector('#kalap-profile-page')
    if (!page) return
    page.classList.remove('is-visible')
    setProfileNavActive(false)
    setTimeout(() => page.remove(), 180)
    document.body.classList.remove('kalap-profile-open')
  }

  function editProfile() {
    document.querySelector('#kp-edit-overlay')?.remove()
    const profile = profileData()
    const avatars = ['😎','🤑','🤩','🔥','🛍️','👑','🦊','🐼']
    const overlay = document.createElement('div')
    overlay.id = 'kp-edit-overlay'
    overlay.className = 'kp-edit-overlay'
    overlay.innerHTML = `<section class="kp-edit-sheet"><header><div><small>PROFIL LOKAL</small><h2>Edit profil</h2></div><button type="button" data-kp-edit-close>×</button></header><div class="kp-avatar-picker">${avatars.map(avatar => `<button type="button" data-kp-avatar="${avatar}" class="${avatar===profile.avatar?'active':''}">${avatar}</button>`).join('')}</div><label>Nama<input data-kp-name maxlength="28" value="${esc(profile.name)}"></label><label>Bio<input data-kp-bio maxlength="58" value="${esc(profile.bio)}"></label><footer><button type="button" data-kp-edit-close>Batal</button><button type="button" data-kp-save-profile>Simpan Profil</button></footer></section>`
    overlay.addEventListener('click', event => {
      if (event.target === overlay || event.target.closest('[data-kp-edit-close]')) { overlay.remove(); return }
      const avatar = event.target.closest('[data-kp-avatar]')
      if (avatar) {
        overlay.querySelectorAll('[data-kp-avatar]').forEach(button => button.classList.toggle('active', button === avatar))
        return
      }
      if (event.target.closest('[data-kp-save-profile]')) {
        const selected = overlay.querySelector('[data-kp-avatar].active')?.dataset.kpAvatar || profile.avatar
        writeJSON(PROFILE_KEY, {
          avatar: selected,
          name: overlay.querySelector('[data-kp-name]').value.trim() || 'KALAP Shopper',
          bio: overlay.querySelector('[data-kp-bio]').value.trim() || 'Belanja dulu. Nyesel belakangan.',
        })
        overlay.remove()
        openProfilePage()
      }
    })
    document.body.appendChild(overlay)
  }

  function routeDestination(destination) {
    closeProfilePage()
    setTimeout(() => {
      if (destination === 'orders') document.querySelector('[data-action="open-orders"]')?.click()
      if (destination === 'favorites') document.querySelector('[data-v2-nav="favorites"]')?.click()
      if (destination === 'collections') document.querySelector('[data-v22-collections]')?.click()
      if (destination === 'rewards') document.querySelector('[data-v2-nav="rewards"]')?.click()
    }, 190)
  }

  function routeFeature(feature) {
    closeProfilePage()
    setTimeout(() => document.querySelector(`[data-v2-feature="${feature}"]`)?.click(), 190)
  }

  function openProductFromProfile(value) {
    const [store,id] = String(value).split(':')
    closeProfilePage()
    const storeButton = document.querySelector(`.store-tab[data-store="${store}"]`)
    setTimeout(() => {
      storeButton?.click()
      setTimeout(() => {
        const card = [...document.querySelectorAll('.product-card')].find(node => node.querySelector('[data-action="add"]')?.dataset.id === id)
        if (card) { card.scrollIntoView({ behavior:'smooth', block:'center' }); card.click() }
      }, 150)
    }, 190)
  }

  document.addEventListener('click', event => {
    const nav = event.target.closest('[data-v2-nav]')
    const pageOpen = Boolean(document.querySelector('#kalap-profile-page'))

    if (nav?.dataset.v2Nav === 'profile') {
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      openProfilePage()
      return
    }

    if (pageOpen && nav) {
      closeProfilePage()
      return
    }

    if (event.target.closest('[data-kp-close]')) { closeProfilePage(); return }
    if (event.target.closest('[data-kp-edit]')) { editProfile(); return }

    const destination = event.target.closest('[data-kp-destination]')
    if (destination) { routeDestination(destination.dataset.kpDestination); return }

    const feature = event.target.closest('[data-kp-feature]')
    if (feature) { routeFeature(feature.dataset.kpFeature); return }

    const product = event.target.closest('[data-kp-product]')
    if (product) { openProductFromProfile(product.dataset.kpProduct); return }
  }, true)

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (document.querySelector('#kp-edit-overlay')) document.querySelector('#kp-edit-overlay')?.remove()
      else if (document.querySelector('#kalap-profile-page')) closeProfilePage()
    }
  })

  window.addEventListener('storage', () => {
    if (document.querySelector('#kalap-profile-page')) openProfilePage()
  })
})()
