const foodNames = [
  'Nasi Padang Rendang', 'Nasi Padang Ayam Pop', 'Nasi Padang Dendeng Balado', 'Nasi Goreng Kampung', 'Nasi Goreng Jawa',
  'Nasi Uduk Betawi', 'Nasi Liwet Solo', 'Nasi Kuning Manado', 'Nasi Tutug Oncom', 'Nasi Pecel Madiun',
  'Sate Madura', 'Sate Padang', 'Sate Maranggi', 'Sate Lilit Bali', 'Sate Kambing Tegal',
  'Bakso Malang', 'Bakso Urat', 'Bakso Mercon', 'Bakso Solo', 'Bakso Bakar',
  'Soto Betawi', 'Soto Lamongan', 'Soto Kudus', 'Soto Banjar', 'Soto Medan',
  'Rawon Surabaya', 'Gulai Kambing', 'Tongseng Kambing', 'Empal Gentong', 'Coto Makassar',
  'Pempek Kapal Selam', 'Pempek Lenjer', 'Tekwan Palembang', 'Model Palembang', 'Mie Celor',
  'Mie Aceh Goreng', 'Mie Aceh Kuah', 'Mie Kocok Bandung', 'Mie Koclok Cirebon', 'Mie Bangka',
  'Ayam Geprek Sambal Bawang', 'Ayam Penyet', 'Ayam Taliwang', 'Ayam Betutu', 'Ayam Goreng Kalasan',
  'Bebek Madura', 'Bebek Goreng Surabaya', 'Ikan Bakar Jimbaran', 'Ikan Woku Manado', 'Bandeng Presto',
  'Gudeg Jogja', 'Oseng Mercon', 'Brongkos Jogja', 'Mangut Lele', 'Garang Asem',
  'Gado-Gado Jakarta', 'Ketoprak', 'Karedok Sunda', 'Lotek Bandung', 'Pecel Sayur',
  'Batagor Bandung', 'Siomay Bandung', 'Cuanki Bandung', 'Cilok Bumbu Kacang', 'Cireng Rujak',
  'Seblak Ceker', 'Seblak Seafood', 'Tahu Gejrot', 'Tahu Tek', 'Tahu Campur Lamongan',
  'Lontong Balap', 'Kupat Tahu', 'Lontong Sayur Medan', 'Bubur Ayam Cianjur', 'Bubur Manado Tinutuan',
  'Martabak Manis Cokelat Keju', 'Martabak Telur', 'Terang Bulan Red Velvet', 'Pukis Banyumas', 'Kue Pancong',
  'Serabi Solo', 'Klepon', 'Onde-Onde', 'Lemper Ayam', 'Pastel Isi Ragout',
  'Risol Mayo', 'Lumpia Semarang', 'Pisang Goreng Pontianak', 'Pisang Ijo Makassar', 'Es Pisang Ijo',
  'Es Cendol Dawet', 'Es Teler', 'Es Campur', 'Kolak Pisang', 'Bubur Sumsum',
  'Kopi Susu Gula Aren', 'Es Teh Manis Jumbo', 'Wedang Ronde', 'Bandrek', 'Bajigur'
]

const clothingTypes = [
  'Kaos Oversized', 'Kaos Regular Fit', 'Kemeja Oxford', 'Kemeja Linen', 'Polo Shirt',
  'Hoodie Pullover', 'Crewneck Sweatshirt', 'Jaket Coach', 'Jaket Bomber', 'Jaket Denim',
  'Celana Cargo', 'Celana Chino', 'Celana Jeans', 'Celana Linen', 'Jogger Pants',
  'Rok Plisket', 'Rok A-Line', 'Blouse Casual', 'Tunik Minimalis', 'Outer Kimono'
]
const clothingStyles = ['Hitam', 'Putih', 'Navy', 'Olive', 'Cokelat']

const shoeTypes = [
  'Sneakers Retro', 'Sneakers Court', 'Sneakers Canvas', 'Running Shoes', 'Walking Shoes',
  'Trail Shoes', 'Slip On', 'Loafers', 'Derby Shoes', 'Oxford Shoes',
  'Chelsea Boots', 'Work Boots', 'Sandal Slide', 'Sandal Outdoor', 'Mules',
  'Mary Jane', 'Ballet Flats', 'Platform Shoes', 'High Top', 'Low Top'
]
const shoeStyles = ['Mono Black', 'Triple White', 'Cream Gum', 'Grey Stone', 'Navy White']

const tumblerTypes = [
  'Tumbler Stainless 1.2L', 'Tumbler Vacuum 900ml', 'Coffee Tumbler 600ml', 'Travel Mug 500ml', 'Sport Bottle 750ml',
  'Thermos Flask 1L', 'Tumbler Straw 1L', 'Tumbler Handle 1.2L', 'Slim Bottle 500ml', 'Kids Bottle 450ml',
  'Infuser Bottle 700ml', 'Cold Cup 710ml', 'Insulated Cup 590ml', 'Minimal Bottle 600ml', 'Flip Straw Bottle 800ml',
  'Wide Mouth Bottle 950ml', 'Office Tumbler 480ml', 'Camping Bottle 1L', 'Gym Bottle 1.5L', 'Tea Tumbler 500ml'
]
const tumblerStyles = ['Midnight', 'Cloud', 'Sage', 'Terracotta', 'Ocean']

const bagTypes = [
  'Tote Bag Premium', 'Sling Bag Urban', 'Backpack Minimalis', 'Handbag Structured', 'Shoulder Bag Classic',
  'Crossbody Bag', 'Hobo Bag', 'Bucket Bag', 'Satchel Bag', 'Messenger Bag',
  'Laptop Bag 14 Inch', 'Weekender Bag', 'Duffel Bag', 'Mini Bag', 'Camera Bag',
  'Waist Bag', 'Drawstring Bag', 'Travel Bag', 'Canvas Tote', 'Leather Tote'
]
const bagStyles = ['Onyx Black', 'Ivory Cream', 'Mocha Brown', 'Forest Olive', 'Stone Grey']

const imagePools = {
  makanan: [
    'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1626500155537-93690c24099e?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=900&q=80'
  ],
  pakaian: [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=80'
  ],
  sepatu: [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&w=900&q=80'
  ],
  tumbler: [
    'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1589365278144-c9e705f843ba?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1605714196241-00bf7a8fe7bb?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1575377427642-087cf684f29d?auto=format&fit=crop&w=900&q=80'
  ],
  tas: [
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1585488434455-1e7b6b7a9b60?auto=format&fit=crop&w=900&q=80'
  ]
}

const rp = (value) => Math.round(value / 1000) * 1000

function makeProduct({ id, name, category, index, min, max }) {
  const span = max - min
  const price = rp(min + ((index * 7919) % span))
  const rating = (4 + ((index * 7) % 10) / 10).toFixed(1)
  const reviewCount = 180 + ((index * 137) % 14800)
  const badges = ['BEST', 'HOT', 'VIRAL', 'HEMAT', 'PILIHAN']
  return {
    id,
    name,
    category,
    price,
    rating,
    reviewCount,
    badge: badges[index % badges.length],
    image: imagePools[category][index % imagePools[category].length],
  }
}

const makanan = foodNames.map((name, index) => makeProduct({
  id: `food-${String(index + 1).padStart(3, '0')}`,
  name,
  category: 'makanan',
  index,
  min: 12000,
  max: 98000,
}))

function combinations(types, styles, category, prefix, min, max) {
  const names = types.flatMap(type => styles.map(style => `${type} — ${style}`)).slice(0, 100)
  return names.map((name, index) => makeProduct({
    id: `${prefix}-${String(index + 1).padStart(3, '0')}`,
    name,
    category,
    index,
    min,
    max,
  }))
}

const pakaian = combinations(clothingTypes, clothingStyles, 'pakaian', 'cloth', 500000, 3200000)
const sepatu = combinations(shoeTypes, shoeStyles, 'sepatu', 'shoe', 500000, 4500000)
const tumbler = combinations(tumblerTypes, tumblerStyles, 'tumbler', 'tumbler', 59000, 699000)
const tas = combinations(bagTypes, bagStyles, 'tas', 'bag', 249000, 2999000)

export const catalog = { makanan, pakaian, sepatu, tumbler, tas }

export const storefronts = [
  { key: 'makanan', label: 'Makanan', icon: '🍜', subtitle: '100 menu Indonesia' },
  { key: 'pakaian', label: 'Pakaian', icon: '👕', subtitle: '100 pilihan fashion premium' },
  { key: 'sepatu', label: 'Sepatu', icon: '👟', subtitle: '100 pilihan sepatu premium' },
  { key: 'tumbler', label: 'Tumbler', icon: '🥤', subtitle: '100 pilihan tumbler' },
  { key: 'tas', label: 'Tas', icon: '👜', subtitle: '100 pilihan tas' },
]
