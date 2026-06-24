import { WebsiteCampaign } from '../types';

export const INITIAL_CAMPAIGNS: WebsiteCampaign[] = [
  {
    id: 'campaign-1',
    title: 'Shopee PH Tipid Hacks 2026',
    url: 'https://shopee.ph/m/piso-deals-today',
    reward: 12.50,
    timer: 15,
    logo: 'ShoppingBag',
    category: 'Shopping',
    description: 'Basahin ang gabay para sa Piso Sale at libreng shipping voucher ngayon para makatipid sa iyong susunod na budol!',
    completed: false,
    mockPageContent: {
      heroTitle: '🧡 Shopee PH Piso Deals & Discount Codes',
      heroSubtitle: 'Pinaka-kumpletong listahan ng Voucher Codes ngayong Hunyo 2026',
      primaryColor: '#EE4D2D', // Shopee Orange
      accentColor: '#FFC72C',
      paragraphs: [
        'Maligayang pagdating sa Shopee PH Savings Portal! Dito mo mahahanap ang mga lihim na discount na hindi agad makikita sa homepage ng app.',
        'Tuwing alas-dose ng hatinggabi at alas-dose ng tanghali, mayroon tayong Flash Sale kung saan pwedeng makuha ang mga piling gadgets, damit, at household items sa halagang Isang Piso (₱1) lamang. Siguraduhing mabilis ang iyong internet connection at naka-abang sa server clock.'
      ],
      features: [
        '🔥 Piso Flash Sale Hub (Abang tuwing 12 AM / 12 PM)',
        '🚚 100% Free Shipping Voucher (Minimum Spend ₱0)',
        '🏷️ 20% Coins Cashback sa lahat ng Fashion & Beauty items',
        '💳 G-Cash Wallet discount: Dagdag ₱50 off kapag GCash ang pinambayad.'
      ],
      offers: [
        'Xiaomi Redmi Note 13 - Sale Price: ₱5,999 (₱9,999 bago mag-sale)',
        'Korean Minimalist Backpack - Sale Price: ₱49 (Dating ₱250)',
        'Stainless Insulated Tumbler (Double Wall) - Sale Price: ₱15 (Dating ₱120)'
      ]
    }
  },
  {
    id: 'campaign-2',
    title: 'Inquirer Balita Ngayon',
    url: 'https://newsinfo.inquirer.net/kabuhayan-pilipinas',
    reward: 8.50,
    timer: 12,
    logo: 'Newspaper',
    category: 'Balita',
    description: 'Alamin ang pinakabagong balita tungkol sa pag-unlad ng ekonomiya at kabuhayan sa Pilipinas.',
    completed: false,
    mockPageContent: {
      heroTitle: '📰 Inquirer Balita: Kabuhayan at Teknolohiya',
      heroSubtitle: 'Sentro ng katotohanan ukol sa usaping pananalapi at trabaho sa bansa',
      primaryColor: '#002F6C', // Dark Blue
      accentColor: '#E53E3E',
      paragraphs: [
        'DUMAMI ang mga Pilipinong nagnanais pumasok sa digital at freelance industry nitong nakaraang quarter, ayon sa ulat ng Department of Labor and Employment. Patuloy na lumalakas ang remote work economy na nagbibigay ng pagkakataon sa mga probinsya na kumita ng sapat.',
        'Ayon sa mga ekonomista, ang maliliit na negosyo at e-commerce startup ang siyang nagpapasigla sa lokal na produksyon habang patuloy na bumababa ang unemployment rate sa bansa.'
      ],
      features: [
        '💼 Freelancing: DOLE naglunsad ng libreng training program para sa mga taga-probinsya',
        '📈 Ekonomiya: GDP ng Pilipinas lumaki ng 6.2% dahil sa pinalakas na domestic consumption',
        '💵 Piso: Lumalakas ang halaga ng piso laban sa dolyar dahil sa dumaraming remittances',
        '🚗 Transportasyon: Modernized jeepney routes pinalawig pa sa iba-ibang dako ng Metro Manila'
      ]
    }
  },
  {
    id: 'campaign-3',
    title: 'GCash Promos & Cashbacks',
    url: 'https://www.gcash.com/promos/earn-extra-load',
    reward: 15.00,
    timer: 18,
    logo: 'Wallet',
    category: 'E-Services',
    description: 'Tuklasin kung paano makakuha ng 10% cashback sa pagbili ng Load o pagbabayad ng kuryente at tubigon gamit ang GCash.',
    completed: false,
    mockPageContent: {
      heroTitle: '🔵 GCash Super Promos & Bill Cashbacks',
      heroSubtitle: 'Gawin nating may kwento ang bawat piso mo sa GCash!',
      primaryColor: '#1E40AF', // GCash Blue
      accentColor: '#10B981',
      paragraphs: [
        'Gamitin ang GCash araw-araw upang mangolekta ng G-Coins na pwedeng ipang-palit sa totoong pera, load vouchers, o pagkain sa iyong paboritong restaurant sa pamamagitan ng G-Forest at G-Life.',
        'Ngayong buwan, magbayad ng kahit anong bill (Meralco, Maynilad, Cignal, atbp.) na nagkakahalaga ng hindi bababa sa ₱1,000 at makatanggap ng instant ₱100 cashback rekta sa iyong GCash wallet!'
      ],
      features: [
        '⚡ Meralco & Water Bills Payday Cashback (₱100 instant reward)',
        '📱 Buy Load Promo: Makakuha ng 10% higit na load para sa lahat ng networks',
        '🌳 G-Forest update: Mag-tanim ng Virtual Tree, makatulong sa kalikasan, at makakuha ng discounts',
        '🛡️ GInsure: Protektahan ang iyong pamilya sa presyong nagsisimula sa ₱39 kada buwan'
      ],
      offers: [
        'Dunkin Donuts Voucher - G-Coins Requirement: 150 Coins',
        '₱50 Jollibee Meal - G-Coins Requirement: 200 Coins',
        '₱100 SM Gift Pass - G-Coins Requirement: 400 Coins'
      ]
    }
  },
  {
    id: 'campaign-4',
    title: 'Pinoy Lutong Bahay Recipes',
    url: 'https://lutongbahay.ph/best-beef-adobo-recipe',
    reward: 9.00,
    timer: 10,
    logo: 'Utensils',
    category: 'Kultura',
    description: 'Sari-saring simpleng paraan sa pagluluto ng sikat na Beef Adobo at Sinigang na may twist.',
    completed: false,
    mockPageContent: {
      heroTitle: '🍳 Pinoy Lutong Bahay: Ang Pinakamasarap na Beef Adobo',
      heroSubtitle: 'Lutuing Pilipino na gawang-bahay, madaling ihanda para sa pamilya',
      primaryColor: '#B45309', // Warm Amber/Brown
      accentColor: '#10B981',
      paragraphs: [
        'Sinasabing may higit daan-daang bersyon ng Adobo sa bansa. Ngayon, ituturo namin ang sikretong matamis-asim at malapot na Beef Adobo gamit lamang ang mga simpleng sangkap na mabibili sa inyong malapit na talipapa.',
        'Ang sikreto sa lambot ay ang dahan-dahang pagpapakulo ng karne sa toyo, suka, at maraming bawang sa loob ng 45 minuto bago ito tuluyang prituhin.'
      ],
      features: [
        '🥩 Sangkap: 500g Baka, 1/2 basong Toyo, 1/3 basong Suka, 2 ulo ng Bawang, Pamintang Buo, Dahon ng Laurel',
        '🔥 Unang Hakbang: Marinate ang karne sa toyo, bawang at kaunting paminta sa loob ng isang oras.',
        '🥘 Ikalawang Hakbang: Pakuluan sa mahinang apoy gamit ang marinating sauce kasama ang suka. Huwag munang hahaluin hanggang kumulo.',
        '✨ Tip: Budburan ng toasted garlic sa ibabaw bago ihain para sa kaakit-akit na amoy!'
      ]
    }
  },
  {
    id: 'campaign-5',
    title: 'JobStreet PH Trabaho Online Finder',
    url: 'https://jobstreet.com.ph/wfh-high-paying-jobs',
    reward: 14.50,
    timer: 20,
    logo: 'Briefcase',
    category: 'E-Services',
    description: 'Silipin ang mga high-paying Work-from-Home jobs na tumatanggap ng mga mag-aaral o walang karanasan.',
    completed: false,
    mockPageContent: {
      heroTitle: '🚀 JobStreet PH: Remote Support & Virtual Assistant Hiring',
      heroSubtitle: 'Magtrabaho sa komportableng tahanan na may sahod na ₱30k to ₱60k kada buwan',
      primaryColor: '#0055A5', // JobStreet Blue-cyan
      accentColor: '#EF4444',
      paragraphs: [
        'Patuloy ang pagtaas ng demand para sa mga Virtual Assistants, Customer Service Representatives, at Social Media Managers sa Pilipinas bilang mga global partners.',
        'Hindi kailangan ng mataas na tinapos, basta mayroon kang maayos na computer, mabilis na internet backup, at dedikasyon sa trabaho. Nag-aalok din ang mga kompanya ng libreng equipment tulad ng PC at noise-cancelling headset.'
      ],
      features: [
        '👩‍💻 Part-time VA: ₱20,000/month (4 hours, flexi time, open for college students)',
        '📞 Customer Support Agent: ₱35,000/month + HMO Benefits (No experienced required, paid training)',
        '📝 Content Moderator: ₱28,000/month (Willing to work night shift, entry level available)',
        '🎨 Graphic Designer: ₱45,000/month (Requires basic knowledge in Canva, Photoshop, or Figma)'
      ],
      offers: [
        'Simulan ang pag-apply ngayong araw sa pamamagitan ng iyong online resume.',
        'Makatanggap ng tugon o interview schedule sa loob ng 48 oras.'
      ]
    }
  },
  {
    id: 'campaign-6',
    title: 'TechPinoy Gadget & Budget Phone Reviews',
    url: 'https://techpinoy.com/best-phones-under-10k-2026',
    reward: 10.00,
    timer: 15,
    logo: 'Cpu',
    category: 'Teknolohiya',
    description: 'Basahin ang aming detalyadong pagsusuri sa pinaka-murang gaming phones na nagkakahalaga ng kulang sa ₱10,000.',
    completed: false,
    mockPageContent: {
      heroTitle: '📱 TechPinoy: Pinakamahusay na Gaming Phones Under ₱10,000',
      heroSubtitle: 'Paghahambing sa performance ng mga budget-friendly smartphones ngayong mid-2026',
      primaryColor: '#6B21A8', // Purple
      accentColor: '#F59E0B',
      paragraphs: [
        'Gusto mo bang maglaro ng Mobile Legends o Genshin Impact nang hindi nauubos ang iyong naipong alkansya? Ngayong 2026, abot-kaya na ang mga processors tulad ng MediaTek Helio G99 at Dimensity series.',
        'Sinuri namin ang tatlong pinaka-rekomendadong phone base sa battery longevity, screen refresh rate (dapat hindi bababa sa 90Hz), at RAM size (piliin ang 8GB RAM + virtual extension para walang lag).'
      ],
      features: [
        '🔋 Tecno Pova Neo 4: Best Battery Warrior (6000mAh, 45W Fast Charging) - Pinakasolid ang haba ng laro.',
        '🎮 Infinix Hot 40 Pro: Streamer Choice (Helio G99 Ultimate, 120Hz Fluid Screen) - Swabe sa bawat bakbakan.',
        '📸 Redmi Note 13 4G: Everyday All-Rounder (108MP camera, Amoled Display) - Maganda para sa pati-TikTok at Vlogging.',
        '⚠️ Paalala: Iwasan ang paglalaro habang nagkakarga upang mapahaba ang lifespan ng baterya.'
      ]
    }
  },
  {
    id: 'campaign-7',
    title: 'Biyaheng Pinas: Alindog ng Boracay & Palawan',
    url: 'https://biyahengpinas.ph/best-island-destinations',
    reward: 14.00,
    timer: 20,
    logo: 'Compass',
    category: 'Kultura',
    description: 'Suriin ang murang itinerary at sikat na turo-turo spot sa pinakabagong travel guide natin sa Pilipinas.',
    completed: false,
    mockPageContent: {
      heroTitle: '🌴 Biyaheng Pinas: Budget Travel Guide sa El Nido at Boracay',
      heroSubtitle: 'Paano malibot ang ganda ng Pilipinas sa halagang ₱5,000 lamang',
      primaryColor: '#047857', // Emerald/Teal
      accentColor: '#3B82F6',
      paragraphs: [
        'Hindi kailangang gumastos ng daan-daang libo para makita ang pino at puting buhangin ng Boracay, o ang mahiwagang limestone formations ng Palawan. Sa pagsunod sa mga tip ng aming local backpackers, pwede kang makatipid nang husto.',
        'Piliin ang paglalakbay tuwing lean season (Hulyo hanggang Oktubre). Bagama’t maaari itong madalas umulan, madami namang hotels at plane tickets ang nagkakaroon ng 50% hanggang 70% na discount.'
      ],
      features: [
        '✈️ Seat Sale Watcher: Mag-setup ng alerts para sa Piso Fare ng Cebu Pacific o AirAsia.',
        '🏡 Transporation: Maglakad, sumakay sa mga e-trike, o mag-renta ng motorsiklo (₱350/day) para makatipid.',
        '🍛 Pagkain: Subukan ang mga sikat na carinderia o local kainan sa gilid ng kalsada kumpara sa mga mamahaling beachfront restos.',
        '🌊 Island Hopping: Makilahok sa "joiner tours" para hati-hati kayo sa bangka sa halagang ₱800 bawat ulo.'
      ]
    }
  }
];
