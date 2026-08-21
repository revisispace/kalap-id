import { catalog, storefronts } from './data/catalog-v12.js'

(() => {
  const CORE_KEY = 'kalap-v1'
  const META_KEY = 'kalap-v2-meta'
  const VERSION = 'V2.0'

  const money = value => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(Number(value) || 0)

  const defaultMeta = () => ({
    favorites: [],
    coins: 0,
    xp: 0,
    processedOrders: [],
    dailyBonusDate: null,
    voucherClaims: {},
    activeVouchers: [],
    mystery: {},
    mysteryHistory: [],
    missionClaims: {},
    inventory: [],
    activeTitle: 'KALAP Shopper',
    activeFrame: 'default',
    boosters: { xp2x: 0, coin2x: 0, mysteryKey: 0 },
    flashBoost: null,
    v2RewardedOrders: [],
  })

  function readCore() {
    try { return JSON.parse(localStorage.getItem(CORE_KEY) || '{}') }
    catch { return {} }
  }

  function readMeta() {
    try {
      const saved = JSON.parse(localStorage.getItem(META_KEY) || '{}')
      const base = defaultMeta()
      return {
        ...base,
        ...saved,
        favorites: Array.isArray(saved.favorites) ? saved.favorites : [],
        processedOrders: Array.isArray(saved.processedOrders) ? saved.processedOrders : [],
        activeVouchers: Array.isArray(saved.activeVouchers) ? saved.activeVouchers : [],
        mysteryHistory: Array.isArray(saved.mysteryHistory) ? saved.mysteryHistory : [],
        inventory: Array.isArray(saved.inventory) ? saved.inventory : [],
        v2RewardedOrders: Array.isArray(saved.v2RewardedOrders) ? saved.v2RewardedOrders : [],
        voucherClaims: saved.voucherClaims && typeof saved.voucherClaims === 'object' ? saved.voucherClaims : {},
        mystery: saved.mystery && typeof saved.mystery === 'object' ? saved.mystery : {},
        missionClaims: saved.missionClaims && typeof saved.missionClaims === 'object' ? saved.missionClaims : {},
        boosters: { ...base.boosters, ...(saved.boosters || {}) },
        coins: Number(saved.coins) || 0,
        xp: Number(saved.xp) || 0,
      }
    } catch { return defaultMeta() }
  }

  let meta = readMeta()
  let refreshTimer = null
  let lastOrderFingerprint = ''

  function saveMeta() {
    localStorage.setItem(META_KEY, JSON.stringify(meta))
  }

  function dateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  }

  function weekKey(date = new Date()) {
    const start = new Date(date.getFullYear(), 0, 1)
    const days = Math.floor((date - start) / 86400000)
    return `${date.getFullYear()}-W${String(Math.ceil((days + start.getDay() + 1) / 7)).padStart(2,'0')}`
  }

  function hash(text) {
    return [...String(text)].reduce((acc, char) => ((acc * 31) + char.charCodeAt(0)) >>> 0, 2166136261)
  }

  function seededPick(items, count, seedText) {
    const pool = [...items]
    let seed = hash(seedText)
    const picked = []
    while (pool.length && picked.length < count) {
      seed = (seed * 1664525 + 1013904223) >>> 0
      const index = seed % pool.length
      picked.push(pool.splice(index, 1)[0])
    }
    return picked
  }

  function allProducts() {
    return storefronts.flatMap(store => (catalog[store.key] || []).map(product => ({ ...product, store: store.key })))
  }

  function storeInfo(key) {
    return storefronts.find(store => store.key === key) || { key, label: key, icon: '🛍️' }
  }

  function toast(text) {
    document.querySelector('.v2-toast')?.remove()
    const node = document.createElement('div')
    node.className = 'v2-toast'
    node.textContent = text
    document.body.appendChild(node)
    setTimeout(() => node.remove(), 1900)
  }

  function levelInfo() {
    const target = 500
    const level = Math.floor(meta.xp / target) + 1
    const current = meta.xp % target
    return { level, current, target, percent: current / target * 100 }
  }

  function membership(core = readCore()) {
    const spent = Number(core.lifetimeSpent) || 0
    if (spent >= 75_000_000) return { key:'black', name:'KALAP BLACK', icon:'◆', multiplier:1.5, daily:200, next:null, min:75_000_000 }
    if (spent >= 30_000_000) return { key:'gold', name:'KALAP GOLD', icon:'★', multiplier:1.25, daily:150, next:75_000_000, min:30_000_000 }
    if (spent >= 10_000_000) return { key:'silver', name:'KALAP SILVER', icon:'◇', multiplier:1.1, daily:125, next:30_000_000, min:10_000_000 }
    return { key:'starter', name:'KALAP STARTER', icon:'○', multiplier:1, daily:100, next:10_000_000, min:0 }
  }

  function membershipProgress(core = readCore()) {
    const tier = membership(core)
    if (!tier.next) return 100
    const spent = Number(core.lifetimeSpent) || 0
    return Math.max(0, Math.min(100, ((spent - tier.min) / (tier.next - tier.min)) * 100))
  }

  function dailyBonus() {
    const today = dateKey()
    if (meta.dailyBonusDate === today) return
    const tier = membership()
    meta.dailyBonusDate = today
    meta.coins += tier.daily
    saveMeta()
    setTimeout(() => toast(`🪙 Daily bonus +${tier.daily} Coins`), 700)
  }

  function orderDate(order) {
    return order.localDate || dateKey(new Date(order.date))
  }

  function todaysOrders(core = readCore()) {
    const today = dateKey()
    return (Array.isArray(core.transactionHistory) ? core.transactionHistory : []).filter(order => orderDate(order) === today)
  }

  function activeVoucher(id) {
    return meta.activeVouchers.find(v => v.id === id)
  }

  function consumeVoucher(id) {
    meta.activeVouchers = meta.activeVouchers.filter(v => v.id !== id)
  }

  function processCheckoutRewards() {
    const core = readCore()
    const orders = Array.isArray(core.transactionHistory) ? core.transactionHistory : []
    const known = new Set(meta.processedOrders)
    const v2Known = new Set(meta.v2RewardedOrders)
    const tier = membership(core)
    let changed = false
    let latestReward = null

    orders.slice().reverse().forEach(order => {
      if (!order?.id) return
      const amount = Number(order.amount) || 0

      if (!known.has(order.id)) {
        let xpMultiplier = 1
        let coinMultiplier = tier.multiplier
        if (activeVoucher('xp2x')) { xpMultiplier *= 2; consumeVoucher('xp2x') }
        if (activeVoucher('coin2x')) { coinMultiplier *= 2; consumeVoucher('coin2x') }
        if ((meta.boosters.xp2x || 0) > 0) { xpMultiplier *= 2; meta.boosters.xp2x -= 1 }
        if ((meta.boosters.coin2x || 0) > 0) { coinMultiplier *= 2; meta.boosters.coin2x -= 1 }

        const xpGain = Math.round(Math.max(20, amount / 100000) * xpMultiplier)
        const coinGain = Math.round(Math.max(5, amount / 250000) * coinMultiplier)
        let bonus = 0

        if (activeVoucher('spend300') && amount >= 3_000_000) {
          bonus += 300
          consumeVoucher('spend300')
        }

        if (meta.flashBoost && Date.now() < Number(meta.flashBoost.expires || 0) && meta.flashBoost.store === order.store) {
          bonus += 200
          meta.flashBoost = null
        }

        meta.xp += xpGain
        meta.coins += coinGain + bonus
        known.add(order.id)
        latestReward = { xpGain, coinGain: coinGain + bonus }
        changed = true
      }

      if (!v2Known.has(order.id)) {
        v2Known.add(order.id)
        changed = true
      }
    })

    if (changed) {
      meta.processedOrders = [...known].slice(-250)
      meta.v2RewardedOrders = [...v2Known].slice(-250)
      saveMeta()
      if (latestReward) setTimeout(() => toast(`+${latestReward.xpGain} XP · +${latestReward.coinGain} Coins`), 250)
    }
  }

  function favorite(id) { return meta.favorites.find(item => item.id === id) }
  function activeStore() { return document.querySelector('.store-tab.active')?.dataset.store || 'makanan' }

  function enhanceCards() {
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
          event.preventDefault(); event.stopPropagation()
          if (favorite(id)) {
            meta.favorites = meta.favorites.filter(item => item.id !== id)
            toast('♡ Dihapus dari Favorit')
          } else {
            meta.favorites = [{
              id,
              name: card.querySelector('h3')?.textContent?.trim() || 'Produk KALAP',
              price: card.querySelector('.price')?.textContent?.trim() || '',
              image: card.querySelector('img')?.src || '',
              store: activeStore(),
            }, ...meta.favorites].slice(0, 100)
            toast('♥ Masuk Favorit')
          }
          saveMeta(); refreshHeart(card, id); updateNavBadges(); refreshMissionDots()
        })
        card.querySelector('.product-image-wrap')?.appendChild(heart)
      }
      refreshHeart(card, id)
    })
  }

  function refreshHeart(card, id) {
    const heart = card.querySelector('.favorite-button')
    if (!heart) return
    const isActive = Boolean(favorite(id))
    heart.classList.toggle('active', isActive)
    heart.textContent = isActive ? '♥' : '♡'
  }

  function parsePrice(card) { return Number((card.querySelector('.price')?.textContent || '').replace(/[^0-9]/g, '')) || 0 }
  function parseRating(card) {
    const text = card.querySelector('.rating-row span')?.textContent || ''
    return Number((text.match(/[0-9]+(?:[.,][0-9]+)?/) || ['0'])[0].replace(',', '.')) || 0
  }

  function sortCards(mode) {
    const grid = document.querySelector('.product-grid')
    if (!grid) return
    const cards = [...grid.querySelectorAll('.product-card')]
    cards.sort((a,b) => mode === 'low' ? parsePrice(a)-parsePrice(b) : mode === 'high' ? parsePrice(b)-parsePrice(a) : parseRating(b)-parseRating(a))
    cards.forEach(card => grid.appendChild(card))
    document.querySelectorAll('.v12-sort button').forEach(button => button.classList.toggle('active', button.dataset.sort === mode))
  }

  function ensureSort() {
    const row = document.querySelector('.result-meta')
    if (!row || document.querySelector('.v12-sort')) return
    const bar = document.createElement('div')
    bar.className = 'v12-sort'
    bar.innerHTML = '<span>Urutkan</span><button type="button" data-sort="popular" class="active">Populer</button><button type="button" data-sort="low">Harga ↓</button><button type="button" data-sort="high">Harga ↑</button>'
    bar.addEventListener('click', event => { const button = event.target.closest('[data-sort]'); if (button) sortCards(button.dataset.sort) })
    row.insertAdjacentElement('afterend', bar)
  }

  function closeOverlay() { document.querySelector('#v2-overlay')?.remove() }
  function overlay(content, mode='') {
    closeOverlay()
    const node = document.createElement('div')
    node.id = 'v2-overlay'
    node.className = `v2-overlay ${mode}`
    node.innerHTML = `<section class="v2-sheet v2full-sheet">${content}</section>`
    node.addEventListener('click', event => {
      if (event.target === node || event.target.closest('[data-v2-close]')) closeOverlay()
    })
    document.body.appendChild(node)
    return node
  }

  function goToProduct(item, activateFlash = false) {
    closeOverlay()
    const storeButton = document.querySelector(`.store-tab[data-store="${item.store}"]`)
    storeButton?.click()
    setTimeout(() => {
      const input = document.querySelector('#search-input')
      if (!input) return
      input.value = item.name
      input.dispatchEvent(new Event('input', { bubbles:true }))
      document.querySelector('.marketplace')?.scrollIntoView({ behavior:'smooth', block:'start' })
      if (activateFlash) {
        meta.flashBoost = { store:item.store, productId:item.id, expires:Date.now() + 15 * 60 * 1000 }
        saveMeta()
        toast('⚡ Flash bonus aktif: +200 Coins')
      }
    }, 140)
  }

  function flashWindow() {
    const now = new Date()
    const block = Math.floor(now.getHours() / 3)
    const end = new Date(now)
    end.setHours((block + 1) * 3, 0, 0, 0)
    return { key:`${dateKey(now)}-${block}`, end }
  }

  function flashProducts() {
    const win = flashWindow()
    return seededPick(allProducts(), 8, `flash-${win.key}`)
  }

  function formatCountdown(target) {
    const seconds = Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000))
    const h = String(Math.floor(seconds/3600)).padStart(2,'0')
    const m = String(Math.floor((seconds%3600)/60)).padStart(2,'0')
    const s = String(seconds%60).padStart(2,'0')
    return `${h}:${m}:${s}`
  }

  const vouchers = [
    { id:'coin2x', icon:'🪙', title:'2× KALAP Coins', text:'Checkout berikutnya dapat 2× Coins.' },
    { id:'xp2x', icon:'⚡', title:'2× XP Booster', text:'Checkout berikutnya dapat 2× XP.' },
    { id:'spend300', icon:'🎟️', title:'+300 Coins', text:'Bonus 300 Coins untuk checkout ≥ Rp3 juta.' },
  ]

  function voucherClaimedToday(id) { return meta.voucherClaims[`${dateKey()}:${id}`] }
  function claimVoucher(id) {
    if (voucherClaimedToday(id)) return toast('Voucher hari ini sudah diambil')
    const voucher = vouchers.find(v => v.id === id)
    if (!voucher) return
    meta.voucherClaims[`${dateKey()}:${id}`] = true
    meta.activeVouchers.push({ id, claimedAt:Date.now() })
    saveMeta(); toast(`🎟️ ${voucher.title} aktif`); openVouchers()
  }

  function openVouchers() {
    const cards = vouchers.map(v => {
      const claimed = voucherClaimedToday(v.id)
      const active = activeVoucher(v.id)
      return `<article class="v2-voucher ${active?'active':''}"><span>${v.icon}</span><div><small>${active?'AKTIF':'VOUCHER HARIAN'}</small><strong>${v.title}</strong><p>${v.text}</p></div><button data-voucher="${v.id}" ${claimed?'disabled':''}>${active?'Menunggu checkout':claimed?'Sudah diambil':'Ambil'}</button></article>`
    }).join('')
    const node = overlay(`<header class="v2-sheet-head"><div><small>V2 · VOUCHER</small><h2>🎟️ Voucher Kamu</h2><p>Ambil voucher harian dan pakai otomatis di checkout berikutnya.</p></div><button data-v2-close>×</button></header><div class="v2-voucher-list">${cards}</div>`,'v2-voucher-mode')
    node.addEventListener('click', event => { const button = event.target.closest('[data-voucher]'); if (button && !button.disabled) claimVoucher(button.dataset.voucher) })
  }

  const mysteryPrizes = [
    { weight:28, label:'+150 Coins', apply:() => { meta.coins += 150 } },
    { weight:18, label:'+300 Coins', apply:() => { meta.coins += 300 } },
    { weight:10, label:'+600 Coins', apply:() => { meta.coins += 600 } },
    { weight:20, label:'+120 XP', apply:() => { meta.xp += 120 } },
    { weight:10, label:'+300 XP', apply:() => { meta.xp += 300 } },
    { weight:7, label:'2× Coins Booster', apply:() => { meta.boosters.coin2x += 1 } },
    { weight:7, label:'2× XP Booster', apply:() => { meta.boosters.xp2x += 1 } },
  ]

  function mysteryCount() { return Number(meta.mystery[dateKey()] || 0) }
  function drawPrize() {
    const total = mysteryPrizes.reduce((sum, prize) => sum + prize.weight, 0)
    let roll = Math.random() * total
    for (const prize of mysteryPrizes) { roll -= prize.weight; if (roll <= 0) return prize }
    return mysteryPrizes[0]
  }

  function openMysteryBox() {
    const count = mysteryCount()
    const freeKey = Number(meta.boosters.mysteryKey || 0) > 0
    if (count >= 3 && !freeKey) return toast('Mystery Box hari ini sudah habis')
    if (!freeKey && meta.coins < 300) return toast('Butuh 300 KALAP Coins')
    if (freeKey) meta.boosters.mysteryKey -= 1
    else meta.coins -= 300
    const prize = drawPrize()
    prize.apply()
    meta.mystery[dateKey()] = count + 1
    meta.mysteryHistory = [{ date:new Date().toISOString(), prize:prize.label }, ...meta.mysteryHistory].slice(0,30)
    saveMeta()
    const node = overlay(`<header class="v2-sheet-head"><div><small>MYSTERY BOX</small><h2>🎁 Kamu dapat...</h2></div><button data-v2-close>×</button></header><div class="mystery-result"><span>✨</span><strong>${prize.label}</strong><p>Reward langsung masuk ke akun KALAP di device ini.</p><button data-v2-close>Lanjut</button></div>`,'mystery-mode')
    node.querySelector('.mystery-result')?.classList.add('reveal')
    refreshMissionDots(); updateNavBadges()
  }

  function openMystery() {
    const count = mysteryCount()
    overlay(`<header class="v2-sheet-head"><div><small>V2 · MYSTERY</small><h2>🎁 Mystery Box</h2><p>Buka maksimal 3 box per hari. Harga 300 Coins per box.</p></div><button data-v2-close>×</button></header><div class="mystery-box-card"><div class="mystery-visual">?</div><div><small>${count}/3 DIBUKA HARI INI</small><h3>Apa isinya?</h3><p>Coins, XP, atau booster checkout.</p><button data-open-mystery ${count>=3 && !(meta.boosters.mysteryKey>0)?'disabled':''}>${meta.boosters.mysteryKey>0?'Pakai Mystery Key':'Buka · 300 Coins'}</button></div></div><div class="mystery-history"><strong>Riwayat hadiah</strong>${meta.mysteryHistory.slice(0,5).map(item=>`<div><span>${new Date(item.date).toLocaleDateString('id-ID')}</span><b>${item.prize}</b></div>`).join('') || '<p>Belum ada box yang dibuka.</p>'}</div>`,'mystery-mode').addEventListener('click', event => { if (event.target.closest('[data-open-mystery]')) openMysteryBox() })
  }

  const missions = [
    { id:'checkout1', icon:'🛒', title:'Checkout sekali', target:1, reward:100, progress:(core) => todaysOrders(core).length },
    { id:'spend5m', icon:'💸', title:'Belanja Rp5 juta', target:5_000_000, reward:150, progress:(core) => todaysOrders(core).reduce((s,o)=>s+(Number(o.amount)||0),0) },
    { id:'fav3', icon:'♥', title:'Simpan 3 favorit', target:3, reward:80, progress:() => meta.favorites.length },
    { id:'stores2', icon:'🛍️', title:'Checkout 2 kategori', target:2, reward:120, progress:(core) => new Set(todaysOrders(core).map(o=>o.store)).size },
    { id:'mystery1', icon:'🎁', title:'Buka Mystery Box', target:1, reward:100, progress:() => mysteryCount() },
  ]

  function missionClaimed(id) { return meta.missionClaims[`${dateKey()}:${id}`] }
  function claimMission(id) {
    const mission = missions.find(m => m.id === id)
    if (!mission || missionClaimed(id)) return
    const progress = mission.progress(readCore())
    if (progress < mission.target) return toast('Mission belum selesai')
    meta.missionClaims[`${dateKey()}:${id}`] = true
    meta.coins += mission.reward
    saveMeta(); toast(`✅ +${mission.reward} Coins`); openMissions()
  }

  function openMissions() {
    const core = readCore()
    const cards = missions.map(m => {
      const p = Math.min(m.target, m.progress(core))
      const done = p >= m.target
      const claimed = missionClaimed(m.id)
      const percent = Math.min(100, (p/m.target)*100)
      const progressLabel = m.target >= 1_000_000 ? `${money(p)} / ${money(m.target)}` : `${p} / ${m.target}`
      return `<article class="mission-card ${done?'done':''}"><span>${m.icon}</span><div><strong>${m.title}</strong><small>${progressLabel}</small><div class="mission-progress"><i style="width:${percent}%"></i></div></div><button data-mission="${m.id}" ${!done||claimed?'disabled':''}>${claimed?'Claimed':`+${m.reward}`}</button></article>`
    }).join('')
    const node = overlay(`<header class="v2-sheet-head"><div><small>DAILY MISSIONS</small><h2>✅ Mission Hari Ini</h2><p>Selesaikan aktivitas harian untuk menambah KALAP Coins.</p></div><button data-v2-close>×</button></header><div class="mission-list">${cards}</div>`,'mission-mode')
    node.addEventListener('click', event => { const button = event.target.closest('[data-mission]'); if (button && !button.disabled) claimMission(button.dataset.mission) })
  }

  const shopItems = [
    { id:'title-sneaker', type:'title', icon:'👟', title:'Sneaker Goblin', text:'Title profil eksklusif.', price:600, value:'Sneaker Goblin' },
    { id:'title-sultan', type:'title', icon:'👑', title:'Sultan Kalap', text:'Title profil premium.', price:1000, value:'Sultan Kalap' },
    { id:'frame-inferno', type:'frame', icon:'🔥', title:'Inferno Frame', text:'Profile ring merah menyala.', price:1500, value:'inferno' },
    { id:'boost-xp', type:'boost', icon:'⚡', title:'2× XP Next Order', text:'Berlaku untuk satu checkout.', price:750, value:'xp2x' },
    { id:'boost-coins', type:'boost', icon:'🪙', title:'2× Coins Next Order', text:'Berlaku untuk satu checkout.', price:750, value:'coin2x' },
    { id:'mystery-key', type:'boost', icon:'🗝️', title:'Mystery Key', text:'Buka satu box ekstra.', price:500, value:'mysteryKey' },
  ]

  function owns(id) { return meta.inventory.includes(id) }
  function buyReward(id) {
    const item = shopItems.find(i => i.id === id)
    if (!item) return
    if ((item.type === 'title' || item.type === 'frame') && owns(id)) return toast('Item sudah kamu punya')
    if (meta.coins < item.price) return toast('KALAP Coins belum cukup')
    meta.coins -= item.price
    if (item.type === 'title' || item.type === 'frame') meta.inventory.push(id)
    else meta.boosters[item.value] = Number(meta.boosters[item.value] || 0) + 1
    saveMeta(); toast(`🛍️ ${item.title} dibeli`); openRewardShop()
  }

  function activateReward(id) {
    const item = shopItems.find(i => i.id === id)
    if (!item || !owns(id)) return
    if (item.type === 'title') meta.activeTitle = item.value
    if (item.type === 'frame') meta.activeFrame = item.value
    saveMeta(); toast(`${item.title} dipakai`); openRewardShop()
  }

  function openRewardShop() {
    const cards = shopItems.map(item => {
      const owned = owns(item.id)
      const active = (item.type === 'title' && meta.activeTitle === item.value) || (item.type === 'frame' && meta.activeFrame === item.value)
      return `<article class="reward-item ${owned?'owned':''}"><span>${item.icon}</span><div><small>${item.type.toUpperCase()}</small><strong>${item.title}</strong><p>${item.text}</p></div><div class="reward-actions">${owned && (item.type==='title'||item.type==='frame') ? `<button data-activate="${item.id}" ${active?'disabled':''}>${active?'Dipakai':'Pakai'}</button>` : `<button data-buy="${item.id}">🪙 ${item.price}</button>`}</div></article>`
    }).join('')
    const node = overlay(`<header class="v2-sheet-head"><div><small>REWARD SHOP</small><h2>🛍️ Tukar KALAP Coins</h2><p>Saldo Coins kamu: <strong>${meta.coins.toLocaleString('id-ID')}</strong></p></div><button data-v2-close>×</button></header><div class="reward-grid">${cards}</div>`,'reward-shop-mode')
    node.addEventListener('click', event => { const buy = event.target.closest('[data-buy]'); const activate = event.target.closest('[data-activate]'); if (buy) buyReward(buy.dataset.buy); if (activate) activateReward(activate.dataset.activate) })
  }

  function leaderboardRows() {
    const core = readCore()
    const userScore = Number(core.lifetimeSpent) || 0
    const names = ['Raka','Alya','Dimas','Naya','Bimo','Keira','Rafi','Tara','Juno']
    const seed = hash(weekKey())
    const bots = names.map((name, index) => ({ name, score: Math.max(1_000_000, Math.round(((seed % 80_000_000) + (index+1)*7_700_000) % 90_000_000 / 1000)*1000), me:false }))
    return [...bots, { name:'Kamu', score:userScore, me:true }].sort((a,b)=>b.score-a.score).slice(0,10)
  }

  function openLeaderboard() {
    const rows = leaderboardRows().map((row,index) => `<div class="leader-row ${row.me?'me':''}"><span>${index<3?['🥇','🥈','🥉'][index]:`#${index+1}`}</span><div><strong>${row.name}</strong><small>${row.me?'Profil device ini':'League bot lokal'}</small></div><b>${money(row.score)}</b></div>`).join('')
    overlay(`<header class="v2-sheet-head"><div><small>${weekKey()}</small><h2>🏆 Weekly League</h2><p>Leaderboard lokal yang dibuat di device ini.</p></div><button data-v2-close>×</button></header><div class="leader-list">${rows}</div><div class="v2-info-card"><strong>Local League</strong><p>Nama selain “Kamu” adalah karakter league yang digenerate lokal untuk progression. Tidak ada akun pengguna lain.</p></div>`,'leader-mode')
  }

  function preferenceScores() {
    const core = readCore()
    const scores = Object.fromEntries(storefronts.map(store => [store.key, 0]))
    ;(Array.isArray(core.transactionHistory) ? core.transactionHistory : []).forEach(order => { scores[order.store] = (scores[order.store] || 0) + 3 })
    meta.favorites.forEach(item => { scores[item.store] = (scores[item.store] || 0) + 1 })
    return scores
  }

  function recommendations() {
    const scores = preferenceScores()
    const bestStore = Object.entries(scores).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'sepatu'
    const products = (catalog[bestStore] || []).filter(product => !favorite(product.id))
    return { store:bestStore, products:seededPick(products, 6, `rec-${dateKey()}-${bestStore}`) }
  }

  function ensureRecommendations() {
    const marketplace = document.querySelector('.marketplace')
    if (!marketplace || document.querySelector('.v2-recommendations')) return
    const rec = recommendations()
    const info = storeInfo(rec.store)
    const section = document.createElement('section')
    section.className = 'v2-recommendations'
    section.innerHTML = `<div class="v2-section-head"><div><small>PERSONALIZED</small><h2>✨ Buat kamu</h2><p>Lebih banyak ${info.label.toLowerCase()} berdasarkan aktivitas di device ini.</p></div><button data-v2-feature="profile">Profil</button></div><div class="recommend-strip">${rec.products.map(item=>`<article data-rec-id="${item.id}" data-rec-store="${rec.store}"><img src="${item.image}" alt=""><div><strong>${item.name}</strong><span>${money(item.price)}</span></div></article>`).join('')}</div>`
    marketplace.insertAdjacentElement('beforebegin', section)
    section.addEventListener('click', event => {
      const card = event.target.closest('[data-rec-id]')
      if (!card) return
      const item = (catalog[card.dataset.recStore] || []).find(p=>p.id===card.dataset.recId)
      if (item) goToProduct({ ...item, store:card.dataset.recStore })
    })
  }

  function ensureHub() {
    const daily = document.querySelector('.daily-strip')
    if (!daily || document.querySelector('.v2-hub')) return
    const tier = membership()
    const win = flashWindow()
    const hub = document.createElement('section')
    hub.className = 'v2-hub'
    hub.innerHTML = `<div class="v2-hub-head"><div><small>KALAP! ${VERSION}</small><h2>Your dopamine hub</h2></div><div class="hub-balance"><span>🪙 ${meta.coins.toLocaleString('id-ID')}</span><b>${tier.icon} ${tier.name}</b></div></div><div class="v2-feature-strip"><button data-v2-feature="flash"><span>⚡</span><strong>Flash Sale</strong><small data-flash-countdown>${formatCountdown(win.end)}</small></button><button data-v2-feature="voucher"><span>🎟️</span><strong>Voucher</strong><small>${meta.activeVouchers.length} aktif</small></button><button data-v2-feature="mystery"><span>🎁</span><strong>Mystery Box</strong><small>${mysteryCount()}/3 hari ini</small></button><button data-v2-feature="missions"><span>✅</span><strong>Missions</strong><small data-mission-dot>Daily rewards</small></button><button data-v2-feature="shop"><span>🛍️</span><strong>Reward Shop</strong><small>Pakai Coins</small></button><button data-v2-feature="leader"><span>🏆</span><strong>League</strong><small>Weekly rank</small></button></div>`
    daily.insertAdjacentElement('afterend', hub)
  }

  function openFlash() {
    const win = flashWindow()
    const cards = flashProducts().map(item => `<article class="flash-product" data-flash-id="${item.id}" data-flash-store="${item.store}"><div><img src="${item.image}" alt=""><span>+200 COINS</span></div><small>${storeInfo(item.store).label}</small><strong>${item.name}</strong><b>${money(item.price)}</b><button>Aktifkan Flash Bonus</button></article>`).join('')
    const node = overlay(`<header class="v2-sheet-head"><div><small>FLASH SALE · <b data-flash-countdown>${formatCountdown(win.end)}</b></small><h2>⚡ Flash Picks</h2><p>Aktifkan produk lalu checkout kategori yang sama dalam 15 menit untuk bonus +200 Coins.</p></div><button data-v2-close>×</button></header><div class="flash-grid">${cards}</div>`,'flash-mode')
    node.addEventListener('click', event => {
      const card = event.target.closest('[data-flash-id]')
      if (!card) return
      const item = (catalog[card.dataset.flashStore] || []).find(p=>p.id===card.dataset.flashId)
      if (item) goToProduct({ ...item, store:card.dataset.flashStore }, true)
    })
  }

  function openFavorites() {
    const list = meta.favorites.length ? meta.favorites.map(item => `<article class="favorite-row"><img src="${item.image}" alt=""><div><small>${storeInfo(item.store).label}</small><strong>${item.name}</strong><span>${item.price}</span></div><div class="favorite-actions"><button data-find="${item.id}">Lihat</button><button class="remove" data-remove="${item.id}">×</button></div></article>`).join('') : '<div class="v2-empty"><span>♡</span><strong>Favorit masih kosong</strong><p>Tap ikon hati pada produk yang ingin kamu simpan.</p></div>'
    const node = overlay(`<header class="v2-sheet-head"><div><small>V2 · FAVORIT</small><h2>♥ Favorit Kamu</h2><p>${meta.favorites.length} produk tersimpan.</p></div><button data-v2-close>×</button></header><div class="favorite-list">${list}</div>`,'favorites-mode')
    node.addEventListener('click', event => {
      const remove = event.target.closest('[data-remove]')
      if (remove) { meta.favorites = meta.favorites.filter(item=>item.id!==remove.dataset.remove); saveMeta(); openFavorites(); return }
      const find = event.target.closest('[data-find]')
      if (find) { const item = favorite(find.dataset.find); if (item) goToProduct(item) }
    })
  }

  function openProfile() {
    processCheckoutRewards()
    const core = readCore()
    const level = levelInfo()
    const tier = membership(core)
    const progress = membershipProgress(core)
    const ownedTitles = shopItems.filter(i=>i.type==='title'&&owns(i.id))
    overlay(`<header class="v2-sheet-head"><div><small>${VERSION} · PROFILE</small><h2>◉ Profil KALAP</h2><p>Semua progress tersimpan di device ini.</p></div><button data-v2-close>×</button></header><div class="profile-hero ${meta.activeFrame==='inferno'?'inferno':''}"><div class="profile-avatar">K!</div><div><small>LEVEL ${level.level}</small><h3>${meta.activeTitle}</h3><span>🔥 ${Number(core.streak)||0} day streak</span></div><b>${tier.icon} ${tier.name}</b></div><div class="xp-card"><div><span>XP ${level.current}/${level.target}</span><strong>Level ${level.level}</strong></div><div class="xp-track"><i style="width:${level.percent}%"></i></div></div><div class="membership-card ${tier.key}"><div><small>MEMBERSHIP</small><strong>${tier.name}</strong><span>${tier.multiplier}× base Coin multiplier</span></div><div class="membership-track"><i style="width:${progress}%"></i></div>${tier.next?`<small>${money(Math.max(0,tier.next-(Number(core.lifetimeSpent)||0)))} lagi ke tier berikutnya</small>`:'<small>Tier tertinggi tercapai</small>'}</div><div class="profile-stats"><div><small>KALAP Coins</small><strong>🪙 ${meta.coins.toLocaleString('id-ID')}</strong></div><div><small>Total checkout</small><strong>${(core.transactionHistory||[]).length}</strong></div><div><small>Total belanja</small><strong>${money(core.lifetimeSpent)}</strong></div><div><small>Favorit</small><strong>${meta.favorites.length}</strong></div></div><div class="profile-shortcuts"><button data-v2-feature="missions">✅ Missions</button><button data-v2-feature="voucher">🎟️ Voucher</button><button data-v2-feature="shop">🛍️ Reward Shop</button><button data-v2-feature="leader">🏆 League</button></div>${ownedTitles.length?`<div class="owned-titles"><strong>Title koleksi</strong><div>${ownedTitles.map(i=>`<span>${i.title}</span>`).join('')}</div></div>`:''}`,'profile-mode')
  }

  function ensureShare() {
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
        if (navigator.share) await navigator.share({ title:'KALAP!', text })
        else if (navigator.clipboard) { await navigator.clipboard.writeText(text); toast('Teks checkout disalin') }
      } catch {}
    })
    success.insertAdjacentElement('afterend', button)
  }

  function ensureBottomNav() {
    let nav = document.querySelector('.kalap-bottom-nav')
    const expected = 'v2-full'
    if (nav?.dataset.version === expected) return
    nav?.remove()
    nav = document.createElement('nav')
    nav.className = 'kalap-bottom-nav v2-bottom-nav'
    nav.dataset.version = expected
    nav.innerHTML = `<button data-v2-nav="home"><span>⌂</span><small>Home</small></button><button data-v2-nav="orders"><span>▣</span><small>Pesanan</small><b data-order-count hidden></b></button><button data-v2-nav="rewards"><span>✦</span><small>Rewards</small><b data-reward-dot hidden>!</b></button><button data-v2-nav="favorites"><span>♡</span><small>Favorit</small><b data-fav-count hidden></b></button><button data-v2-nav="profile"><span>◉</span><small>Profil</small></button>`
    nav.addEventListener('click', event => {
      const button = event.target.closest('[data-v2-nav]')
      if (!button) return
      const target = button.dataset.v2Nav
      if (target === 'home') window.scrollTo({ top:0, behavior:'smooth' })
      if (target === 'orders') document.querySelector('[data-action="open-orders"]')?.click()
      if (target === 'rewards') openMissions()
      if (target === 'favorites') openFavorites()
      if (target === 'profile') openProfile()
    })
    document.body.appendChild(nav)
    updateNavBadges()
  }

  function updateNavBadges() {
    const core = readCore()
    const orderBadge = document.querySelector('[data-order-count]')
    const favBadge = document.querySelector('[data-fav-count]')
    const rewardDot = document.querySelector('[data-reward-dot]')
    const orders = Array.isArray(core.transactionHistory) ? core.transactionHistory : []
    if (orderBadge) { orderBadge.hidden = !orders.length; orderBadge.textContent = Math.min(99, orders.length) }
    if (favBadge) { favBadge.hidden = !meta.favorites.length; favBadge.textContent = Math.min(99, meta.favorites.length) }
    if (rewardDot) rewardDot.hidden = !missions.some(m => m.progress(core) >= m.target && !missionClaimed(m.id))
  }

  function refreshMissionDots() {
    const node = document.querySelector('[data-mission-dot]')
    if (!node) return
    const core = readCore()
    const claimable = missions.filter(m=>m.progress(core)>=m.target&&!missionClaimed(m.id)).length
    node.textContent = claimable ? `${claimable} reward siap` : 'Daily rewards'
    updateNavBadges()
  }

  function updateDynamicLabels() {
    const win = flashWindow()
    document.querySelectorAll('[data-flash-countdown]').forEach(node => { node.textContent = formatCountdown(win.end) })
  }

  function versionLabels() {
    document.title = 'KALAP! V2 — The Dopamine Marketplace'
    document.querySelectorAll('.brand-sub').forEach(node => node.textContent = 'V2 · dopamine app')
    document.querySelectorAll('.hero .eyebrow').forEach(node => { if (node.textContent.includes('V1')) node.textContent = 'V2 · DOPAMINE APP' })
    document.querySelectorAll('footer strong').forEach(node => { if (node.textContent.includes('KALAP!')) node.textContent = 'KALAP! V2' })
  }

  function handleFeature(name) {
    if (name === 'flash') openFlash()
    if (name === 'voucher') openVouchers()
    if (name === 'mystery') openMystery()
    if (name === 'missions') openMissions()
    if (name === 'shop') openRewardShop()
    if (name === 'leader') openLeaderboard()
    if (name === 'profile') openProfile()
  }

  document.addEventListener('click', event => {
    const feature = event.target.closest('[data-v2-feature]')
    if (feature) { event.preventDefault(); handleFeature(feature.dataset.v2Feature) }
  })

  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeOverlay() })
  window.addEventListener('storage', () => { meta = readMeta(); scheduleEnhance() })

  function enhance() {
    processCheckoutRewards()
    versionLabels()
    enhanceCards()
    ensureSort()
    ensureBottomNav()
    ensureHub()
    ensureRecommendations()
    ensureShare()
    refreshMissionDots()
    updateNavBadges()
  }

  function scheduleEnhance() {
    clearTimeout(refreshTimer)
    refreshTimer = setTimeout(enhance, 60)
  }

  dailyBonus()
  enhance()

  setInterval(() => {
    const core = readCore()
    const orders = Array.isArray(core.transactionHistory) ? core.transactionHistory : []
    const fingerprint = orders.map(order => order.id).join('|')
    if (fingerprint !== lastOrderFingerprint) {
      lastOrderFingerprint = fingerprint
      processCheckoutRewards()
      scheduleEnhance()
    }
    updateDynamicLabels()
  }, 1000)
})()
