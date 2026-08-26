(() => {
  const CORE_KEY = 'kalap-v1'
  const CONTEXT_KEY = 'kalap-v22-checkout-context'
  let paymentActive = false

  function readCore() {
    try { return JSON.parse(localStorage.getItem(CORE_KEY) || '{}') }
    catch { return {} }
  }

  function parseMoney(text = '') {
    return Number(String(text).replace(/[^0-9]/g, '')) || 0
  }

  function checkoutTotal(overlay) {
    return parseMoney(
      overlay.querySelector('.v21-checkout-sheet > footer strong')?.textContent ||
      overlay.querySelector('.v21-summary .total b')?.textContent || ''
    )
  }

  function saveCheckoutContext(overlay) {
    const activeStore = document.querySelector('.store-tab.active')?.dataset.store || 'makanan'
    const delivery = overlay.querySelector('[data-v21-delivery].active')
    const address = (() => {
      try { return JSON.parse(localStorage.getItem('kalap-v21-address') || 'null') }
      catch { return null }
    })()

    localStorage.setItem(CONTEXT_KEY, JSON.stringify({
      store: activeStore,
      delivery: delivery?.dataset.v21Delivery || null,
      deliveryLabel: delivery?.querySelector('span')?.textContent?.trim() || null,
      deliveryEta: delivery?.querySelector('small')?.textContent?.trim() || null,
      address,
      total: checkoutTotal(overlay),
      createdAt: new Date().toISOString(),
    }))
  }

  function triggerCoreSpendDirectly() {
    // app.js listens for any bubbling click on [data-action="spend-wallet"].
    // Trigger that action directly instead of clicking [data-action="checkout"],
    // because commerce-core-v21 intercepts the checkout button and would reopen
    // the V2 checkout screen again.
    const trigger = document.createElement('button')
    trigger.type = 'button'
    trigger.hidden = true
    trigger.dataset.action = 'spend-wallet'
    trigger.setAttribute('aria-hidden', 'true')
    document.body.appendChild(trigger)
    trigger.click()
    trigger.remove()
  }

  function pay(overlay) {
    if (paymentActive) return

    const core = readCore()
    const total = checkoutTotal(overlay)
    const balance = Number(core.walletBalance) || 0
    if (!total || total > balance) return

    paymentActive = true
    saveCheckoutContext(overlay)

    const button = overlay.querySelector('[data-v21-pay]')
    if (button) {
      button.disabled = true
      button.setAttribute('aria-busy', 'true')
      button.innerHTML = '<span class="v22-pay-spinner"></span> Memproses...'
    }

    // Give the user immediate visual feedback, then hand off straight to the
    // core spend action. There is no second V2 checkout and no legacy review.
    window.setTimeout(() => {
      overlay.remove()
      triggerCoreSpendDirectly()

      // Core processing is ~850 ms. Unlock after the transition is safely done.
      window.setTimeout(() => {
        paymentActive = false
      }, 1200)
    }, 140)
  }

  document.addEventListener('click', event => {
    const payButton = event.target.closest('#v21-checkout-overlay [data-v21-pay]')
    if (!payButton || payButton.disabled) return

    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()

    const overlay = payButton.closest('#v21-checkout-overlay')
    if (overlay) pay(overlay)
  }, true)
})()
