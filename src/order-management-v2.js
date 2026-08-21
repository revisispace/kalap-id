(() => {
  const CORE_KEY = 'kalap-v1'
  let enhancing = false

  function readCore() {
    try { return JSON.parse(localStorage.getItem(CORE_KEY) || '{}') }
    catch { return {} }
  }

  function writeCore(core) {
    localStorage.setItem(CORE_KEY, JSON.stringify(core))
    window.dispatchEvent(new Event('storage'))
    window.dispatchEvent(new CustomEvent('kalap:orders-updated', { detail: { transactionHistory: orders(core) } }))
  }

  function orders(core = readCore()) {
    return Array.isArray(core.transactionHistory) ? core.transactionHistory : []
  }

  function findOrder(id, core = readCore()) {
    return orders(core).find(order => String(order.id) === String(id))
  }

  function isFood(order) {
    return order?.store === 'makanan'
  }

  function isCompleted(order) {
    if (!order || order.cancelledAt) return false
    const created = new Date(order.date).getTime()
    if (!Number.isFinite(created)) return false
    const elapsed = Math.max(0, Math.floor((Date.now() - created) / 1000))
    return elapsed >= (isFood(order) ? 105 : 200)
  }

  function isActive(order) {
    return Boolean(order && !order.cancelledAt && !isCompleted(order))
  }

  function currentTrackerTab() {
    return document.querySelector('[data-action="tracker-tab"].active')?.dataset.tab || 'food'
  }

  function toast(text) {
    document.querySelector('.order-mgmt-toast')?.remove()
    const node = document.createElement('div')
    node.className = 'order-mgmt-toast'
    node.textContent = text
    document.body.appendChild(node)
    window.setTimeout(() => node.remove(), 1800)
  }

  function closeActionSheet() {
    document.querySelector('#order-action-overlay')?.remove()
  }

  function actionSheet({ eyebrow = 'PESANAN', title, text, primary, secondary = 'Kembali', danger = false, onPrimary }) {
    closeActionSheet()
    const overlay = document.createElement('div')
    overlay.id = 'order-action-overlay'
    overlay.className = 'order-action-overlay overlay'
    overlay.innerHTML = `
      <section class="order-action-sheet" role="dialog" aria-modal="true">
        <div class="order-action-drag"></div>
        <small>${eyebrow}</small>
        <h3>${title}</h3>
        <p>${text}</p>
        <div class="order-action-buttons">
          <button type="button" data-order-action-cancel>${secondary}</button>
          <button type="button" class="${danger ? 'danger' : ''}" data-order-action-confirm>${primary}</button>
        </div>
      </section>`

    overlay.addEventListener('click', event => {
      if (event.target === overlay || event.target.closest('[data-order-action-cancel]')) {
        closeActionSheet()
        return
      }
      if (event.target.closest('[data-order-action-confirm]')) {
        closeActionSheet()
        onPrimary?.()
      }
    })

    document.body.appendChild(overlay)
  }

  function cardOrderId(card) {
    return card.querySelector('[data-order-menu]')?.dataset.orderMenu || card.querySelector('[data-action="tracker-detail"][data-id]')?.dataset.id || null
  }

  function updateTabCounts() {
    const list = orders()
    const counts = {
      food: list.filter(isFood).length,
      goods: list.filter(order => !isFood(order)).length,
    }
    document.querySelectorAll('[data-action="tracker-tab"][data-tab]').forEach(tab => {
      const badge = tab.querySelector('b')
      if (badge) badge.textContent = counts[tab.dataset.tab] || 0
    })
  }

  function renderEmptyStateIfNeeded() {
    const panel = document.querySelector('.panel-modal.order-panel:not(.order-detail)')
    const list = panel?.querySelector('.tracker-list')
    if (!list) return
    const tab = currentTrackerTab()
    const expected = orders().filter(order => tab === 'food' ? isFood(order) : !isFood(order))
    const visibleCards = list.querySelectorAll('.tracker-order-card:not(.order-removing)')

    list.querySelector('.tracker-empty.order-managed-empty')?.remove()
    if (!expected.length && !visibleCards.length) {
      const empty = document.createElement('div')
      empty.className = 'tracker-empty order-managed-empty'
      empty.innerHTML = `<span>${tab === 'food' ? '🍜' : '📦'}</span><strong>Belum ada pesanan ${tab === 'food' ? 'makanan' : 'barang'}.</strong><p>Checkout dulu, lalu status pesanan akan muncul di sini.</p>`
      list.appendChild(empty)
    }
  }

  function removeCard(card, animate = true) {
    if (!card || card.classList.contains('order-removing')) return
    if (!animate) {
      card.remove()
      renderEmptyStateIfNeeded()
      return
    }
    card.classList.add('order-removing')
    window.setTimeout(() => {
      card.remove()
      renderEmptyStateIfNeeded()
    }, 180)
  }

  function syncTrackerDOM({ animateRemoved = false } = {}) {
    const validOrders = new Map(orders().map(order => [String(order.id), order]))

    document.querySelectorAll('.tracker-order-card').forEach(card => {
      const id = cardOrderId(card)
      if (!id) return
      const order = validOrders.get(String(id))
      if (!order) {
        removeCard(card, animateRemoved)
        return
      }
      markCancelledCard(card, order)
    })

    updateTabCounts()
    renderEmptyStateIfNeeded()
    syncHeaderBadge()
  }

  function deleteOrder(id) {
    const core = readCore()
    const before = orders(core)
    const next = before.filter(order => String(order.id) !== String(id))
    if (next.length === before.length) return
    core.transactionHistory = next
    writeCore(core)

    document.querySelectorAll('.tracker-order-card').forEach(card => {
      if (String(cardOrderId(card)) === String(id)) removeCard(card, true)
    })
    updateTabCounts()
    syncHeaderBadge()
    window.setTimeout(renderEmptyStateIfNeeded, 190)
    toast('Riwayat pesanan dihapus')
  }

  function cancelOrder(id) {
    const core = readCore()
    const order = findOrder(id, core)
    if (!order || !isActive(order)) return
    order.cancelledAt = new Date().toISOString()
    order.cancelled = true
    writeCore(core)
    syncTrackerDOM()
    toast('Pesanan dibatalkan')
  }

  function clearCompletedHistory() {
    const core = readCore()
    const list = orders(core)
    const removable = list.filter(order => order.cancelledAt || isCompleted(order))
    if (!removable.length) {
      toast('Belum ada riwayat selesai untuk dihapus')
      return
    }

    const removableIds = new Set(removable.map(order => String(order.id)))
    core.transactionHistory = list.filter(order => !removableIds.has(String(order.id)))
    writeCore(core)

    document.querySelectorAll('.tracker-order-card').forEach(card => {
      if (removableIds.has(String(cardOrderId(card)))) removeCard(card, true)
    })
    updateTabCounts()
    syncHeaderBadge()
    window.setTimeout(renderEmptyStateIfNeeded, 190)
    toast(`${removable.length} riwayat pesanan dihapus`)
  }

  function openOrderAction(id) {
    const order = findOrder(id)
    if (!order) return

    if (isActive(order)) {
      actionSheet({
        eyebrow: 'PESANAN BERJALAN',
        title: 'Batalkan pesanan?',
        text: 'Pesanan akan berhenti dari proses pengiriman dan tetap muncul sebagai pesanan dibatalkan sampai kamu menghapusnya.',
        primary: 'Batalkan Pesanan',
        danger: true,
        onPrimary: () => cancelOrder(id),
      })
      return
    }

    actionSheet({
      eyebrow: order.cancelledAt ? 'PESANAN DIBATALKAN' : 'RIWAYAT PESANAN',
      title: 'Hapus dari riwayat?',
      text: 'Pesanan ini akan langsung hilang dari daftar Pesanan dan Riwayat di device ini. Statistik KALAP yang sudah tercatat tidak berubah.',
      primary: 'Hapus Riwayat',
      danger: true,
      onPrimary: () => deleteOrder(id),
    })
  }

  function addHistoryTools(panel) {
    if (!panel || panel.querySelector('.order-history-tools')) return
    const tabs = panel.querySelector('.tracker-tabs')
    if (!tabs) return
    const tools = document.createElement('div')
    tools.className = 'order-history-tools'
    tools.innerHTML = `<span>Kelola pesanan di device ini</span><button type="button" data-clear-order-history>Hapus riwayat selesai</button>`
    tabs.insertAdjacentElement('afterend', tools)
  }

  function markCancelledCard(card, order) {
    if (!order?.cancelledAt) return
    card.classList.add('order-cancelled')
    const status = card.querySelector('.tracker-status-row')
    if (status) {
      const labels = status.querySelector('div:first-child')
      const icon = status.querySelector('.tracker-status-icon')
      if (labels) labels.innerHTML = '<small>Status sekarang</small><strong>Pesanan dibatalkan</strong><span>Tidak dilanjutkan ke pengiriman</span>'
      if (icon) icon.textContent = '⛔'
    }
    const progress = card.querySelector('.tracker-mini-progress i')
    if (progress) progress.style.width = '100%'
    const detail = card.querySelector('[data-action="tracker-detail"]')
    if (detail) {
      detail.textContent = 'Pesanan dibatalkan'
      detail.disabled = true
      detail.classList.add('cancelled-detail')
    }
  }

  function addOrderMenu(card) {
    const detail = card.querySelector('[data-action="tracker-detail"][data-id]')
    const id = detail?.dataset.id
    if (!id) return
    const order = findOrder(id)
    if (!order) {
      removeCard(card, false)
      return
    }

    markCancelledCard(card, order)

    if (card.querySelector('.order-card-menu')) return
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'order-card-menu'
    button.dataset.orderMenu = id
    button.setAttribute('aria-label', 'Kelola pesanan')
    button.textContent = '•••'
    card.appendChild(button)
  }

  function syncHeaderBadge() {
    const active = orders().filter(isActive).length
    document.querySelectorAll('[data-action="open-orders"] b').forEach(node => {
      if (active > 0) {
        node.hidden = false
        node.textContent = Math.min(99, active)
      } else {
        node.hidden = true
      }
    })
  }

  function enhance() {
    if (enhancing) return
    enhancing = true
    try {
      const panel = document.querySelector('.panel-modal.order-panel:not(.order-detail)')
      addHistoryTools(panel)
      document.querySelectorAll('.tracker-order-card').forEach(addOrderMenu)
      syncTrackerDOM()
    } finally {
      enhancing = false
    }
  }

  document.addEventListener('click', event => {
    const menu = event.target.closest('[data-order-menu]')
    if (menu) {
      event.preventDefault()
      event.stopPropagation()
      openOrderAction(menu.dataset.orderMenu)
      return
    }

    if (event.target.closest('[data-clear-order-history]')) {
      event.preventDefault()
      const count = orders().filter(order => order.cancelledAt || isCompleted(order)).length
      if (!count) {
        toast('Belum ada riwayat selesai untuk dihapus')
        return
      }
      actionSheet({
        eyebrow: 'BERSIHKAN RIWAYAT',
        title: `Hapus ${count} pesanan selesai?`,
        text: 'Pesanan yang masih berjalan tetap aman. Pesanan selesai dan dibatalkan akan langsung hilang dari device ini.',
        primary: 'Hapus Riwayat',
        danger: true,
        onPrimary: clearCompletedHistory,
      })
      return
    }

    if (event.target.closest('[data-action="tracker-tab"]')) {
      window.setTimeout(() => syncTrackerDOM(), 0)
      window.setTimeout(() => syncTrackerDOM(), 70)
    }
  }, true)

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeActionSheet()
  })

  window.addEventListener('storage', () => window.setTimeout(syncTrackerDOM, 0))
  window.addEventListener('kalap:orders-updated', () => window.setTimeout(syncTrackerDOM, 0))

  window.setInterval(enhance, 300)
  enhance()
})()
