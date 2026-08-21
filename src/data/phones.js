const groups = [
  // Samsung — 34 variants
  { brand: 'Samsung', model: 'Samsung Galaxy A16 5G', variants: [['8/256 GB','Blue Black',2699000],['8/256 GB','Light Green',2699000],['8/128 GB','Blue Black',2399000],['8/128 GB','Light Gray',2399000]] },
  { brand: 'Samsung', model: 'Samsung Galaxy A26 5G', variants: [['8/256 GB','Black',4299000],['8/256 GB','Mint',4299000],['8/128 GB','Black',3899000],['8/128 GB','White',3899000]] },
  { brand: 'Samsung', model: 'Samsung Galaxy A36 5G', variants: [['8/128 GB','Awesome Black',5199000],['8/128 GB','Awesome White',5199000],['8/256 GB','Awesome Black',5699000],['8/256 GB','Awesome Lavender',5699000],['12/256 GB','Awesome Black',6199000],['12/256 GB','Awesome Lime',6199000]] },
  { brand: 'Samsung', model: 'Samsung Galaxy A56 5G', variants: [['8/128 GB','Awesome Graphite',5999000],['8/128 GB','Awesome Lightgray',5999000],['8/256 GB','Awesome Graphite',6499000],['8/256 GB','Awesome Olive',6499000],['12/256 GB','Awesome Graphite',6999000],['12/256 GB','Awesome Pink',6999000]] },
  { brand: 'Samsung', model: 'Samsung Galaxy S25 FE', variants: [['8/256 GB','Navy',12499000],['8/256 GB','Jetblack',12499000],['8/512 GB','Navy',15499000],['8/512 GB','Icyblue',15499000]] },
  { brand: 'Samsung', model: 'Samsung Galaxy S24 FE', variants: [['8/256 GB','Graphite',9999000],['8/256 GB','Blue',9999000],['8/128 GB','Graphite',8999000],['8/128 GB','Gray',8999000]] },
  { brand: 'Samsung', model: 'Samsung Galaxy S25', variants: [['12/256 GB','Navy',14999000],['12/256 GB','Silver Shadow',14999000],['12/512 GB','Navy',16999000],['12/512 GB','Icyblue',16999000]] },
  { brand: 'Samsung', model: 'Samsung Galaxy S25+', variants: [['12/256 GB','Navy',17999000],['12/512 GB','Silver Shadow',19999000]] },

  // Xiaomi / Redmi / POCO — 33 variants
  { brand: 'Xiaomi', model: 'Redmi Note 14', variants: [['8/128 GB','Midnight Black',2399000],['8/128 GB','Mist Purple',2399000],['8/256 GB','Midnight Black',2799000],['8/256 GB','Ocean Blue',2799000]] },
  { brand: 'Xiaomi', model: 'Redmi Note 14 5G', variants: [['8/256 GB','Midnight Black',3199000],['8/256 GB','Coral Green',3199000],['12/512 GB','Midnight Black',3899000],['12/512 GB','Lavender Purple',3899000]] },
  { brand: 'Xiaomi', model: 'Redmi Note 14 Pro', variants: [['8/256 GB','Midnight Black',3699000],['8/256 GB','Aurora Purple',3699000],['12/512 GB','Midnight Black',4299000],['12/512 GB','Ocean Blue',4299000]] },
  { brand: 'Xiaomi', model: 'Redmi Note 14 Pro 5G', variants: [['8/256 GB','Midnight Black',4399000],['8/256 GB','Coral Green',4399000],['12/512 GB','Midnight Black',5199000],['12/512 GB','Lavender Purple',5199000]] },
  { brand: 'Xiaomi', model: 'POCO X7 5G', variants: [['8/256 GB','Black',3799000],['8/256 GB','Green',3799000],['12/512 GB','Black',4399000],['12/512 GB','Silver',4399000]] },
  { brand: 'Xiaomi', model: 'POCO X7 Pro 5G', variants: [['8/256 GB','Black',4599000],['8/256 GB','Yellow',4599000],['12/512 GB','Black',4999000],['12/512 GB','Yellow',4999000]] },
  { brand: 'Xiaomi', model: 'Xiaomi 14T', variants: [['12/256 GB','Titan Black',5999000],['12/256 GB','Titan Gray',5999000],['12/512 GB','Titan Black',6499000],['12/512 GB','Titan Blue',6499000]] },
  { brand: 'Xiaomi', model: 'Xiaomi 14T Pro', variants: [['12/512 GB','Titan Black',8999000],['12/512 GB','Titan Gray',8999000]] },
  { brand: 'Xiaomi', model: 'Xiaomi 15', variants: [['12/256 GB','Black',11999000],['12/512 GB','White',12999000]] },
  { brand: 'Xiaomi', model: 'Xiaomi 15 Ultra', variants: [['16/512 GB','Black',16999000]] },

  // Apple — 33 variants
  { brand: 'Apple', model: 'Apple iPhone 13', variants: [['128 GB','Midnight',8999000],['128 GB','Starlight',8999000],['128 GB','Pink',8999000]] },
  { brand: 'Apple', model: 'Apple iPhone 14', variants: [['128 GB','Midnight',9999000],['128 GB','Starlight',9999000],['128 GB','Blue',9999000]] },
  { brand: 'Apple', model: 'Apple iPhone 15', variants: [['128 GB','Black',11999000],['128 GB','Blue',11999000],['128 GB','Pink',11999000],['128 GB','Green',11999000],['256 GB','Black',13999000],['256 GB','Blue',13999000],['256 GB','Pink',13999000]] },
  { brand: 'Apple', model: 'Apple iPhone 15 Plus', variants: [['128 GB','Black',13999000],['128 GB','Blue',13999000],['128 GB','Pink',13999000]] },
  { brand: 'Apple', model: 'Apple iPhone 16e', variants: [['128 GB','Black',11999000],['128 GB','White',11999000],['256 GB','Black',13999000],['256 GB','White',13999000]] },
  { brand: 'Apple', model: 'Apple iPhone 16', variants: [['128 GB','Black',14999000],['128 GB','White',14999000],['128 GB','Pink',14999000],['128 GB','Teal',14999000],['128 GB','Ultramarine',14999000],['256 GB','Black',16999000],['256 GB','White',16999000],['256 GB','Ultramarine',16999000]] },
  { brand: 'Apple', model: 'Apple iPhone 16 Plus', variants: [['128 GB','Black',16999000],['128 GB','Pink',16999000],['128 GB','Ultramarine',16999000]] },
  { brand: 'Apple', model: 'Apple iPhone 16 Pro', variants: [['128 GB','Black Titanium',19999000],['128 GB','Natural Titanium',19999000]] },
]

const badges = ['BEST', 'HOT', 'VIRAL', 'PILIHAN', 'NEW']

function googleImageSearch(name) {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(name)}`
}

function thumbnail(name, index) {
  const host = (index % 4) + 1
  return `https://tse${host}.mm.bing.net/th?q=${encodeURIComponent(name + ' official smartphone')}&w=900&h=900&c=7&rs=1&p=0`
}

const flattened = groups.flatMap(group => group.variants.map(([storage, color, price]) => ({
  brand: group.brand,
  name: `${group.model} ${storage} — ${color}`,
  price,
})))

export const phoneCatalog = flattened.slice(0, 100).map((item, index) => ({
  id: `phone-${String(index + 1).padStart(3, '0')}`,
  name: item.name,
  brand: item.brand,
  category: 'hp',
  price: item.price,
  rating: (4.3 + ((index * 3) % 7) / 10).toFixed(1),
  reviewCount: 240 + ((index * 211) % 18000),
  badge: badges[index % badges.length],
  image: thumbnail(item.name, index),
  imageSearch: googleImageSearch(item.name),
}))

export const phoneStorefront = {
  key: 'hp',
  label: 'HP',
  icon: '📱',
  subtitle: '100 HP',
}
