(() => {
  let scheduled = false

  function syncModalState() {
    scheduled = false
    const hasOpenSheet = Boolean(
      document.querySelector('.overlay') ||
      document.querySelector('.v2-overlay')
    )
    document.body.classList.toggle('modal-open', hasOpenSheet)
  }

  function scheduleSync() {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(syncModalState)
  }

  const observer = new MutationObserver(scheduleSync)
  observer.observe(document.body, { childList: true, subtree: true })

  document.addEventListener('click', scheduleSync, true)
  document.addEventListener('keydown', scheduleSync, true)
  window.addEventListener('pageshow', scheduleSync)

  syncModalState()
})()
