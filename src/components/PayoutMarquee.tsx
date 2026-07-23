import React, { useState, useEffect, useMemo } from 'react';
import { WithdrawalRequest } from '../types';
import { CheckCircle2, Sparkles, Star, TrendingUp, ShieldCheck } from 'lucide-react';

interface PayoutMarqueeProps {
  realUserWithdrawals?: WithdrawalRequest[];
  currentUserName?: string;
  language?: 'tl' | 'en';
}

interface MarqueeItem {
  id: string;
  userName: string;
  amount: number;
  dateStr: string;
  method: string;
  isReal?: boolean;
}

// Rich pool of authentic Filipino First Names
const FILIPINO_FIRST_NAMES = [
  "Maria Clara", "Juan", "Mark Anthony", "Angelica", "Rhea Mae", "Cristina", "John Paul",
  "Lourdes", "Aileen", "Jobert", "Kenneth", "Janine", "Roderick", "Maricel", "Dexter",
  "Erika", "Paolo", "Grace", "Jonard", "Michelle", "Liezel", "Ferdinand", "Rosemarie",
  "Reynaldo", "Rowena", "Arnel", "Bernadette", "Christopher", "Digna", "Eduardo",
  "Francisca", "Gideon", "Hazel", "Isagani", "Jovita", "Kristine", "Leandro", "Marilyn",
  "Norberto", "Ofelia", "Patrick", "Querube", "Rogelio", "Sonia", "Teodoro", "Ursula",
  "Vicente", "Wilma", "Xavier", "Yolanda", "Zenaida", "Alvin", "Belinda", "Carmelo",
  "Divina", "Emmanuel", "Florfina", "Gerald", "Herminia", "Ignacio", "Josefina",
  "Karlo", "Lilibeth", "Manuel", "Nora", "Orlando", "Priscilla", "Rafael", "Stephanie",
  "Tomas", "Vangie", "Wilfredo", "Yesha", "Zandro", "Melane", "Benecel", "Danilo",
  "Gladys", "Cherry", "Analyn", "Ramon", "Melanie", "Jayson", "Sheryl", "Dante",
  "Liza", "Rene", "Gemma", "Cesar", "Sheila", "Edgar", "Evelyn", "Joselito",
  "Abigail", "Jomar", "Krystel", "Nicanor", "Rowell", "Teresita", "Vergel", "Aria",
  "Bryan", "Christian", "Dominic", "Elena", "Faith", "Gabriel", "Hannah", "Ivan",
  "Joanna", "Katrina", "Lorenzo", "Monique", "Nathan", "Patricia", "Richard", "Samantha"
];

// Rich pool of 300+ unique, authentic Filipino Last Names (Surnames)
const FILIPINO_LAST_NAMES = [
  "Santos", "Dela Cruz", "Reyes", "Mendoza", "Torres", "Ramos", "Gonzales", "Flores",
  "Cruz", "Bautista", "Garcia", "Ocampo", "Navarro", "Villanueva", "Fernandez",
  "Aquino", "Dela Rosa", "Castillo", "Tolentino", "Pineda", "Valdez", "Soriano",
  "Mercado", "Santiago", "Perez", "Aguilar", "Corpuz", "Manalo", "Delos Santos",
  "Salazar", "Pascual", "Dizon", "Rosales", "Villareal", "Guzman", "Sarmiento",
  "Cordero", "Evangelista", "Domingo", "Cervantes", "Galleon", "Esguerra", "Hernandez",
  "Javier", "Macapagal", "Padilla", "Ramirez", "Samson", "Umali", "Zamora",
  "Catacutan", "Dagohoy", "Buenaventura", "Abarca", "Villamor", "Bagtas", "Abad",
  "Abarquez", "Abella", "Abelardo", "Abellana", "Aberasturi", "Abila", "Abines",
  "Abrenica", "Abrera", "Abril", "Abubakar", "Acuña", "Advincula", "Agcaoili",
  "Agoncillo", "Agpaoa", "Alcantara", "Alcasid", "Aldaba", "Alegre", "Alejandrino",
  "Alfonso", "Alimurung", "Alinsunurin", "Almeda", "Almendras", "Almonte", "Alunan",
  "Alvarez", "Amador", "Ambata", "Amor", "Ampil", "Anonas", "Ante", "Antonio",
  "Añonuevo", "Apacible", "Aparente", "Aranas", "Aranda", "Arboleda", "Arce",
  "Arcilla", "Arellano", "Arenas", "Arevalo", "Arguelles", "Arieta", "Arnaiz",
  "Arrieta", "Arroyo", "Asis", "Atienza", "Austria", "Avelino", "Avila", "Avellana",
  "Ayala", "Azarcon", "Azurin", "Banal", "Bacani", "Barretto", "Bagatsing", "Balthazar",
  "Balagtas", "Balajadia", "Baluyot", "Bangoy", "Banzon", "Baratang", "Barbaza",
  "Barcebal", "Barrios", "Basilio", "Belmonte", "Benitez", "Bernardo", "Biag",
  "Blanco", "Bocalbos", "Bonilla", "Bonifacio", "Borja", "Bravo", "Brillantes",
  "Briones", "Buenaseda", "Buenaflor", "Buencamino", "Buenconsejo", "Bugayong",
  "Buiter", "Bustamante", "Cailles", "Calaguas", "Calimbas", "Calingo", "Camacho",
  "Campo", "Campos", "Canlas", "Cannu", "Canto", "Caparas", "Capinpin", "Carandang",
  "Carreon", "Casimiro", "Castañeda", "Castro", "Cayetano", "Celestino", "Centeno",
  "Clemente", "Cojuangco", "Concepcion", "Constantino", "Crisostomo", "Cuenco",
  "Cuevas", "Cunanan", "Dacanay", "David", "De Castro", "De Guia", "De Guzman",
  "De Jesus", "De Leon", "De Mesa", "De Silos", "De Vega", "Del Rosario", "Del Fierro",
  "Del Pilar", "Dela Peña", "Dela Torre", "Delgado", "Dimaculangan", "Dimalanta",
  "Dimayuga", "Docena", "Dulay", "Dungo", "Dy", "Edralin", "Eleazar", "Encarnacion",
  "Enriquez", "Escalante", "Escudero", "Espina", "Espino", "Espinosa", "Espiritu",
  "Estacio", "Estrada", "Estrella", "Eugenio", "Fajardo", "Farolan", "Feliciano",
  "Felix", "Ferreros", "Flavier", "Floro", "Fontanilla", "Fortich", "Francia",
  "Franco", "Fuentebella", "Fuentes", "Gabor", "Gatchalian", "Gatdula", "Gatus",
  "Generoso", "Go", "Gomez", "Gonzaga", "Guanzon", "Guerzon", "Guevarra", "Guico",
  "Guingona", "Gutierrez", "Halili", "Hermoso", "Hidalgo", "Hilario", "Hizon",
  "Ilagan", "Imperial", "Inocencio", "Isip", "Jacinto", "Jalbuena", "Jarque",
  "Jimenez", "Joaquin", "Joven", "Jovellanos", "Joya", "Juban", "Juico", "Katigbak",
  "Lacson", "Lagman", "Lapid", "Laurel", "Ledesma", "Legaspi", "Lichauco", "Lim",
  "Limjap", "Lontoc", "Lopez", "Lorenzana", "Lorenzo", "Loyola", "Luansing", "Lucero",
  "Luciano", "Lugay", "Mabini", "Macaraeg", "Magsaysay", "Malvar", "Manahan",
  "Manglapus", "Marañon", "Marasigan", "Marcos", "Marroquin", "Masangkay", "Matabang",
  "Matias", "Natividad", "Nepomuceno", "Nicanor", "Nicolas", "Nisperos", "Noble",
  "Nolasco", "Olalia", "Ong", "Ongpin", "Oppen", "Ordoñez", "Oreta", "Orosa",
  "Osmeña", "Osias", "Pardo", "Panganiban", "Pangilinan", "Paras", "Paredes",
  "Pelaez", "Peña", "Peñaloza", "Pimentel", "Piñol", "Plaza", "Ponce",
  "Poe", "Poblete", "Portillo", "Prieto", "Puno", "Puyat", "Que", "Quezon",
  "Quiazon", "Quimpo", "Quirino", "Recto", "Regala", "Regalado", "Remulla", "Revilla",
  "Ricarte", "Rillo", "Rivas", "Rivera", "Robredo", "Roces", "Rodriguez", "Roco",
  "Roldan", "Roman", "Romero", "Romualdez", "Romulo", "Rosa", "Roxas", "Roy",
  "Salalima", "Salcedo", "Salde", "Salgado", "Salonga", "Salvador", "Sampaguita",
  "Sampedro", "Sancianco", "San Diego", "San Juan", "San Miguel", "San Pedro",
  "Santa Maria", "Santillan", "Singson", "Sison", "Sotto", "Solis", "Somera",
  "Suansing", "Suarez", "Sy", "Tadiar", "Tanco", "Taningco", "Tecson", "Teodoro",
  "Teves", "Tiangco", "Tirona", "Trias", "Trillanes", "Tuason", "Tupas", "Tuazon",
  "Unson", "Urbano", "Valderrama", "Valdes", "Valenzuela", "Valera", "Velasco",
  "Veloso", "Ver", "Vera", "Vergara", "Veyra", "Viana", "Vibar", "Vicente",
  "Villa", "Villa-Real", "Villacorta", "Villafuerte", "Villalon", "Villar", "Villarama",
  "Villarica", "Villegas", "Vinzons", "Yabut", "Yambao", "Yulo", "Yuson", "Zabala",
  "Zobel", "Zulueta", "Zialcita"
];

// Realistic payout amounts in PHP
const PAYOUT_AMOUNTS = [
  100, 120, 150, 180, 200, 250, 300, 350, 400, 450, 500, 600, 750, 850, 1000, 1250, 1500, 2000, 2500, 3000, 5000
];

// Realistic dates generator
function generateDateString(index: number): string {
  const dates = [
    "Hulyo 23, 2026", "Hulyo 22, 2026", "Hulyo 21, 2026", "Hulyo 20, 2026",
    "Hulyo 19, 2026", "Hulyo 18, 2026", "Hulyo 17, 2026", "Hulyo 16, 2026",
    "Hulyo 15, 2026", "Hulyo 14, 2026"
  ];
  return dates[index % dates.length];
}

// Generate deterministic pool of ~1000 realistic Filipino user payouts
function generateSimulatedPayoutsCount(targetCount = 1000): MarqueeItem[] {
  const items: MarqueeItem[] = [];
  const fnLength = FILIPINO_FIRST_NAMES.length;
  const lnLength = FILIPINO_LAST_NAMES.length;
  const amtLength = PAYOUT_AMOUNTS.length;

  for (let i = 0; i < targetCount; i++) {
    // Pick first & last name sequentially across 300+ unique surnames so every surname is distinct
    const fn = FILIPINO_FIRST_NAMES[i % fnLength];
    const ln = FILIPINO_LAST_NAMES[i % lnLength];
    const amount = PAYOUT_AMOUNTS[(i * 13 + 5) % amtLength];
    const dateStr = generateDateString(i);
    
    // Ensure no unknown or empty names
    const fullName = `${fn} ${ln}`.trim();
    if (!fullName || fullName.toLowerCase().includes('unknown') || /^\d+$/.test(fullName)) {
      continue;
    }

    items.push({
      id: `sim-payout-${i + 1}`,
      userName: fullName,
      amount,
      dateStr,
      method: 'GCash',
      isReal: false
    });
  }

  return items;
}

export default function PayoutMarquee({
  realUserWithdrawals = [],
  currentUserName,
  language = 'tl'
}: PayoutMarqueeProps) {
  const [fetchedRealPayouts, setFetchedRealPayouts] = useState<MarqueeItem[]>([]);

  // Fetch recent real payouts from server
  useEffect(() => {
    let mounted = true;
    const fetchRecentPayouts = async () => {
      try {
        const res = await fetch('/api/payouts/recent');
        if (res.ok) {
          const data = await res.json();
          if (mounted && Array.isArray(data.payouts)) {
            const formatted = data.payouts
              .filter((p: any) => {
                const name = (p.userName || '').trim();
                return name && !name.toLowerCase().includes('unknown') && !/^\d+$/.test(name);
              })
              .map((p: any) => ({
                id: `real-server-${p.id}`,
                userName: p.userName,
                amount: p.amount || 100,
                dateStr: p.createdAt || 'Ngayon',
                method: 'GCash',
                isReal: true
              }));
            setFetchedRealPayouts(formatted);
          }
        }
      } catch (err) {
        // Silently handle offline/dev fallback
      }
    };

    fetchRecentPayouts();
    const interval = setInterval(fetchRecentPayouts, 15000); // refresh every 15s
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Format local real user withdrawals from prop
  const propRealPayouts: MarqueeItem[] = useMemo(() => {
    return (realUserWithdrawals || [])
      .filter(w => {
        const name = (w.accountName || currentUserName || '').trim();
        return name && !name.toLowerCase().includes('unknown') && !/^\d+$/.test(name);
      })
      .map(w => ({
        id: `real-prop-${w.id}`,
        userName: (w.accountName || currentUserName || 'Verified User').trim(),
        amount: w.amount,
        dateStr: w.createdAt || 'Ngayon',
        method: 'GCash',
        isReal: true
      }));
  }, [realUserWithdrawals, currentUserName]);

  // Combine ~1000 simulated items with real payouts placed right at the front
  const allPayoutItems = useMemo(() => {
    const baseSimulated = generateSimulatedPayoutsCount(1000);
    
    // Combine real payouts (remove duplicates by ID or name+amount)
    const realList = [...propRealPayouts, ...fetchedRealPayouts];
    const uniqueRealMap = new Map<string, MarqueeItem>();
    realList.forEach(item => {
      const key = `${item.userName}-${item.amount}-${item.dateStr}`;
      if (!uniqueRealMap.has(key)) {
        uniqueRealMap.set(key, item);
      }
    });

    const uniqueReals = Array.from(uniqueRealMap.values());

    // Place real payouts at the top / front of the array
    return [...uniqueReals, ...baseSimulated];
  }, [propRealPayouts, fetchedRealPayouts]);

  // For seamless infinite scrolling, duplicate the list or render a slice for performance
  // rendering ~150 visible items at once in the DOM keeps smooth 60fps scrolling without lag
  const displayItems = useMemo(() => {
    const slice = allPayoutItems.slice(0, 200);
    return [...slice, ...slice];
  }, [allPayoutItems]);

  return (
    <div id="z-one-payout-marquee-container" className="w-full bg-slate-950 border-b border-slate-800/80 text-white overflow-hidden select-none relative z-30 shadow-inner flex items-center h-8 sm:h-9">
      
      {/* FIXED LEFT BADGE / HEADER LABEL */}
      <div className="shrink-0 bg-slate-900/95 border-r border-slate-800/90 px-2.5 sm:px-3 h-full flex items-center gap-1.5 z-20 shadow-md">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[10px] sm:text-[11px] font-black tracking-tight text-emerald-400 uppercase flex items-center gap-1">
          <span>Z-oneApp Live Payouts</span>
          <span className="text-slate-400 font-normal hidden md:inline text-[9px]">(1,000+ Users)</span>
        </span>
      </div>

      {/* MARQUEE SCROLLING CONTENT TRACK */}
      <div className="flex-1 overflow-hidden relative h-full flex items-center">
        <div className="flex items-center gap-4 whitespace-nowrap animate-marqueeLeft hover:[animation-play-state:paused] cursor-pointer py-1">
          {displayItems.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold border transition-all shrink-0 ${
                item.isReal
                  ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border-emerald-500/80 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
              }`}
            >
              {item.isReal ? (
                <span className="bg-amber-400 text-slate-950 p-0.5 rounded-full flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(251,191,36,0.6)]" title="Verified Payout">
                  <Star className="w-2.5 h-2.5 fill-slate-950 text-slate-950" />
                </span>
              ) : (
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              )}

              <span className="font-extrabold text-white tracking-tight">{item.userName}</span>
              <span className="text-emerald-400 font-black font-mono">₱{item.amount.toFixed(2)}</span>
              <span className="text-[9px] text-slate-400 font-semibold">({item.method})</span>
              <span className="text-[9px] text-slate-500 font-normal">[{item.dateStr}]</span>
            </div>
          ))}
        </div>
      </div>

      {/* TAILWIND CUSTOM ANIMATION CSS INJECTOR */}
      <style>{`
        @keyframes marqueeLeft {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marqueeLeft {
          animation: marqueeLeft 480s linear infinite;
        }
      `}</style>
    </div>
  );
}
