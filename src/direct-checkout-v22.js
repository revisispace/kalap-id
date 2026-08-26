(() => {
  const CORE_KEY = 'kalap-v1'
  const CONTEXT_KEY = 'kalap-v22-checkout-context'
  let handoffActive = false

  function readCore() {
    try { return JSON.parse(localStorage.getItem(CORE_KEY) || '{}') }
    catch { return {} }
  }

  function parseMoney(text = '') {
    return Number(String(text).replace(/[^0-9]/g, '')) || 0
  }

  function saveCheckoutContext(overlay) {
    const activeStore = document.querySelector('.store-tab.active')?.dataset.store || 'makanan'
    const delivery = overlay.querySelector('[data-v21-delivery].active')
    const address = (() => {
      try { return JSON.parse(localStorage.getItem('kalap-v21-address') || 'null') }
      catch { return null }
    })()
    const total = parseMoney(
      overlay.querySelector('.v21-checkout-sheet > footer strong')?.textContent ||
      overlay.querySelector('.v21-summary .total b')?.textContent || ''
    )

    localStorage.setItem(CONTEXT_KEY, JSON.stringify({
      store: activeStore,
      delivery: delivery?.dataset.v21Delivery || null,
      deliveryLabel: delivery?.querySelector('span')?.textContent?.trim() || null,
      deliveryEta: delivery?.querySelector('small')?.textContent?.trim() || null,
      address,
      total,
      createdAt: new Date().toISOString(),
    }))
  }

  function directHandoff(overlay) {
    if (handoffActive) return

    const core = readCore()
    const total = parseMoney(
      overlay.querySelector('.v21-checkout-sheet > footer strong')?.textContent ||
      overlay.querySelector('.v21-summary .total b')?.textContent || ''
    )
    const balance = Number(core.walletBalance) || 0
    if (!total || total > balance) return

    handoffActive = true
    saveCheckoutContext(overlay)

    const button = overlay.querySelector('[data-v21-pay]')
    if (button) {
      button.disabled = true
      button.setAttribute('aria-busy', 'true')
      button.innerHTML = '<span class="v22-pay-spinner"></span> Memproses...'
    }

    const legacyObserver = new MutationObserver(() => {
      const spend = document.querySelector('.checkout-modal [data-action="spend-wallet"]')
      if (!spend) return

      const legacyOverlay = spend.closest('.overlay')
      if (legacyOverlay) {
        legacyOverlay.style.opacity = '0'
        legacyOverlay.style.visibility = 'hidden'
        legacyOverlay.style.pointerEvents = 'none'
      }

      legacyObserver.disconnect()
      spend.click()

      setTimeout(() => {
        handoffActive = false
      }, 1200)
    })

    legacyObserver.observe(document.body, { childList: true, subtree: true })

    // Keep the polished checkout visible while the legacy review screen is created
    // behind it. It is never shown to the user; we immediately trigger its payment action.
    const coreCheckout = document.querySelector('[data-action="checkout"]')
    if (!coreCheckout) {
      legacyObserver.disconnect()
      handoffActive = false
      if (button) {
        button.disabled = false
        button.removeAttribute('aria-busy')
        button.textContent = 'Bayar Sekarang'
      }
      return
    }

    coreCheckout.click()

    // app.js re-renders the root during the handoff. Remove the V2 checkout only
    // after the spend action has been found, preventing a visual flash of review UI.
    const cleanup = new MutationObserver(() => {
      const processing = document.querySelector('.checkout-modal .processing')
      if (!processing) return
      cleanup.disconnect()
      document.querySelector('#v21-checkout-overlay')?.remove()
    })
    cleanup.observe(document.body, { childList: true, subtree: true })

    setTimeout(() => {
      legacyObserver.disconnect()
      cleanup.disconnect()
      document.querySelector('#v21-checkout-overlay')?.remove()
      handoffActive = false
    }, 2500)
  }

  document.addEventListener('click', event => {
    const pay = event.target.closest('#v21-checkout-overlay [data-v21-pay]')
    if (!pay || pay.disabled) return

    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()

    const overlay = pay.closest('#v21-checkout-overlay')
    if (overlay) directHandoff(overlay)
  }, true)
})()
