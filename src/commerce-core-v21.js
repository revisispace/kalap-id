import { catalog, storefronts } from './data/catalog-v12.js'

(() => {
  const META_KEY = 'kalap-v2-meta'
  const CORE_KEY = 'kalap-v1'
  const CUSTOM_KEY = 'kalap-v2-customizations'
  const RECENT_KEY = 'kalap-v21-recent'
  const ADDRESS_KEY = 'kalap-v21-address'
  const FILTER_KEY = 'kalap-v21-filter'
  let checkoutBypass = false
  let activeProduct = null
  let detailQty = 1
  let lastStore = null

  const money = value => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(Number(value) || 0)

  const esc = value => String(value ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;')

  const readJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) }
    catch { return fallback }
  }
  const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value))

  const allProducts = () => storefronts.flatMap(store => (catalog[store.key] || []).map(product => ({ ...product, store: store.key })))
  const productIndex = new Map(allProducts().map(product => [`${product.store}:${product.id}`, product]))
  const storeInfo = key => storefronts.find(store => store.key === key) || { key, label:key, icon:'🛍️' }
  const activeStore = () => document.querySelector('.store-tab.active')?.dataset.store || 'makanan'
  const getProduct = (store, id) => productIndex.get(`${store}:${id}`) || (catalog[store] || []).find(item => item.id === id)

  function hash(text) {
    return [...String(text)].reduce((sum, char) => ((sum * 31) + char.charCodeAt(0)) >>> 0, 17)
  }

  function brandOf(product) {
    if (product.brand) return product.brand
    if (product.store === 'makanan') return restaurantFor(product)
    const brands = ['Nike','adidas','PUMA','UNIQLO','Levi\'s','The North Face','Patagonia','Carhartt','Polo','Lacoste','ASICS','New Balance','HOKA','On','Converse','Vans','Salomon','Stanley','YETI','Hydro Flask','Owala','KINTO','Zojirushi','Thermos','LocknLock','TYESO','Starbucks','Herschel','Fjallraven','JanSport','Eastpak','Coach','Longchamp','Michael Kors','Samsung','Apple','Xiaomi','Redmi','POCO']
    return brands.find(name => product.name.toLowerCase().startsWith(name.toLowerCase())) || product.name.split(' ')[0]
  }

  function restaurantFor(product) {
    const names = ['Dapur Nusantara','Warung Senja','Rasa Kampung','Sambal & Co.','Kedai Tengah Kota','Nasi Rame 88','Dapur Pagi','Jajan Lokal']
    return names[hash(product.name) % names.length]
  }

  function sellerKey(product) {
    return product.store === 'makanan' ? restaurantFor(product) : brandOf(product)
  }

  function sellerProducts(product) {
    const key = sellerKey(product)
    return (catalog[product.store] || []).filter(item => sellerKey({ ...item, store: product.store }) === key).slice(0, 20)
  }

  function productFromCard(card) {
    const id = card?.querySelector('[data-action="add"][data-id]')?.dataset.id
    if (!id) return null
    const store = activeStore()
    const product = getProduct(store, id)
    return product ? { ...product, store } : null
  }

  function productFacts(product) {
    const seed = hash(product.id)
    return {
      sold: 180 + (seed % 9800),
      stock: 6 + (seed % 55),
      followers: 1200 + (seed % 98000),
      response: 90 + (seed % 10),
      joined: 2019 + (seed % 6),
    }
  }

  function specs(product) {
    if (product.store === 'makanan') return [
      ['Kategori', 'Makanan siap santap'], ['Porsi', hash(product.id)%2 ? '1 orang' : '1–2 orang'], ['Waktu siap', `${12 + hash(product.id)%16} menit`], ['Kemasan', 'Food grade']
    ]
    if (product.store === 'hp') {
      const match = product.name.match(/(\d+\/\d+ GB|\d+ GB)/i)
      return [['Brand', brandOf(product)], ['Memori', match?.[1] || 'Sesuai varian'], ['Garansi', '1 tahun'], ['Kondisi', 'Baru'], ['Jaringan', '4G / 5G sesuai model']]
    }
    if (product.store === 'sepatu') return [['Brand', brandOf(product)], ['Kondisi', 'Baru'], ['Size', 'EU 38–44'], ['Material', 'Sesuai model'], ['Box', 'Original packaging']]
    if (product.store === 'pakaian') return [['Brand', brandOf(product)], ['Kondisi', 'Baru'], ['Size', 'S–XL'], ['Fit', 'Pilihan tersedia'], ['Perawatan', 'Ikuti care label']]
    if (product.store === 'tas') return [['Brand', brandOf(product)], ['Kondisi', 'Baru'], ['Material', 'Sesuai model'], ['Packaging', 'Standard / gift'], ['Garansi', '7 hari pengecekan']]
    if (product.store === 'tumbler') return [['Brand', brandOf(product)], ['Kondisi', 'Baru'], ['Material', 'Food grade'], ['Tutup', 'Pilihan tersedia'], ['Perawatan', 'Cuci sebelum digunakan']]
    return [['Brand', brandOf(product)], ['Kondisi', 'Baru']]
  }

  function optionConfig(product) {
    if (product.store === 'makanan') return [
      { key:'portion', label:'Porsi', values:['Regular','Jumbo'], def:'Regular' },
      { key:'spice', label:'Level pedas', values:['Tidak pedas','Sedang','Pedas','Extra pedas'], def:'Sedang' },
      { key:'utensils', label:'Alat makan', values:['Tidak perlu','Sertakan'], def:'Tidak perlu' },
      { key:'note', label:'Catatan untuk restoran', text:true, placeholder:'Contoh: sambal dipisah, tanpa bawang...' },
    ]
    if (product.store === 'pakaian') return [
      { key:'size', label:'Ukuran', values:['S','M','L','XL'], def:'M' }, { key:'fit', label:'Fit', values:['Regular','Relaxed','Oversized'], def:'Regular' }
    ]
    if (product.store === 'sepatu') return [
      { key:'size', label:'Ukuran EU', values:['38','39','40','41','42','43','44'], def:'41' }, { key:'pack', label:'Packaging', values:['Standard Box','Eco Packaging'], def:'Standard Box' }
    ]
    if (product.store === 'tumbler') return [
      { key:'lid', label:'Tipe tutup', values:['Standard','Straw','Flip'], def:'Standard' }, { key:'engraving', label:'Nama pada tumbler', text:true, placeholder:'Opsional, maks. 16 karakter', max:16 }
    ]
    if (product.store === 'tas') return [
      { key:'carry', label:'Cara pakai', values:['Standard','Crossbody','Shoulder'], def:'Standard' }, { key:'gift', label:'Packaging', values:['Regular','Gift Wrap'], def:'Regular' }
    ]
    if (product.store === 'hp') return [
      { key:'setup', label:'Setup awal', values:['Standard','Transfer Data','Siap Pakai'], def:'Standard' }, { key:'sim', label:'Preferensi SIM', values:['Physical SIM','eSIM jika tersedia'], def:'Physical SIM' }
    ]
    return []
  }

  function savedSelections(product) {
    return readJSON(CUSTOM_KEY, {})[`${product.store}:${product.id}`]?.selections || {}
  }

  function gallery(product) {
    const query = encodeURIComponent(`${product.name} official product`)
    const alt1 = `https://tse1.mm.bing.net/th?q=${query}&w=900&h=900&c=7&rs=1&p=0`
    const alt2 = `https://tse2.mm.bing.net/th?q=${query}%20detail&w=900&h=900&c=7&rs=1&p=0`
    return [...new Set([product.image, alt1, alt2])]
  }

  function reviewSet(product) {
    const seed = hash(product.id)
    const names = ['Alya','Raka','Dimas','Naya','Keira','Bimo','Tara','Juno']
    const phrases = product.store === 'makanan'
      ? ['Rasanya pas dan porsinya oke.','Datang masih hangat, bakal order lagi.','Bumbunya terasa dan packaging rapi.']
      : ['Barang sesuai ekspektasi dan packing rapi.','Detail produk cocok dengan yang diterima.','Pengiriman cepat dan kondisinya bagus.']
    return [0,1,2].map(i => ({ name:names[(seed+i*3)%names.length], rating: 4 + ((seed+i)%2), text:phrases[(seed+i)%phrases.length] }))
  }

  function addRecent(product) {
    const current = readJSON(RECENT_KEY, [])
    const next = [{ id:product.id, store:product.store, name:product.name, image:product.image, price:product.price, viewedAt:Date.now() }, ...current.filter(item => !(item.id===product.id && item.store===product.store))].slice(0,20)
    writeJSON(RECENT_KEY, next)
    renderRecentSection()
  }

  function isFavorite(product) {
    const favorites = readJSON(META_KEY, {}).favorites || []
    return favorites.some(item => item.id === product.id && (!item.store || item.store === product.store))
  }

  function toggleFavorite(product) {
    const meta = readJSON(META_KEY, {})
    const favorites = Array.isArray(meta.favorites) ? meta.favorites : []
    const index = favorites.findIndex(item => item.id === product.id && (!item.store || item.store === product.store))
    if (index >= 0) favorites.splice(index,1)
    else favorites.unshift({ id:product.id, store:product.store, name:product.name, price:money(product.price), image:product.image })
    meta.favorites = favorites.slice(0,100)
    writeJSON(META_KEY, meta)
    syncHearts()
    updateDetailHeart(product)
  }

  function syncHearts() {
    const favorites = readJSON(META_KEY, {}).favorites || []
    document.querySelectorAll('.product-card').forEach(card => {
      const product = productFromCard(card)
      if (!product) return
      let heart = card.querySelector('.favorite-button')
      if (!heart) {
        heart = document.createElement('button')
        heart.type = 'button'
        heart.className = 'favorite-button'
        heart.setAttribute('aria-label','Favorit')
        card.querySelector('.product-image-wrap')?.appendChild(heart)
      }
      heart.dataset.v21Favorite = `${product.store}:${product.id}`
      const active = favorites.some(item => item.id===product.id && (!item.store || item.store===product.store))
      heart.classList.toggle('active',active)
      heart.textContent = active ? '♥' : '♡'
    })
  }

  function updateDetailHeart(product) {
    const button = document.querySelector('[data-v21-favorite]')
    if (!button) return
    const active = isFavorite(product)
    button.classList.toggle('active',active)
    button.innerHTML = active ? '♥ <span>Tersimpan</span>' : '♡ <span>Favorit</span>'
  }

  function renderOptions(product, selections) {
    return optionConfig(product).map(option => {
      if (option.text) return `<label class="v21-option text"><span>${esc(option.label)}</span><input data-v21-input="${option.key}" value="${esc(selections[option.key]||'')}" placeholder="${esc(option.placeholder||'')}" ${option.max?`maxlength="${option.max}"`:''}></label>`
      const selected = selections[option.key] || option.def
      return `<div class="v21-option"><span>${esc(option.label)}</span><div class="v21-chips">${option.values.map(value=>`<button type="button" data-v21-chip="${option.key}" data-value="${esc(value)}" class="${selected===value?'active':''}">${esc(value)}</button>`).join('')}</div></div>`
    }).join('')
  }

  function openProduct(product) {
    if (!product) return
    closeProduct()
    activeProduct = product
    detailQty = 1
    addRecent(product)
    const info = storeInfo(product.store)
    const facts = productFacts(product)
    const seller = sellerKey(product)
    const selections = savedSelections(product)
    const images = gallery(product)
    const reviews = reviewSet(product)
    const related = (catalog[product.store] || []).filter(item=>item.id!==product.id).slice(hash(product.id)%10, hash(product.id)%10 + 6)

    const overlay = document.createElement('div')
    overlay.id = 'v21-product-overlay'
    overlay.className = `v21-overlay ${product.store==='makanan'?'food':'goods'}`
    overlay.innerHTML = `<section class="v21-product-sheet" role="dialog" aria-modal="true">
      <header class="v21-topbar"><button data-v21-close>←</button><strong>Detail Produk</strong><button data-v21-favorite>♡ <span>Favorit</span></button></header>
      <div class="v21-product-scroll">
        <section class="v21-gallery"><a class="v21-main-image" href="${product.imageSearch}" target="_blank" rel="noopener"><img data-v21-main src="${images[0]}" alt="${esc(product.name)}"><span>↗ Lihat gambar</span></a><div class="v21-thumbs">${images.map((src,i)=>`<button data-v21-gallery="${i}" class="${i===0?'active':''}"><img src="${src}" alt=""></button>`).join('')}</div></section>
        <section class="v21-title-block"><small>${info.icon} ${esc(info.label)} · ${esc(brandOf(product))}</small><h1>${esc(product.name)}</h1><div class="v21-price">${money(product.price)}</div><div class="v21-stats"><span>★ ${product.rating}</span><span>${Number(product.reviewCount).toLocaleString('id-ID')} ulasan</span><span>${facts.sold.toLocaleString('id-ID')} terjual</span></div><div class="v21-stock">✓ Stok ${facts.stock} · siap diproses</div></section>
        <button class="v21-seller" data-v21-seller><div class="v21-seller-logo">${product.store==='makanan'?'🍜':info.icon}</div><div><small>${product.store==='makanan'?'RESTORAN':'OFFICIAL STORE'}</small><strong>${esc(seller)}</strong><span>★ ${(4.6 + (hash(seller)%4)/10).toFixed(1)} · ${facts.followers.toLocaleString('id-ID')} followers</span></div><b>Lihat toko →</b></button>
        <section class="v21-section"><div class="v21-section-head"><h2>Spesifikasi</h2></div><div class="v21-specs">${specs(product).map(([k,v])=>`<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}</div></section>
        <section class="v21-section"><div class="v21-section-head"><h2>Kustomisasi</h2><small>Pilih sebelum masuk keranjang</small></div>${renderOptions(product,selections)}</section>
        <section class="v21-section"><div class="v21-section-head"><h2>Pengiriman</h2></div><div class="v21-delivery"><span>${product.store==='makanan'?'🛵':'🚚'}</span><div><strong>${product.store==='makanan'?'Antar langsung':'Regular Delivery'}</strong><small>${product.store==='makanan'?'Estimasi 25–40 menit':'Estimasi 1–3 hari'}</small></div><b>Gratis</b></div></section>
        <section class="v21-section"><div class="v21-section-head"><h2>Ulasan pembeli</h2><button data-v21-allreviews>Lihat semua</button></div><div class="v21-reviews">${reviews.map(r=>`<article><div><strong>${r.name}</strong><span>${'★'.repeat(r.rating)}</span></div><p>${esc(r.text)}</p></article>`).join('')}</div></section>
        <section class="v21-section"><div class="v21-section-head"><h2>Produk serupa</h2></div><div class="v21-related">${related.map(item=>`<button data-v21-related="${item.id}"><img src="${item.image}" alt=""><strong>${esc(item.name)}</strong><span>${money(item.price)}</span></button>`).join('')}</div></section>
      </div>
      <footer class="v21-product-footer"><div class="v21-qty"><button data-v21-qty="-1">−</button><strong data-v21-qty-value>1</strong><button data-v21-qty="1">+</button></div><button class="v21-add" data-v21-add><span>Tambah ke Keranjang</span><b>${money(product.price)}</b></button></footer>
    </section>`

    overlay.addEventListener('click', event => {
      if (event.target===overlay || event.target.closest('[data-v21-close]')) return closeProduct()
      if (event.target.closest('[data-v21-favorite]')) return toggleFavorite(product)
      const galleryButton = event.target.closest('[data-v21-gallery]')
      if (galleryButton) {
        const index = Number(galleryButton.dataset.v21Gallery)
        overlay.querySelector('[data-v21-main]').src = images[index]
        overlay.querySelectorAll('[data-v21-gallery]').forEach(btn=>btn.classList.toggle('active',btn===galleryButton))
        return
      }
      const chip = event.target.closest('[data-v21-chip]')
      if (chip) {
        overlay.querySelectorAll(`[data-v21-chip="${CSS.escape(chip.dataset.v21Chip)}"]`).forEach(btn=>btn.classList.remove('active'))
        chip.classList.add('active')
        return
      }
      const qty = event.target.closest('[data-v21-qty]')
      if (qty) {
        detailQty = Math.max(1,Math.min(9,detailQty+Number(qty.dataset.v21Qty)))
        overlay.querySelector('[data-v21-qty-value]').textContent = detailQty
        overlay.querySelector('.v21-add b').textContent = money(product.price*detailQty)
        return
      }
      if (event.target.closest('[data-v21-seller]')) return openSeller(product)
      const relatedButton = event.target.closest('[data-v21-related]')
      if (relatedButton) {
        const relatedProduct = getProduct(product.store,relatedButton.dataset.v21Related)
        if (relatedProduct) openProduct({ ...relatedProduct, store:product.store })
        return
      }
      if (event.target.closest('[data-v21-allreviews]')) return openReviews(product)
      if (event.target.closest('[data-v21-add]')) return addToCartFromDetail(product,overlay)
    })

    document.body.appendChild(overlay)
    document.body.classList.add('v21-open')
    updateDetailHeart(product)
  }

  function collectSelections(product, overlay) {
    const result = {}
    optionConfig(product).forEach(option => {
      if (option.text) result[option.key] = overlay.querySelector(`[data-v21-input="${CSS.escape(option.key)}"]`)?.value?.trim() || ''
      else result[option.key] = overlay.querySelector(`[data-v21-chip="${CSS.escape(option.key)}"].active`)?.dataset.value || option.def
    })
    return result
  }

  function addToCartFromDetail(product,overlay) {
    const custom = readJSON(CUSTOM_KEY,{})
    const selections = collectSelections(product,overlay)
    custom[`${product.store}:${product.id}`] = { selections, summary:Object.values(selections).filter(Boolean).join(' · '), updatedAt:Date.now() }
    writeJSON(CUSTOM_KEY,custom)
    closeProduct()
    const storeButton = document.querySelector(`.store-tab[data-store="${product.store}"]`)
    if (!storeButton?.classList.contains('active')) storeButton?.click()
    setTimeout(()=>{
      const add = [...document.querySelectorAll('.product-card [data-action="add"]')].find(btn=>btn.dataset.id===product.id)
      if (!add) return
      checkoutBypass = true
      for(let i=0;i<detailQty;i+=1) add.click()
      checkoutBypass = false
    },90)
  }

  function closeProduct() {
    document.querySelector('#v21-product-overlay')?.remove()
    document.body.classList.remove('v21-open')
    activeProduct = null
  }

  function openSeller(product) {
    const seller = sellerKey(product)
    const info = storeInfo(product.store)
    const products = sellerProducts(product)
    const facts = productFacts(product)
    const old = document.querySelector('#v21-seller-overlay'); old?.remove()
    const overlay = document.createElement('div')
    overlay.id='v21-seller-overlay'; overlay.className=`v21-overlay seller ${product.store==='makanan'?'food':'goods'}`
    overlay.innerHTML=`<section class="v21-seller-sheet"><header><button data-v21-seller-close>←</button><strong>${product.store==='makanan'?'Restoran':'Toko'}</strong><span></span></header><div class="v21-seller-scroll"><section class="v21-store-hero"><div>${product.store==='makanan'?'🍜':info.icon}</div><small>${product.store==='makanan'?'RESTORAN':'OFFICIAL STORE'}</small><h1>${esc(seller)}</h1><p>★ ${(4.6+(hash(seller)%4)/10).toFixed(1)} · ${facts.followers.toLocaleString('id-ID')} followers · ${facts.response}% respons cepat</p><div><span>✓ Terverifikasi</span><span>Sejak ${facts.joined}</span></div></section><section class="v21-store-products"><div class="v21-section-head"><h2>${product.store==='makanan'?'Menu':'Produk'} dari ${esc(seller)}</h2></div><div>${products.map(item=>`<button data-v21-store-product="${item.id}"><img src="${item.image}" alt=""><strong>${esc(item.name)}</strong><span>${money(item.price)}</span></button>`).join('')}</div></section></div></section>`
    overlay.addEventListener('click',event=>{
      if(event.target===overlay||event.target.closest('[data-v21-seller-close]')) return overlay.remove()
      const item=event.target.closest('[data-v21-store-product]')
      if(item){ const next=getProduct(product.store,item.dataset.v21StoreProduct); overlay.remove(); if(next)openProduct({...next,store:product.store}) }
    })
    document.body.appendChild(overlay)
  }

  function openReviews(product) {
    const overlay=document.createElement('div'); overlay.className='v21-overlay reviews'; overlay.id='v21-reviews-overlay'
    const base=reviewSet(product); const reviews=[...base,...base.map((r,i)=>({...r,name:['Fajar','Siska','Reno'][i],text:i===0?'Worth it untuk harganya.':i===1?'Sudah coba dan overall puas.':'Sesuai deskripsi, akan beli lagi.'}))]
    overlay.innerHTML=`<section class="v21-simple-sheet"><header><button data-v21-review-close>←</button><strong>Ulasan Pembeli</strong><span>★ ${product.rating}</span></header><div class="v21-review-list">${reviews.map(r=>`<article><div><strong>${r.name}</strong><span>${'★'.repeat(r.rating)}</span></div><p>${esc(r.text)}</p><small>Pembelian terverifikasi</small></article>`).join('')}</div></section>`
    overlay.addEventListener('click',e=>{if(e.target===overlay||e.target.closest('[data-v21-review-close]'))overlay.remove()}); document.body.appendChild(overlay)
  }

  function renderRecentSection() {
    const marketplace=document.querySelector('.marketplace'); if(!marketplace)return
    document.querySelector('.v21-recent')?.remove()
    const recent=readJSON(RECENT_KEY,[]).slice(0,10); if(!recent.length)return
    const section=document.createElement('section'); section.className='v21-recent'
    section.innerHTML=`<div class="v21-home-head"><div><small>TERAKHIR DILIHAT</small><h2>Lanjut lihat produk</h2></div><button data-v21-clear-recent>Hapus</button></div><div class="v21-recent-strip">${recent.map(item=>`<button data-v21-recent="${item.store}:${item.id}"><img src="${item.image}" alt=""><strong>${esc(item.name)}</strong><span>${money(item.price)}</span></button>`).join('')}</div>`
    marketplace.insertAdjacentElement('beforebegin',section)
  }

  function renderFilterBar() {
    const marketplace=document.querySelector('.marketplace'); if(!marketplace)return
    const store=activeStore(); if(lastStore===store && document.querySelector('.v21-filterbar'))return
    lastStore=store; document.querySelector('.v21-filterbar')?.remove()
    const brands=[...new Set((catalog[store]||[]).map(item=>brandOf({...item,store})))].slice(0,18)
    const bar=document.createElement('div'); bar.className='v21-filterbar'
    bar.innerHTML=`<button data-v21-filter-open>☰ Filter</button><select data-v21-brand><option value="">Semua brand</option>${brands.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join('')}</select><button data-v21-price="low">Termurah</button><button data-v21-price="high">Termahal</button>`
    const resultMeta=marketplace.querySelector('.result-meta'); resultMeta?.insertAdjacentElement('afterend',bar)
  }

  function loadAllVisible(callback) {
    let tries=0
    const tick=()=>{ const more=document.querySelector('[data-action="load-more"]'); if(more&&tries<6){tries++;more.click();setTimeout(tick,60)} else callback() }
    tick()
  }

  function filterCards({brand='',min=0,max=Infinity,sort=null}={}) {
    loadAllVisible(()=>{
      const cards=[...document.querySelectorAll('.product-card')]
      cards.forEach(card=>{
        const product=productFromCard(card); if(!product)return
        const okBrand=!brand||brandOf(product)===brand; const okPrice=product.price>=min&&product.price<=max
        card.hidden=!(okBrand&&okPrice)
      })
      const grid=document.querySelector('.product-grid')
      if(sort&&grid){cards.filter(c=>!c.hidden).sort((a,b)=>{const pa=productFromCard(a)?.price||0,pb=productFromCard(b)?.price||0;return sort==='low'?pa-pb:pb-pa}).forEach(card=>grid.appendChild(card))}
    })
  }

  function openAdvancedFilter() {
    const saved=readJSON(FILTER_KEY,{min:'',max:''}); const overlay=document.createElement('div'); overlay.id='v21-filter-overlay'; overlay.className='v21-overlay filter'
    overlay.innerHTML=`<section class="v21-filter-sheet"><header><strong>Filter Produk</strong><button data-v21-filter-close>×</button></header><div><label>Harga minimum<input data-v21-min inputmode="numeric" value="${esc(saved.min||'')}" placeholder="500000"></label><label>Harga maksimum<input data-v21-max inputmode="numeric" value="${esc(saved.max||'')}" placeholder="20000000"></label></div><footer><button data-v21-reset-filter>Reset</button><button data-v21-apply-filter>Terapkan</button></footer></section>`
    overlay.addEventListener('click',event=>{if(event.target===overlay||event.target.closest('[data-v21-filter-close]'))return overlay.remove();if(event.target.closest('[data-v21-reset-filter]')){writeJSON(FILTER_KEY,{});overlay.remove();filterCards();return}if(event.target.closest('[data-v21-apply-filter]')){const min=Number(overlay.querySelector('[data-v21-min]').value.replace(/\D/g,''))||0;const max=Number(overlay.querySelector('[data-v21-max]').value.replace(/\D/g,''))||Infinity;writeJSON(FILTER_KEY,{min,max:max===Infinity?'':max});overlay.remove();filterCards({min,max})}})
    document.body.appendChild(overlay)
  }

  function enhanceSearchAutocomplete() {
    const input=document.querySelector('#search-input'); if(!input||input.dataset.v21Search)return
    input.dataset.v21Search='true'; const box=document.createElement('div'); box.className='v21-suggestions'; input.closest('.search-box')?.appendChild(box)
    input.addEventListener('input',()=>{const q=input.value.trim().toLowerCase();if(q.length<2){box.innerHTML='';box.hidden=true;return}const store=activeStore();const matches=(catalog[store]||[]).filter(item=>item.name.toLowerCase().includes(q)).slice(0,6);box.innerHTML=matches.map(item=>`<button type="button" data-v21-suggest="${item.id}"><span>${esc(item.name)}</span><b>${money(item.price)}</b></button>`).join('');box.hidden=!matches.length})
    box.addEventListener('click',event=>{const btn=event.target.closest('[data-v21-suggest]');if(!btn)return;const product=getProduct(activeStore(),btn.dataset.v21Suggest);box.hidden=true;if(product)openProduct({...product,store:activeStore()})})
  }

  function cartInfo() {
    const store=activeStore(); const lines=[...document.querySelectorAll('.cart-line')]; const totalText=document.querySelector('.cart-summary > div:first-child strong')?.textContent||'0'; const total=Number(totalText.replace(/\D/g,''))||0
    return {store,lines,total,count:lines.reduce((sum,line)=>sum+(Number(line.querySelector('.qty-control b')?.textContent)||1),0)}
  }

  function defaultAddress() { return {label:'Rumah',name:'Kamu',detail:'Jakarta, Indonesia'} }

  function openCheckoutV2() {
    const info=cartInfo(); if(!info.lines.length)return
    const address=readJSON(ADDRESS_KEY,defaultAddress()); const wallet=readJSON(CORE_KEY,{}).walletBalance||0
    const overlay=document.createElement('div');overlay.id='v21-checkout-overlay';overlay.className=`v21-overlay checkout ${info.store==='makanan'?'food':'goods'}`
    const delivery=info.store==='makanan'?[['instant','🛵 Antar langsung','25–40 menit','Gratis'],['priority','⚡ Prioritas','15–25 menit','Gratis']]:[['regular','🚚 Regular','1–3 hari','Gratis'],['same','⚡ Same Day','Hari ini','Gratis']]
    overlay.innerHTML=`<section class="v21-checkout-sheet"><header><button data-v21-checkout-close>←</button><strong>Checkout</strong><span>${info.count} item</span></header><div class="v21-checkout-scroll"><section class="v21-checkout-card"><small>ALAMAT PENGIRIMAN</small><div class="v21-address"><span>📍</span><div><strong>${esc(address.label)} · ${esc(address.name)}</strong><p>${esc(address.detail)}</p></div><button data-v21-edit-address>Ubah</button></div></section><section class="v21-checkout-card"><small>PILIH PENGIRIMAN</small><div class="v21-delivery-options">${delivery.map((d,i)=>`<button data-v21-delivery="${d[0]}" class="${i===0?'active':''}"><span>${d[1]}</span><small>${d[2]}</small><b>${d[3]}</b></button>`).join('')}</div></section><section class="v21-checkout-card"><small>METODE PEMBAYARAN</small><div class="v21-payment"><span>💳</span><div><strong>KALAP Wallet</strong><small>Saldo ${money(wallet)}</small></div><b>✓</b></div></section><section class="v21-checkout-card"><small>RINGKASAN</small><div class="v21-summary"><div><span>Subtotal (${info.count} item)</span><b>${money(info.total)}</b></div><div><span>Pengiriman</span><b>Gratis</b></div><div class="total"><span>Total</span><b>${money(info.total)}</b></div></div></section></div><footer><div><small>Total pembayaran</small><strong>${money(info.total)}</strong></div><button data-v21-pay>Lanjut ke Pembayaran</button></footer></section>`
    overlay.addEventListener('click',event=>{if(event.target===overlay||event.target.closest('[data-v21-checkout-close]'))return overlay.remove();const deliveryBtn=event.target.closest('[data-v21-delivery]');if(deliveryBtn){overlay.querySelectorAll('[data-v21-delivery]').forEach(btn=>btn.classList.remove('active'));deliveryBtn.classList.add('active');return}if(event.target.closest('[data-v21-edit-address]'))return editAddress(()=>{overlay.remove();openCheckoutV2()});if(event.target.closest('[data-v21-pay]')){overlay.remove();const coreCheckout=document.querySelector('[data-action="checkout"]');if(coreCheckout){checkoutBypass=true;coreCheckout.click();checkoutBypass=false}}})
    document.body.appendChild(overlay)
  }

  function editAddress(done) {
    const address=readJSON(ADDRESS_KEY,defaultAddress());const overlay=document.createElement('div');overlay.className='v21-overlay address';overlay.id='v21-address-overlay'
    overlay.innerHTML=`<section class="v21-filter-sheet"><header><strong>Alamat Pengiriman</strong><button data-v21-address-close>×</button></header><div><label>Label<input data-v21-address-label value="${esc(address.label)}"></label><label>Nama penerima<input data-v21-address-name value="${esc(address.name)}"></label><label>Alamat<textarea data-v21-address-detail>${esc(address.detail)}</textarea></label></div><footer><button data-v21-address-close>Batal</button><button data-v21-address-save>Simpan</button></footer></section>`
    overlay.addEventListener('click',event=>{if(event.target===overlay||event.target.closest('[data-v21-address-close]'))return overlay.remove();if(event.target.closest('[data-v21-address-save]')){writeJSON(ADDRESS_KEY,{label:overlay.querySelector('[data-v21-address-label]').value.trim()||'Rumah',name:overlay.querySelector('[data-v21-address-name]').value.trim()||'Kamu',detail:overlay.querySelector('[data-v21-address-detail]').value.trim()||'Jakarta, Indonesia'});overlay.remove();done?.()}});document.body.appendChild(overlay)
  }

  function annotateCart() {
    const custom=readJSON(CUSTOM_KEY,{})
    document.querySelectorAll('.cart-line').forEach(line=>{if(line.querySelector('.v21-cart-option'))return;const id=line.querySelector('[data-action="qty"]')?.dataset.id;if(!id)return;const saved=custom[`${activeStore()}:${id}`];if(!saved?.summary)return;const small=document.createElement('small');small.className='v21-cart-option';small.textContent=saved.summary;line.querySelector('.line-copy')?.appendChild(small)})
  }

  document.addEventListener('click',event=>{
    if(checkoutBypass)return
    const heart=event.target.closest('[data-v21-favorite]')
    if(heart){event.preventDefault();event.stopPropagation();const [store,id]=heart.dataset.v21Favorite.split(':');const product=getProduct(store,id);if(product)toggleFavorite({...product,store});return}
    const checkout=event.target.closest('[data-action="checkout"]')
    if(checkout){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();openCheckoutV2();return}
    const card=event.target.closest('.product-card')
    if(card){
      if(event.target.closest('.product-image-wrap a'))return
      if(event.target.closest('.favorite-button'))return
      const product=productFromCard(card);if(!product)return
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();openProduct(product);return
    }
    const recent=event.target.closest('[data-v21-recent]')
    if(recent){const [store,id]=recent.dataset.v21Recent.split(':');const p=getProduct(store,id);if(p)openProduct({...p,store});return}
    if(event.target.closest('[data-v21-clear-recent]')){writeJSON(RECENT_KEY,[]);renderRecentSection();return}
    if(event.target.closest('[data-v21-filter-open]')){openAdvancedFilter();return}
    const brand=event.target.closest('[data-v21-brand]');if(brand){filterCards({brand:brand.value});return}
    const price=event.target.closest('[data-v21-price]');if(price){filterCards({sort:price.dataset.v21Price});return}
  },true)

  document.addEventListener('change',event=>{if(event.target.matches('[data-v21-brand]'))filterCards({brand:event.target.value})})
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){document.querySelectorAll('#v21-product-overlay,#v21-seller-overlay,#v21-reviews-overlay,#v21-filter-overlay,#v21-checkout-overlay,#v21-address-overlay').forEach(node=>node.remove());document.body.classList.remove('v21-open')}})

  function enhance() {
    syncHearts(); renderRecentSection(); renderFilterBar(); enhanceSearchAutocomplete(); annotateCart()
  }

  setInterval(enhance,500)
  enhance()
})()
