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
  },
  {
    id: 'campaign-8',
    title: 'DITO Sim Sulit Promos 2026',
    url: 'https://dito.ph/promos/sulit-data',
    reward: 1.25,
    timer: 8,
    logo: 'Smartphone',
    category: 'E-Services',
    description: 'Tuklasin ang pinakamurang data pack ng DITO Sim para sa mga estudyante at heavy gamers ngayong taon.',
    completed: false,
    mockPageContent: {
      heroTitle: '📱 DITO Sim Sulit Data Offers',
      heroSubtitle: 'Pinaka-mabilis at abot-kayang internet para sa bawat Pilipino',
      primaryColor: '#EF4444',
      accentColor: '#1E3A8A',
      paragraphs: [
        'Ang DITO Telecommunity ay nag-aalok ng unlimited data promos para sa social media at gaming sa halagang ₱99 lamang bawat buwan. Walang speed cap at may kasama pang libreng tawag.',
        'Suriin ang listahan ng aming verified retail partners para makabili ng SIM cards na may preloaded 10GB free data agad.'
      ]
    }
  },
  {
    id: 'campaign-9',
    title: 'Piso WiFi Business Guide',
    url: 'https://pisowifi.ph/how-to-start-business',
    reward: 1.85,
    timer: 10,
    logo: 'Wifi',
    category: 'Teknolohiya',
    description: 'Alamin kung paano kumita ng ₱500 hanggang ₱1,500 kada araw gamit ang Piso WiFi machine sa inyong barangay.',
    completed: false,
    mockPageContent: {
      heroTitle: '📶 Paano Magsimula ng Piso WiFi Vendo Business',
      heroSubtitle: 'Gawing karagdagang kita ang inyong natitirang bandwidth sa bahay',
      primaryColor: '#2563EB',
      accentColor: '#10B981',
      paragraphs: [
        'Ang Piso WiFi vendo ay isa sa pinaka-popular na passive income source sa Pilipinas. Sa maliit na kapital na ₱15,000, maaari ka nang magkaroon ng sariling makina na gagana 24/7.',
        'Ipinapakita sa gabay na ito ang tamang pag-configure ng mikroTik router para sa mas mabilis at ligtas na koneksyon ng iyong mga customer.'
      ]
    }
  },
  {
    id: 'campaign-10',
    title: 'Pinoy Freelancer Tutorial',
    url: 'https://pinoyfreelance.ph/upwork-guide-2026',
    reward: 2.02,
    timer: 12,
    logo: 'Laptop',
    category: 'E-Services',
    description: 'Mga hakbang para gumawa ng panalong profile sa Upwork at makuha ang iyong unang dolyar na kliyente.',
    completed: false,
    mockPageContent: {
      heroTitle: '💼 Upwork Guide para sa Baguhang Freelancer',
      heroSubtitle: 'Mula zero experience hanggang sa kumita ng dolyar sa bahay',
      primaryColor: '#15803D',
      accentColor: '#F59E0B',
      paragraphs: [
        'Huwag matakot magsimula kahit wala pang portfolio. Ang susi ay ang paggawa ng personalized na proposal na sasagot sa problema ng kliyente sa halip na basta magpadala ng template.',
        'Ibinabahagi rito ang libreng templates para sa Cover Letter na nakakuha na ng higit ₱100k worth ng projects mula sa US clients.'
      ]
    }
  },
  {
    id: 'campaign-11',
    title: 'Globe Prepaid GOSAKTO Hacks',
    url: 'https://globe.com.ph/gosakto-cheap-combinations',
    reward: 1.15,
    timer: 7,
    logo: 'Zap',
    category: 'E-Services',
    description: 'Sikretong code at promo combinations sa Globe para sa 15GB data na may validity na 15 araw.',
    completed: false,
    mockPageContent: {
      heroTitle: '⚡ Globe GoSakto Murang Data Hacks',
      heroSubtitle: 'Mag-register nang mas mura, magka-data nang mas marami!',
      primaryColor: '#1D4ED8',
      accentColor: '#EC4899',
      paragraphs: [
        'Bakit ka magbabayad ng mas mahal kung mayroong lihim na registration codes na mas sulit para sa mga mag-aaral? Sa halagang ₱75, mayroon ka nang data, texts, at social media allowance.',
        'Abangan ang aming listahan ng codes na laging updated kada linggo upang masiguro ang inyong pagtitipid.'
      ]
    }
  },
  {
    id: 'campaign-12',
    title: 'Lazada Mega Sale Tips 2026',
    url: 'https://lazada.com.ph/how-to-stack-vouchers',
    reward: 1.45,
    timer: 9,
    logo: 'Gift',
    category: 'Shopping',
    description: 'Gabay sa pag-stack ng store vouchers, free shipping, at Lazada bonus para sa 50% discount.',
    completed: false,
    mockPageContent: {
      heroTitle: '🛍️ Lazada Voucher Stacking Secrets',
      heroSubtitle: 'Sulitin ang bawat Piso sa pamamagitan ng pinagsama-samang discounts',
      primaryColor: '#0F172A',
      accentColor: '#06B6D4',
      paragraphs: [
        'Sa Lazada, maaari mong pagsamahin ang hanggang limang magkakaibang vouchers sa iisang checkout! Sundin ang hakbang sa ibaba para ma-apply ang Store Voucher, Lazada Voucher, Bank Discount, Cashback, at Free Shipping.',
        'Siguraduhing naka-collect ka ng Lazada Bonus araw-araw bago sumapit ang mismong sale date para mas malaki ang bawas.'
      ]
    }
  },
  {
    id: 'campaign-13',
    title: 'Smart Gigalife GigaPoints Tips',
    url: 'https://smart.com.ph/gigalife-freebies',
    reward: 1.62,
    timer: 8,
    logo: 'Sparkles',
    category: 'E-Services',
    description: 'Paano mag-claim ng libreng 1GB data araw-araw gamit ang GigaLife points app ng Smart.',
    completed: false,
    mockPageContent: {
      heroTitle: '⭐ GigaLife Points & Free Data claiming',
      heroSubtitle: 'Sari-saring rewards para sa matapat na Smart prepaid subscribers',
      primaryColor: '#059669',
      accentColor: '#D97706',
      paragraphs: [
        'Ang Smart GigaPoints ay naipon sa bawat load register mo. Gamitin ang points na ito para mag-redeem ng pagkain sa Jollibee, Grab discounts, o libreng data packs na magagamit mo agad.',
        'I-download ang GigaLife app at mag-login tuwing Miyerkules para sa "Giga Mania" na may discount sa points redemption.'
      ]
    }
  },
  {
    id: 'campaign-14',
    title: 'Quezon Province Tourism Guide',
    url: 'https://quezon.gov.ph/tourism-beaches',
    reward: 1.30,
    timer: 11,
    logo: 'Compass',
    category: 'Kultura',
    description: 'Planuhin ang iyong biyahe sa sikat na Borawan Island at Kamay ni Hesus sa Lucban, Quezon.',
    completed: false,
    mockPageContent: {
      heroTitle: '⛰️ Biyaheng Quezon Province Travel Itinerary',
      heroSubtitle: 'Tuklasin ang ganda ng kalikasan, kultura, at pagkain sa Katimugang Luzon',
      primaryColor: '#047857',
      accentColor: '#F59E0B',
      paragraphs: [
        'Ang Quezon Province ay sikat sa masasarap na Lucban Longganisa at makukulay na Pahiyas Festival. Kung nais mo namang pumunta sa beach, naghihintay ang pinong buhangin ng Jomalig Island.',
        'Narito ang aming 3 days 2 nights DIY Travel Itinerary na may kabuuang budget na ₱2,500 lamang bawat tao kasama na ang pamasahe at tuluyan.'
      ]
    }
  },
  {
    id: 'campaign-15',
    title: 'Bitcoin PH Investment Guide',
    url: 'https://bitcoin.com.ph/basics-for-beginners',
    reward: 1.95,
    timer: 15,
    logo: 'Coins',
    category: 'Teknolohiya',
    description: 'Alamin kung paano ligtas na bumili ng Bitcoin at crypto sa Pilipinas gamit ang GCash at Coins.ph.',
    completed: false,
    mockPageContent: {
      heroTitle: '🪙 Crypto sa Pilipinas: Gabay sa Pagbili ng Bitcoin',
      heroSubtitle: 'Ligtas, mabilis, at dumaan sa regulasyon ng Bangko Sentral ng Pilipinas',
      primaryColor: '#B45309',
      accentColor: '#1E3A8A',
      paragraphs: [
        'Ang cryptocurrency ay isang digital asset na pwedeng bilhin para sa long-term investment. Ngunit paalala: ito ay may mataas na peligro kaya siguraduhing mag-aral muna bago mag-invest ng iyong pera.',
        'Maaari kang magsimula sa halagang ₱50 lamang gamit ang sikat na regulated apps sa bansa gaya ng Coins.ph o GCrypto.'
      ]
    }
  },
  {
    id: 'campaign-16',
    title: 'Pinoy Recipe: Crispy Sisig Secret',
    url: 'https://lutongbahay.ph/crispy-pork-sisig',
    reward: 1.10,
    timer: 6,
    logo: 'Utensils',
    category: 'Kultura',
    description: 'Tuklasin ang sikretong paraan para mapanatiling crispy ang Pork Sisig kahit malamig na.',
    completed: false,
    mockPageContent: {
      heroTitle: '🥩 Ang Lihim sa Crispy Pampanga Sisig',
      heroSubtitle: 'Lutuing paboritong pulutan o ulam na pumatok sa buong mundo',
      primaryColor: '#991B1B',
      accentColor: '#F59E0B',
      paragraphs: [
        'Ang Sisig ay nagmula sa Pampanga at naging paborito ng mga Pilipino sa handaan. Ang sikreto para manatili itong crispy ay ang paggamit ng tinadtad na chicharon at tamang oras ng pag-fry sa kumukulong mantika.',
        'Huwag kalimutang lagyan ng kalamansi, sili, at sibuyas para sa perpektong timpla. Iwasan ang paglalagay ng mayonnaise kung nais mo ang tradisyonal na lasa!'
      ]
    }
  },
  {
    id: 'campaign-17',
    title: 'Online Selling Tips: Shopee & TikTok',
    url: 'https://sellersuccess.ph/tiktok-live-selling',
    reward: 2.04,
    timer: 14,
    logo: 'TrendingUp',
    category: 'E-Services',
    description: 'Matutong gumamit ng TikTok Live Selling para mapalago ang iyong retail business mula sa bahay.',
    completed: false,
    mockPageContent: {
      heroTitle: '📈 Paano Kumita sa TikTok Shop at Live Selling',
      heroSubtitle: 'Tuklasin ang tamang diskarte para sa libo-libong orders kada araw',
      primaryColor: '#000000',
      accentColor: '#EE4D2D',
      paragraphs: [
        'Ang TikTok Shop ay naging mabilis na paraan para sa mga small business owner na maabot ang milyun-milyong buyers sa bansa nang walang malaking budget para sa ads.',
        'Ang sikreto sa matagumpay na live selling ay ang pagiging energetic, pagbibigay ng special discount codes habang nagla-live, at pagkakaroon ng magandang lighting sa iyong kwarto.'
      ]
    }
  },
  {
    id: 'campaign-18',
    title: 'Baguio City Travel Hacks',
    url: 'https://biyahengpinas.ph/baguio-cold-destinations',
    reward: 1.70,
    timer: 12,
    logo: 'Compass',
    category: 'Kultura',
    description: 'Mga murang transient house at sikat na strawberry picking locations sa Baguio City.',
    completed: false,
    mockPageContent: {
      heroTitle: '🌲 Baguio City DIY Budget Travel Guide',
      heroSubtitle: 'Langhapin ang lamig at amoy ng pine trees sa murang halaga',
      primaryColor: '#065F46',
      accentColor: '#F43F5E',
      paragraphs: [
        'Ang Baguio City o ang Summer Capital ng Pilipinas ay angkop para sa pamilya o mag-kakaibigan na nais magpalamig. Sa pagsakay sa bus mula sa Cubao, makakarating ka rito sa loob ng apat hanggang limang oras.',
        'Subukan ang Strawberry Taho, bumisita sa Burnham Park, at mamili ng murang ukay-ukay sa Night Market para sa kumpletong karanasan.'
      ]
    }
  },
  {
    id: 'campaign-19',
    title: 'G-News: DOST Libreng Scholarships',
    url: 'https://gnews.ph/dost-scholarship-requirements',
    reward: 1.05,
    timer: 8,
    logo: 'GraduationCap',
    category: 'Balita',
    description: 'DOST naglunsad ng scholarship para sa mga incoming college students na kukuha ng Science courses.',
    completed: false,
    mockPageContent: {
      heroTitle: '📰 DOST College Scholarship Programs 2026',
      heroSubtitle: 'Makatanggap ng libreng matrikula at ₱7,000 monthly allowance sa iyong pag-aaral',
      primaryColor: '#1E3A8A',
      accentColor: '#10B981',
      paragraphs: [
        'Inanunsyo ng Department of Science and Technology ang pagbubukas ng aplikasyon para sa taong pampanuruan 2026-2027. Ang lahat ng senior high school graduates na may hilig sa Agham at Teknolohiya ay kwalipikadong sumali.',
        'Mayroon ding kasamang book allowance na ₱10,000 bawat taon at subsidy para sa graduation expenses.'
      ]
    }
  },
  {
    id: 'campaign-20',
    title: 'Home-Based Virtual Assistant Skills',
    url: 'https://jobstreet.com.ph/skills-for-va-career',
    reward: 1.90,
    timer: 13,
    logo: 'Briefcase',
    category: 'E-Services',
    description: 'Limang mahahalagang skills na kailangan mong matutunan para maging isang mataas-sumahod na VA.',
    completed: false,
    mockPageContent: {
      heroTitle: '💻 5 Skills na Patok sa Virtual Assistant Hiring',
      heroSubtitle: 'Palakasin ang iyong resume para sa mas mataas na sahod',
      primaryColor: '#1E40AF',
      accentColor: '#10B981',
      paragraphs: [
        'Bago mag-apply, siguraduhing mayroon kang kaalaman sa mga tool tulad ng Google Workspace, Trello o Asana para sa project management, Canva para sa basic graphics, at email management.',
        'Mayroon kaming inihandang libreng video playlist kung saan maaari mong aralin ang mga ito nang libre sa loob ng dalawang linggo.'
      ]
    }
  },
  {
    id: 'campaign-21',
    title: 'DTI Libreng Negosyo Seminar 2026',
    url: 'https://dti.gov.ph/free-seminars-for-msmes',
    reward: 1.50,
    timer: 10,
    logo: 'BookOpen',
    category: 'E-Services',
    description: 'Sumali sa libreng seminar ng DTI tungkol sa tamang pagre-rehistro ng online shop at pagkuha ng Mayor Permit.',
    completed: false,
    mockPageContent: {
      heroTitle: '🏢 DTI Business Mentorship and Free Training',
      heroSubtitle: 'Tulay sa pag-unlad ng maliliit na negosyong Pilipino',
      primaryColor: '#1E3A8A',
      accentColor: '#D97706',
      paragraphs: [
        'Ang Department of Trade and Industry ay naglalayong tulungan ang mga micro, small, at medium enterprises (MSMEs) na mai-rehistro at mapalago ang kanilang kabuhayan gamit ang tamang digital marketing.',
        'Ang mga kalahok ay makatatanggap ng sertipiko na makatutulong para sa mabilis na pag-approve ng pautang para sa negosyo.'
      ]
    }
  },
  {
    id: 'campaign-22',
    title: 'LTO License Renewal Guide',
    url: 'https://lto.gov.ph/portal-renewal-appointment',
    reward: 1.20,
    timer: 7,
    logo: 'Shield',
    category: 'E-Services',
    description: 'Alamin ang mabilis na paraan sa pag-renew ng Driver License gamit ang LTMS Portal online appointment.',
    completed: false,
    mockPageContent: {
      heroTitle: '🚗 Mabilis na Renewal ng Driver License sa LTO',
      heroSubtitle: 'Iwasan ang fixer, gamitin ang online portal para sa 1-hour renewal!',
      primaryColor: '#1D4ED8',
      accentColor: '#10B981',
      paragraphs: [
        'Ngayong 2026, mas pinadali na ang pagkuha at pag-renew ng Driver License sa pamamagitan ng LTMS (Land Transportation Management System) portal. Doon mo na rin pwedeng sagutan ang online CDE exam.',
        'Suriin ang listahan ng accredited medical clinics para sa mabilis na medical exam bago pumunta sa sangay ng LTO.'
      ]
    }
  },
  {
    id: 'campaign-23',
    title: 'Manila Food Trip: Binondo Guide',
    url: 'https://lutongbahay.ph/binondo-chinatown-food-trip',
    reward: 1.65,
    timer: 11,
    logo: 'Utensils',
    category: 'Kultura',
    description: 'Kumpletong listahan ng pinakamasarap na Xiao Long Bao, Fried Dumplings, at Hopia sa Binondo.',
    completed: false,
    mockPageContent: {
      heroTitle: '🥟 Binondo Chinatown DIY Food Trip Guide',
      heroSubtitle: 'Kainang subok na sa sarap sa pinaka-matandang Chinatown sa mundo',
      primaryColor: '#DC2626',
      accentColor: '#F59E0B',
      paragraphs: [
        'Ang Binondo Chinatown sa Maynila ay tanyag sa napakaraming masasarap at murang Chinese-Filipino foods. Sa budget na ₱500, maaari ka nang mabusog kasama ang iyong kaibigan.',
        'Huwag kalimutang subukan ang sikat na Dong Bei Dumpling, Wai Ying Fastfood, at bumili ng mainit na hopia sa Eng Bee Tin.'
      ]
    }
  },
  {
    id: 'campaign-24',
    title: 'PhilHealth Online Contribution Guide',
    url: 'https://philhealth.gov.ph/member-portal-access',
    reward: 1.35,
    timer: 9,
    logo: 'Activity',
    category: 'E-Services',
    description: 'Gabay sa pagbabayad at pag-check ng PhilHealth Contribution gamit ang Member Portal online.',
    completed: false,
    mockPageContent: {
      heroTitle: '🏥 PhilHealth Member Portal & Online Payment',
      heroSubtitle: 'Seguridad sa kalusugan para sa pamilyang Pilipino',
      primaryColor: '#059669',
      accentColor: '#1E3A8A',
      paragraphs: [
        'Madali mo nang masusubaybayan ang iyong buwanang hulog sa PhilHealth sa pag-login sa bagong member portal. Siguraduhing active ang iyong status para magamit ang hospital discounts sa oras ng pangangailangan.',
        'Maaari nang magbayad gamit ang GCash, credit cards, o iba pang e-wallets rekta sa website.'
      ]
    }
  },
  {
    id: 'campaign-25',
    title: 'Pag-IBIG MP2 Savings Hack',
    url: 'https://pagibigfund.gov.ph/mp2-high-dividend',
    reward: 1.80,
    timer: 12,
    logo: 'PiggyBank',
    category: 'E-Services',
    description: 'Paano kumita ng 7% guaranteed annual dividend rate gamit ang Pag-IBIG MP2 voluntary savings.',
    completed: false,
    mockPageContent: {
      heroTitle: '💰 Pag-IBIG MP2 Savings Investment Tutorial',
      heroSubtitle: 'Mag-ipon nang ligtas na may mataas na balik kumpara sa ordinaryong bangko',
      primaryColor: '#1E3A8A',
      accentColor: '#F59E0B',
      paragraphs: [
        'Ang Pag-IBIG MP2 is a government-guaranteed voluntary savings program design for Filipinos who want to grow their money safely. The lock-in period is 5 years, and dividend rates go up to 7% annually.',
        'Maaari mong simulan ang pag-save sa halagang ₱500 bawat hulog. Ipakikita sa gabay na ito ang madaling pag-open online nang hindi pumupunta sa branch.'
      ]
    }
  },
  {
    id: 'campaign-26',
    title: 'Tagaytay Weekend DIY Itinerary',
    url: 'https://biyahengpinas.ph/tagaytay-viewpoint-bulalo',
    reward: 1.55,
    timer: 10,
    logo: 'Compass',
    category: 'Kultura',
    description: 'Tingnan ang listahan ng murang Bulalo spots at magandang view ng Taal Volcano sa Tagaytay.',
    completed: false,
    mockPageContent: {
      heroTitle: '🗻 Tagaytay Cool Getaway DIY Travel Guide',
      heroSubtitle: 'Mabilisang weekend relaxation kasama ang pamilya o barkada',
      primaryColor: '#0F766E',
      accentColor: '#EC4899',
      paragraphs: [
        'Ang Tagaytay ay sikat sa malamig na simoy ng hangin at masasarap na Bulalo. Isang biyaheng bus o kotse lamang mula sa Maynila at narito ka na sa loob ng dalawang oras.',
        'Inirerekomenda nomad naming bisitahin ang Picnic Grove, People’s Park in the Sky, at sumubok sa mga patok na café sa gilid ng bundok.'
      ]
    }
  },
  {
    id: 'campaign-27',
    title: 'SSS Salary Loan Online Guide',
    url: 'https://sss.gov.ph/salary-loan-application',
    reward: 1.40,
    timer: 9,
    logo: 'Banknote',
    category: 'E-Services',
    description: 'Hakbang sa pag-apply ng SSS Salary Loan gamit ang My.SSS Portal para sa mabilis na approval.',
    completed: false,
    mockPageContent: {
      heroTitle: '🏦 Paano Mag-apply ng SSS Salary Loan Online',
      heroSubtitle: 'Mabilis na tulong pinansyal para sa mga empleyado at self-employed members',
      primaryColor: '#1E3A8A',
      accentColor: '#10B981',
      paragraphs: [
        'Kung ikaw ay may hindi bababa sa 36 buwanang kontribusyon, maaari kang mag-apply ng Salary Loan sa SSS. Direct-to-bank o direct-to-e-wallet na ang payout ngayon sa loob ng 3 hanggang 5 working days.',
        'Sundin ang gabay sa tamang pag-upload ng iyong disbursement account at selfie requirements sa portal.'
      ]
    }
  }
];
