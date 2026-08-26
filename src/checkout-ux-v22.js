(() => {
  const CORE_KEY = 'kalap-v1'
  let observer = null

  function readCore() {
    try { return JSON.parse(localStorage.getItem(CORE_KEY) || '{}') }
    catch { return {} }
  }

  function parseMoney(text = '') {
    return Number(String(text).replace(/[^0-9]/g, '')) || 0
  }

  function enhanceCheckout() {
    const overlay = document.querySelector('#v21-checkout-overlay')
    if (!overlay || overlay.dataset.uxEnhanced === 'true') return
    overlay.dataset.uxEnhanced = 'true'

    const sheet = overlay.querySelector('.v21-checkout-sheet')
    const footer = sheet?.querySelector(':scope > footer')
    const payButton = footer?.querySelector('[data-v21-pay]')
    const payment = overlay.querySelector('.v21-payment')
    const totalText = footer?.querySelector('strong')?.textContent || overlay.querySelector('.v21-summary .total b')?.textContent || ''
    const total = parseMoney(totalText)
    const core = readCore()
    const balance = Number(core.walletBalance) || 0
    const insufficient = total > balance

    // Recognition over recall: separate payment name and balance visually and semantically.
    const paymentInfo = payment?.querySelector('div')
    if (paymentInfo) {
      const name = paymentInfo.querySelector('strong')
      const balanceNode = paymentInfo.querySelector('small')
      if (name) name.textContent = 'KALAP Wallet'
      if (balanceNode) balanceNode.textContent = `Saldo tersedia Rp${balance.toLocaleString('id-ID')}`
    }

    // Error prevention: warn before the user attempts payment.
    const summaryCard = [...overlay.querySelectorAll('.v21-checkout-card')].find(card => card.querySelector('.v21-summary'))
    if (insufficient && summaryCard && !summaryCard.querySelector('.v22-checkout-warning')) {
      const warning = document.createElement('div')
      warning.className = 'v22-checkout-warning'
      warning.innerHTML = `<span>!</span><div><strong>Saldo belum cukup</strong><br>Kurang Rp${(total - balance).toLocaleString('id-ID')} untuk menyelesaikan checkout ini.</div>`
      summaryCard.appendChild(warning)
      payment?.classList.add('is-insufficient')
    }

    if (payButton) {
      if (insufficient) {
        payButton.disabled = true
        payButton.textContent = 'Saldo Tidak Cukup'
        payButton.setAttribute('aria-disabled', 'true')
      } else {
        payButton.disabled = false
        payButton.textContent = 'Bayar Sekarang'
        payButton.removeAttribute('aria-disabled')
      }
    }

    // Visible system state: persist selection in the DOM and announce it.
    overlay.querySelectorAll('[data-v21-delivery]').forEach(button => {
      button.setAttribute('aria-pressed', button.classList.contains('active') ? 'true' : 'false')
      button.addEventListener('click', () => {
        overlay.querySelectorAll('[data-v21-delivery]').forEach(option => {
          option.setAttribute('aria-pressed', option === button ? 'true' : 'false')
        })
      })
    })
  }

  function start() {
    enhanceCheckout()
    if (observer) return
    observer = new MutationObserver(() => enhanceCheckout())
    observer.observe(document.body, { childList: true, subtree: true })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
})()
