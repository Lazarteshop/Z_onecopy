import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { Firestore } from '@google-cloud/firestore';
import { initializeApp as initFirebaseApp, getApps as getFirebaseApps, getApp as getFirebaseApp } from 'firebase/app';
import { 
  getFirestore as getWebFirestore, 
  collection as webCollection, 
  doc as webDoc, 
  getDoc as webGetDoc,
  getDocs as webGetDocs, 
  setDoc as webSetDoc, 
  deleteDoc as webDeleteDoc,
  updateDoc as webUpdateDoc,
  query as webQuery,
  where as webWhere
} from 'firebase/firestore';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { INITIAL_CAMPAIGNS } from './src/data/campaigns';
import { GoogleGenAI } from '@google/genai';
import webpush from 'web-push';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// VAPID Web Push Setup
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEoePhNL4BlPYLBzw1foKQm1ajHEWnbtORLuPFlKcOd1F33VSaS9Rcmb_2Hyq9hvfONzJS6l6OPDegY55gMjemg';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '4mJ867usD6R8PMeN2ECtUVJMm0N8cA8jR9Ab7HfYCTk';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@gcash-click-earn.com';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('🔔 Web Push VAPID initialized successfully.');
} catch (vapidErr) {
  console.error('Failed to initialize VAPID details:', vapidErr);
}

app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// --- IDEMPOTENCY KEY PROTECTION SYSTEM ---
// Protects critical financial transactions and state mutations against duplicate packet replay on slow networks
const idempotencyCache = new Map<string, { status: number; body: any; timestamp: number }>();

// Periodic cleanup of idempotency cache (TTL: 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of idempotencyCache.entries()) {
    if (now - entry.timestamp > 10 * 60 * 1000) {
      idempotencyCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

function checkIdempotency(req: express.Request, res: express.Response, next: express.NextFunction) {
  const key = (req.headers['x-idempotency-key'] as string) || req.body?.idempotencyKey || req.body?.requestId;
  if (!key) {
    return next();
  }

  const cached = idempotencyCache.get(key);
  if (cached) {
    console.log(`[Idempotency] Returning cached response for key: ${key}`);
    return res.status(cached.status).json(cached.body);
  }

  // Intercept json response to cache it
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      idempotencyCache.set(key, { status: res.statusCode, body, timestamp: Date.now() });
    }
    return originalJson(body);
  };

  next();
}

// --- HIGH-QUALITY TEXT-TO-SPEECH PROXY ENDPOINT ---
function splitTextIntoChunks(text: string, maxLength: number = 150): string[] {
  // Split by sentence boundaries but keep punctuation
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if ((currentChunk + ' ' + trimmed).trim().length <= maxLength) {
      currentChunk = (currentChunk + ' ' + trimmed).trim();
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      if (trimmed.length <= maxLength) {
        currentChunk = trimmed;
      } else {
        // If a single sentence is longer than maxLength, split by spaces
        const parts = trimmed.split(' ');
        currentChunk = '';
        for (const part of parts) {
          if (!part) continue;
          if ((currentChunk + ' ' + part).trim().length <= maxLength) {
            currentChunk = (currentChunk + ' ' + part).trim();
          } else {
            if (currentChunk.trim()) {
              chunks.push(currentChunk.trim());
            }
            currentChunk = part;
          }
        }
      }
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}

function numberToTagalog(n: number): string {
  if (n === 0) return "zero";
  
  const ones = ["", "isa", "dalawa", "tatlo", "apat", "lima", "anim", "pito", "walo", "siyam"];
  const tens = ["", "sampu", "dalawampu", "tatlumpu", "apatnapu", "limampu", "animnapu", "pitumpu", "walumpu", "siyamnapu"];
  
  if (n < 10) return ones[n];
  
  if (n >= 10 && n < 20) {
    const digit = n % 10;
    if (digit === 0) return "sampu";
    const base = ones[digit];
    return `labing-${base}`;
  }
  
  if (n >= 20 && n < 100) {
    const tenIndex = Math.floor(n / 10);
    const digit = n % 10;
    if (digit === 0) return tens[tenIndex];
    return `${tens[tenIndex]}'t ${ones[digit]}`;
  }
  
  if (n >= 100 && n < 1000) {
    const hundredDigit = Math.floor(n / 100);
    const remaining = n % 100;
    
    let hundredStr = "";
    if (hundredDigit === 1) {
      hundredStr = "isang daan";
    } else if (hundredDigit === 2) {
      hundredStr = "dalawang daan";
    } else if (hundredDigit === 3) {
      hundredStr = "tatlong daan";
    } else if (hundredDigit === 4) {
      hundredStr = "apat na raan";
    } else if (hundredDigit === 5) {
      hundredStr = "limang daan";
    } else if (hundredDigit === 6) {
      hundredStr = "anim na raan";
    } else if (hundredDigit === 7) {
      hundredStr = "pitong daan";
    } else if (hundredDigit === 8) {
      hundredStr = "walong daan";
    } else if (hundredDigit === 9) {
      hundredStr = "siyam na raan";
    }
    
    if (remaining === 0) return hundredStr;
    return `${hundredStr} at ${numberToTagalog(remaining)}`;
  }
  
  if (n >= 1000 && n < 1000000) {
    const thousandPart = Math.floor(n / 1000);
    const remaining = n % 1000;
    
    let thousandStr = "";
    if (thousandPart === 1) {
      thousandStr = "isang libo";
    } else {
      const thousandSpoken = numberToTagalog(thousandPart);
      let linker = "ng";
      if (thousandSpoken.endsWith("a") || thousandSpoken.endsWith("o") || thousandSpoken.endsWith("u")) {
        linker = "ng";
      } else if (thousandSpoken.endsWith("n")) {
        linker = "g";
      } else {
        linker = " na";
      }
      
      if (thousandSpoken.endsWith("'t")) {
        thousandStr = `${thousandSpoken} libo`;
      } else {
        thousandStr = `${thousandSpoken}${linker} libo`;
      }
    }
    
    if (remaining === 0) return thousandStr;
    return `${thousandStr} at ${numberToTagalog(remaining)}`;
  }
  
  return n.toString();
}

function normalizeFilipinoText(input: string): string {
  if (!input) return "";
  let result = input;

  // 1. First, replace known system names and abbreviations with high-quality phonetic representations
  // This ensures the neural TTS model pronounces "Z-one" exactly as the premium brand "Zee-one" instead of "Zohn"
  result = result.replace(/Z-oneApp/gi, 'Zee-one App');
  result = result.replace(/Z-one Feed/gi, 'Zee-one Feed');
  result = result.replace(/Z-one/gi, 'Zee-one');
  result = result.replace(/GCash/gi, 'G Cash');
  result = result.replace(/SMS/gi, 'S M S');
  result = result.replace(/FAQs/gi, 'F A Qs');

  // 2. Format 11-digit mobile numbers (e.g., 09171234567 or +639171234567) to space-separated digits
  // so that the TTS reads them naturally as individual digits (e.g. "0 9 1 7...") instead of a massive number
  result = result.replace(/(?:\+63|0)9\d{9}\b/g, (match) => {
    return match.split('').join(' ');
  });

  // 3. Process Filipino Peso currency notations (e.g. ₱100.00, ₱ 5.50, PHP 50)
  result = result.replace(/(?:₱|PHP)\s*([\d,]+)(?:\.(\d+))?/gi, (match, numStr, centStr) => {
    const rawNum = parseInt(numStr.replace(/,/g, ''), 10);
    const cents = centStr ? parseInt(centStr.substring(0, 2), 10) : 0;
    
    if (isNaN(rawNum)) return match;
    
    const spokenAmount = numberToTagalog(rawNum);
    
    let currencySuffix = " piso";
    if (spokenAmount.endsWith("n")) {
      currencySuffix = "g piso";
    } else if (spokenAmount.endsWith("a") || spokenAmount.endsWith("o") || spokenAmount.endsWith("u")) {
      currencySuffix = "ng piso";
    } else if (spokenAmount.endsWith("t") || spokenAmount.endsWith("m")) {
      currencySuffix = " na piso";
    }

    let spokenCents = "";
    if (cents > 0) {
      const centSpoken = numberToTagalog(cents);
      let centSuffix = " sentimo";
      if (centSpoken.endsWith("n")) {
        centSuffix = "g sentimo";
      } else if (centSpoken.endsWith("a") || centSpoken.endsWith("o") || centSpoken.endsWith("u")) {
        centSuffix = "ng sentimo";
      } else if (centSpoken.endsWith("t") || centSpoken.endsWith("m")) {
        centSuffix = " na sentimo";
      }
      spokenCents = " at " + centSpoken + centSuffix;
    }
    
    return `${spokenAmount}${currencySuffix}${spokenCents}`;
  });

  // 4. Remove commas from general standalone numbers (e.g. 1,500 -> 1500) so they can be parsed as a single number
  result = result.replace(/\b(\d{1,3})(?:,(\d{3}))+\b/g, (match) => {
    return match.replace(/,/g, '');
  });

  // 5. Clean trailing decimals from general standalone numbers (e.g. 100.00 -> 100) to avoid "point zero zero"
  result = result.replace(/(\d+)\.00\b/g, '$1');
  result = result.replace(/(\d+)\.0\b/g, '$1');

  // 6. Replace general standalone decimal numbers (e.g., 1.5, 3.14) with Tagalog "punto" words
  result = result.replace(/(\d+)\.(\d+)\b/g, (match, intPart, decPart) => {
    const intSpoken = numberToTagalog(parseInt(intPart, 10));
    const decSpoken = numberToTagalog(parseInt(decPart, 10));
    return `${intSpoken} punto ${decSpoken}`;
  });

  // 7. Explicitly handle common seconds / timing phrases in Tagalog
  result = result.replace(/5-segundong/g, 'limang segundong');
  result = result.replace(/5 segundo/g, 'limang segundo');
  result = result.replace(/1-segundong/g, 'isang segundong');
  result = result.replace(/1 segundo/g, 'isang segundo');
  result = result.replace(/3-segundong/g, 'tatlong segundong');
  result = result.replace(/3 segundo/g, 'tatlong segundo');
  result = result.replace(/10-segundong/g, 'sampung segundong');
  result = result.replace(/10 segundo/g, 'sampung segundo');

  // 8. Find any remaining standalone numbers (1 to 6 digits) and convert them to Tagalog words
  // We use word boundaries to avoid matching digits inside English words (like in HTML classes or IDs)
  result = result.replace(/\b\d{1,6}\b/g, (match) => {
    const n = parseInt(match, 10);
    if (isNaN(n)) return match;
    return numberToTagalog(n);
  });

  // 9. Deeply clean up special characters and punctuation that can trigger unnatural neural pauses,
  // stutters, or mechanical glitches in the TTS model. We want the text to be a pure, flowing script.
  result = result.replace(/['"`]/g, ''); // Strip all quotation marks to avoid hesitations
  result = result.replace(/[()]/g, ' '); // Replace parentheses with warm breathing spaces
  result = result.replace(/&/g, ' and '); // Convert raw ampersands to natural "and"
  result = result.replace(/[-]/g, ' ');  // Replace stray hyphens with brief pauses (spaces)

  return result;
}

function stripSSML(input: string): string {
  if (!input) return "";
  return input.replace(/<\/?[^>]+(>|$)/g, ""); // Strip any HTML/XML tags
}

function getVoiceForMode(voiceMode: string): string {
  switch (voiceMode) {
    case 'happy': return 'Puck';
    case 'sad': return 'Charon';
    case 'horror': return 'Fenrir';
    case 'news': return 'Kore';
    case 'romance': return 'Aoede';
    case 'wizard': return 'Fenrir';
    default: return 'Aoede';
  }
}

function buildSystemInstruction(
  voiceMode: string,
  clientRate?: string,
  clientPitch?: string,
  options?: {
    speakNaturally?: boolean;
    warmTone?: boolean;
    pauseNaturally?: boolean;
    newsPresenter?: boolean;
    emotionEmphasis?: boolean;
    ssmlMode?: boolean;
  }
): string {
  const speakNaturally = options?.speakNaturally ?? true;
  const warmTone = options?.warmTone ?? true;
  const pauseNaturally = options?.pauseNaturally ?? true;
  const newsPresenter = options?.newsPresenter ?? false;
  const emotionEmphasis = options?.emotionEmphasis ?? true;
  const ssmlMode = options?.ssmlMode ?? true;

  const rateDetail = clientRate ? ` speaking rate of ${clientRate}x,` : '';
  const pitchDetail = clientPitch ? ` pitch level of ${clientPitch},` : '';

  let directives: string[] = [];

  if (speakNaturally) {
    directives.push("Speak naturally like a real human. Do NOT sound like an AI assistant or reading machine. Speak with highly natural human inflection, realistic micro-breathing sounds, and native-like Taglish pronunciation.");
  }
  if (warmTone) {
    directives.push("Use a warm, conversational, and friendly tone of voice. Sound approachable, helpful, and authentic, as if having a personal discussion with a friend or viewer.");
  }
  if (pauseNaturally) {
    directives.push("Pause naturally between sentences and phrases. Insert tiny micro-pauses or brief breathing spaces where a real person would naturally catch their breath (e.g. at commas, periods, and ellipses), making the rhythm flow smoothly.");
  }
  if (newsPresenter || voiceMode === 'news') {
    directives.push("Sound like a professional, articulate Filipino news presenter or broadcast journalist. Use perfect pronunciation, formal authoritative emphasis, and clear, crisp evening news intonation.");
  }
  if (emotionEmphasis) {
    directives.push("Add slight emotion and appropriate vocal emphasis. Convey the actual feeling behind the words (e.g., excitement for rewards, trust for security) and emphasize important UI names and terms naturally.");
  }
  if (ssmlMode) {
    directives.push("Interpret the script structure as if reading SSML prosody guidelines: slow down for explanatory points, raise pitch slightly for warm expressions, and vary speaking rate and volume to keep the content highly engaging and human.");
  }

  // Base voice character
  let baseRole = "You are a warm, extremely friendly, and 100% real human narrator.";
  if (voiceMode === 'happy') {
    baseRole = "You are an exceptionally happy, lively, and enthusiastic human narrator.";
  } else if (voiceMode === 'romance') {
    baseRole = "You are an intimate, soft, and extremely warm human narrator speaking closely to the microphone.";
  } else if (voiceMode === 'sad') {
    baseRole = "You are a deeply emotional, somber, and sincere human narrator speaking with a heavy heart.";
  } else if (voiceMode === 'horror') {
    baseRole = "You are a suspenseful, creepy, and terrifyingly realistic narrator speaking with deep whispers.";
  } else if (voiceMode === 'wizard') {
    baseRole = "You are a wise, mystical, deep-voiced, and ancient wizard narrator speaking with great authority and magical resonance.";
  } else if (newsPresenter || voiceMode === 'news') {
    baseRole = "You are an articulate, professional, and formal native Filipino news reporter.";
  }

  return `${baseRole} Speak with a${rateDetail}${pitchDetail} custom-tuned voice.
Specific voice directives to follow:
${directives.map((d, i) => `${i + 1}. ${d}`).join('\n')}

The script is in Taglish (Tagalog-English code-switching). Read English words (like "Register", "G-Cash", "Browse & Earn", "SMS", "status", "posts", "wallet") with a highly natural, fluent, and lifelike Filipino-English accent—exactly how a real Filipino content creator or vlogger would say them in a video. Absolutely zero mechanical or flat cadence. Do not add any introductory remarks, notes, or explanations. Only read the script text provided, verbatim.`;
}

async function preProcessWithAI(
  rawInput: string, 
  voiceMode: string, 
  clientRate?: string, 
  clientPitch?: string,
  options?: {
    speakNaturally?: boolean;
    warmTone?: boolean;
    pauseNaturally?: boolean;
    newsPresenter?: boolean;
    emotionEmphasis?: boolean;
    highQualityAI?: boolean;
    autoPunctuate?: boolean;
    ssmlMode?: boolean;
    verbatim?: boolean;
  }
): Promise<{ spokenText: string; systemInstruction: string; voiceName: string }> {
  const ai = getGeminiClient();
  const defaultVoice = getVoiceForMode(voiceMode);
  const defaultInstruction = buildSystemInstruction(voiceMode, clientRate, clientPitch, options);

  const speakNaturally = options?.speakNaturally ?? true;
  const warmTone = options?.warmTone ?? true;
  const pauseNaturally = options?.pauseNaturally ?? true;
  const newsPresenter = options?.newsPresenter ?? false;
  const emotionEmphasis = options?.emotionEmphasis ?? true;
  const highQualityAI = options?.highQualityAI ?? true;
  const autoPunctuate = options?.autoPunctuate ?? true;
  const ssmlMode = options?.ssmlMode ?? true;
  const verbatim = options?.verbatim ?? false;

  if (!ai || !highQualityAI) {
    console.log(`[TTS Preprocessor] Skipping AI study (highQualityAI: ${highQualityAI}, aiClientAvailable: ${!!ai})`);
    return {
      spokenText: normalizeFilipinoText(stripSSML(rawInput)),
      systemInstruction: defaultInstruction,
      voiceName: defaultVoice
    };
  }

  const activeDirectives: string[] = [];
  if (speakNaturally) activeDirectives.push("- Speak naturally: Avoid monotonic, word-by-word reading. Blend phrases naturally with proper liaison.");
  if (verbatim) activeDirectives.push("- Verbatim Speech: The user requested to read their custom script EXACTLY as written. Under NO circumstances should you rewrite, substitute, or delete any words. Keep every word, number, and abbreviation of the Input Text exactly as-is in your 'optimizedSpokenText' output, but still generate a masterclass system instruction for reading this exact text with a natural human voice.");
  if (warmTone) activeDirectives.push("- Warm and conversational: Use a friendly, natural vlogger-like voice tone.");
  if (pauseNaturally) activeDirectives.push("- Pause naturally between sentences: Use ellipses (...) or commas (,) or line breaks to inject natural human breathing pauses.");
  if (newsPresenter || voiceMode === 'news') activeDirectives.push("- Filipino news presenter: Speak with professional, articulate evening-news authority and crystal-clear pronunciation.");
  if (emotionEmphasis) activeDirectives.push("- Add slight emotion and emphasis: Stress key reward values and UI names with authentic emotional touchpoints.");
  if (autoPunctuate) activeDirectives.push("- Tamang Punctuation: Ensure commas, periods, ellipses, and paragraph breaks are placed perfectly to force the voice synthesizer to pause and pace itself exactly like a real person.");
  if (ssmlMode) activeDirectives.push("- SSML Prosody simulation: Study the text's semantic meaning. Slow down at detailed instructions, and speed up or raise pitch slightly during happy/community sections, using formatting/punctuation and detailed direction to achieve this.");

  const prompt = `You are an elite, professional voiceover director and phonetic scriptwriter. 
Your goal is to study the following input text paragraph and optimize it into an absolute masterpiece of natural, human-sounding, fluent conversational script in Taglish (Tagalog-English code-switching) as spoken by a 100% real human narrator.

Input Text to study and rewrite:
"""
${rawInput}
"""

Voice Style Mode requested: ${voiceMode}
Prosody Rate requested: ${clientRate || 'normal/1.0'}
Prosody Pitch requested: ${clientPitch || 'normal/0%'}

ACTIVE HUMAN VOICE TUNING DIRECTIVES TO INTEGRATE:
${activeDirectives.join('\n')}

Guidelines for studying the paragraph and translating/rewriting it:
1. **Word-by-word Elimination**:
   - Do NOT read word-by-word. Real humans speak in rhythmic thought-groups.
   - Insert commas, periods, ellipses "...", and line breaks to naturally force the TTS voice to take a breath and pause.
   - Group Taglish phrases beautifully so they flow seamlessly.
2. **Taglish & Pronunciation Rules**:
   - Keep standard English UI terms (like "Register", "G-Cash", "Browse & Earn", "Sponsor Website Simulator", "SMS", "Posts", "Wallet", "Countdown", "Campaign") in fluent Taglish. Do NOT translate them to mechanical Tagalog. Write them exactly as a real Filipino content creator would say them in a vlog!
   - Expand numbers and symbols into fluent spoken words (e.g., change "₱5.00" to "limang piso", "₱100.00" to "isang daang piso", "5-segundong" to "limang segundong") so they sound perfectly integrated instead of mathematically read.
3. **Voice Directive Construction**:
   - Create a tailored, highly specific, 1-paragraph system instruction for the neural TTS model to read this script.
   - Include the active directives (like conversational warm tone, natural pausing, vlogger style, etc.) in the instruction so the TTS voice engine knows exactly what emotion and pacing to apply.

Provide your output in EXACTLY the following JSON format:
{
  "optimizedSpokenText": "the fully studied, custom punctuated, highly conversational script with natural commas, periods, and ellipses for the TTS model to read",
  "tailoredSystemInstruction": "a detailed, custom 1-paragraph system instruction for the TTS model explaining the exact tone, pacing, emphasis, and emotion to use to sound 100% human for this script",
  "recommendedVoiceName": "the prebuilt voice to use (choose from: Aoede, Puck, Charon, Kore, Fenrir)"
}

Ensure your response is valid JSON and nothing else.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ text: prompt }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.15
      }
    });

    const responseText = response.text;
    if (responseText) {
      const parsed = JSON.parse(responseText.trim());
      if (parsed.optimizedSpokenText && parsed.tailoredSystemInstruction) {
        console.log(`[TTS Preprocessor] AI studied paragraph successfully using gemini-3.5-flash.`);
        console.log(`[TTS Preprocessor] Original: "${rawInput.substring(0, 50)}..."`);
        console.log(`[TTS Preprocessor] Optimized: "${parsed.optimizedSpokenText.substring(0, 60)}..."`);
        console.log(`[TTS Preprocessor] Voice recommended: ${parsed.recommendedVoiceName || defaultVoice}`);
        return {
          spokenText: verbatim ? rawInput : parsed.optimizedSpokenText,
          systemInstruction: parsed.tailoredSystemInstruction,
          voiceName: parsed.recommendedVoiceName || defaultVoice
        };
      }
    }
  } catch (err) {
    console.error(`[TTS Preprocessor] AI preprocessing failed, using standard heuristics. Error:`, err);
  }

  return {
    spokenText: normalizeFilipinoText(stripSSML(rawInput)),
    systemInstruction: defaultInstruction,
    voiceName: defaultVoice
  };
}

// Proxy endpoint to strip X-Frame-Options and Content-Security-Policy so external websites can be viewed inside BrowserSimulator without net::ERR_BLOCKED_BY_RESPONSE errors
app.get('/api/proxy-web', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    return res.status(400).send('Invalid or missing URL parameter.');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,tl;q=0.8'
      },
      redirect: 'follow'
    });
    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || 'text/html; charset=utf-8';
    res.setHeader('Content-Type', contentType);

    // Strip frame-blocking headers
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Frame-Options');

    if (contentType.includes('text/html')) {
      let body = await response.text();
      
      try {
        const parsed = new URL(targetUrl);
        const baseUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
        // Inject <base> tag to resolve relative paths
        if (!/<base\s/i.test(body)) {
          body = body.replace(/<head[^>]*>/i, (match) => `${match}\n<base href="${baseUrl}">`);
        }
      } catch (e) {
        // ignore parse error
      }

      // Neutralize framebuster scripts like `if (top != self) top.location = self.location`
      body = body.replace(/top\.location\s*=/gi, 'void 0 =')
                 .replace(/parent\.location\s*=/gi, 'void 0 =')
                 .replace(/top\.location\.href\s*=/gi, 'void 0 =')
                 .replace(/window\.top\.location\s*=/gi, 'void 0 =');

      return res.send(body);
    } else {
      // Stream or send non-HTML content (e.g. css/js/images)
      const arrayBuffer = await response.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    }
  } catch (err: any) {
    console.error(`Error in /api/proxy-web for ${targetUrl}:`, err.message);
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; }
            .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 24px; max-width: 480px; width: 100%; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
            h2 { color: #38bdf8; margin-top: 0; font-size: 20px; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin-bottom: 20px; }
            .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #10b981; color: white; padding: 12px 24px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 15px; transition: background 0.2s; box-shadow: 0 4px 12px rgba(16,185,129,0.3); }
            .btn:hover { background: #059669; }
            .badge { display: inline-block; background: rgba(56, 189, 248, 0.1); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.2); padding: 4px 10px; border-radius: 20px; font-size: 12px; margin-bottom: 12px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">🌐 Direct Connection Available</div>
            <h2>Pumunta sa Website ng Advertiser</h2>
            <p>Ang website na ito ay maaari mong bisitahin nang direkta sa bagong browser tab. I-click ang button sa ibaba upang buksan ito. Mananatiling aktibo ang iyong timer para makuha ang rewards!</p>
            <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="btn">
              🚀 Buksan ang Website sa Bagong Tab
            </a>
          </div>
        </body>
      </html>
    `);
  }
});

app.get('/api/tts', async (req, res) => {
  const rawText = req.query.text as string;
  const lang = (req.query.lang as string) || 'tl';
  const voiceMode = (req.query.voiceMode as string) || 'normal';
  const clientRate = req.query.rate as string; // Optional speaking rate parameter
  const clientPitch = req.query.pitch as string; // Optional pitch parameter
  
  // Custom Human Tuning parameters from client
  const speakNaturally = req.query.speakNaturally === 'true';
  const warmTone = req.query.warmTone === 'true';
  const pauseNaturally = req.query.pauseNaturally === 'true';
  const newsPresenter = req.query.newsPresenter === 'true';
  const emotionEmphasis = req.query.emotionEmphasis === 'true';
  const highQualityAI = req.query.highQualityAI !== 'false';
  const autoPunctuate = req.query.autoPunctuate !== 'false';
  const ssmlMode = req.query.ssmlMode !== 'false';
  const verbatim = req.query.verbatim === 'true';

  if (!rawText) {
    return res.status(400).send('Missing text parameter');
  }

  // Preprocess input text (including any SSML tags) with AI to optimize spoken text and system instruction
  const { spokenText, systemInstruction, voiceName } = await preProcessWithAI(rawText, voiceMode, clientRate, clientPitch, {
    speakNaturally,
    warmTone,
    pauseNaturally,
    newsPresenter,
    emotionEmphasis,
    highQualityAI,
    autoPunctuate,
    ssmlMode,
    verbatim
  });

  // Attempt to use Gemini TTS for high fidelity human voiceover
  const ai = getGeminiClient();
  if (ai) {
    let base64Audio: string | undefined;

    // First attempt: gemini-3.1-flash-tts-preview
    try {
      console.log(`[TTS] Requesting Gemini TTS (model: gemini-3.1-flash-tts-preview, voice: ${voiceName}, mode: ${voiceMode}) for text: "${spokenText.substring(0, 50)}..."`);

      // We send the 100% pure studied script text inside 'contents' to prevent the model from getting confused
      // or trying to read prompt instructions. The voice behavior is controlled entirely by the systemInstruction.
      const ttsResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: [{ 
          parts: [{ text: spokenText }] 
        }],
        config: {
          responseModalities: ['AUDIO'],
          systemInstruction: systemInstruction,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName }
            }
          }
        }
      });

      base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (err) {
      console.warn(`[TTS] Primary gemini-3.1-flash-tts-preview failed, attempting fallback to gemini-2.5-flash-preview-tts. Error:`, err);
    }

    // Fallback: gemini-2.5-flash-preview-tts
    if (!base64Audio) {
      try {
        console.log(`[TTS] Requesting Fallback Gemini TTS (model: gemini-2.5-flash-preview-tts, voice: ${voiceName}, mode: ${voiceMode})`);
        const ttsResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-preview-tts',
          contents: [{ 
            parts: [{ text: spokenText }] 
          }],
          config: {
            responseModalities: ['AUDIO'],
            systemInstruction: systemInstruction,
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName }
              }
            }
          }
        });

        base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      } catch (err) {
        console.error(`[TTS] Fallback gemini-2.5-flash-preview-tts failed. Error:`, err);
      }
    }

    if (base64Audio) {
      console.log(`[TTS] Gemini TTS synthesized successfully!`);
      const audioBuffer = Buffer.from(base64Audio, 'base64');
      res.setHeader('Content-Type', 'audio/mp3');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      return res.send(audioBuffer);
    } else {
      console.warn(`[TTS] Both Gemini TTS models did not return audio data for text: "${spokenText.substring(0, 30)}". Falling back to Google Translate TTS.`);
    }
  }

  // FALLBACK: Google Translate TTS Proxy (stipping SSML tags to avoid robotic reads of XML)
  const cleanFallbackText = normalizeFilipinoText(stripSSML(rawText));
  try {
    const textChunks = splitTextIntoChunks(cleanFallbackText, 150);
    const buffers: Buffer[] = [];

    for (const chunk of textChunks) {
      if (!chunk.trim()) continue;
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`;
      
      const response = await fetch(ttsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.63 Safari/537.36'
        }
      });

      if (!response.ok) {
        console.warn(`Google TTS returned status ${response.status} for chunk: ${chunk}`);
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      buffers.push(Buffer.from(arrayBuffer));
    }

    if (buffers.length === 0) {
      throw new Error("Failed to synthesize any text chunks");
    }

    const mergedBuffer = Buffer.concat(buffers);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.send(mergedBuffer);
  } catch (error) {
    console.error('Text-to-speech proxy failure:', error);
    res.status(500).send('Failed to synthesize speech');
  }
});

// --- IN-MEMORY USER ONLINE STATUS TRACKING ---
const activeUsersMap: Record<string, number> = {};

app.use((req, res, next) => {
  const token = req.headers.authorization;
  if (token) {
    activeUsersMap[token] = Date.now();
  }
  next();
});

// --- PERSISTENT DATA STORAGE PATHS ---
const DATA_DIRECTORY = process.env.DATA_DIR || process.env.RENDER_DATA_PATH || (fs.existsSync('/var/data') ? '/var/data' : path.join(process.cwd(), 'src', 'data'));
if (!fs.existsSync(DATA_DIRECTORY)) {
  try {
    fs.mkdirSync(DATA_DIRECTORY, { recursive: true });
  } catch (mkErr) {
    console.error('Failed creating DATA_DIRECTORY:', mkErr);
  }
}

const DB_FILE_PATH = path.join(DATA_DIRECTORY, 'db.json');
const DB_BACKUP_PATH = path.join(DATA_DIRECTORY, 'db.json.bak');
const DB_TMP_PATH = path.join(DATA_DIRECTORY, 'db.json.tmp');

// If running with a dedicated persistent disk (e.g. on Render) and DB does not exist yet there, copy initial db.json
const BASE_DEFAULT_DB = path.join(process.cwd(), 'src', 'data', 'db.json');
if (DATA_DIRECTORY !== path.join(process.cwd(), 'src', 'data') && !fs.existsSync(DB_FILE_PATH) && fs.existsSync(BASE_DEFAULT_DB)) {
  try {
    fs.copyFileSync(BASE_DEFAULT_DB, DB_FILE_PATH);
    console.log(`📁 Persistent storage initialized: Copied baseline database from ${BASE_DEFAULT_DB} to ${DB_FILE_PATH}`);
  } catch (copyErr) {
    console.error('Error copying baseline database to persistent disk:', copyErr);
  }
}

// --- FIREBASE CONFIGURATION & INITIALIZATION ---
let firebaseConfigObj = {
  projectId: "feisty-listener-3d2jw",
  appId: "1:828078909829:web:ce668cbe71588119b33cec",
  apiKey: "AIzaSyCxS9Nt3GHIfo82RSuDEvzYrdJtpJSFTHk",
  authDomain: "feisty-listener-3d2jw.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-websiteviewerand-39fa42c9-2ddb-4a73-9de1-b8f9fc2b550c",
  storageBucket: "feisty-listener-3d2jw.firebasestorage.app",
  messagingSenderId: "828078909829"
};

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfigObj = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch (e) {
  console.error('Warning: Failed to load dynamic firebase-applet-config.json, using defaults.', e);
}

// Unified Cloud DB Adapter
interface CloudDBAdapter {
  isActive: boolean;
  type: 'gcp-admin' | 'web-client' | 'none';
  getCollection: (colName: string) => Promise<any[]>;
  getDoc: (colName: string, docId: string) => Promise<any | null>;
  setDoc: (colName: string, docId: string, data: any) => Promise<void>;
  deleteDoc: (colName: string, docId: string) => Promise<void>;
  updateDoc: (colName: string, docId: string, data: any) => Promise<void>;
  queryByField: (colName: string, field: string, value: any) => Promise<any[]>;
}

let cloudDb: CloudDBAdapter = {
  isActive: false,
  type: 'none',
  getCollection: async () => [],
  getDoc: async () => null,
  setDoc: async () => {},
  deleteDoc: async () => {},
  updateDoc: async () => {},
  queryByField: async () => []
};

let isFirestoreActive = false;
let firestore: any = null;

// --- SECURE GOOGLE CLOUD / FIREBASE SERVICE ACCOUNT CREDENTIALS ENGINE ---
function resolveServiceAccountCredentials(): { data: any | null; source: string | null } {
  const envCandidates = [
    { name: 'FIREBASE_SERVICE_ACCOUNT', value: process.env.FIREBASE_SERVICE_ACCOUNT },
    { name: 'GOOGLE_APPLICATION_CREDENTIALS', value: process.env.GOOGLE_APPLICATION_CREDENTIALS },
    { name: 'FIREBASE_SERVICE_ACCOUNT_KEY', value: process.env.FIREBASE_SERVICE_ACCOUNT_KEY },
    { name: 'SERVICE_ACCOUNT_KEY', value: process.env.SERVICE_ACCOUNT_KEY },
    { name: 'GCS_KEY', value: process.env.GCS_KEY }
  ];

  for (const candidate of envCandidates) {
    const raw = candidate.value?.trim();
    if (!raw) continue;

    // 1. Raw inline JSON string
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.client_email || parsed.project_id) {
          return { data: parsed, source: `${candidate.name} (inline JSON)` };
        }
      } catch (err: any) {
        console.error(`⚠️ [Auth][WARN] Failed to parse inline JSON from ${candidate.name}:`, err.message);
      }
    }

    // 2. Base64-encoded JSON string
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf-8').trim();
      if (decoded.startsWith('{')) {
        const parsed = JSON.parse(decoded);
        if (parsed.client_email || parsed.project_id) {
          return { data: parsed, source: `${candidate.name} (base64 decoded)` };
        }
      }
    } catch (_) {}

    // 3. File path on container/filesystem
    try {
      if (fs.existsSync(raw)) {
        const fileContent = fs.readFileSync(raw, 'utf-8').trim();
        if (fileContent.startsWith('{')) {
          const parsed = JSON.parse(fileContent);
          if (parsed.client_email || parsed.project_id) {
            return { data: parsed, source: `${candidate.name} (file: ${raw})` };
          }
        }
      }
    } catch (err: any) {
      console.error(`⚠️ [Auth][WARN] Failed reading credentials file from ${raw}:`, err.message);
    }
  }

  return { data: null, source: null };
}

const { data: serviceAccountData, source: credentialSource } = resolveServiceAccountCredentials();
const hasServiceAccount = !!serviceAccountData;
const isOnGoogleCloud = !!process.env.K_SERVICE || !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

// Sanitized Startup Verification Log (Strictly NO private keys or tokens logged)
if (hasServiceAccount) {
  const maskedEmail = serviceAccountData.client_email 
    ? `${serviceAccountData.client_email.split('@')[0].substring(0, 8)}...` 
    : 'service-account';
  console.log(`🗝️ [Storage][AUTH_CONFIG] Secure Service Account credentials loaded from ${credentialSource}. Project: ${serviceAccountData.project_id || 'default'}, Client: ${maskedEmail}, HasPrivateKey: ${!!serviceAccountData.private_key}`);
} else if (isOnGoogleCloud) {
  console.log('☁️ [Storage][AUTH_CONFIG] Google Cloud Run container detected (Metadata Server IAM authentication available).');
} else {
  console.log('ℹ️ [Storage][AUTH_CONFIG] No explicit Service Account found in environment variables. Will attempt Metadata server fallback if running in GCP.');
}

// 1. First attempt: @google-cloud/firestore (GCP IAM / Service Account)
if (hasServiceAccount || isOnGoogleCloud) {
  try {
    const isCustomProject = hasServiceAccount && serviceAccountData?.project_id && (serviceAccountData.project_id !== firebaseConfigObj.projectId);
    
    const firestoreOptions: any = {
      projectId: hasServiceAccount ? (serviceAccountData.project_id || firebaseConfigObj.projectId) : firebaseConfigObj.projectId,
    };

    if (!isCustomProject && firebaseConfigObj.firestoreDatabaseId) {
      firestoreOptions.databaseId = firebaseConfigObj.firestoreDatabaseId;
    }

    if (hasServiceAccount) {
      firestoreOptions.credentials = serviceAccountData;
    }

    const gcpFirestore = new Firestore(firestoreOptions);
    firestore = gcpFirestore;
    isFirestoreActive = true;

    cloudDb = {
      isActive: true,
      type: 'gcp-admin',
      getCollection: async (colName: string) => {
        const snap = await gcpFirestore.collection(colName).get();
        const items: any[] = [];
        snap.forEach(docSnap => items.push({ id: docSnap.id, ...docSnap.data() }));
        return items;
      },
      getDoc: async (colName: string, docId: string) => {
        const snap = await gcpFirestore.collection(colName).doc(docId).get();
        if (!snap.exists) return null;
        return { id: snap.id, ...snap.data() };
      },
      setDoc: async (colName: string, docId: string, data: any) => {
        await gcpFirestore.collection(colName).doc(docId).set(data);
      },
      deleteDoc: async (colName: string, docId: string) => {
        await gcpFirestore.collection(colName).doc(docId).delete();
      },
      updateDoc: async (colName: string, docId: string, data: any) => {
        await gcpFirestore.collection(colName).doc(docId).update(data);
      },
      queryByField: async (colName: string, field: string, value: any) => {
        const snap = await gcpFirestore.collection(colName).where(field, '==', value).get();
        const items: any[] = [];
        snap.forEach(docSnap => items.push({ id: docSnap.id, ...docSnap.data() }));
        return items;
      }
    };
    console.log('☁️ @google-cloud/firestore client initialized successfully.');
  } catch (err) {
    console.warn('⚠️ @google-cloud/firestore initialization failed, switching to Firebase Web Client SDK fallback:', err);
  }
}

// 2. Firebase Web Client SDK initialization
let fbAppInstance: any = null;

try {
  fbAppInstance = getFirebaseApps().length > 0 ? getFirebaseApp() : initFirebaseApp({
    apiKey: firebaseConfigObj.apiKey,
    projectId: firebaseConfigObj.projectId,
    authDomain: firebaseConfigObj.authDomain,
    storageBucket: firebaseConfigObj.storageBucket,
    messagingSenderId: firebaseConfigObj.messagingSenderId,
    appId: firebaseConfigObj.appId
  });
} catch (fbInitErr) {
  console.warn('⚠️ Firebase Web App initialization warning:', fbInitErr);
}

if (!cloudDb.isActive && fbAppInstance) {
  try {
    const webDbInstance = firebaseConfigObj.firestoreDatabaseId
      ? getWebFirestore(fbAppInstance, firebaseConfigObj.firestoreDatabaseId)
      : getWebFirestore(fbAppInstance);

    cloudDb = {
      isActive: true,
      type: 'web-client',
      getCollection: async (colName: string) => {
        const snap = await webGetDocs(webCollection(webDbInstance, colName));
        const items: any[] = [];
        snap.forEach(docSnap => items.push({ id: docSnap.id, ...docSnap.data() }));
        return items;
      },
      getDoc: async (colName: string, docId: string) => {
        const snap = await webGetDoc(webDoc(webDbInstance, colName, docId));
        if (!snap.exists()) return null;
        return { id: snap.id, ...snap.data() };
      },
      setDoc: async (colName: string, docId: string, data: any) => {
        await webSetDoc(webDoc(webDbInstance, colName, docId), data);
      },
      deleteDoc: async (colName: string, docId: string) => {
        await webDeleteDoc(webDoc(webDbInstance, colName, docId));
      },
      updateDoc: async (colName: string, docId: string, data: any) => {
        await webUpdateDoc(webDoc(webDbInstance, colName, docId), data);
      },
      queryByField: async (colName: string, field: string, value: any) => {
        const q = webQuery(webCollection(webDbInstance, colName), webWhere(field, '==', value));
        const snap = await webGetDocs(q);
        const items: any[] = [];
        snap.forEach(docSnap => items.push({ id: docSnap.id, ...docSnap.data() }));
        return items;
      }
    };
    isFirestoreActive = true;
    firestore = webDbInstance;
    console.log(`☁️ Firebase Web SDK Firestore adapter initialized successfully (Database: ${firebaseConfigObj.firestoreDatabaseId || 'default'}).`);
  } catch (webErr) {
    console.error('⚠️ Could not initialize Firebase Web SDK adapter. Active storage will use persistent local database:', webErr);
    isFirestoreActive = false;
    firestore = null;
  }
}

// --- DATABASE TYPES ---
interface Subscription {
  status: 'none' | 'pending' | 'active' | 'expired';
  planId: '7days' | '1month' | '2months' | '3months' | '4months' | null;
  requestedPlanName?: string | null;
  requestedAmount?: number | null;
  requestedAt?: string | null;
  approvedAt?: string | null;
  expiresAt?: string | null;
}

interface UserSession {
  id: string;
  email: string;
  password?: string;
  name: string;
  avatar: string;
  coverPhoto?: string;
  bio?: string;
  referralCode: string;
  invitedBy?: string; // referralCode of referrer
  isAdmin: boolean;
  isDemo?: boolean; // System clone / demo mode flag (RAM only, NOT saved to DB/Firestore)
  isBanned?: boolean; // banned from Z-one or app
  reelsTokens?: number; // Reels upload tokens (0.50 tokens = 1 reel)
  balance?: number; // top-level balance fallback
  lifetimeEarnings?: number; // top-level lifetime earnings fallback
  zonedUsers?: string[]; // userIds followed/zoned
  createdAt?: string;
  subscription?: Subscription;
  completedCampaignIds?: string[]; // track completed campaigns centrally
  lastCampaignDateKey?: string; // tracks daily campaign resets at 6am PST
  freeAccessExpiresAt?: string; // 3-Hour free access from spin wheel
  lastSpinDateKey?: string; // daily track for spin wheel YYYY-MM-DD PST
  wonFreeAccessDateKey?: string; // daily track to ensure ONLY ONE winner per day in system
  stats: {
    balance: number;
    lifetimeEarnings: number;
    completedTasksCount: number;
    dailyCheckInDate: string | null;
  };
  withdrawals: {
    id: string;
    accountName: string;
    gcashNumber: string;
    amount: number;
    status: 'pending' | 'processing' | 'success' | 'failed';
    createdAt: string;
    referenceNo: string;
  }[];
  activityLogs: {
    id: string;
    type: 'reward' | 'withdraw' | 'bonus';
    title: string;
    amount: number;
    timestamp: string;
    details: string;
  }[];
  referredFriends: {
    id: string;
    name: string;
    avatar: string;
    currentEarnings: number;
    bonusClaimed: boolean;
    joinedAt: string;
  }[];
  pushSubscriptions?: Array<{
    endpoint: string;
    expirationTime?: number | null;
    keys: {
      p256dh: string;
      auth: string;
    };
    userAgent?: string;
    createdAt?: string;
  }>;
  vaStats?: {
    hiredCount: number;
    virtualMoneyBalance: number;
    totalVMEarned: number;
    hiringRewardClaimed: boolean;
    hiringRewardClaimedAt?: string;
    isVaRegistered?: boolean;
    vaSubscription?: {
      status: 'none' | 'pending' | 'active' | 'expired';
      subscribedAt?: string;
      expiresAt?: string;
      paymentMethod?: 'balance' | 'gcash';
      gcashSenderNumber?: string;
      gcashRefNo?: string;
    };
    hiredVAs?: Array<{
      id: string;
      userId: string;
      name: string;
      avatar: string;
      email?: string;
      hiredAt: string;
      status: 'active' | 'flagged';
    }>;
  };
}

interface DirectMessage {
  id: string;
  clientMessageId?: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  createdAt: string;
}

interface GroupChat {
  id: string;
  name: string;
  avatar: string;
  description?: string;
  createdBy: string;
  creatorName: string;
  members: string[]; // User IDs
  createdAt: string;
  updatedAt?: string;
}

interface GroupMessage {
  id: string;
  clientMessageId?: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  createdAt: string;
}

interface StoryReaction {
  userId: string;
  userName: string;
  userAvatar: string;
  emoji: string;
  createdAt: string;
}

interface StoryViewerDetail {
  id: string;
  name: string;
  avatar: string;
  viewedAt: string;
}

interface ZoneStory {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  mediaUrl?: string;
  mediaType: 'image' | 'video' | 'text';
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  caption?: string;
  viewers: string[]; // user IDs
  viewerDetails?: StoryViewerDetail[];
  reactions?: StoryReaction[];
  createdAt: string;
  expiresAt: string;
}

interface ActiveCall {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  type: 'video' | 'voice';
  status: 'ringing' | 'accepted' | 'declined' | 'ended';
  createdAt: string;
  callerSignal?: string;
  receiverSignal?: string;
  callerCandidates?: string;
  receiverCandidates?: string;
}

interface MerchantAd {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  title: string;
  url: string;
  description: string;
  logo: string;
  category: 'Shopping' | 'Balita' | 'Teknolohiya' | 'E-Services' | 'Kultura';
  primaryColor: string;
  accentColor: string;
  planId: 'bronze' | 'silver' | 'gold' | 'platinum';
  planName: string;
  price: number;
  durationDays: number;
  gcashSenderNumber: string;
  gcashReferenceNo: string;
  status: 'pending' | 'active' | 'declined' | 'expired';
  createdAt: string;
  approvedAt?: string;
  expiresAt?: string;
  aiCommercial?: any;
}

interface ReelVideo {
  id: string;
  url: string;
  embedUrl: string;
  platform: 'tiktok' | 'facebook' | 'youtube' | 'direct';
  title?: string;
  likes: number;
  likedBy?: string[];
  watchedBy?: string[];
  addedBy?: string;
  addedByUserId?: string;
  status?: 'approved' | 'pending' | 'disapproved';
  disapproveReason?: string;
  createdAt: string;
}

interface ReelTokenSubscription {
  id: string;
  userId?: string;
  userName: string;
  userEmail?: string;
  gcashNumber: string;
  gcashRefNo: string;
  packageName: string;
  price: number;
  tokensGranted: number;
  status: 'pending' | 'approved' | 'declined';
  createdAt: string;
  approvedAt?: string;
}

const INITIAL_REELS: ReelVideo[] = [
  {
    id: 'reel-1',
    url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0&loop=1&playlist=dQw4w9WgXcQ',
    platform: 'youtube',
    title: '🔥 Actual GCash Cashout Proof - Daily PPV Earning Reel',
    likes: 1248,
    createdAt: new Date().toISOString()
  },
  {
    id: 'reel-2',
    url: 'https://www.tiktok.com/@tiktok/video/7100000000000000000',
    embedUrl: 'https://www.youtube.com/embed/L_LUpnjgPso?autoplay=0&loop=1&playlist=L_LUpnjgPso',
    platform: 'tiktok',
    title: '🎵 TikTok Viral Earning Hack - Mag-click lang at kumita ng GCash!',
    likes: 3890,
    createdAt: new Date().toISOString()
  },
  {
    id: 'reel-3',
    url: 'https://www.facebook.com/reel/100000000000000',
    embedUrl: 'https://www.youtube.com/embed/kJQP7kiw5Fk?autoplay=0&loop=1&playlist=kJQP7kiw5Fk',
    platform: 'facebook',
    title: '📘 FB Reels Feature Preview - PAUTANG NO MORE!',
    likes: 2150,
    createdAt: new Date().toISOString()
  }
];

interface UserPhoto {
  id: string;
  url: string;
  caption?: string;
  privacy: 'public' | 'only_me';
  uploadedAt: string;
}

interface UserAlbum {
  id: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  title: string;
  description?: string;
  privacy: 'public' | 'only_me';
  coverPhoto?: string;
  photos: UserPhoto[];
  createdAt: string;
  updatedAt?: string;
}

interface DBStructure {
  users: UserSession[];
  campaigns?: any[];
  posts?: any[];
  directMessages?: DirectMessage[];
  groupChats?: GroupChat[];
  groupMessages?: GroupMessage[];
  activeCalls?: ActiveCall[];
  merchantAds?: MerchantAd[];
  reels?: ReelVideo[];
  reelSubscriptions?: ReelTokenSubscription[];
  reelRedemptions?: any[];
  stories?: ZoneStory[];
  albums?: UserAlbum[];
  vaLeaderboardWinner?: any;
  shopProducts?: any[];
  shopBaskets?: any[];
  shopCarts?: Record<string, any[]>;
  shopOrders?: any[];
  vaBanners?: any[];
  vaSubscriptions?: any[];
}

const INITIAL_SHOP_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Ultra Pro Smartwatch Series 9 (AMOLED Screen, Heart & Sleep Monitor)',
    price: 1499.00,
    originalPrice: 2999.00,
    image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&auto=format&fit=crop&q=60',
    category: 'Gadgets',
    description: 'High-definition AMOLED Bluetooth smartwatch with waterproof casing, fitness tracking, and 7-day battery life.',
    stock: 45,
    rating: 4.9,
    isActive: true,
    salesCount: 412,
    tags: ['Bestseller', 'Free Shipping']
  },
  {
    id: 'prod-2',
    name: 'Wireless ANC Noise-Cancelling Earbuds Pro 3 (Deep Bass & HD Mic)',
    price: 850.00,
    originalPrice: 1699.00,
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=60',
    category: 'Gadgets',
    description: 'Active Noise Cancellation Bluetooth 5.3 earbuds with low-latency gaming mode and crystal-clear calls.',
    stock: 80,
    rating: 4.8,
    isActive: true,
    salesCount: 620,
    tags: ['Popular', 'Flash Sale']
  },
  {
    id: 'prod-3',
    name: 'Korean Glass Skin Serum with 10% Niacinamide & Hyaluronic Acid',
    price: 599.00,
    originalPrice: 999.00,
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=60',
    category: 'Beauty',
    description: 'Glow booster serum to brighten dull skin, minimize pores, and retain 24-hour hydration.',
    stock: 120,
    rating: 4.9,
    isActive: true,
    salesCount: 890,
    tags: ['Beauty Pick', 'Organic']
  },
  {
    id: 'prod-4',
    name: 'Ergonomic Orthopedic Memory Foam Support Pillow',
    price: 780.00,
    originalPrice: 1450.00,
    image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&auto=format&fit=crop&q=60',
    category: 'Home',
    description: 'Premium contour memory foam pillow for neck pain relief and optimal cervical spine alignment.',
    stock: 60,
    rating: 4.7,
    isActive: true,
    salesCount: 295,
    tags: ['Top Rated']
  },
  {
    id: 'prod-5',
    name: 'Premium Leather Classic Slim Bifold RFID-Blocking Wallet',
    price: 490.00,
    originalPrice: 950.00,
    image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=60',
    category: 'Fashion',
    description: 'Genuine leather slim men\'s wallet with 8 card slots, dual cash compartment, and RFID protection.',
    stock: 95,
    rating: 4.8,
    isActive: true,
    salesCount: 512,
    tags: ['Genuine Leather']
  },
  {
    id: 'prod-6',
    name: 'Portable USB-C Rechargeable Desk Air Purifier with HEPA Filter',
    price: 1150.00,
    originalPrice: 2200.00,
    image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&auto=format&fit=crop&q=60',
    category: 'Home',
    description: 'Quiet desktop air purifier that captures 99.97% of dust, smoke, allergens, and odors.',
    stock: 35,
    rating: 4.9,
    isActive: true,
    salesCount: 180,
    tags: ['HEPA Filter']
  }
];

const INITIAL_SHOP_ORDERS: any[] = [
  {
    id: 'ord-demo-1',
    orderNumber: 'ZONE-ORD-88129',
    userId: 'user-juan',
    userName: 'Juan Dela Cruz',
    userEmail: 'juan@example.com',
    userAvatar: '👨‍💻',
    items: [
      {
        productId: 'prod-1',
        productName: 'Ultra Pro Smartwatch Series 9 (AMOLED Screen, Heart & Sleep Monitor)',
        price: 1499.00,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&auto=format&fit=crop&q=60',
        category: 'Gadgets'
      }
    ],
    itemCount: 1,
    subtotal: 1499.00,
    shippingFee: 0,
    discount: 50.00,
    promoCode: 'VA-PROMO50',
    totalAmount: 1449.00,
    paymentMethod: 'gcash',
    paymentStatus: 'paid',
    gcashSenderName: 'Juan Dela Cruz',
    gcashSenderNumber: '09171234567',
    gcashRefNo: '992831002341',
    shippingAddress: {
      recipientName: 'Juan Dela Cruz',
      phoneNumber: '09171234567',
      region: 'NCR',
      province: 'Metro Manila',
      city: 'Quezon City',
      barangay: 'Brgy. Central',
      streetAddress: 'Unit 4B Sunrise Towers, Katipunan Ave.',
      postalCode: '1101',
      deliveryNotes: 'Leave at lobby security guard if not around',
      label: 'Home'
    },
    trackingNumber: 'ZEX-88912034',
    courierName: 'Z-one Express',
    riderName: 'Kuya Elmer (0918-555-1234)',
    riderPhone: '09185551234',
    status: 'to_ship',
    statusTimeline: [
      {
        status: 'order_placed',
        title: 'Order Placed & Payment Verified',
        description: 'Your order was successfully placed via GCash (Ref #992831002341).',
        timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
        location: 'Z-oneShop Central Warehouse'
      },
      {
        status: 'for_packing',
        title: 'Package Packed with Bubble Wrap',
        description: 'Items have been quality-checked and safely boxed with security seal.',
        timestamp: new Date(Date.now() - 18 * 3600000).toISOString(),
        location: 'Warehouse Fulfillment Bay 3'
      },
      {
        status: 'sorting_hub',
        title: 'Arrived at Central Sorting Hub',
        description: 'Parcel scanned at Pasig Central Sorting Hub and queued for route dispatch.',
        timestamp: new Date(Date.now() - 10 * 3600000).toISOString(),
        location: 'Pasig Central Hub'
      },
      {
        status: 'rider_pickup',
        title: 'Picked Up by Assigned Courier Rider',
        description: 'Kuya Elmer picked up the parcel and is heading to delivery territory.',
        timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
        location: 'Quezon City Delivery Hub'
      },
      {
        status: 'to_ship',
        title: 'Out for Delivery (To Ship)',
        description: 'Rider is on the way to your delivery address. Please keep your phone reachable!',
        timestamp: new Date(Date.now() - 1 * 3600000).toISOString(),
        location: 'Katipunan Ave, Quezon City'
      }
    ],
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    paidAt: new Date(Date.now() - 24 * 3600000).toISOString()
  }
];

const INITIAL_SHOP_BASKETS = [
  {
    id: 'basket-demo-1',
    userId: 'user-juan',
    userName: 'Juan Dela Cruz',
    userAvatar: '👨‍💻',
    items: [
      { productId: 'prod-1', productName: 'Ultra Pro Smartwatch Series 9', price: 1499.00, quantity: 1, image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&auto=format&fit=crop&q=60' },
      { productId: 'prod-2', productName: 'Wireless ANC Noise-Cancelling Earbuds Pro 3', price: 850.00, quantity: 1, image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=60' }
    ],
    totalAmount: 2349.00,
    status: 'unpaid',
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString()
  },
  {
    id: 'basket-demo-2',
    userId: 'user-clara',
    userName: 'Maria Clara Santos',
    userAvatar: '👩‍⚕️',
    items: [
      { productId: 'prod-3', productName: 'Korean Glass Skin Serum with 10% Niacinamide', price: 599.00, quantity: 2, image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=60' },
      { productId: 'prod-5', productName: 'Premium Leather Classic Slim Bifold Wallet', price: 490.00, quantity: 1, image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=60' }
    ],
    totalAmount: 1688.00,
    status: 'unpaid',
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString()
  },
  {
    id: 'basket-demo-3',
    userId: 'user-roberto',
    userName: 'Roberto Gutierrez',
    userAvatar: '👨‍💼',
    items: [
      { productId: 'prod-6', productName: 'Portable USB-C Rechargeable Desk Air Purifier', price: 1150.00, quantity: 1, image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&auto=format&fit=crop&q=60' },
      { productId: 'prod-4', productName: 'Ergonomic Orthopedic Memory Foam Support Pillow', price: 780.00, quantity: 1, image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&auto=format&fit=crop&q=60' }
    ],
    totalAmount: 1930.00,
    status: 'unpaid',
    createdAt: new Date(Date.now() - 20 * 3600000).toISOString()
  }
];

// Helper to auto-expire unpaid banners/baskets
function checkAndExpireBanners(db: DBStructure) {
  if (!db || !Array.isArray(db.vaBanners)) return;
  const now = Date.now();
  let changed = false;

  for (const banner of db.vaBanners) {
    if (banner.status === 'active' && banner.expiresAt) {
      if (new Date(banner.expiresAt).getTime() <= now) {
        banner.status = 'bad_order_expired';
        banner.completedAt = new Date().toISOString();
        changed = true;

        if (banner.targetBasketId && Array.isArray(db.shopBaskets)) {
          const basket = db.shopBaskets.find(b => b.id === banner.targetBasketId);
          if (basket && basket.status === 'unpaid') {
            basket.status = 'expired_bad_order';
          }
        }
      }
    }
  }

  return changed;
}

// Helper to sync a single user's active shopping cart into unpaid shopBaskets (Active Leads for VAs)
function syncUserCartToBasket(db: DBStructure, userId: string) {
  if (!db.shopBaskets) {
    db.shopBaskets = [...INITIAL_SHOP_BASKETS];
  }
  if (!db.shopCarts) {
    db.shopCarts = {};
  }

  const user = (db.users || []).find(u => u.id === userId);
  const cart = db.shopCarts[userId] || [];

  const existingBasketIndex = db.shopBaskets.findIndex(b => b.userId === userId && b.status === 'unpaid');

  if (cart.length > 0) {
    const totalAmount = cart.reduce((sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
    const basketItems = cart.map((it: any) => ({
      productId: it.productId,
      productName: it.productName,
      price: it.price,
      quantity: it.quantity,
      image: it.image
    }));

    if (existingBasketIndex !== -1) {
      db.shopBaskets[existingBasketIndex].items = basketItems;
      db.shopBaskets[existingBasketIndex].totalAmount = totalAmount;
      if (user?.name) db.shopBaskets[existingBasketIndex].userName = user.name;
      if (user?.avatar) db.shopBaskets[existingBasketIndex].userAvatar = user.avatar;
    } else {
      db.shopBaskets.unshift({
        id: 'basket-' + userId.replace(/[^a-zA-Z0-9]/g, '') + '-' + Date.now(),
        userId: userId,
        userName: user?.name || 'Customer Lead',
        userAvatar: user?.avatar || '🛍️',
        items: basketItems,
        totalAmount: totalAmount,
        status: 'unpaid',
        createdAt: new Date().toISOString()
      });
    }
  } else {
    // If cart is now empty, remove unpaid basket only if it doesn't have an active banner attached
    if (existingBasketIndex !== -1) {
      const basket = db.shopBaskets[existingBasketIndex];
      const hasBanner = (db.vaBanners || []).some(ban => ban.targetBasketId === basket.id && ban.status === 'active');
      if (!hasBanner) {
        db.shopBaskets.splice(existingBasketIndex, 1);
      }
    }
  }
}

// Helper to sync all active carts into unpaid shopBaskets
function checkAndSyncAllCartsToBaskets(db: DBStructure) {
  if (!db.shopBaskets || db.shopBaskets.length === 0) {
    db.shopBaskets = [...INITIAL_SHOP_BASKETS];
  }
  if (db.shopCarts) {
    Object.keys(db.shopCarts).forEach(userId => {
      syncUserCartToBasket(db, userId);
    });
  }
}

// --- HELPER TO INITIALIZE AND GET DATABASE ---
let cachedDB: DBStructure | null = null;

function loadDB(): DBStructure {
  if (cachedDB && Array.isArray(cachedDB.users) && cachedDB.users.length > 0) {
    return cachedDB;
  }
  const envAdminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const envAdminPassword = process.env.ADMIN_PASSWORD || 'AdminSecurePassword123';
  const envAdminName = process.env.ADMIN_NAME || 'System Administrator';

  // Ensure the src/data directory exists
  const dir = path.dirname(DB_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let loaded: DBStructure | null = null;

  // 1. Try reading primary db.json
  if (fs.existsSync(DB_FILE_PATH)) {
    try {
      const data = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      if (data && data.trim().length > 0) {
        const parsed = JSON.parse(data);
        if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
          loaded = parsed;
        }
      }
    } catch (e) {
      console.error('⚠️ Warning: Primary db.json reading/parsing failed, attempting backup recovery...', e);
    }
  }

  // 2. Try recovering from backup if primary failed or was corrupted
  if (!loaded && fs.existsSync(DB_BACKUP_PATH)) {
    try {
      const data = fs.readFileSync(DB_BACKUP_PATH, 'utf-8');
      if (data && data.trim().length > 0) {
        const parsed = JSON.parse(data);
        if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
          console.log('🛡️ Auto-Recovery: Successfully restored database from db.json.bak!');
          loaded = parsed;
          try {
            fs.writeFileSync(DB_FILE_PATH, data, 'utf-8');
          } catch {}
        }
      }
    } catch (bakErr) {
      console.error('⚠️ Backup recovery error:', bakErr);
    }
  }

  // 3. If loaded successfully from file or backup, ensure integrity
  if (loaded) {
    // Synchronize/Update admin credentials dynamically from environment info
    const admin = loaded.users.find(u => u.isAdmin);
    if (admin) {
      admin.email = envAdminEmail;
      admin.password = envAdminPassword;
      admin.name = envAdminName;
    }
    loaded.merchantAds = loaded.merchantAds || [];
    if (!loaded.campaigns || loaded.campaigns.length < INITIAL_CAMPAIGNS.length) {
      const existingIds = new Set(loaded.campaigns ? loaded.campaigns.map((c: any) => c.id) : []);
      const newCampaignsToAdd = INITIAL_CAMPAIGNS.filter(c => !existingIds.has(c.id));
      loaded.campaigns = [...(loaded.campaigns || []), ...newCampaignsToAdd];
    }
    if (!loaded.posts) {
      loaded.posts = [];
    }
    if (!loaded.reels || loaded.reels.length === 0) {
      loaded.reels = INITIAL_REELS;
    }
    if (!loaded.groupChats) {
      loaded.groupChats = [];
    }
    if (!loaded.groupMessages) {
      loaded.groupMessages = [];
    }
    if (!loaded.stories) {
      loaded.stories = [];
    }
    if (!loaded.directMessages) {
      loaded.directMessages = [];
    }
    if (!loaded.shopProducts || loaded.shopProducts.length === 0) {
      loaded.shopProducts = INITIAL_SHOP_PRODUCTS;
    }
    if (!loaded.shopBaskets || loaded.shopBaskets.length === 0) {
      loaded.shopBaskets = INITIAL_SHOP_BASKETS;
    }
    if (!loaded.shopCarts) {
      loaded.shopCarts = {};
    }
    if (!loaded.shopOrders || loaded.shopOrders.length === 0) {
      loaded.shopOrders = INITIAL_SHOP_ORDERS;
    }
    if (!loaded.vaBanners) {
      loaded.vaBanners = [];
    }
    if (!loaded.vaSubscriptions) {
      loaded.vaSubscriptions = [];
    }

    // Run auto-expiration on banners & unpaid baskets
    checkAndExpireBanners(loaded);
    checkAndSyncAllCartsToBaskets(loaded);

    // Automatically purge simulated/fake withdrawals
    if (loaded.users && Array.isArray(loaded.users)) {
      loaded.users.forEach(u => {
        if (Array.isArray(u.withdrawals)) {
          u.withdrawals = u.withdrawals.filter(w => {
            if (w.id === 'with-1785655833689') return true; // Preserve Jonard Belleza real withdrawal
            const isFake = w.id.startsWith('with-db-') || w.id.startsWith('with-sim-') || String(w.createdAt || '').includes('Ago 2, 2026');
            return !isFake;
          });
        }
      });

      // Ensure Jonard Belleza has his real withdrawal
      const jonardB = loaded.users.find(u => u.name && u.name.toLowerCase().includes('jonard belleza'));
      if (jonardB) {
        if (!Array.isArray(jonardB.withdrawals)) jonardB.withdrawals = [];
        if (!jonardB.withdrawals.some(w => w.id === 'with-1785655833689')) {
          jonardB.withdrawals.push({
            id: 'with-1785655833689',
            accountName: 'JONARD BELLEZA',
            gcashNumber: '09932143141',
            amount: 126,
            status: 'success',
            createdAt: '8/2/2026, 7:30:33 AM',
            referenceNo: 'REF1136831562'
          });
        }
      }
    }

    cachedDB = loaded;
    return loaded;
  }

  // Generate unique code helper
  const genRef = () => 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  // Create default seed database
  const defaultDB: DBStructure = {
    posts: [
      {
        id: 'post-welcome',
        userId: 'admin-rosco',
        userName: 'System Administrator',
        userAvatar: '👑',
        text: 'Welcome sa Z-one! Ang pinakabagong social media portal kung saan pwede kayong mag-post, mag-like, mag-comment, at mag-Zone (Follow) sa bawat isa. Iwasan po natin ang bastos/pornographic na content at bad words upang maiwasan ang ma-banned. Happy Click-Earning!',
        mediaUrl: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&auto=format&fit=crop&q=60',
        mediaType: 'image',
        likes: [],
        comments: [
          {
            id: 'comment-seed-1',
            userId: 'user-juan',
            userName: 'Juan Dela Cruz',
            userAvatar: '👨‍💻',
            text: 'Wow, napakagandang platform naman nito! Salamat admin!',
            createdAt: new Date(Date.now() - 3600000).toISOString()
          }
        ],
        createdAt: new Date(Date.now() - 7200000).toISOString()
      }
    ],
    users: [
      // 1. Core Admin Account
      {
        id: 'admin-rosco',
        email: envAdminEmail,
        password: envAdminPassword,
        name: envAdminName,
        avatar: '👑',
        referralCode: 'ADMIN-ROSCO',
        isAdmin: true,
        stats: {
          balance: 0,
          lifetimeEarnings: 0,
          completedTasksCount: 0,
          dailyCheckInDate: null
        },
        withdrawals: [],
        activityLogs: [
          {
            id: 'log-seed-admin',
            type: 'bonus',
            title: 'System Initialized',
            amount: 0,
            timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
            details: 'Naka-online na ang GCash Click-Earn Cloud Server. Handa nang subaybayan ang aktibidad ng mga mamamayan!'
          }
        ],
        referredFriends: []
      },
      // 2. Mock Test User 1
      {
        id: 'user-juan',
        email: 'juan@example.ph',
        password: 'Password123',
        name: 'Juan Dela Cruz',
        avatar: '👨‍💻',
        referralCode: 'REF-JUAN77',
        isAdmin: false,
        stats: {
          balance: 145.00,
          lifetimeEarnings: 345.00,
          completedTasksCount: 16,
          dailyCheckInDate: new Date().toLocaleDateString('fil-PH')
        },
        withdrawals: [
          {
            id: 'with-seed-1',
            accountName: 'Juan Dela Cruz',
            gcashNumber: '09171234567',
            amount: 200.00,
            status: 'pending',
            createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toLocaleString('fil-PH', { hour12: true }),
            referenceNo: 'REF' + Math.floor(1000000000 + Math.random() * 9000000000)
          }
        ],
        activityLogs: [
          {
            id: 'log-seed-juan-1',
            type: 'withdraw',
            title: 'Nagsumite ng GCash Cashout',
            amount: 200.00,
            timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000).toLocaleString('fil-PH', { hour12: true }),
            details: 'Humihiling ng ₱200.00 cashout sa GCash number 09171234567. Naghihintay ng pag-approve ng admin.'
          },
          {
            id: 'log-seed-juan-2',
            type: 'reward',
            title: 'Shopee PH Tipid Hacks 2026 Completed',
            amount: 12.50,
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleString('fil-PH', { hour12: true }),
            details: 'Nanood ng website upang matutunan ang Piso deals at libreng shipping guide.'
          }
        ],
        referredFriends: []
      },
      // 3. Mock Test User 2
      {
        id: 'user-clara',
        email: 'clara@example.ph',
        password: 'Password123',
        name: 'Maria Clara Santos',
        avatar: '👩‍⚕️',
        referralCode: 'REF-CLARAS',
        invitedBy: 'ADMIN-ROSCO',
        isAdmin: false,
        stats: {
          balance: 280.00,
          lifetimeEarnings: 530.00,
          completedTasksCount: 25,
          dailyCheckInDate: null
        },
        withdrawals: [
          {
            id: 'with-seed-2',
            accountName: 'Maria Clara Santos',
            gcashNumber: '09187654321',
            amount: 250.00,
            status: 'success',
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toLocaleString('fil-PH', { hour12: true }),
            referenceNo: 'REF5830184321'
          }
        ],
        activityLogs: [
          {
            id: 'log-seed-clara-1',
            type: 'withdraw',
            title: 'GCash Cashout Approved',
            amount: 250.00,
            timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toLocaleString('fil-PH', { hour12: true }),
            details: 'Nabayaran na ang ₱250.00 cashout sa iyong GCash wallet.'
          }
        ],
        referredFriends: []
      }
    ],
    campaigns: INITIAL_CAMPAIGNS,
    merchantAds: [],
    reels: INITIAL_REELS,
    stories: [],
    groupChats: [
      {
        id: 'gc-community-main',
        name: 'Ka-Zone Official Community GC 🌟',
        avatar: '🇵🇭',
        description: 'Opisyal na Group Chat ng lahat ng Ka-Zone members para sa kwentuhan, tulungan, at click-earning updates!',
        createdBy: 'admin-rosco',
        creatorName: 'System Administrator',
        members: ['admin-rosco', 'user-juan', 'user-clara'],
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    groupMessages: [
      {
        id: 'gmsg-welcome-1',
        groupId: 'gc-community-main',
        senderId: 'admin-rosco',
        senderName: 'System Administrator',
        senderAvatar: '👑',
        text: 'Maligayang pagdating sa Opisyal na Group Chat ng Z-one! Dito ay maaari kayong mag-usap-usap ng libre, magpalitan ng tips sa click-earning, at gumawa rin ng inyong sariling mga Group Chat kasama ang inyong mga kaibigan at team.',
        createdAt: new Date(Date.now() - 86000000).toISOString()
      },
      {
        id: 'gmsg-welcome-2',
        groupId: 'gc-community-main',
        senderId: 'user-juan',
        senderName: 'Juan Dela Cruz',
        senderAvatar: '👨‍💻',
        text: 'Magandang araw sa lahat ng Ka-Zone members! Napakabilis ng palitan ng mensahe dito.',
        createdAt: new Date(Date.now() - 3600000).toISOString()
      }
    ]
  };

  // Add Maria Clara as admin's referred friend at the start
  defaultDB.users[0].referredFriends.push({
    id: 'user-clara',
    name: 'Maria Clara Santos',
    avatar: '👩‍⚕️',
    currentEarnings: 530.00,
    bonusClaimed: false,
    joinedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toLocaleDateString('fil-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  });

  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(defaultDB, null, 2), 'utf-8');
    fs.writeFileSync(DB_BACKUP_PATH, JSON.stringify(defaultDB, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write initial default database:', err);
  }

  cachedDB = defaultDB;
  return defaultDB;
}

const lastSyncedCache = {
  users: new Map<string, string>(),
  campaigns: new Map<string, string>(),
  posts: new Map<string, string>(),
  directMessages: new Map<string, string>(),
  merchantAds: new Map<string, string>(),
  reels: new Map<string, string>(),
  reelSubscriptions: new Map<string, string>(),
  stories: new Map<string, string>(),
  albums: new Map<string, string>(),
  groupChats: new Map<string, string>(),
  groupMessages: new Map<string, string>(),
  shopProducts: new Map<string, string>(),
  shopBaskets: new Map<string, string>(),
  shopOrders: new Map<string, string>(),
  vaBanners: new Map<string, string>(),
  vaSubscriptions: new Map<string, string>()
};

function initLastSyncedCache(data: DBStructure) {
  if (lastSyncedCache.users.size === 0 && data.users && data.users.length > 0) {
    for (const u of data.users) {
      lastSyncedCache.users.set(u.id, JSON.stringify(u));
    }
  }
  if (lastSyncedCache.campaigns.size === 0 && data.campaigns && data.campaigns.length > 0) {
    for (const c of data.campaigns) {
      lastSyncedCache.campaigns.set(c.id, JSON.stringify(c));
    }
  }
  if (lastSyncedCache.posts.size === 0 && data.posts && data.posts.length > 0) {
    for (const p of data.posts) {
      lastSyncedCache.posts.set(p.id, JSON.stringify(p));
    }
  }
  if (lastSyncedCache.directMessages.size === 0 && data.directMessages && data.directMessages.length > 0) {
    for (const dm of data.directMessages) {
      lastSyncedCache.directMessages.set(dm.id, JSON.stringify(dm));
    }
  }
  if (lastSyncedCache.merchantAds.size === 0 && data.merchantAds && data.merchantAds.length > 0) {
    for (const ma of data.merchantAds) {
      lastSyncedCache.merchantAds.set(ma.id, JSON.stringify(ma));
    }
  }
  if (lastSyncedCache.reels.size === 0 && data.reels && data.reels.length > 0) {
    for (const r of data.reels) {
      lastSyncedCache.reels.set(r.id, JSON.stringify(r));
    }
  }
  if (lastSyncedCache.reelSubscriptions.size === 0 && data.reelSubscriptions && data.reelSubscriptions.length > 0) {
    for (const rs of data.reelSubscriptions) {
      lastSyncedCache.reelSubscriptions.set(rs.id, JSON.stringify(rs));
    }
  }
  if (lastSyncedCache.stories.size === 0 && data.stories && data.stories.length > 0) {
    for (const s of data.stories) {
      lastSyncedCache.stories.set(s.id, JSON.stringify(s));
    }
  }
  if (lastSyncedCache.albums.size === 0 && data.albums && data.albums.length > 0) {
    for (const a of data.albums) {
      lastSyncedCache.albums.set(a.id, JSON.stringify(a));
    }
  }
  if (lastSyncedCache.groupChats.size === 0 && data.groupChats && data.groupChats.length > 0) {
    for (const g of data.groupChats) {
      lastSyncedCache.groupChats.set(g.id, JSON.stringify(g));
    }
  }
  if (lastSyncedCache.groupMessages.size === 0 && data.groupMessages && data.groupMessages.length > 0) {
    for (const gm of data.groupMessages) {
      lastSyncedCache.groupMessages.set(gm.id, JSON.stringify(gm));
    }
  }
  if (lastSyncedCache.shopProducts.size === 0 && data.shopProducts && data.shopProducts.length > 0) {
    for (const sp of data.shopProducts) {
      lastSyncedCache.shopProducts.set(sp.id, JSON.stringify(sp));
    }
  }
  if (lastSyncedCache.shopBaskets.size === 0 && data.shopBaskets && data.shopBaskets.length > 0) {
    for (const sb of data.shopBaskets) {
      lastSyncedCache.shopBaskets.set(sb.id, JSON.stringify(sb));
    }
  }
  if (lastSyncedCache.shopOrders.size === 0 && data.shopOrders && data.shopOrders.length > 0) {
    for (const so of data.shopOrders) {
      lastSyncedCache.shopOrders.set(so.id, JSON.stringify(so));
    }
  }
  if (lastSyncedCache.vaBanners.size === 0 && data.vaBanners && data.vaBanners.length > 0) {
    for (const vb of data.vaBanners) {
      lastSyncedCache.vaBanners.set(vb.id, JSON.stringify(vb));
    }
  }
  if (lastSyncedCache.vaSubscriptions.size === 0 && data.vaSubscriptions && data.vaSubscriptions.length > 0) {
    for (const vs of data.vaSubscriptions) {
      lastSyncedCache.vaSubscriptions.set(vs.id, JSON.stringify(vs));
    }
  }
}

let saveDBTimeout: NodeJS.Timeout | null = null;
let firestoreSyncTimeout: NodeJS.Timeout | null = null;
let lastCloudSyncTimestamp: string | null = null;

function saveDB(data: DBStructure, immediate: boolean = false) {
  if (!data || !Array.isArray(data.users) || data.users.length === 0) {
    console.error('⚠️ REFUSING TO SAVE EMPTY/CORRUPTED DB OBJECT TO DISK!');
    return;
  }

  cachedDB = data;
  
  const doSave = () => {
    try {
      const jsonStr = JSON.stringify(data, null, 2);
      // 1. Atomic write using temp file + rename
      fs.writeFileSync(DB_TMP_PATH, jsonStr, 'utf-8');
      fs.renameSync(DB_TMP_PATH, DB_FILE_PATH);
      // 2. Verified backup copy
      fs.writeFileSync(DB_BACKUP_PATH, jsonStr, 'utf-8');
    } catch (err) {
      console.error('Error in atomic saveDB:', err);
    }
  };

  if (immediate) {
    if (saveDBTimeout) clearTimeout(saveDBTimeout);
    doSave();
    if (firestoreSyncTimeout) clearTimeout(firestoreSyncTimeout);
    uploadToFirestore(data).catch(err => {
      console.error('Error uploading db changes to Cloud Firestore:', err);
    });
  } else {
    if (saveDBTimeout) clearTimeout(saveDBTimeout);
    saveDBTimeout = setTimeout(doSave, 150);

    // Fast debounced Cloud Firestore synchronization (500ms) so data is never lost during republishes or restarts
    if (firestoreSyncTimeout) clearTimeout(firestoreSyncTimeout);
    firestoreSyncTimeout = setTimeout(() => {
      uploadToFirestore(data).catch(err => {
        console.error('Error uploading db changes to Cloud Firestore:', err);
      });
    }, 500);
  }
}

async function uploadToFirestore(data: DBStructure) {
  if (!cloudDb.isActive) {
    return;
  }
  
  initLastSyncedCache(data);

  try {
    const promises: Promise<any>[] = [];

    // 1. Users
    for (const u of data.users) {
      const uStr = JSON.stringify(u);
      if (lastSyncedCache.users.get(u.id) !== uStr) {
        promises.push((async () => {
          try {
            const { id, ...uWithoutId } = u;
            if (uWithoutId.avatar && uWithoutId.avatar.startsWith('data:') && uWithoutId.avatar.length > 500000) {
              uWithoutId.avatar = '👤';
            }
            await cloudDb.setDoc('users', u.id, uWithoutId);
            lastSyncedCache.users.set(u.id, uStr);
          } catch (userErr) {
            console.error(`Error saving user ${u.id} to Cloud DB:`, userErr);
          }
        })());
      }
    }

    // 2. Campaigns
    if (data.campaigns) {
      for (const c of data.campaigns) {
        const cStr = JSON.stringify(c);
        if (lastSyncedCache.campaigns.get(c.id) !== cStr) {
          promises.push((async () => {
            try {
              const { id, ...cWithoutId } = c;
              await cloudDb.setDoc('campaigns', c.id, cWithoutId);
              lastSyncedCache.campaigns.set(c.id, cStr);
            } catch (campErr) {
              console.error(`Error saving campaign ${c.id} to Cloud DB:`, campErr);
            }
          })());
        }
      }
    }

    // 3. Posts
    if (data.posts) {
      for (const p of data.posts) {
        const pStr = JSON.stringify(p);
        if (lastSyncedCache.posts.get(p.id) !== pStr) {
          promises.push((async () => {
            try {
              const { id, ...pWithoutId } = p;
              if (pWithoutId.mediaUrl && pWithoutId.mediaUrl.startsWith('data:')) {
                const up = await uploadMediaToFirebaseStorage(pWithoutId.mediaUrl, 'posts', p.userId || 'general');
                pWithoutId.mediaUrl = up?.url || saveBase64ToUploadFile(pWithoutId.mediaUrl, 'posts', p.userId) || undefined;
              }
              if (pWithoutId.mediaUrls && Array.isArray(pWithoutId.mediaUrls)) {
                pWithoutId.mediaUrls = await Promise.all(pWithoutId.mediaUrls.map(async url => {
                  if (url && url.startsWith('data:')) {
                    const up = await uploadMediaToFirebaseStorage(url, 'posts', p.userId || 'general');
                    return up?.url || saveBase64ToUploadFile(url, 'posts', p.userId) || url;
                  }
                  return url;
                }));
              }
              await cloudDb.setDoc('posts', p.id, pWithoutId);
              lastSyncedCache.posts.set(p.id, pStr);
            } catch (postErr) {
              console.error(`Error saving post ${p.id} to Cloud DB:`, postErr);
            }
          })());
        }
      }
    }

    // 4. Direct Messages
    if (data.directMessages) {
      for (const dm of data.directMessages) {
        const dmStr = JSON.stringify(dm);
        if (lastSyncedCache.directMessages.get(dm.id) !== dmStr) {
          promises.push((async () => {
            try {
              const { id, ...dmWithoutId } = dm;
              if (dmWithoutId.mediaUrl && dmWithoutId.mediaUrl.startsWith('data:')) {
                const up = await uploadMediaToFirebaseStorage(dmWithoutId.mediaUrl, 'direct-messages', dm.senderId || 'general');
                dmWithoutId.mediaUrl = up?.url || saveBase64ToUploadFile(dmWithoutId.mediaUrl, 'direct-messages', dm.senderId) || undefined;
              }
              await cloudDb.setDoc('direct_messages', dm.id, dmWithoutId);
              lastSyncedCache.directMessages.set(dm.id, dmStr);
            } catch (dmErr) {
              console.error(`Error saving DM ${dm.id} to Cloud DB:`, dmErr);
            }
          })());
        }
      }
    }

    // 5. Merchant Ads
    if (data.merchantAds) {
      for (const ma of data.merchantAds) {
        const maStr = JSON.stringify(ma);
        if (lastSyncedCache.merchantAds.get(ma.id) !== maStr) {
          promises.push((async () => {
            try {
              const { id, ...maWithoutId } = ma;
              await cloudDb.setDoc('merchant_ads', ma.id, maWithoutId);
              lastSyncedCache.merchantAds.set(ma.id, maStr);
            } catch (maErr) {
              console.error(`Error saving Merchant Ad ${ma.id} to Cloud DB:`, maErr);
            }
          })());
        }
      }
    }

    // 6. Reels (Videos)
    if (data.reels) {
      for (const r of data.reels) {
        const rStr = JSON.stringify(r);
        if (lastSyncedCache.reels.get(r.id) !== rStr) {
          promises.push((async () => {
            try {
              const { id, ...rWithoutId } = r;
              if (rWithoutId.url && rWithoutId.url.startsWith('data:')) {
                const up = await uploadMediaToFirebaseStorage(rWithoutId.url, 'reels', r.id || 'general');
                rWithoutId.url = up?.url || saveBase64ToUploadFile(rWithoutId.url, 'reels', r.id) || rWithoutId.url;
              }
              await cloudDb.setDoc('reels', r.id, rWithoutId);
              lastSyncedCache.reels.set(r.id, rStr);
            } catch (reelErr) {
              console.error(`Error saving Reel ${r.id} to Cloud DB:`, reelErr);
            }
          })());
        }
      }
    }

    // 7. Reel Subscriptions
    if (data.reelSubscriptions) {
      for (const rs of data.reelSubscriptions) {
        const rsStr = JSON.stringify(rs);
        if (lastSyncedCache.reelSubscriptions.get(rs.id) !== rsStr) {
          promises.push((async () => {
            try {
              const { id, ...rsWithoutId } = rs;
              await cloudDb.setDoc('reel_subscriptions', rs.id, rsWithoutId);
              lastSyncedCache.reelSubscriptions.set(rs.id, rsStr);
            } catch (rsErr) {
              console.error(`Error saving Reel Subscription ${rs.id} to Cloud DB:`, rsErr);
            }
          })());
        }
      }
    }

    // 8. Stories (MyDay)
    if (data.stories) {
      for (const s of data.stories) {
        const sStr = JSON.stringify(s);
        if (lastSyncedCache.stories.get(s.id) !== sStr) {
          promises.push((async () => {
            try {
              const { id, ...sWithoutId } = s;
              if (sWithoutId.mediaUrl && sWithoutId.mediaUrl.startsWith('data:')) {
                const up = await uploadMediaToFirebaseStorage(sWithoutId.mediaUrl, 'stories', s.userId || 'general');
                sWithoutId.mediaUrl = up?.url || saveBase64ToUploadFile(sWithoutId.mediaUrl, 'stories', s.userId) || undefined;
              }
              await cloudDb.setDoc('stories', s.id, sWithoutId);
              lastSyncedCache.stories.set(s.id, sStr);
            } catch (sErr) {
              console.error(`Error saving Story ${s.id} to Cloud DB:`, sErr);
            }
          })());
        }
      }
    }

    // 8b. Photo Albums
    if (data.albums) {
      for (const a of data.albums) {
        const aStr = JSON.stringify(a);
        if (lastSyncedCache.albums.get(a.id) !== aStr) {
          promises.push((async () => {
            try {
              const { id, ...aWithoutId } = a;
              await cloudDb.setDoc('albums', a.id, aWithoutId);
              lastSyncedCache.albums.set(a.id, aStr);
            } catch (aErr) {
              console.error(`Error saving Album ${a.id} to Cloud DB:`, aErr);
            }
          })());
        }
      }
    }

    // 9. Group Chats
    if (data.groupChats) {
      for (const g of data.groupChats) {
        const gStr = JSON.stringify(g);
        if (lastSyncedCache.groupChats.get(g.id) !== gStr) {
          promises.push((async () => {
            try {
              const { id, ...gWithoutId } = g;
              await cloudDb.setDoc('group_chats', g.id, gWithoutId);
              lastSyncedCache.groupChats.set(g.id, gStr);
            } catch (gErr) {
              console.error(`Error saving Group ${g.id} to Cloud DB:`, gErr);
            }
          })());
        }
      }
    }

    // 10. Group Messages
    if (data.groupMessages) {
      for (const gm of data.groupMessages) {
        const gmStr = JSON.stringify(gm);
        if (lastSyncedCache.groupMessages.get(gm.id) !== gmStr) {
          promises.push((async () => {
            try {
              const { id, ...gmWithoutId } = gm;
              if (gmWithoutId.mediaUrl && gmWithoutId.mediaUrl.startsWith('data:')) {
                const up = await uploadMediaToFirebaseStorage(gmWithoutId.mediaUrl, 'group-chats', gm.senderId || 'general');
                gmWithoutId.mediaUrl = up?.url || saveBase64ToUploadFile(gmWithoutId.mediaUrl, 'group-chats', gm.senderId) || undefined;
              }
              await cloudDb.setDoc('group_messages', gm.id, gmWithoutId);
              lastSyncedCache.groupMessages.set(gm.id, gmStr);
            } catch (gmErr) {
              console.error(`Error saving Group Message ${gm.id} to Cloud DB:`, gmErr);
            }
          })());
        }
      }
    }

    // 11. Shop Products, Baskets, Orders & VA Banners
    if (data.shopProducts) {
      for (const sp of data.shopProducts) {
        const spStr = JSON.stringify(sp);
        if (lastSyncedCache.shopProducts.get(sp.id) !== spStr) {
          promises.push((async () => {
            try {
              const { id, ...spWithoutId } = sp;
              await cloudDb.setDoc('shop_products', sp.id, spWithoutId);
              lastSyncedCache.shopProducts.set(sp.id, spStr);
            } catch (spErr) {
              console.error(`Error saving shop product ${sp.id} to Cloud DB:`, spErr);
            }
          })());
        }
      }
    }

    if (data.shopOrders) {
      for (const so of data.shopOrders) {
        const soStr = JSON.stringify(so);
        if (lastSyncedCache.shopOrders.get(so.id) !== soStr) {
          promises.push((async () => {
            try {
              const { id, ...soWithoutId } = so;
              await cloudDb.setDoc('shop_orders', so.id, soWithoutId);
              lastSyncedCache.shopOrders.set(so.id, soStr);
            } catch (soErr) {
              console.error(`Error saving shop order ${so.id} to Cloud DB:`, soErr);
            }
          })());
        }
      }
    }

    if (data.vaBanners) {
      for (const vb of data.vaBanners) {
        const vbStr = JSON.stringify(vb);
        if (lastSyncedCache.vaBanners.get(vb.id) !== vbStr) {
          promises.push((async () => {
            try {
              const { id, ...vbWithoutId } = vb;
              await cloudDb.setDoc('va_banners', vb.id, vbWithoutId);
              lastSyncedCache.vaBanners.set(vb.id, vbStr);
            } catch (vbErr) {
              console.error(`Error saving VA Banner ${vb.id} to Cloud DB:`, vbErr);
            }
          })());
        }
      }
    }

    // Deletion syncs
    const currentStoryIds = new Set(data.stories ? data.stories.map(s => s.id) : []);
    for (const cachedId of lastSyncedCache.stories.keys()) {
      if (!currentStoryIds.has(cachedId)) {
        promises.push((async () => {
          try {
            await cloudDb.deleteDoc('stories', cachedId);
            lastSyncedCache.stories.delete(cachedId);
          } catch (delErr) {
            console.error(`Error deleting Story ${cachedId} from Cloud DB:`, delErr);
          }
        })());
      }
    }

    const currentAlbumIds = new Set(data.albums ? data.albums.map(a => a.id) : []);
    for (const cachedId of lastSyncedCache.albums.keys()) {
      if (!currentAlbumIds.has(cachedId)) {
        promises.push((async () => {
          try {
            await cloudDb.deleteDoc('albums', cachedId);
            lastSyncedCache.albums.delete(cachedId);
          } catch (delErr) {
            console.error(`Error deleting Album ${cachedId} from Cloud DB:`, delErr);
          }
        })());
      }
    }

    const currentGroupIds = new Set(data.groupChats ? data.groupChats.map(g => g.id) : []);
    for (const cachedId of lastSyncedCache.groupChats.keys()) {
      if (!currentGroupIds.has(cachedId)) {
        promises.push((async () => {
          try {
            await cloudDb.deleteDoc('group_chats', cachedId);
            lastSyncedCache.groupChats.delete(cachedId);
          } catch (delErr) {
            console.error(`Error deleting Group ${cachedId} from Cloud DB:`, delErr);
          }
        })());
      }
    }

    const currentGmIds = new Set(data.groupMessages ? data.groupMessages.map(gm => gm.id) : []);
    for (const cachedId of lastSyncedCache.groupMessages.keys()) {
      if (!currentGmIds.has(cachedId)) {
        promises.push((async () => {
          try {
            await cloudDb.deleteDoc('group_messages', cachedId);
            lastSyncedCache.groupMessages.delete(cachedId);
          } catch (delErr) {
            console.error(`Error deleting Group Message ${cachedId} from Cloud DB:`, delErr);
          }
        })());
      }
    }

    const currentReelIds = new Set(data.reels ? data.reels.map(r => r.id) : []);
    for (const cachedId of lastSyncedCache.reels.keys()) {
      if (!currentReelIds.has(cachedId)) {
        promises.push((async () => {
          try {
            await cloudDb.deleteDoc('reels', cachedId);
            lastSyncedCache.reels.delete(cachedId);
          } catch (delErr) {
            console.error(`Error deleting Reel ${cachedId} from Cloud DB:`, delErr);
          }
        })());
      }
    }

    const currentPostIds = new Set(data.posts ? data.posts.map(p => p.id) : []);
    for (const cachedId of lastSyncedCache.posts.keys()) {
      if (!currentPostIds.has(cachedId)) {
        promises.push((async () => {
          try {
            await cloudDb.deleteDoc('posts', cachedId);
            lastSyncedCache.posts.delete(cachedId);
          } catch (delErr) {
            console.error(`Error deleting post ${cachedId} from Cloud DB:`, delErr);
          }
        })());
      }
    }

    const currentDmIds = new Set(data.directMessages ? data.directMessages.map(dm => dm.id) : []);
    for (const cachedId of lastSyncedCache.directMessages.keys()) {
      if (!currentDmIds.has(cachedId)) {
        promises.push((async () => {
          try {
            await cloudDb.deleteDoc('direct_messages', cachedId);
            lastSyncedCache.directMessages.delete(cachedId);
          } catch (delErr) {
            console.error(`Error deleting DM ${cachedId} from Cloud DB:`, delErr);
          }
        })());
      }
    }

    if (promises.length > 0) {
      await Promise.all(promises);
      lastCloudSyncTimestamp = new Date().toISOString();
      console.log(`☁️ Cloud DB sync finished: Pushed ${promises.length} changes to persistent Firestore.`);
    }
  } catch (err) {
    console.error('❌ Failed background write to Cloud DB:', err);
  }
}

async function syncFromFirestore() {
  if (!cloudDb.isActive) {
    console.log('ℹ️ Cloud DB adapter not active. Using persistent local disk storage.');
    return;
  }

  try {
    const envAdminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const envAdminPassword = process.env.ADMIN_PASSWORD || 'AdminSecurePassword123';
    const envAdminName = process.env.ADMIN_NAME || 'System Administrator';

    console.log('☁️ Initiating cloud synchronization from Firestore database...');

    let fetchErrors = 0;
    const safeGetCollection = async (name: string) => {
      try {
        return await cloudDb.getCollection(name);
      } catch (err) {
        fetchErrors++;
        console.warn(`⚠️ Could not fetch collection "${name}" from Cloud DB:`, err);
        return [];
      }
    };

    // Load all collections concurrently
    const [
      dbUsers,
      dbCampaigns,
      dbPosts,
      dbDMs,
      dbMerchantAds,
      dbReels,
      dbReelSubs,
      dbStories,
      dbAlbums,
      dbGroupChats,
      dbGroupMessages,
      dbShopProducts,
      dbShopBaskets,
      dbShopOrders,
      dbVaBanners
    ] = await Promise.all([
      safeGetCollection('users'),
      safeGetCollection('campaigns'),
      safeGetCollection('posts'),
      safeGetCollection('direct_messages'),
      safeGetCollection('merchant_ads'),
      safeGetCollection('reels'),
      safeGetCollection('reel_subscriptions'),
      safeGetCollection('stories'),
      safeGetCollection('albums'),
      safeGetCollection('group_chats'),
      safeGetCollection('group_messages'),
      safeGetCollection('shop_products'),
      safeGetCollection('shop_baskets'),
      safeGetCollection('shop_orders'),
      safeGetCollection('va_banners')
    ]);

    const hasAnyCloudData = dbUsers.length > 0 || dbStories.length > 0 || dbAlbums.length > 0 || dbGroupChats.length > 0 || 
                            dbGroupMessages.length > 0 || dbDMs.length > 0 || dbPosts.length > 0 || 
                            dbReels.length > 0 || dbShopOrders.length > 0;

    const localDB = loadDB(); // Read current local records

    if (hasAnyCloudData) {
      console.log(`📱 Found Cloud Firestore records: ${dbUsers.length} users, ${dbReels.length} reels, ${dbStories.length} stories, ${dbGroupChats.length} group chats, ${dbGroupMessages.length} group msgs, ${dbDMs.length} DMs, ${dbPosts.length} posts. Merging with local storage...`);

      // 1. Clean withdrawals
      for (const u of dbUsers) {
        if (Array.isArray(u.withdrawals)) {
          const originalLen = u.withdrawals.length;
          u.withdrawals = u.withdrawals.filter((w: any) => {
            if (w.id === 'with-1785655833689') return true;
            const isFake = w.id.startsWith('with-db-') || w.id.startsWith('with-sim-') || String(w.createdAt || '').includes('Ago 2, 2026');
            return !isFake;
          });
          if (u.withdrawals.length !== originalLen) {
            cloudDb.updateDoc('users', u.id, { withdrawals: u.withdrawals }).catch(() => {});
          }
        }
      }

      // 2. Safe merge of all collections so NO local or cloud record is lost
      const mergeById = (localArr: any[] = [], cloudArr: any[] = []) => {
        const map = new Map<string, any>();
        localArr.forEach(it => { if (it && it.id) map.set(it.id, it); });
        cloudArr.forEach(it => { if (it && it.id) map.set(it.id, it); });
        return Array.from(map.values());
      };

      const finalUsers = mergeById(localDB.users, dbUsers);
      const finalPosts = mergeById(localDB.posts, dbPosts);
      const finalDMs = mergeById(localDB.directMessages, dbDMs);
      const finalMerchantAds = mergeById(localDB.merchantAds, dbMerchantAds);
      const finalReels = mergeById(localDB.reels, dbReels);
      const finalReelSubs = mergeById(localDB.reelSubscriptions, dbReelSubs);
      const finalStories = mergeById(localDB.stories, dbStories);
      const finalAlbums = mergeById(localDB.albums || [], dbAlbums);
      const finalGroupChats = mergeById(localDB.groupChats, dbGroupChats);
      const finalGroupMessages = mergeById(localDB.groupMessages, dbGroupMessages);
      const finalCampaigns = dbCampaigns.length > 0 ? dbCampaigns : (localDB.campaigns || INITIAL_CAMPAIGNS);
      const finalShopProducts = mergeById(localDB.shopProducts || INITIAL_SHOP_PRODUCTS, dbShopProducts);
      const finalShopBaskets = mergeById(localDB.shopBaskets || INITIAL_SHOP_BASKETS, dbShopBaskets);
      const finalShopOrders = mergeById(localDB.shopOrders || INITIAL_SHOP_ORDERS, dbShopOrders);
      const finalVaBanners = mergeById(localDB.vaBanners || [], dbVaBanners);

      const mergedDB: DBStructure = {
        users: finalUsers.length > 0 ? finalUsers : localDB.users,
        campaigns: finalCampaigns,
        posts: finalPosts,
        directMessages: finalDMs,
        merchantAds: finalMerchantAds,
        reels: finalReels.length > 0 ? finalReels : INITIAL_REELS,
        reelSubscriptions: finalReelSubs,
        stories: finalStories,
        albums: finalAlbums,
        groupChats: finalGroupChats.length > 0 ? finalGroupChats : localDB.groupChats,
        groupMessages: finalGroupMessages.length > 0 ? finalGroupMessages : localDB.groupMessages,
        shopProducts: finalShopProducts,
        shopBaskets: finalShopBaskets,
        shopCarts: localDB.shopCarts || {},
        shopOrders: finalShopOrders,
        vaBanners: finalVaBanners,
        vaSubscriptions: localDB.vaSubscriptions || []
      };

      // Admin verification
      const admin = mergedDB.users.find(u => u.isAdmin);
      if (admin) {
        admin.email = envAdminEmail;
        admin.password = envAdminPassword;
        admin.name = envAdminName;
      }

      cachedDB = mergedDB;
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(mergedDB, null, 2), 'utf-8');
      fs.writeFileSync(DB_BACKUP_PATH, JSON.stringify(mergedDB, null, 2), 'utf-8');
      initLastSyncedCache(mergedDB);
      lastCloudSyncTimestamp = new Date().toISOString();
      console.log(`✅ Merged state saved: ${mergedDB.users.length} users, ${mergedDB.reels?.length} reels, ${mergedDB.stories?.length} stories, ${mergedDB.groupChats?.length} group chats, ${mergedDB.groupMessages?.length} group msgs.`);

      // Push any local items not yet in Cloud to Firestore
      uploadToFirestore(mergedDB).catch(err => {
        console.error('Error in initial post-merge upload to Cloud DB:', err);
      });
    } else if (fetchErrors > 0) {
      console.warn(`⚠️ Cloud Firestore sync encountered ${fetchErrors} errors during initial query. Retaining existing in-memory/local state to protect cloud data from baseline overwrite.`);
    } else {
      console.log('🌱 Cloud Firestore confirmed empty. Seeding all local baseline records to Cloud...');
      const seedDB = localDB;
      initLastSyncedCache(seedDB);
      await uploadToFirestore(seedDB);
      lastCloudSyncTimestamp = new Date().toISOString();
      console.log('✅ Baseline seed completed: All initial reels, group chats, and stories are now persistent in Cloud Firestore!');
    }
  } catch (err) {
    console.error('⚠️ Could not sync with Cloud DB at startup. Using local database fallback:', err);
  }
}

// Ensure database is initialized (will be updated dynamically during startup sync)
let database = loadDB();

// --- AUTH MIDDLEWARE ---
function generateToken(userId: string) {
  return userId; // Simple pass-through for simulation token
}

function hasActiveAccess(user: UserSession): boolean {
  if (user.isAdmin) return true;

  // Support 3-Hour Free Access granted from Spin Wheel
  if (user.freeAccessExpiresAt) {
    if (new Date(user.freeAccessExpiresAt).getTime() > Date.now()) {
      return true;
    }
  }
  
  const regDate = user.createdAt ? new Date(user.createdAt) : new Date();
  const passedMs = Date.now() - regDate.getTime();
  const oneDayInMs = 24 * 60 * 60 * 1000;
  
  // Free trial access for exactly 1 day (24 hours)
  if (passedMs < oneDayInMs) {
    return true;
  }
  
  // If registered more than 1 day ago, must have active, unexpired subscription
  const sub = user.subscription;
  if (!sub || sub.status !== 'active') {
    return false;
  }
  
  if (sub.expiresAt) {
    return new Date(sub.expiresAt).getTime() > Date.now();
  }
  
  return false;
}

// ============================================
//         WEB PUSH NOTIFICATION ENGINE
// ============================================

async function sendPushNotificationToUser(userId: string, payload: { title: string; body: string; url?: string; icon?: string; tag?: string }) {
  if (!userId) return;
  try {
    const db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) return;

    const notificationPayload = JSON.stringify({
      title: payload.title || 'GCash Click-Earn / Z-one',
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      badge: '/icon-192.png',
      url: payload.url || '/',
      tag: payload.tag || `zone-${Date.now()}`
    });

    const activeSubs: any[] = [];
    for (const sub of user.pushSubscriptions) {
      if (!sub || !sub.endpoint || !sub.keys) continue;
      try {
        await webpush.sendNotification(sub as any, notificationPayload);
        activeSubs.push(sub);
      } catch (err: any) {
        const statusCode = err?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          console.log(`Push sub expired/unregistered for user ${user.name} (${user.id}). Removing.`);
        } else {
          console.log(`Push sub failed for user ${user.name}:`, err?.message || statusCode);
          activeSubs.push(sub);
        }
      }
    }

    if (activeSubs.length !== user.pushSubscriptions.length) {
      user.pushSubscriptions = activeSubs;
      saveDB(db);
    }
  } catch (pushErr) {
    console.error('Error in sendPushNotificationToUser:', pushErr);
  }
}

async function broadcastPushNotification(payload: { title: string; body: string; url?: string; icon?: string; tag?: string }, excludeUserId?: string) {
  try {
    const db = loadDB();
    for (const user of db.users) {
      if (user.id === excludeUserId) continue;
      if (user.pushSubscriptions && user.pushSubscriptions.length > 0) {
        sendPushNotificationToUser(user.id, payload).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Error in broadcastPushNotification:', err);
  }
}

// GET VAPID PUBLIC KEY
app.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// SUBSCRIBE TO PUSH NOTIFICATIONS
app.post('/api/push/subscribe', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Kailangan ng login upang mag-subscribe sa notifications.' });
  }

  const { subscription } = req.body;
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ error: 'Invalid push subscription payload.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi nahanap ang user.' });
  }

  if (!user.pushSubscriptions) {
    user.pushSubscriptions = [];
  }

  const existingIdx = user.pushSubscriptions.findIndex(s => s.endpoint === subscription.endpoint);
  const userAgent = req.headers['user-agent'] || '';
  const newSubData = {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime || null,
    keys: subscription.keys,
    userAgent,
    createdAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    user.pushSubscriptions[existingIdx] = newSubData;
  } else {
    user.pushSubscriptions.push(newSubData);
  }

  saveDB(db);
  console.log(`🔔 Registered push subscription for user ${user.name} (${user.id}). Total devices: ${user.pushSubscriptions.length}`);
  
  res.json({
    success: true,
    message: 'Matagumpay na na-activate ang background notifications para sa device na ito! 🔔',
    activeDevicesCount: user.pushSubscriptions.length
  });
});

// UNSUBSCRIBE FROM PUSH NOTIFICATIONS
app.post('/api/push/unsubscribe', (req, res) => {
  const userId = req.headers.authorization;
  const { endpoint } = req.body;

  if (userId) {
    const db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (user && user.pushSubscriptions) {
      user.pushSubscriptions = user.pushSubscriptions.filter(s => s.endpoint !== endpoint);
      saveDB(db);
    }
  }

  res.json({ success: true, message: 'Unsubscribed from notifications.' });
});

// TEST PUSH NOTIFICATION
app.post('/api/push/test', async (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Kailangan ng login.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
    return res.status(400).json({ error: 'Wala pang aktibong notification subscription ang device na ito. I-enable muna ang notifications.' });
  }

  await sendPushNotificationToUser(userId, {
    title: '🔔 Test Notification - GCash Click-Earn',
    body: 'Gumagana ang background notifications! Kahit naka-close ang app basta bukas ang mobile data/internet, makakatanggap ka pa rin ng updates. 🎉',
    url: '/',
    tag: 'test-notification'
  });

  res.json({ success: true, message: 'Naipadala ang test notification sa iyong device!' });
});

// ============================================
//               AUTHENTICATION
// ============================================

// IN-MEMORY STORAGE FOR SYSTEM CLONE & UNIQUE DEMO TESTING LINK USERS
// Demo users registered via System Clone & Unique Demo Testing Link are kept strictly in RAM only!
// They are NEVER saved to db.users, db.json, or Firestore!
const demoUsers: UserSession[] = [];

// Helper to look up a user in demoUsers (RAM) first, then db.users (Production DB)
function findUserInSystem(userId: string, db: DBStructure): UserSession | undefined {
  if (!userId) return undefined;
  const demoUser = demoUsers.find(u => u.id === userId);
  if (demoUser) return demoUser;
  return db.users.find(u => u.id === userId);
}

// ENDPOINT TO AUTOMATICALLY PURGE DEMO USER DATA FROM RAM MEMORY WHEN USER LEAVES DEMO MODE/PAGE
app.post('/api/auth/demo-session-clear', (req, res) => {
  const userId = req.headers.authorization || req.body?.userId || req.body?.id;
  const userEmail = req.body?.email ? String(req.body.email).toLowerCase().trim() : null;

  if (userEmail) {
    for (let i = demoUsers.length - 1; i >= 0; i--) {
      if (demoUsers[i].email.toLowerCase() === userEmail) {
        demoUsers.splice(i, 1);
      }
    }
  }
  if (userId) {
    for (let i = demoUsers.length - 1; i >= 0; i--) {
      if (demoUsers[i].id === userId) {
        demoUsers.splice(i, 1);
      }
    }
  }

  res.json({ success: true, message: 'Demo user data automatically purged from RAM.' });
});

// REGISTER
app.post('/api/auth/register', (req, res) => {
  const { email, password, name, avatar, referralCode, isDemo } = req.body;
  const isDemoModeReq = Boolean(isDemo || req.headers['x-demo-mode'] === 'true');

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Kailangan ibigay ang email, password, at pangalan.' });
  }

  const db = loadDB();
  const lowerEmail = email.toLowerCase().trim();

  const userExistsReal = db.users.find(u => u.email.toLowerCase() === lowerEmail);
  const userExistsDemo = demoUsers.find(u => u.email.toLowerCase() === lowerEmail);
  if (userExistsReal || userExistsDemo) {
    return res.status(400).json({ error: 'Ang email na ito ay may rehistradong account na.' });
  }

  // Generate individual referral code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let myCode = 'REF-';
  for (let i = 0; i < 6; i++) {
    myCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const userId = isDemoModeReq ? ('demo-user-' + Date.now()) : ('user-api-' + Date.now());
  const defaultAvatar = avatar || '👤';

  // Create new user session structure
  const newUser: UserSession = {
    id: userId,
    email: email.trim(),
    password: password,
    name: name.trim(),
    avatar: defaultAvatar,
    referralCode: myCode,
    isAdmin: false,
    isDemo: isDemoModeReq,
    createdAt: new Date().toISOString(),
    subscription: {
      status: 'none',
      planId: null,
      requestedPlanName: null,
      requestedAmount: null,
      requestedAt: null,
      expiresAt: null
    },
    stats: {
      balance: 25.00, // Starting Welcome Bonus
      lifetimeEarnings: 25.00,
      completedTasksCount: 0,
      dailyCheckInDate: null
    },
    withdrawals: [],
    activityLogs: [
      {
        id: 'log-welcome-' + Date.now(),
        type: 'bonus',
        title: isDemoModeReq ? 'Salamat sa pag-testing sa System Clone! Libreng Pang-umpisang Pera' : 'Salamat sa pagre-register! Libreng Pang-umpisang Pera',
        amount: 25.00,
        timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
        details: 'Nakatanggap ka ng libreng ₱25.00 bilang Welcome Gift.'
      }
    ],
    referredFriends: []
  };

  if (isDemoModeReq) {
    // 🌐 SYSTEM CLONE / TESTING DEMO MODE REGISTRATION:
    // STORE EXCLUSIVELY IN RAM (demoUsers). DO NOT WRITE TO db.users OR FIRESTORE!
    demoUsers.push(newUser);
  } else {
    // 🔒 LEGITIMATE OFFICIAL SYSTEM REGISTRATION:
    // SAVE TO PERSISTENT DATABASE AND FIRESTORE!
    if (referralCode) {
      const codeClean = referralCode.trim().toUpperCase();
      const referrer = db.users.find(u => u.referralCode === codeClean);
      if (referrer) {
        newUser.invitedBy = codeClean;
        referrer.referredFriends.push({
          id: userId,
          name: newUser.name,
          avatar: newUser.avatar,
          currentEarnings: 25.00,
          bonusClaimed: false,
          joinedAt: new Date().toLocaleDateString('fil-PH', { month: 'short', day: 'numeric', year: 'numeric' })
        });
        referrer.activityLogs.unshift({
          id: 'log-ref-join-' + Date.now(),
          type: 'bonus',
          title: `Sumali gamit ang Link mo si ${newUser.name}`,
          amount: 0,
          timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
          details: `${newUser.name} ay gumawa ng account gamit ang iyong link. Makakakuha ka ng ₱5.00 kapag naka-ipon siya ng kanyang unang ₱100.00!`
        });
      }
    }
    db.users.push(newUser);
    saveDB(db);
  }

  const { password: _, ...userSafe } = newUser as any;
  res.json({ user: userSafe, token: generateToken(userId) });
});

// LOGIN
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Kailangan ibigay ang email at password.' });
  }

  const db = loadDB();
  const lowerEmail = email.toLowerCase().trim();

  let user = demoUsers.find(u => u.email.toLowerCase() === lowerEmail);
  if (!user) {
    user = db.users.find(u => u.email.toLowerCase() === lowerEmail);
  }

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Maling email o password. Pakisubukang muli.' });
  }

  if (user.isBanned) {
    return res.status(403).json({ error: '🔴 Ang iyong account ay banned ng administrator dahil sa paglabag sa Community Rules ng Z-one.' });
  }

  const { password: _, ...userSafe } = user as any;
  res.json({ user: userSafe, token: generateToken(user.id) });
});

// AUTO-RESTORE SESSION ENDPOINT
app.post('/api/auth/auto-restore', (req, res) => {
  const { email, password, name, avatar, stats, withdrawals, activityLogs, referredFriends, isDemo } = req.body;
  const isDemoModeReq = Boolean(isDemo || req.headers['x-demo-mode'] === 'true');

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Kailangan ibigay ang email, password, at pangalan.' });
  }

  const db = loadDB();
  const lowerEmail = email.toLowerCase().trim();

  let user = demoUsers.find(u => u.email.toLowerCase() === lowerEmail) || db.users.find(u => u.email.toLowerCase() === lowerEmail);

  if (!user) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let myCode = 'REF-';
    for (let i = 0; i < 6; i++) {
      myCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    user = {
      id: isDemoModeReq ? ('demo-restore-' + Date.now()) : ('user-restore-' + Date.now()),
      email: email.trim(),
      password: password,
      name: name.trim(),
      avatar: avatar || '👤',
      referralCode: myCode,
      isAdmin: false,
      isDemo: isDemoModeReq,
      createdAt: new Date().toISOString(),
      subscription: {
        status: 'none',
        planId: null,
        requestedPlanName: null,
        requestedAmount: null,
        requestedAt: null,
        expiresAt: null
      },
      stats: stats || {
        balance: 25.00,
        lifetimeEarnings: 25.00,
        completedTasksCount: 0,
        dailyCheckInDate: null
      },
      withdrawals: withdrawals || [],
      activityLogs: activityLogs || [],
      referredFriends: referredFriends || []
    };

    if (isDemoModeReq) {
      demoUsers.push(user);
    } else {
      db.users.push(user);
      saveDB(db);
    }
  } else {
    if (user.password !== password) {
      return res.status(401).json({ error: 'Suriing mabuti ang email at password.' });
    }
  }

  const { password: _, ...userSafe } = user as any;
  res.json({ user: userSafe, token: generateToken(user.id) });
});

// GOOGLE SIGN IN OR SIGN UP SIMULATION
app.post('/api/auth/google', (req, res) => {
  const { email, name, avatar, referralCode, isDemo } = req.body;
  const isDemoModeReq = Boolean(isDemo || req.headers['x-demo-mode'] === 'true');

  if (!email || !name) {
    return res.status(400).json({ error: 'Kailangan ibigay ang Google account details.' });
  }

  const db = loadDB();
  const lowerEmail = email.toLowerCase().trim();

  let user = demoUsers.find(u => u.email.toLowerCase() === lowerEmail) || db.users.find(u => u.email.toLowerCase() === lowerEmail);

  // If user doesn't exist, create it on-the-fly (Sign Up)
  if (!user) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let myCode = 'REF-';
    for (let i = 0; i < 6; i++) {
      myCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const userId = isDemoModeReq ? ('demo-google-' + Date.now()) : ('user-google-' + Date.now());
    const defaultAvatar = avatar || '🌐';

    user = {
      id: userId,
      email: email.trim(),
      name: name.trim(),
      avatar: defaultAvatar,
      referralCode: myCode,
      isAdmin: false,
      isDemo: isDemoModeReq,
      createdAt: new Date().toISOString(),
      subscription: {
        status: 'none',
        planId: null,
        requestedPlanName: null,
        requestedAmount: null,
        requestedAt: null,
        expiresAt: null
      },
      stats: {
        balance: 25.00,
        lifetimeEarnings: 25.00,
        completedTasksCount: 0,
        dailyCheckInDate: null
      },
      withdrawals: [],
      activityLogs: [
        {
          id: 'log-welcome-' + Date.now(),
          type: 'bonus',
          title: 'Welcome! Google Sign-up Activated',
          amount: 25.00,
          timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
          details: 'Nakatanggap ka ng libreng ₱25.00 bilang Welcome Gift sa pag-login gamit ang Google.'
        }
      ],
      referredFriends: []
    };

    if (isDemoModeReq) {
      demoUsers.push(user);
    } else {
      if (referralCode) {
        const codeClean = referralCode.trim().toUpperCase();
        const referrer = db.users.find(u => u.referralCode === codeClean);
        if (referrer) {
          user.invitedBy = codeClean;
          referrer.referredFriends.push({
            id: userId,
            name: user.name,
            avatar: user.avatar,
            currentEarnings: 25.00,
            bonusClaimed: false,
            joinedAt: new Date().toLocaleDateString('fil-PH', { month: 'short', day: 'numeric', year: 'numeric' })
          });
          referrer.activityLogs.unshift({
            id: 'log-ref-join-' + Date.now(),
            type: 'bonus',
            title: `Sumali gamit ang Link mo si ${user.name} (Google)`,
            amount: 0,
            timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
            details: `${user.name} ay gumawa ng account gamit ang Google Sign-In at iyong referral link.`
          });
        }
      }
      db.users.push(user);
      saveDB(db);
    }
  }

  const { password: _, ...userSafe } = user as any;
  res.json({ user: userSafe, token: generateToken(user.id) });
});

// GET USER PROFILE
app.get('/api/user/profile', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Lumalabas na naka-Logout ka. Mag-login muna.' });
  }

  const db = loadDB();
  const user = findUserInSystem(userId, db);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang gumagamit.' });
  }

  // Check subscription expiration
  let dbChanged = false;
  
  if (!user.createdAt) {
    user.createdAt = new Date().toISOString();
    dbChanged = true;
  }
  
  if (!user.subscription) {
    user.subscription = {
      status: 'none',
      planId: null,
      requestedPlanName: null,
      requestedAmount: null,
      requestedAt: null,
      expiresAt: null
    };
    dbChanged = true;
  } else if (user.subscription.status === 'active' && user.subscription.expiresAt) {
    if (new Date(user.subscription.expiresAt).getTime() < Date.now()) {
      user.subscription.status = 'expired';
      user.activityLogs.unshift({
        id: 'expire-sub-' + Date.now(),
        type: 'bonus',
        title: 'Expired na ang iyong Subscription 🚫',
        amount: 0,
        timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
        details: 'Ang iyong premium subscription access ay natapos na ngayon. Mangyaring pumili muli ng subscription plan upang muling ma-reopen ang iyong dashboard access.'
      });
      dbChanged = true;
    }
  }

  // Update referred friends' progress and real successful withdrawals live in referrer's profile screen
  // By matching referredFriends with their actual current earnings and withdrawals on our DB!
  let isFriendListModified = false;
  const synchronizedReferredFriends = user.referredFriends.map(friend => {
    const actualFriendUser = db.users.find(u => u.id === friend.id || u.name === friend.name);
    const realSuccessWithdrawals = actualFriendUser && Array.isArray(actualFriendUser.withdrawals)
      ? actualFriendUser.withdrawals.filter((w: any) => w.status === 'success')
      : [];
    
    return {
      ...friend,
      avatar: actualFriendUser ? actualFriendUser.avatar : friend.avatar,
      currentEarnings: actualFriendUser ? actualFriendUser.stats.lifetimeEarnings : friend.currentEarnings,
      withdrawals: realSuccessWithdrawals
    };
  });

  const { password: _, ...userSafe } = user as any;
  userSafe.referredFriends = synchronizedReferredFriends;
  res.json({ user: userSafe });
});

// UPDATE USER PROFILE PIC / DETAILS
app.post('/api/user/update-profile', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Mag-login muna.' });
  }

  const { avatar, name } = req.body;
  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang gumagamit.' });
  }

  if (avatar) {
    user.avatar = avatar;
  }
  if (name && name.trim()) {
    user.name = name.trim();
  }

  // Also update all posts of this user with the new avatar and name
  if (db.posts) {
    db.posts.forEach(p => {
      if (p.userId === userId) {
        if (avatar) p.userAvatar = avatar;
        if (name) p.userName = name.trim();
      }
      // Also comments
      if (p.comments) {
        p.comments.forEach(c => {
          if (c.userId === userId) {
            if (avatar) c.userAvatar = avatar;
            if (name) c.userName = name.trim();
          }
        });
      }
    });
  }

  saveDB(db);
  const { password: _, ...userSafe } = user as any;
  res.json({ success: true, user: userSafe, message: 'Matagumpay na na-update ang iyong profile!' });
});

// --- ADMIN: BAN / UNBAN USER ---
app.post('/api/admin/users/:userId/ban', async (req, res) => {
  const adminId = req.headers.authorization;
  if (!adminId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const db = loadDB();
  const admin = db.users.find(u => u.id === adminId);
  if (!admin || !admin.isAdmin) {
    return res.status(403).json({ error: 'Sapat na Admin privileges ay kailangan.' });
  }

  const { userId } = req.params;
  const targetUser = db.users.find(u => u.id === userId);
  if (!targetUser) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  if (targetUser.isAdmin) {
    return res.status(400).json({ error: 'Hindi pwedeng i-ban ang admin.' });
  }

  targetUser.isBanned = !targetUser.isBanned;
  saveDB(db);

  if (cloudDb.isActive) {
    cloudDb.updateDoc('users', userId, { isBanned: targetUser.isBanned }).catch((e) => {
      console.error('Cloud DB ban update error:', e);
    });
  }

  res.json({ 
    success: true, 
    isBanned: targetUser.isBanned, 
    message: targetUser.isBanned ? `Si ${targetUser.name} ay matagumpay na na-ban!` : `Si ${targetUser.name} ay matagumpay na na-unban!` 
  });
});

// --- ADMIN: DELETE USER ---
app.delete('/api/admin/users/:userId', async (req, res) => {
  const adminId = req.headers.authorization;
  if (!adminId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const db = loadDB();
  const admin = db.users.find(u => u.id === adminId);
  if (!admin || !admin.isAdmin) {
    return res.status(403).json({ error: 'Sapat na Admin privileges ay kailangan.' });
  }

  const { userId } = req.params;
  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  const targetUser = db.users[userIndex];
  if (targetUser.isAdmin) {
    return res.status(400).json({ error: 'Hindi pwedeng i-delete ang admin account.' });
  }

  db.users.splice(userIndex, 1);
  saveDB(db);

  if (cloudDb.isActive) {
    cloudDb.deleteDoc('users', userId).catch((e) => {
      console.error('Cloud DB delete user error:', e);
    });
  }

  res.json({ success: true, message: `Si ${targetUser.name} ay matagumpay na na-delete sa sistema.` });
});

// --- REELS & SHORTS API ENDPOINTS ---
function formatEmbedUrlServer(rawUrl: string) {
  if (!rawUrl) return { embedUrl: '', platform: 'direct' as const };
  let url = rawUrl.trim();

  // 1. YouTube Shorts & Watch
  const ytShortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/i);
  if (ytShortsMatch && ytShortsMatch[1]) {
    return {
      embedUrl: `https://www.youtube.com/embed/${ytShortsMatch[1]}?autoplay=1&enablejsapi=1`,
      platform: 'youtube' as const
    };
  }

  const ytWatchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/i);
  if (ytWatchMatch && ytWatchMatch[1]) {
    return {
      embedUrl: `https://www.youtube.com/embed/${ytWatchMatch[1]}?autoplay=1&enablejsapi=1`,
      platform: 'youtube' as const
    };
  }

  // 2. Facebook Reels / Videos
  if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.com')) {
    if (url.includes('facebook.com/plugins/video.php')) {
      return { embedUrl: url, platform: 'facebook' as const };
    }
    const encoded = encodeURIComponent(url);
    return {
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=false&autoplay=true`,
      platform: 'facebook' as const
    };
  }

  // 3. TikTok
  const tiktokMatch = url.match(/tiktok\.com\/.*\/video\/(\d+)/i) || url.match(/tiktok\.com\/embed\/v2\/(\d+)/i);
  if (tiktokMatch && tiktokMatch[1]) {
    return {
      embedUrl: `https://www.tiktok.com/player/v1/${tiktokMatch[1]}?autoplay=1`,
      platform: 'tiktok' as const
    };
  }
  if (url.includes('tiktok.com')) {
    return { embedUrl: url, platform: 'tiktok' as const };
  }

  // 4. Instagram
  const igMatch = url.match(/instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/i);
  if (igMatch && igMatch[1]) {
    return {
      embedUrl: `https://www.instagram.com/p/${igMatch[1]}/embed`,
      platform: 'instagram' as const
    };
  }

  // 5. Direct
  return { embedUrl: url, platform: 'direct' as const };
}

app.get('/api/reels', (req, res) => {
  const db = loadDB();
  if (!db.reels || db.reels.length === 0) {
    db.reels = [...INITIAL_REELS];
    saveDB(db);
  }

  const authUserId = req.headers.authorization || (req.query.userId as string);
  const user = authUserId ? db.users.find(u => u.id === authUserId) : null;
  const isAdmin = user?.isAdmin || req.query.admin === 'true';

  let filtered = db.reels;
  if (!isAdmin) {
    // Regular users only see approved reels (or legacy reels without status)
    filtered = db.reels.filter(r => !r.status || r.status === 'approved');
  }

  res.json({ 
    reels: filtered,
    reelsTokens: user ? (user.reelsTokens || 0) : 0,
    userReelsTokens: user ? (user.reelsTokens || 0) : 0
  });
});

app.post('/api/reels', (req, res) => {
  const { url, embedUrl, platform, title, addedBy, userId } = req.body;
  if (!url || !url.trim()) {
    return res.status(400).json({ error: 'Kailangan ibigay ang Video URL.' });
  }

  const db = loadDB();
  db.reels = db.reels || [...INITIAL_REELS];

  const authUserId = req.headers.authorization || userId;
  const user = authUserId ? db.users.find(u => u.id === authUserId) : null;
  const isAdmin = user?.isAdmin === true;

  const { embedUrl: autoEmbedUrl, platform: autoPlatform } = formatEmbedUrlServer(url.trim());
  const finalEmbedUrl = embedUrl || autoEmbedUrl;
  const finalPlatform = platform || autoPlatform;

  if (!isAdmin) {
    // User upload: Check token balance (0.50 tokens per reel upload required)
    const currentTokens = user ? (user.reelsTokens || 0) : 0;
    if (currentTokens < 0.50) {
      return res.status(400).json({ 
        error: `Kailangan mo ng 0.50 Tokens bawat Reel. Ang iyong kasalukuyang balance ay ${currentTokens.toFixed(2)} Tokens. Mag-subscribe ng '20 Reels & Shorts' package sa halagang ₱10.00 pesos sa GCash 09914089646.`,
        needTokens: true,
        currentTokens
      });
    }

    const newReel: ReelVideo = {
      id: 'reel-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      url: url.trim(),
      embedUrl: finalEmbedUrl,
      platform: finalPlatform,
      title: title?.trim() || (finalPlatform === 'tiktok' ? '🎵 TikTok Reel Video' : finalPlatform === 'facebook' ? '📘 FB Reel Video' : finalPlatform === 'youtube' ? '▶️ YouTube Short' : '🎬 Reel Video'),
      likes: 0,
      addedBy: user ? user.name : (addedBy || 'User'),
      addedByUserId: user ? user.id : undefined,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    db.reels.unshift(newReel);
    saveDB(db);

    return res.json({ 
      success: true, 
      reel: newReel, 
      reels: db.reels.filter(r => !r.status || r.status === 'approved'),
      message: 'Matagumpay na naisumite ang iyong Reel! Isasailalim ito sa Review ng Admin. Ang 0.50 tokens ay mababawas LAMANG kapag ito ay MA-APPROVE ng Admin.' 
    });
  }

  // Admin upload (Auto-approved, no tokens needed)
  const newReel: ReelVideo = {
    id: 'reel-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    url: url.trim(),
    embedUrl: finalEmbedUrl,
    platform: finalPlatform,
    title: title?.trim() || '🎬 Official Reel Video',
    likes: 0,
    addedBy: 'Admin',
    status: 'approved',
    createdAt: new Date().toISOString()
  };

  db.reels.unshift(newReel);
  saveDB(db, true);

  if (cloudDb.isActive) {
    const { id, ...rWithoutId } = newReel;
    cloudDb.setDoc('reels', newReel.id, rWithoutId).catch(() => {});
  }

  res.json({ success: true, reel: newReel, reels: db.reels, message: 'Matagumpay na naidagdag ang Reel (Admin Approved)!' });
});

// TOKEN SUBSCRIPTION REQUEST (20 Reels = ₱10 pesos / 10 Tokens)
app.post('/api/reels/token-subscription', (req, res) => {
  const { userId, userName, userEmail, gcashNumber, gcashRefNo } = req.body;
  if (!gcashRefNo || !gcashRefNo.trim()) {
    return res.status(400).json({ error: 'Kailangan ibigay ang GCash Reference Number.' });
  }

  const db = loadDB();
  db.reelSubscriptions = db.reelSubscriptions || [];

  const authUserId = req.headers.authorization || userId;
  let user = authUserId ? db.users.find(u => u.id === authUserId || (u.email && u.email.toLowerCase() === authUserId.toLowerCase())) : null;

  if (!user && userEmail) {
    user = db.users.find(u => u.email.toLowerCase().trim() === userEmail.toLowerCase().trim());
  }

  if (!user && userName) {
    user = db.users.find(u => u.name.toLowerCase().trim() === userName.toLowerCase().trim());
  }

  const newSub: ReelTokenSubscription = {
    id: 'reel-sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    userId: user ? user.id : (userId || 'guest'),
    userName: user ? user.name : (userName || 'Guest User'),
    userEmail: user ? user.email : (userEmail || undefined),
    gcashNumber: gcashNumber || 'GCash',
    gcashRefNo: gcashRefNo.trim(),
    packageName: '20 Reels & Shorts Package',
    price: 10,
    tokensGranted: 10, // 10 tokens = 20 reels @ 0.50 tokens/reel
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  db.reelSubscriptions.unshift(newSub);
  saveDB(db);

  res.json({
    success: true,
    subscription: newSub,
    message: `Matagumpay na naisumite ang iyong ₱10 = 20 Reels Token Subscription! Ibe-verify ng Admin ang GCash Reference No. (${gcashRefNo}) upang ma-credit ang iyong 10 Tokens.`
  });
});

// ADMIN: GET ALL REELS & REEL SUBSCRIPTIONS & REDEMPTIONS
app.get('/api/admin/reels', (req, res) => {
  const adminId = req.headers.authorization;
  if (!adminId) return res.status(401).json({ error: 'Unauthenticated.' });

  const db = loadDB();
  const admin = db.users.find(u => u.id === adminId);
  if (!admin || !admin.isAdmin) return res.status(403).json({ error: 'Sapat na Admin privileges ay kailangan.' });

  res.json({
    reels: db.reels || [],
    reelSubscriptions: db.reelSubscriptions || [],
    reelRedemptions: db.reelRedemptions || []
  });
});

// USER: GET MY UPLOADED REELS & REDEMPTIONS ACTIVITY
app.get('/api/reels/my-activity', (req, res) => {
  const authUserId = req.headers.authorization || (req.query.userId as string);
  if (!authUserId) return res.status(401).json({ error: 'Kailangan mag-login.' });

  const db = loadDB();
  db.reels = db.reels || [];
  db.reelRedemptions = db.reelRedemptions || [];

  const user = db.users.find(u => u.id === authUserId || (u.email && u.email.toLowerCase() === authUserId.toLowerCase()));

  if (!user) return res.status(404).json({ error: 'Hindi mahanap ang user.' });

  // Filter reels uploaded by this user
  const userReels = db.reels.filter(r => 
    r.addedByUserId === user.id || 
    (r.addedBy && r.addedBy.toLowerCase().trim() === user.name.toLowerCase().trim())
  );

  // Filter redemptions by this user
  const userRedemptions = db.reelRedemptions.filter(r => r.userId === user.id);
  const totalRedeemed = userRedemptions.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  res.json({
    success: true,
    myReels: userReels,
    myRedemptions: userRedemptions,
    totalRedeemed,
    currentBalance: user.balance || 0
  });
});

// USER: REDEEM REEL PROFIT TO MAIN BALANCE (Minimum ₱300)
app.post('/api/reels/redeem-profit', (req, res) => {
  const authUserId = req.headers.authorization || req.body.userId;
  if (!authUserId) return res.status(401).json({ error: 'Kailangan mag-login.' });

  const { amount } = req.body;
  const requestedAmount = Number(amount);

  if (isNaN(requestedAmount) || requestedAmount < 300) {
    return res.status(400).json({ error: 'Kailangan ng minimum ₱300.00 profit bago makapag-redeem.' });
  }

  const db = loadDB();
  db.reelRedemptions = db.reelRedemptions || [];

  const user = db.users.find(u => u.id === authUserId || (u.email && u.email.toLowerCase() === authUserId.toLowerCase()));
  if (!user) return res.status(404).json({ error: 'Hindi mahanap ang user account.' });

  // Add requested amount directly to user's main wallet balance (KASALUKUYANG BALANCE)
  user.balance = Number(((user.balance || 0) + requestedAmount).toFixed(2));
  user.lifetimeEarnings = Number(((user.lifetimeEarnings || 0) + requestedAmount).toFixed(2));

  // Record Redemption
  const newRedemption = {
    id: 'reel-red-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    amount: requestedAmount,
    status: 'completed' as const,
    createdAt: new Date().toISOString()
  };

  db.reelRedemptions.unshift(newRedemption);

  // Log to User Activity
  user.activityLogs = user.activityLogs || [];
  user.activityLogs.unshift({
    id: 'act-' + Date.now(),
    type: 'reward',
    title: `💰 Reel Profit Redeemed (+₱${requestedAmount.toFixed(2)})`,
    amount: requestedAmount,
    timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
    details: `Matagumpay mong na-redeem ang ₱${requestedAmount.toFixed(2)} profit mula sa iyong Reels at naidagdag sa Kasalukuyang Balance!`
  });

  saveDB(db);

  if (cloudDb.isActive) {
    cloudDb.updateDoc('users', user.id, {
      balance: user.balance,
      lifetimeEarnings: user.lifetimeEarnings,
      activityLogs: user.activityLogs
    }).catch((e) => {
      console.error('Cloud DB update balance error:', e);
    });
  }

  res.json({
    success: true,
    newBalance: user.balance,
    redemption: newRedemption,
    message: `🎉 Matagumpay na na-redeem ang ₱${requestedAmount.toFixed(2)}! Naidagdag na ito sa iyong Kasalukuyang Balance (₱${user.balance.toFixed(2)}).`
  });
});

// ADMIN: APPROVE REEL (Deducts 0.50 tokens from user)
app.post('/api/admin/reels/:id/approve', (req, res) => {
  const adminId = req.headers.authorization;
  if (!adminId) return res.status(401).json({ error: 'Unauthenticated.' });

  const db = loadDB();
  const admin = db.users.find(u => u.id === adminId);
  if (!admin || !admin.isAdmin) return res.status(403).json({ error: 'Sapat na Admin privileges ay kailangan.' });

  const { id } = req.params;
  const reel = (db.reels || []).find(r => r.id === id);
  if (!reel) return res.status(404).json({ error: 'Hindi mahanap ang Reel video.' });

  reel.status = 'approved';

  // Deduct 0.50 tokens from the user who submitted this reel
  if (reel.addedByUserId) {
    const user = db.users.find(u => u.id === reel.addedByUserId);
    if (user) {
      user.reelsTokens = Math.max(0, Number(((user.reelsTokens || 0) - 0.5).toFixed(2)));
      user.activityLogs = user.activityLogs || [];
      user.activityLogs.unshift({
        id: 'act-' + Date.now(),
        type: 'reward',
        title: '🎬 Approved Reel Video (-0.50 Tokens)',
        amount: 0,
        timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
        details: `In-approve ng Admin ang iyong Reel ("${reel.title || 'Reel Video'}"). Nabawasan ng 0.50 tokens ang iyong balance.`
      });
    }
  }

  saveDB(db);
  res.json({ success: true, reel, reels: db.reels, message: 'Matagumpay na na-approve ang Reel at nabawasan ng 0.50 tokens ang user!' });
});

// ADMIN: DISAPPROVE REEL (0 tokens deducted!)
app.post('/api/admin/reels/:id/disapprove', (req, res) => {
  const adminId = req.headers.authorization;
  if (!adminId) return res.status(401).json({ error: 'Unauthenticated.' });

  const db = loadDB();
  const admin = db.users.find(u => u.id === adminId);
  if (!admin || !admin.isAdmin) return res.status(403).json({ error: 'Sapat na Admin privileges ay kailangan.' });

  const { id } = req.params;
  const { reason } = req.body;
  const reel = (db.reels || []).find(r => r.id === id);
  if (!reel) return res.status(404).json({ error: 'Hindi mahanap ang Reel video.' });

  reel.status = 'disapproved';
  reel.disapproveReason = reason || 'Community guidelines violation';

  // NO TOKENS ARE DEDUCTED FROM USER WHEN REEL IS DISAPPROVED!
  if (reel.addedByUserId) {
    const user = db.users.find(u => u.id === reel.addedByUserId);
    if (user) {
      user.activityLogs = user.activityLogs || [];
      user.activityLogs.unshift({
        id: 'act-' + Date.now(),
        type: 'bonus',
        title: '❌ Disapproved Reel Video (0 Tokens Deducted)',
        amount: 0,
        timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
        details: `Hindi na-approve ng Admin ang iyong Reel ("${reel.title || 'Reel Video'}"). Dahilan: ${reel.disapproveReason}. Walang nabawas na tokens sa iyong account.`
      });
    }
  }

  saveDB(db);
  res.json({ success: true, reel, reels: db.reels, message: 'Disapproved ang Reel. Walang nabawas na tokens sa user!' });
});

// ADMIN: APPROVE REEL TOKEN SUBSCRIPTION (Credits +10 tokens = 20 Reels)
app.post('/api/admin/reels/subscriptions/:id/approve', (req, res) => {
  const adminId = req.headers.authorization;
  if (!adminId) return res.status(401).json({ error: 'Unauthenticated.' });

  const db = loadDB();
  const admin = db.users.find(u => u.id === adminId);
  if (!admin || !admin.isAdmin) return res.status(403).json({ error: 'Sapat na Admin privileges ay kailangan.' });

  const { id } = req.params;
  db.reelSubscriptions = db.reelSubscriptions || [];
  const sub = db.reelSubscriptions.find(s => s.id === id);
  if (!sub) return res.status(404).json({ error: 'Hindi mahanap ang subscription request.' });

  sub.status = 'approved';
  sub.approvedAt = new Date().toISOString();

  // Robust target user lookup
  const subUserIdLower = sub.userId ? sub.userId.toLowerCase().trim() : '';
  const subUserNameLower = sub.userName ? sub.userName.toLowerCase().trim() : '';
  const subUserEmailLower = sub.userEmail ? sub.userEmail.toLowerCase().trim() : '';

  let targetUser = db.users.find(u => 
    (subUserIdLower && subUserIdLower !== 'guest' && u.id.toLowerCase().trim() === subUserIdLower) ||
    (subUserEmailLower && u.email && u.email.toLowerCase().trim() === subUserEmailLower) ||
    (subUserNameLower && subUserNameLower !== 'user' && subUserNameLower !== 'guest user' && u.name.toLowerCase().trim() === subUserNameLower)
  );

  // Fallback: if only 1 regular user matches name
  if (!targetUser && subUserNameLower && subUserNameLower !== 'user' && subUserNameLower !== 'guest user') {
    targetUser = db.users.find(u => u.name.toLowerCase().includes(subUserNameLower) || subUserNameLower.includes(u.name.toLowerCase()));
  }

  if (targetUser) {
    const tokensToAdd = sub.tokensGranted || 10;
    targetUser.reelsTokens = Number(((targetUser.reelsTokens || 0) + tokensToAdd).toFixed(2));
    targetUser.activityLogs = targetUser.activityLogs || [];
    targetUser.activityLogs.unshift({
      id: 'act-' + Date.now(),
      type: 'bonus',
      title: '🎟️ Approved Reel Tokens (+10 Tokens / 20 Reels)',
      amount: 0,
      timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
      details: `In-approve ng Admin ang iyong ₱10 GCash payment (Ref: ${sub.gcashRefNo}). Naka-receive ka ng ${tokensToAdd}.00 Tokens (pwedeng mag-upload ng 20 Reels & Shorts)!`
    });
  }

  saveDB(db);
  res.json({ 
    success: true, 
    subscription: sub, 
    message: `In-approve ang Reel Token Subscription! Na-credit ang 10 tokens sa user account (${targetUser ? targetUser.name : sub.userName}).` 
  });
});

// ADMIN: DECLINE REEL TOKEN SUBSCRIPTION
app.post('/api/admin/reels/subscriptions/:id/decline', (req, res) => {
  const adminId = req.headers.authorization;
  if (!adminId) return res.status(401).json({ error: 'Unauthenticated.' });

  const db = loadDB();
  const admin = db.users.find(u => u.id === adminId);
  if (!admin || !admin.isAdmin) return res.status(403).json({ error: 'Sapat na Admin privileges ay kailangan.' });

  const { id } = req.params;
  db.reelSubscriptions = db.reelSubscriptions || [];
  const sub = db.reelSubscriptions.find(s => s.id === id);
  if (!sub) return res.status(404).json({ error: 'Hindi mahanap ang subscription request.' });

  sub.status = 'declined';
  saveDB(db);

  res.json({ success: true, subscription: sub, message: 'Nadecline ang Reel Token Subscription request.' });
});

// ADMIN: DIRECTLY ADJUST USER REEL TOKENS
app.post('/api/admin/users/:userId/tokens', (req, res) => {
  const adminId = req.headers.authorization;
  if (!adminId) return res.status(401).json({ error: 'Unauthenticated.' });

  const db = loadDB();
  const admin = db.users.find(u => u.id === adminId);
  if (!admin || !admin.isAdmin) return res.status(403).json({ error: 'Sapat na Admin privileges ay kailangan.' });

  const { userId } = req.params;
  const { tokens } = req.body;
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'Hindi mahanap ang user.' });

  user.reelsTokens = Math.max(0, Number((Number(tokens) || 0).toFixed(2)));
  saveDB(db);

  res.json({ success: true, reelsTokens: user.reelsTokens, message: `Na-update ang Reel Tokens ni ${user.name} sa ${user.reelsTokens} Tokens!` });
});


app.delete('/api/reels/:id', (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  db.reels = (db.reels || [...INITIAL_REELS]).filter(r => r.id !== id);
  saveDB(db, true);

  if (cloudDb.isActive) {
    cloudDb.deleteDoc('reels', id).catch(() => {});
  }

  res.json({ success: true, reels: db.reels });
});

app.post('/api/reels/:id/like', (req, res) => {
  const { id } = req.params;
  const userId = req.headers.authorization || req.body?.userId;
  const db = loadDB();

  if (!db.reels) {
    db.reels = [...INITIAL_REELS];
  }

  const reel = db.reels.find(r => r.id === id);
  if (!reel) {
    return res.status(404).json({ error: 'Hindi mahanap ang Reel video.' });
  }

  if (!userId) {
    return res.status(401).json({ error: 'Kailangan mong mag-login upang mag-like at kumita ng ₱0.05 per like!' });
  }

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(401).json({ error: 'Kailangan mong mag-login upang mag-like at kumita ng ₱0.05 per like!' });
  }

  if (isUserBanned(db, userId)) {
    return res.status(403).json({ error: 'Banned ka sa system.' });
  }

  reel.likedBy = reel.likedBy || [];
  if (reel.likedBy.includes(userId)) {
    return res.status(400).json({ 
      error: 'Naliked mo na ang Reel na ito! Hindi na ito pwedeng i-unlike.', 
      reels: db.reels 
    });
  }

  // Record user like (No unliking allowed!)
  reel.likedBy.push(userId);
  reel.likes = (reel.likes || 0) + 1;

  // Award ₱0.05 to registered user's balance
  user.stats.balance = Number(((user.stats.balance || 0) + 0.05).toFixed(2));
  user.stats.completedTasksCount = (user.stats.completedTasksCount || 0) + 1;
  user.activityLogs = user.activityLogs || [];
  user.activityLogs.unshift({
    id: 'act-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    type: 'reward',
    title: '₱0.05 Reel Like Reward',
    amount: 0.05,
    timestamp: new Date().toISOString(),
    details: `Nakatanggap ng ₱0.05 reward sa pag-like ng Reel video ("${reel.title || 'Reel Video'}").`
  });

  saveDB(db);
  res.json({ 
    success: true, 
    reels: db.reels, 
    reward: 0.05, 
    newBalance: user.stats.balance, 
    message: '🎉 +₱0.05 Reward sa pag-like ng Reel!' 
  });
});

app.post('/api/reels/:id/watch-reward', (req, res) => {
  const { id } = req.params;
  const userId = req.headers.authorization || req.body?.userId;
  const db = loadDB();

  if (!db.reels) {
    db.reels = [...INITIAL_REELS];
  }

  const reel = db.reels.find(r => r.id === id);
  if (!reel) {
    return res.status(404).json({ error: 'Hindi mahanap ang Reel video.' });
  }

  if (!userId) {
    return res.status(401).json({ error: 'Kailangan mong mag-login upang makakuha ng ₱0.10 Red Pocket Reward!' });
  }

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(401).json({ error: 'Kailangan mong mag-login upang makakuha ng ₱0.10 Red Pocket Reward!' });
  }

  if (isUserBanned(db, userId)) {
    return res.status(403).json({ error: 'Banned ka sa system.' });
  }

  reel.watchedBy = reel.watchedBy || [];
  if (reel.watchedBy.includes(userId)) {
    return res.status(400).json({ 
      error: 'Napanood mo na at na-claim na ang ₱0.10 Red Pocket reward sa Reel na ito!', 
      reels: db.reels 
    });
  }

  // Record user watch reward (Anti-cheat: 1 reward per reel per user)
  reel.watchedBy.push(userId);

  // Award ₱0.10 to registered user's balance
  user.stats.balance = Number(((user.stats.balance || 0) + 0.10).toFixed(2));
  user.stats.completedTasksCount = (user.stats.completedTasksCount || 0) + 1;
  user.activityLogs = user.activityLogs || [];
  user.activityLogs.unshift({
    id: 'act-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    type: 'reward',
    title: '🧧 ₱0.10 Red Pocket Reel Reward',
    amount: 0.10,
    timestamp: new Date().toISOString(),
    details: `Nakatanggap ng ₱0.10 Red Pocket reward dahil sa 100% pagtatapos ng pagpanood sa Reel video ("${reel.title || 'Reel Video'}").`
  });

  saveDB(db);
  res.json({ 
    success: true, 
    reels: db.reels, 
    reward: 0.10, 
    newBalance: user.stats.balance, 
    message: '🧧 +₱0.10 Red Pocket Reel Reward na-claim!' 
  });
});

// --- CAMPAIGNS ENDPOINTS ---
// Helper to get Philippine Standard Time (PST, UTC+8) date key shifted by 6 hours so it resets at exactly 6:00 AM PST
function getPST6AMDateKey(): string {
  const now = Date.now();
  // Philippine Standard Time is UTC+8.
  // We want to shift PST back by 6 hours so that the reset boundary is at 6:00 AM PST.
  // Shifting PST back by 6 hours means: shiftedTime = now + 8 hours - 6 hours = now + 2 hours.
  const shiftedMs = now + (2 * 60 * 60 * 1000);
  const shiftedDate = new Date(shiftedMs);
  
  const year = shiftedDate.getUTCFullYear();
  const month = String(shiftedDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shiftedDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

app.get('/api/campaigns', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const allCampaigns = db.campaigns || INITIAL_CAMPAIGNS;

  if (user.isAdmin) {
    // Admins see all campaigns to view and manage them
    return res.json({ campaigns: allCampaigns });
  }

  // Regular users see exactly 3 random (deterministic per day, per user) campaigns
  const todayStr = getPST6AMDateKey();
  
  // If the 6 AM PST transition day has changed, clear the user's completed campaign list
  let dbChanged = false;
  if (user.lastCampaignDateKey !== todayStr) {
    user.completedCampaignIds = [];
    user.lastCampaignDateKey = todayStr;
    dbChanged = true;
  }

  if (dbChanged) {
    saveDB(db);
  }

  const selectionSeedStr = `${todayStr}-${user.id}`;
  
  // Seeded Random helper function
  function mulberry32(a: number) {
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
  }

  let hash = 0;
  for (let i = 0; i < selectionSeedStr.length; i++) {
    hash = (hash << 5) - hash + selectionSeedStr.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  const rand = mulberry32(Math.abs(hash));
  // Filter out campaigns that reached their maximum clicks limit
  const pool = allCampaigns.filter((c: any) => {
    if (c.maxClicks !== undefined && c.clicks !== undefined) {
      return c.clicks < c.maxClicks;
    }
    return true;
  });
  const selected: any[] = [];
  const count = Math.min(3, pool.length);

  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rand() * pool.length);
    selected.push(pool[idx]);
    pool.splice(idx, 1);
  }

  // Mark completion status matching the user's completedCampaignIds array
  const completedIds = user.completedCampaignIds || [];
  const campaignsWithStatus = selected.map(c => ({
    ...c,
    completed: completedIds.includes(c.id)
  }));

  res.json({ campaigns: campaignsWithStatus });
});

app.get('/api/admin/campaigns', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'Sapat na Admin privileges ay kailangan.' });
  }

  if (!db.campaigns) {
    db.campaigns = INITIAL_CAMPAIGNS;
  }

  res.json({ campaigns: db.campaigns });
});

app.post('/api/admin/campaigns', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'Sapat na Admin privileges ay kailangan.' });
  }

  const { campaign } = req.body;
  if (!campaign || !campaign.id || !campaign.title || !campaign.url) {
    return res.status(400).json({ error: 'Invalid campaign body submission.' });
  }

  if (!db.campaigns) {
    db.campaigns = INITIAL_CAMPAIGNS;
  }

  // Add the new custom campaign at the start
  db.campaigns.unshift(campaign);
  saveDB(db);

  res.json({ success: true, campaigns: db.campaigns });
});

app.delete('/api/admin/campaigns/:id', async (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'Sapat na Admin privileges ay kailangan.' });
  }

  const campaignId = req.params.id;
  if (!db.campaigns) {
    db.campaigns = INITIAL_CAMPAIGNS;
  }

  const initialLength = db.campaigns.length;
  db.campaigns = db.campaigns.filter(c => c.id !== campaignId);

  if (db.campaigns.length === initialLength) {
    return res.status(404).json({ error: 'Hindi mahanap ang campaign.' });
  }

  saveDB(db);

  // If cloudDb is active, also delete the document from Firestore campaigns collection
  if (cloudDb.isActive) {
    cloudDb.deleteDoc('campaigns', campaignId).catch((err) => {
      console.error(`❌ Failed to delete campaign ${campaignId} from Cloud DB:`, err);
    });
  }

  res.json({ success: true, campaigns: db.campaigns });
});

// 1. GET /api/merchant/ads -> list all ads of the current user
app.get('/api/merchant/ads', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Sapat na login ay kailangan.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  const ads = (db.merchantAds || []).filter(ad => ad.userId === userId);
  res.json({ ads });
});

// 2. POST /api/merchant/ads -> create a new merchant ad request
app.post('/api/merchant/ads', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Sapat na login ay kailangan.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  const {
    title,
    url,
    description,
    logo,
    category,
    primaryColor,
    accentColor,
    planId,
    gcashSenderNumber,
    gcashReferenceNo
  } = req.body;

  if (!title || !url || !description || !planId || !gcashSenderNumber || !gcashReferenceNo) {
    return res.status(400).json({ error: 'Pakikumpleto ang lahat ng kinakailangang impormasyon.' });
  }

  // Determine plan specs
  let planName = 'Bronze';
  let price = 299;
  let durationDays = 7;
  if (planId === 'silver') {
    planName = 'Silver';
    price = 999;
    durationDays = 30;
  } else if (planId === 'gold') {
    planName = 'Gold';
    price = 2499;
    durationDays = 90;
  } else if (planId === 'platinum') {
    planName = 'Platinum';
    price = 7999;
    durationDays = 365;
  }

  const newAd: MerchantAd = {
    id: 'ad-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar,
    title,
    url,
    description,
    logo: logo || 'ShoppingBag',
    category: category || 'Shopping',
    primaryColor: primaryColor || '#2563EB',
    accentColor: accentColor || '#10B981',
    planId,
    planName,
    price,
    durationDays,
    gcashSenderNumber,
    gcashReferenceNo,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  db.merchantAds = db.merchantAds || [];
  db.merchantAds.push(newAd);
  saveDB(db);

  res.json({ success: true, ad: newAd });
});

// 3. GET /api/admin/merchant/ads -> admin lists all merchant ads
app.get('/api/admin/merchant/ads', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'Sapat na Admin privileges ay kailangan.' });
  }

  res.json({ ads: db.merchantAds || [] });
});

function getCuratedImagesForCategory(category: string): string[] {
  const lower = (category || '').toLowerCase();
  if (lower.includes('shop') || lower.includes('bili') || lower.includes('retail') || lower.includes('shopping')) {
    return [
      'https://images.unsplash.com/photo-1472851294608-062f824d296e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80'
    ];
  }
  if (lower.includes('balita') || lower.includes('news') || lower.includes('ulat')) {
    return [
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1495020689067-958852a6565d?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1588681664899-f142ff2bac99?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1511649475100-a101ee9d1362?w=800&auto=format&fit=crop&q=80'
    ];
  }
  if (lower.includes('tech') || lower.includes('computer') || lower.includes('software') || lower.includes('teknolohiya')) {
    return [
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80'
    ];
  }
  if (lower.includes('kultura') || lower.includes('sining') || lower.includes('art') || lower.includes('travel') || lower.includes('culture')) {
    return [
      'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1531243269054-5ebf6f3b0b6e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&auto=format&fit=crop&q=80'
    ];
  }
  // Default / E-Services
  return [
    'https://images.unsplash.com/photo-1521791136364-7286d35243dd?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1553878827-4760f31f712e?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800&auto=format&fit=crop&q=80'
  ];
}

function getFallbackAICommercial(ad: any): any {
  const images = getCuratedImagesForCategory(ad.category);
  return {
    title: `Sikat na ${ad.title} Patalastas`,
    musicMood: "Upbeat & Inspiring Corporate Beat",
    ctaText: "Bisitahin kami ngayon sa Z-oneApp!",
    scenes: [
      {
        id: "scene-1",
        text: `Naghahanap ka ba ng maaasahang serbisyo? Ipakikilala namin ang ${ad.title}!`,
        visualDescription: `Isang malinis at modernong pasimula na nagpapakita ng pangalan ng ${ad.title}.`,
        imageUrl: images[0]
      },
      {
        id: "scene-2",
        text: `${ad.description}`,
        visualDescription: `Isang eksena na nagpapakita ng mga benepisyo at mga tampok ng serbisyong ito.`,
        imageUrl: images[1]
      },
      {
        id: "scene-3",
        text: "Mabilis, maaasahan, at ginawa para sa bawat Pilipino saanman sa bansa.",
        visualDescription: `Masasayang tao na gumagamit ng kanilang mga mobile phone nang may ngiti.`,
        imageUrl: images[2]
      },
      {
        id: "scene-4",
        text: `Subukan ang ${ad.title} ngayon! Bisitahin ang aming link upang makakuha ng reward!`,
        visualDescription: `Isang kaakit-akit na pagtatapos na may logo ng ${ad.title} at button na bumisita.`,
        imageUrl: images[3]
      }
    ]
  };
}

async function generateAICommercial(ad: any): Promise<any> {
  const fallback = getFallbackAICommercial(ad);
  const ai = getGeminiClient();
  if (!ai) {
    console.log("No Gemini API key available. Using high-quality fallback commercial.");
    return fallback;
  }

  try {
    const prompt = `Gawa ka ng isang kapana-panabik at kaakit-akit na AI Commercial para sa sumusunod na negosyo sa Pilipinas.
Pangalan ng Negosyo: ${ad.title}
Kategorya: ${ad.category}
Deskripsyon: ${ad.description}

Gumawa ng eksaktong 4 na magkakasunod na scenes (Scene 1 hanggang 4) para sa patalastas na ito.
Ang bawat scene ay dapat magkaroon ng:
1. text: Isang kapana-panabik at kaakit-akit na maikling voiceover (na isusulat sa natural na Tagalog o nakaka-engganyong Taglish). Dapat ay 1 hanggang 2 maiikling pangungusap lamang na madaling basahin sa loob ng 5 segundo.
2. visualDescription: Isang detalyadong visual description para sa scene (hal. "Isang malapit na kuha ng masayang tindera na may ngiti sa labi habang iniaabot ang produkto").

Ibalik ang tugon sa format ng JSON na may eksaktong ganitong structure:
{
  "title": "Pamagat ng Commercial",
  "musicMood": "Uri ng background music (hal. Upbeat & Happy Pop, Cool Tech Synth, Warm acoustic guitar)",
  "ctaText": "Call to action text (hal. Bisitahin kami sa Z-oneApp ngayon!)",
  "scenes": [
    {
      "id": "scene-1",
      "text": "Voiceover script ng Scene 1...",
      "visualDescription": "Visual description ng Scene 1..."
    },
    {
      "id": "scene-2",
      "text": "Voiceover script ng Scene 2...",
      "visualDescription": "Visual description ng Scene 2..."
    },
    {
      "id": "scene-3",
      "text": "Voiceover script ng Scene 3...",
      "visualDescription": "Visual description ng Scene 3..."
    },
    {
      "id": "scene-4",
      "text": "Voiceover script ng Scene 4...",
      "visualDescription": "Visual description ng Scene 4..."
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            musicMood: { type: "STRING" },
            ctaText: { type: "STRING" },
            scenes: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  id: { type: "STRING" },
                  text: { type: "STRING" },
                  visualDescription: { type: "STRING" }
                },
                required: ["id", "text", "visualDescription"]
              }
            }
          },
          required: ["title", "musicMood", "ctaText", "scenes"]
        }
      }
    });

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(text.trim());
      if (parsed && Array.isArray(parsed.scenes) && parsed.scenes.length === 4) {
        const images = getCuratedImagesForCategory(ad.category);
        const scenesWithImages = parsed.scenes.map((scene: any, index: number) => ({
          ...scene,
          id: scene.id || `scene-${index + 1}`,
          imageUrl: images[index] || images[0]
        }));
        return {
          title: parsed.title || fallback.title,
          musicMood: parsed.musicMood || fallback.musicMood,
          ctaText: parsed.ctaText || fallback.ctaText,
          scenes: scenesWithImages,
          duration: 20
        };
      }
    }
  } catch (error) {
    console.error("Failed to generate AI Commercial via Gemini:", error);
  }

  return fallback;
}

// 4. POST /api/admin/merchant/ads/:id/action -> approve or decline
app.post('/api/admin/merchant/ads/:id/action', async (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'Sapat na Admin privileges ay kailangan.' });
  }

  const { action } = req.body; // 'approve' | 'decline'
  if (!action || (action !== 'approve' && action !== 'decline')) {
    return res.status(400).json({ error: 'Invalid action.' });
  }

  db.merchantAds = db.merchantAds || [];
  const ad = db.merchantAds.find(a => a.id === req.params.id);
  if (!ad) {
    return res.status(404).json({ error: 'Hindi mahanap ang merchant ad request.' });
  }

  if (ad.status !== 'pending') {
    return res.status(400).json({ error: 'Ang promotion request na ito ay naproseso na.' });
  }

  if (action === 'decline') {
    ad.status = 'declined';
    saveDB(db);
    return res.json({ success: true, ad });
  }

  // Calculate expiration dates
  const now = new Date();
  const expiry = new Date();
  expiry.setDate(now.getDate() + ad.durationDays);

  ad.status = 'active';
  ad.approvedAt = now.toISOString();
  ad.expiresAt = expiry.toISOString();

  // Generate AI Commercial (100% related to the business promotion!)
  const aiCommercial = await generateAICommercial(ad);
  ad.aiCommercial = aiCommercial;

  // Determine rewards amount based on plan
  let rewardAmount = 1.50;
  let maxClicks = 150;
  if (ad.planId === 'silver') {
    rewardAmount = 2.50;
    maxClicks = 300;
  } else if (ad.planId === 'gold') {
    rewardAmount = 3.50;
    maxClicks = 550;
  } else if (ad.planId === 'platinum') {
    rewardAmount = 5.00;
    maxClicks = 1200;
  }

  // Generate a mock WebsiteCampaign
  const newCampaign = {
    id: 'campaign-merchant-' + ad.id,
    title: ad.title,
    url: ad.url,
    reward: rewardAmount,
    timer: 10,
    logo: ad.logo || 'ShoppingBag',
    category: ad.category || 'Shopping',
    description: ad.description,
    completed: false,
    clicks: 0,
    maxClicks: maxClicks,
    aiCommercial: aiCommercial,
    mockPageContent: {
      heroTitle: `⭐ ${ad.title}`,
      heroSubtitle: `Sponsored Promotion - Bisitahin ang website upang makakuha ng Reward!`,
      primaryColor: ad.primaryColor || '#2563EB',
      accentColor: ad.accentColor || '#10B981',
      paragraphs: [
        ad.description,
        `Salamat sa pagsuporta sa aming lokal na negosyo! Ang pagbisita sa aming page ay nagbibigay-daan sa amin na lumago. Ikinagalak naming makita ka!`
      ],
      features: [
        `🔗 Opisyal na Website: Bisitahin ang link para sa karagdagang impormasyon`,
        `💵 Gantimpala: ₱${rewardAmount.toFixed(2)} pagkatapos basahin ng 10 segundo`,
        `🏷️ Alok: Magtanong o makipag-ugnay sa merchant para sa discounts`,
        `🛡️ Ligtas at beripikadong negosyo sa Z-one`
      ]
    }
  };

  db.campaigns = db.campaigns || [];
  db.campaigns.unshift(newCampaign);

  // Generate a sponsored Social Post inside the community feed!
  const sponsorPost = {
    id: 'post-ad-' + ad.id,
    userId: 'merchant-' + ad.id,
    userName: ad.title + ' 📢 [Sponsor]',
    userAvatar: '🏢',
    text: `${ad.description}\n\n👉 Bisitahin kami sa aming pahina sa: ${ad.url}\n\n✨ (Maaari mo ring mahanap ang aming promotion sa 'Mag-ipon' tab para makakuha ng ₱${rewardAmount.toFixed(2)} reward!)`,
    mediaUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60',
    likes: [],
    comments: [],
    createdAt: new Date().toISOString()
  };

  db.posts = db.posts || [];
  db.posts.unshift(sponsorPost);

  saveDB(db);

  // Sync campaign and post to Cloud DB if active
  if (cloudDb.isActive) {
    cloudDb.setDoc('campaigns', newCampaign.id, newCampaign).catch((e: any) => console.error(e));
    cloudDb.setDoc('posts', sponsorPost.id, sponsorPost).catch((e: any) => console.error(e));
    console.log(`🔥 Synced new merchant campaign and sponsor post to Cloud DB.`);
  }

  res.json({ success: true, ad });
});

// COMPLETED TASK REWARD SYNC
app.post('/api/user/task-complete', checkIdempotency, (req, res) => {
  const userId = req.headers.authorization;
  const { campaignId, rewardAmount, title, details } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated Request.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang gumagamit.' });
  }

  const allCampaigns = db.campaigns || INITIAL_CAMPAIGNS;
  const matchCamp = allCampaigns.find((c: any) => c.id === campaignId);
  const actualReward = matchCamp ? matchCamp.reward : Number(rewardAmount);

  if (!hasActiveAccess(user)) {
    if (actualReward >= 0.05 && actualReward <= 1.99) {
      // Allowed for expired users
    } else {
      return res.status(403).json({ error: 'Expired na ang iyong trial o subscription. Ang maaari mo lamang buksan at makumpleto ay mga website campaign na may reward na ₱0.05 up to ₱1.99 lamang.' });
    }
  }

  const reward = Number(rewardAmount);
  user.stats.balance = Number((user.stats.balance + reward).toFixed(2));
  user.stats.lifetimeEarnings = Number((user.stats.lifetimeEarnings + reward).toFixed(2));
  user.stats.completedTasksCount += 1;

  if (campaignId) {
    if (!user.completedCampaignIds) {
      user.completedCampaignIds = [];
    }
    if (!user.completedCampaignIds.includes(campaignId)) {
      user.completedCampaignIds.push(campaignId);
    }

    // Increment click counts for merchant campaigns to guarantee admin margins
    if (campaignId.startsWith('campaign-merchant-')) {
      const merchantCamp = (db.campaigns || []).find((c: any) => c.id === campaignId);
      if (merchantCamp) {
        merchantCamp.clicks = (merchantCamp.clicks || 0) + 1;
        
        // Sync with Cloud DB if active
        if (cloudDb.isActive) {
          cloudDb.updateDoc('campaigns', campaignId, { clicks: merchantCamp.clicks }).catch((e: any) => console.error(e));
        }
      }
    }
  }

  // Record logs
  user.activityLogs.unshift({
    id: 'log-' + Date.now(),
    type: 'reward',
    title: title || 'Nood Campaign Reward',
    amount: reward,
    timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
    details: details || `Nakumpleto mo ang panonood ng website at may gantimpala kang ₱${reward.toFixed(2)}.`
  });

  // If this user has a referrer, we also sync their current earnings inside referrer's friend entry!
  if (user.invitedBy) {
    const referrer = db.users.find(u => u.referralCode === user.invitedBy);
    if (referrer) {
      const friendEntryIdx = referrer.referredFriends.findIndex(f => f.id === user.id);
      if (friendEntryIdx !== -1) {
        const oldEarnings = referrer.referredFriends[friendEntryIdx].currentEarnings;
        referrer.referredFriends[friendEntryIdx].currentEarnings = user.stats.lifetimeEarnings;

        // If friend just reached 100 lifetime earnings, notify referrer
        if (oldEarnings < 100 && user.stats.lifetimeEarnings >= 100) {
          referrer.activityLogs.unshift({
            id: 'log-ref-alert-' + Date.now(),
            type: 'bonus',
            title: `⭐ Target Naabot ni ${user.name}!`,
            amount: 5.00,
            timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
            details: `Umabot na sa ₱100.00 ang naiipong kita ng na-invite mong si ${user.name}! Pwede mo nang pitasin ang iyong ₱5.00 Bonus sa Referee Section!`
          });
        }
      }
    }
  }

  saveDB(db);
  const { password: _, ...userSafe } = user as any;
  res.json({ user: userSafe });
});

// CLAIM REFERRAL BONUS
app.post('/api/user/claim-referral-bonus', (req, res) => {
  const userId = req.headers.authorization;
  const { friendId } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  if (!hasActiveAccess(user)) {
    return res.status(403).json({ error: 'Expired na ang iyong trial o subscription. Mangyaring kumuha ng access plan upang magpatuloy.' });
  }

  const friend = user.referredFriends.find(f => f.id === friendId);
  if (!friend) {
    return res.status(404).json({ error: 'Hindi nakita si friend sa mga invited mo.' });
  }

  // Check if they actual reach 100 (sync actual user info)
  const actualFriend = db.users.find(u => u.id === friendId);
  const realFriendEarnings = actualFriend ? actualFriend.stats.lifetimeEarnings : friend.currentEarnings;

  if (realFriendEarnings < 100) {
    return res.status(400).json({ error: `Humihingi ng paumanhin: Kailangan muna maabot ni ${friend.name} ang ₱100.00 lifetime earnings. (Kasalukuyan: ₱${realFriendEarnings.toFixed(2)})` });
  }

  if (friend.bonusClaimed) {
    return res.status(400).json({ error: 'Siningil mo na ang reward para kay kaibigan.' });
  }

  // Upgrade status
  friend.bonusClaimed = true;
  friend.currentEarnings = realFriendEarnings;

  // Add reward to referrer
  user.stats.balance = Number((user.stats.balance + 5.00).toFixed(2));
  user.stats.lifetimeEarnings = Number((user.stats.lifetimeEarnings + 5.00).toFixed(2));

  user.activityLogs.unshift({
    id: 'log-ref-claimed-' + Date.now(),
    type: 'bonus',
    title: `Na-claim ang Referral Bonus (${friend.name})`,
    amount: 5.00,
    timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
    details: `Salamat sa pag-akay kay ${friend.name}! Matagumpay nating naitala ang iyong ₱5.00 bonus.`
  });

  saveDB(db);
  const { password: _, ...userSafe } = user as any;
  res.json({ user: userSafe });
});

// GET RECENT REAL PAYOUTS FOR MARQUEE
app.get('/api/payouts/recent', (req, res) => {
  try {
    const db = loadDB();
    const allWithdrawals: any[] = [];
    
    if (Array.isArray(db.users)) {
      db.users.forEach(u => {
        if (Array.isArray(u.withdrawals)) {
          u.withdrawals.forEach(w => {
            const displayName = (w.accountName || u.name || '').trim();
            if (displayName && !displayName.toLowerCase().includes('unknown') && !/^\d+$/.test(displayName)) {
              allWithdrawals.push({
                id: w.id,
                userName: displayName,
                amount: w.amount,
                status: w.status,
                createdAt: w.createdAt,
                referenceNo: w.referenceNo,
                isReal: true
              });
            }
          });
        }
      });
    }

    res.json({ payouts: allWithdrawals });
  } catch (err) {
    res.status(500).json({ payouts: [] });
  }
});

// SUBMIT WITHDRAWAL REQUEST
app.post('/api/user/withdraw', checkIdempotency, (req, res) => {
  const userId = req.headers.authorization;
  const { accountName, gcashNumber, amount } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Naka-Logout. Lumagda muna upang mag-withdraw.' });
  }

  const requestedAmount = Number(amount);
  if (isNaN(requestedAmount) || requestedAmount < 100) {
    return res.status(400).json({ error: 'Ang minimum na withdrawal ay ₱100.00.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi maiproseso: User not found.' });
  }

  if (!hasActiveAccess(user)) {
    return res.status(403).json({ error: 'Expired na ang iyong trial o subscription. Mangyaring kumuha ng access plan upang magpatuloy.' });
  }

  if (user.stats.balance < requestedAmount) {
    return res.status(400).json({ error: 'Kulang ang iyong kasalukuyang balanse sa hinihiling na withdrawal.' });
  }

  // Deduct from balance
  user.stats.balance = Number((user.stats.balance - requestedAmount).toFixed(2));

  // Create request
  const newWithdrawal = {
    id: 'with-' + Date.now(),
    accountName: accountName.trim(),
    gcashNumber: gcashNumber.trim(),
    amount: requestedAmount,
    status: 'pending' as const,
    createdAt: new Date().toLocaleString('fil-PH', { hour12: true }),
    referenceNo: 'REF' + Math.floor(1000000000 + Math.random() * 9000000000)
  };

  user.withdrawals.unshift(newWithdrawal);

  // Log activity
  user.activityLogs.unshift({
    id: 'log-withdraw-' + Date.now(),
    type: 'withdraw',
    title: 'Nagsumite ng GCash Cashout',
    amount: requestedAmount,
    timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
    details: `Humiling ka ng ₱${requestedAmount.toFixed(2)} cashout papunta sa GCash Number: ${gcashNumber}. Naghihintay ito ng pagsusuri ng Admin.`
  });

  saveDB(db);
  const { password: _, ...userSafe } = user as any;
  res.json({ user: userSafe });
});

// DAILY CHECKIN SYNC
app.post('/api/user/daily-checkin', checkIdempotency, (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) return res.status(401).json({ error: 'Access Denied.' });

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  // Allowed for both active and expired users to participate in daily earning features (1.00 check-in reward is in the allowed 0.05-1.99 range)

  const todayStr = new Date().toLocaleDateString('fil-PH');
  if (user.stats.dailyCheckInDate === todayStr) {
    return res.status(400).json({ error: 'Nakuha mo na ang iyong arawang gantimpala para sa araw na ito.' });
  }

  const checkinReward = 1.00;
  user.stats.balance = Number((user.stats.balance + checkinReward).toFixed(2));
  user.stats.lifetimeEarnings = Number((user.stats.lifetimeEarnings + checkinReward).toFixed(2));
  user.stats.dailyCheckInDate = todayStr;

  user.activityLogs.unshift({
    id: 'log-checkin-' + Date.now(),
    type: 'bonus',
    title: 'Daily Check-In Reward Nakuha',
    amount: checkinReward,
    timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
    details: `Pumasok ka ngayong araw at ginawaran ka ng libreng ₱${checkinReward.toFixed(2)}.`
  });

  saveDB(db);
  const { password: _, ...userSafe } = user as any;
  res.json({ user: userSafe });
});

// --- EXPIRED USERS SPIN WHEEL ENDPOINTS ---
app.get('/api/user/spin-status', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) return res.status(401).json({ error: 'Access Denied.' });

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const now = Date.now();
  const pstTime = new Date(now + (8 * 60 * 60 * 1000));
  const pstHour = pstTime.getUTCHours();
  const inWindow = pstHour >= 6 && pstHour < 18;

  const year = pstTime.getUTCFullYear();
  const month = String(pstTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(pstTime.getUTCDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  // Helper to check if they are generally an expired user (excluding active spin wheel 3h access)
  const regDate = user.createdAt ? new Date(user.createdAt) : new Date();
  const passedMs = now - regDate.getTime();
  const trialExpired = passedMs >= 24 * 60 * 60 * 1000;
  const noActiveSub = !user.subscription || user.subscription.status !== 'active' || (user.subscription.expiresAt && new Date(user.subscription.expiresAt).getTime() <= now);
  const isExpiredUser = !user.isAdmin && trialExpired && noActiveSub;

  const hasSpunToday = user.lastSpinDateKey === todayStr;
  const globalWinnerExists = db.users.some(u => u.wonFreeAccessDateKey === todayStr);

  res.json({
    isExpiredUser,
    inWindow,
    pstHour,
    hasSpunToday,
    globalWinnerExists,
    freeAccessExpiresAt: user.freeAccessExpiresAt || null,
    freeAccessActive: user.freeAccessExpiresAt ? new Date(user.freeAccessExpiresAt).getTime() > now : false,
    todayStr
  });
});

app.post('/api/user/spin-wheel', checkIdempotency, (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) return res.status(401).json({ error: 'Access Denied.' });

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const now = Date.now();
  const pstTime = new Date(now + (8 * 60 * 60 * 1000));
  const pstHour = pstTime.getUTCHours();
  const inWindow = pstHour >= 6 && pstHour < 18;

  if (!inWindow) {
    return res.status(400).json({ error: 'Ang spin wheel ay bukas lamang mula 6:00 AM hanggang 6:00 PM PST.' });
  }

  const year = pstTime.getUTCFullYear();
  const month = String(pstTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(pstTime.getUTCDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  // Check generally expired (ignoring active 3h free access for checking spin eligibility)
  const regDate = user.createdAt ? new Date(user.createdAt) : new Date();
  const passedMs = now - regDate.getTime();
  const trialExpired = passedMs >= 24 * 60 * 60 * 1000;
  const noActiveSub = !user.subscription || user.subscription.status !== 'active' || (user.subscription.expiresAt && new Date(user.subscription.expiresAt).getTime() <= now);
  const isExpiredUser = !user.isAdmin && trialExpired && noActiveSub;

  if (!isExpiredUser) {
    return res.status(400).json({ error: 'Ang spin wheel ay para lamang sa mga expired users.' });
  }

  if (user.lastSpinDateKey === todayStr) {
    return res.status(400).json({ error: 'Naka-spin ka na para sa araw na ito. Subukan muli bukas!' });
  }

  // Check if anyone globally won today
  const hasWinnerToday = db.users.some(u => u.wonFreeAccessDateKey === todayStr);

  let won = false;
  if (!hasWinnerToday) {
    // 10% chance to win if no winner exists yet today
    won = Math.random() < 0.10;
  }

  user.lastSpinDateKey = todayStr;

  if (won) {
    const expiresAt = new Date(now + 3 * 60 * 60 * 1000); // exactly 3 hours access
    user.freeAccessExpiresAt = expiresAt.toISOString();
    user.wonFreeAccessDateKey = todayStr;

    user.activityLogs.unshift({
      id: 'log-spin-' + now,
      type: 'bonus',
      title: '🎰 Nanalo sa Spin Wheel!',
      amount: 0,
      timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
      details: 'Binabati kita! Nanalo ka ng libreng 3-Hour access sa Z-oneApp. Gamitin agad ito para mag-view ng campaigns!'
    });

    saveDB(db);
    const { password: _, ...userSafe } = user as any;
    return res.json({
      won: true,
      message: '🎉 Maligayang Pagbati! Nanalo ka ng libreng 3-Hour Access sa Z-oneApp! Mag-view na agad ng homepages para kumita!',
      freeAccessExpiresAt: user.freeAccessExpiresAt,
      user: userSafe
    });
  } else {
    // If lost, return message
    saveDB(db);
    const { password: _, ...userSafe } = user as any;
    return res.json({
      won: false,
      message: '😔 Salamat sa pag-spin! Please come back tomorrow 6am to 6pm.',
      user: userSafe
    });
  }
});


// ============================================
//               ADMIN FUNCTIONS
// ============================================

// GET ALL USERS AND STATS (For Admin dashboard)
app.get('/api/admin/dashboard', (req, res) => {
  const adminId = req.headers.authorization;
  if (!adminId) {
    return res.status(401).json({ error: 'Naka-loob lamang ito sa Admin.' });
  }

  const db = loadDB();
  const adminUser = db.users.find(u => u.id === adminId && u.isAdmin);
  if (!adminUser) {
    return res.status(403).json({ error: 'Wala kang pahintulot na tingnan ang page na ito.' });
  }

  // Construct a summary list for tracking across devices
  const allUsersStats = db.users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    avatar: u.avatar,
    isAdmin: u.isAdmin,
    stats: u.stats,
    withdrawalsCount: u.withdrawals.length,
    withdrawals: u.withdrawals,
    referralCode: u.referralCode,
    referredFriendsCount: u.referredFriends.length,
    lastActivities: u.activityLogs.slice(0, 10), // last 10 activities
    createdAt: u.createdAt || null,
    subscription: u.subscription || null
  }));

  // Gather all withdrawal requests across everyone to manage in one central hub
  const pendingAndAllWithdrawals: {
    userId: string;
    userName: string;
    userAvatar: string;
    request: any;
  }[] = [];

  db.users.forEach(u => {
    u.withdrawals.forEach(w => {
      pendingAndAllWithdrawals.push({
        userId: u.id,
        userName: u.name,
        userAvatar: u.avatar,
        request: w
      });
    });
  });

  // Sort withdrawals by ID or timestamp (newest first)
  pendingAndAllWithdrawals.sort((a, b) => b.request.createdAt.localeCompare(a.request.createdAt));

  res.json({
    users: allUsersStats,
    withdrawals: pendingAndAllWithdrawals,
    reelSubscriptions: db.reelSubscriptions || []
  });
});

// ACTION APPROVE/DECLINE WITHDRAWAL
app.post('/api/admin/withdrawals/:withdrawId/action', (req, res) => {
  const adminId = req.headers.authorization;
  const { withdrawId } = req.params;
  const { action } = req.body; // 'approve' or 'decline'

  if (!adminId) {
    return res.status(401).json({ error: 'Admin signature required.' });
  }

  const db = loadDB();
  const adminUser = db.users.find(u => u.id === adminId && u.isAdmin);
  if (!adminUser) {
    return res.status(403).json({ error: 'Pahintulot ay nakareserba lamang sa Admin.' });
  }

  // Find user and withdrawal request 
  let targetUser: UserSession | undefined;
  let targetWithdrawalIndex = -1;

  for (const user of db.users) {
    const idx = user.withdrawals.findIndex(w => w.id === withdrawId);
    if (idx !== -1) {
      targetUser = user;
      targetWithdrawalIndex = idx;
      break;
    }
  }

  if (!targetUser || targetWithdrawalIndex === -1) {
    return res.status(404).json({ error: 'Hindi nahanap ang partikular na withdrawal request.' });
  }

  const reqObj = targetUser.withdrawals[targetWithdrawalIndex];
  if (reqObj.status !== 'pending' && reqObj.status !== 'processing') {
    return res.status(400).json({ error: `Ang kahilingang ito ay tapos na (Kasalukuyang Status: ${reqObj.status}).` });
  }

  if (action === 'approve') {
    reqObj.status = 'success';
    
    // Add success logger
    targetUser.activityLogs.unshift({
      id: 'admin-action-' + Date.now(),
      type: 'withdraw',
      title: 'GCash Cashout Approved!',
      amount: reqObj.amount,
      timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
      details: `Inaprubahan ng Admin ang iyong cashout na nagkakahalaga ng ₱${reqObj.amount.toFixed(2)}. Matagumpay itong naipadala sa GCash number mo!`
    });

    sendPushNotificationToUser(targetUser.id, {
      title: '🎉 GCash Cashout Approved!',
      body: `Matagumpay na naipadala ang ₱${reqObj.amount.toFixed(2)} sa iyong GCash (${reqObj.gcashNumber})!`,
      url: '/?tab=profile',
      tag: 'payout-success'
    });
  } else if (action === 'decline') {
    reqObj.status = 'failed';
    
    // Refund user balance
    targetUser.stats.balance = Number((targetUser.stats.balance + reqObj.amount).toFixed(2));

    // Add decline logger
    targetUser.activityLogs.unshift({
      id: 'admin-action-' + Date.now(),
      type: 'withdraw',
      title: 'GCash Cashout Tinanggihan (Refunded)',
      amount: reqObj.amount,
      timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
      details: `Tinanggihan ng Admin ang iyong withdrawal request para sa ₱${reqObj.amount.toFixed(2)}. Binalik ang pera sa iyong balance.`
    });

    sendPushNotificationToUser(targetUser.id, {
      title: '⚠️ GCash Withdrawal Update',
      body: `Tinanggihan ng Admin ang iyong cashout na ₱${reqObj.amount.toFixed(2)}. Na-refund na ito sa iyong balance.`,
      url: '/?tab=profile',
      tag: 'payout-declined'
    });
  } else {
    return res.status(400).json({ error: 'Maling desisyon. Approve o Decline lang ang pwedeng gawin.' });
  }

  saveDB(db);
  res.json({ success: true, message: `Desisyon ay naitala nang matagumpay.` });
});

// SIMULATE MOCK FRIEND EVENT FROM SERVER
app.post('/api/admin/simulate-mock-friend', (req, res) => {
  const { referrerId } = req.body;
  const db = loadDB();

  const referrer = db.users.find(u => u.id === referrerId);
  if (!referrer) return res.status(404).json({ error: 'Referrer not found' });

  const randomSub = Math.floor(100 + Math.random() * 900);
  const friendName = 'Piloto Dela Cruz #' + randomSub;

  const codeChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randCode = 'REF-';
  for (let i = 0; i < 6; i++) randCode += codeChars.charAt(Math.floor(Math.random() * codeChars.length));

  // Register friend as actual user in backend!
  const mockFriend: UserSession = {
    id: 'mock-user-' + randomSub,
    email: `piloto${randomSub}@simulator.com`,
    password: 'Password123',
    name: friendName,
    avatar: '🧑‍🚀',
    referralCode: randCode,
    invitedBy: referrer.referralCode,
    isAdmin: false,
    stats: {
      balance: 100,
      lifetimeEarnings: 100,
      completedTasksCount: 4,
      dailyCheckInDate: null
    },
    withdrawals: [],
    activityLogs: [
      {
        id: 'mock-log-1',
        type: 'bonus',
        title: 'Joined platform',
        amount: 25.00,
        timestamp: new Date().toLocaleString(),
        details: 'Signed up under referral code ' + referrer.referralCode
      }
    ],
    referredFriends: []
  };

  db.users.push(mockFriend);

  // Link in referrer's profile list
  referrer.referredFriends.push({
    id: mockFriend.id,
    name: friendName,
    avatar: '🧑‍🚀',
    currentEarnings: 100,
    bonusClaimed: false,
    joinedAt: new Date().toLocaleDateString('fil-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  });

  referrer.activityLogs.unshift({
    id: 'mock-notif-' + Date.now(),
    type: 'bonus',
    title: `Sumali gamit ang link mo si ${friendName}`,
    amount: 0,
    timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
    details: `Salamat sa pagtawag kay ${friendName}! Pumasok siya sa server. Makukuha mo ang ₱5.00 kapag naabot niya ang ₱100 na kabuuang kita.`
  });

  saveDB(db);
  res.json({ success: true, user: referrer });
});

// SIMULATE ANOTHER COMPLETED REWARD FROM THE FRIEND TO DEMONSTRATE MILESTONE REACHED IN THE REFERRER PANEL
app.post('/api/admin/simulate-friend-earnings', (req, res) => {
  const { friendId } = req.body;
  const db = loadDB();

  // Find friend user
  const friend = db.users.find(u => u.id === friendId);
  if (!friend) return res.status(404).json({ error: 'Kaibigan ay hindi nahanap.' });

  // Add earnings to push them over the edges
  friend.stats.lifetimeEarnings = Math.min(100, friend.stats.lifetimeEarnings + 150);
  friend.stats.balance += 150;

  // Sync back to their referrer referredFriends entry
  if (friend.invitedBy) {
    const referrer = db.users.find(u => u.referralCode === friend.invitedBy);
    if (referrer) {
      const entry = referrer.referredFriends.find(f => f.id === friendId);
      if (entry) {
        entry.currentEarnings = friend.stats.lifetimeEarnings;
        
        if (friend.stats.lifetimeEarnings >= 500 && !entry.bonusClaimed) {
          referrer.activityLogs.unshift({
            id: 'mock-earn-reach-' + Date.now(),
            type: 'bonus',
            title: `⭐ Milestone Naabot ni ${friend.name}!`,
            amount: 5.00,
            timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
            details: `Mayroon nang higit sa ₱100.00 na kita si ${friend.name}! Iyong i-claim ang iyong ₱5.00 Referral reward ngayon.`
          });
        }
      }
    }
  }

  saveDB(db);
  res.json({ success: true });
});


// ============================================
//         SUBSCRIPTION ENDPOINTS
// ============================================

// REQUEST A PLAN
app.post('/api/subscription/request', (req, res) => {
  const userId = req.headers.authorization;
  const { planId } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Mag-login muna.' });
  }

  const allowedPlans: Record<string, { name: string; amount: number }> = {
    '7days': { name: '7 Days Access', amount: 20 },
    '1month': { name: '1 Month Access', amount: 200 },
    '2months': { name: '2 Months Access', amount: 500 },
    '3months': { name: '3 Months Access', amount: 1000 },
    '4months': { name: '4 Months Access', amount: 2000 }
  };

  if (!planId || !allowedPlans[planId]) {
    return res.status(400).json({ error: 'Maling subscription plan na pinili.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang gumagamit.' });
  }

  if (planId === '7days') {
    const isExpired = !hasActiveAccess(user);
    if (!isExpired) {
      return res.status(400).json({ error: 'Ang 7-Day Access na nagkakahalaga ng ₱20 ay para lamang sa mga expired users.' });
    }
    const balance = user.stats.balance || 0;
    if (balance >= 50) {
      return res.status(400).json({ error: 'Hindi ka kwalipikado sa ₱20 plan dahil ang iyong balance ay ₱50 o higit pa.' });
    }
  }

  const targetPlan = allowedPlans[planId];

  user.subscription = {
    status: 'pending',
    planId: planId,
    requestedPlanName: targetPlan.name,
    requestedAmount: targetPlan.amount,
    requestedAt: new Date().toISOString()
  };

  user.activityLogs.unshift({
    id: 'sub-req-' + Date.now(),
    type: 'bonus',
    title: 'Nakabinbing Subscription Request ⏳',
    amount: 0,
    timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
    details: `Humiling ka ng access para sa ${targetPlan.name} (₱${targetPlan.amount.toFixed(2)}). Naghihintay ito ng aprubal mula sa Admin.`
  });

  saveDB(db);
  const { password: _, ...userSafe } = user as any;
  res.json({ user: userSafe });
});

// ADMIN APPROVE SUBSCRIPTION
app.post('/api/admin/subscription/:userId/approve', (req, res) => {
  const adminId = req.headers.authorization;
  const { userId } = req.params;

  if (!adminId) {
    return res.status(401).json({ error: 'Naka-loob lamang ito sa Admin.' });
  }

  const db = loadDB();
  const adminUser = db.users.find(u => u.id === adminId && u.isAdmin);
  if (!adminUser) {
    return res.status(403).json({ error: 'Wala kang pahintulot na gawin ito.' });
  }

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  if (!user.subscription || user.subscription.status !== 'pending') {
    return res.status(400).json({ error: 'Walang nakabinbing subscription request ang user na ito.' });
  }

  const planId = user.subscription.planId;
  let validityDays = 30;
  if (planId === '7days') validityDays = 7;
  else if (planId === '2months') validityDays = 60;
  else if (planId === '3months') validityDays = 90;
  else if (planId === '4months') validityDays = 120;

  const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString();

  user.subscription = {
    status: 'active',
    planId: planId,
    requestedPlanName: user.subscription.requestedPlanName,
    requestedAmount: user.subscription.requestedAmount,
    requestedAt: user.subscription.requestedAt,
    approvedAt: new Date().toISOString(),
    expiresAt: expiresAt
  };

  user.activityLogs.unshift({
    id: 'sub-app-' + Date.now(),
    type: 'bonus',
    title: 'Subscription Activated! 🎉',
    amount: 0,
    timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
    details: `Binuksan ng Admin ang iyong account para sa ${user.subscription.requestedPlanName}. Valid ang access mo hanggang sa ${new Date(expiresAt).toLocaleDateString('fil-PH', { month: 'long', day: 'numeric', year: 'numeric' })}.`
  });

  saveDB(db);
  res.json({ success: true, message: `Subscription ay matagumpay na inaprubahan.` });
});

// ADMIN DECLINE SUBSCRIPTION
app.post('/api/admin/subscription/:userId/decline', (req, res) => {
  const adminId = req.headers.authorization;
  const { userId } = req.params;

  if (!adminId) {
    return res.status(401).json({ error: 'Naka-loob lamang ito sa Admin.' });
  }

  const db = loadDB();
  const adminUser = db.users.find(u => u.id === adminId && u.isAdmin);
  if (!adminUser) {
    return res.status(403).json({ error: 'Wala kang pahintulot na gawin ito.' });
  }

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  if (!user.subscription || user.subscription.status !== 'pending') {
    return res.status(400).json({ error: 'Walang nakabinbing subscription request ang user na ito.' });
  }

  const planName = user.subscription.requestedPlanName || 'Subscription';

  user.subscription = {
    status: 'none',
    planId: null,
    requestedPlanName: null,
    requestedAmount: null,
    requestedAt: null,
    expiresAt: null
  };

  user.activityLogs.unshift({
    id: 'sub-dec-' + Date.now(),
    type: 'bonus',
    title: 'Subscription Rejected ❌',
    amount: 0,
    timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
    details: `Ang iyong hiling para sa ${planName} ay tinanggihan ng admin. Mangyaring i-verify ang iyong de-posito o makipag-ugnayan sa Admin.`
  });

  saveDB(db);
  res.json({ success: true, message: `Subscription ay matagumpay na tinanggihan.` });
});


// ============================================
//     ADMIN CLOUD DATABASE & BACKUP APIS
// ============================================

// GET CLOUD DB STATUS
app.get('/api/admin/db/status', (req, res) => {
  const adminId = req.headers.authorization;
  const db = loadDB();
  const adminUser = (db.users || []).find(u => u.id === adminId && u.isAdmin);
  if (!adminUser) {
    return res.status(403).json({ error: 'Naka-loob lamang ito sa Admin.' });
  }

  res.json({
    cloudActive: cloudDb.isActive,
    cloudType: cloudDb.type,
    databaseId: firebaseConfigObj.firestoreDatabaseId || 'default',
    storagePath: DB_FILE_PATH,
    lastCloudSync: lastCloudSyncTimestamp,
    counts: {
      users: db.users ? db.users.length : 0,
      posts: db.posts ? db.posts.length : 0,
      reels: db.reels ? db.reels.length : 0,
      stories: db.stories ? db.stories.length : 0,
      groupChats: db.groupChats ? db.groupChats.length : 0,
      groupMessages: db.groupMessages ? db.groupMessages.length : 0,
      directMessages: db.directMessages ? db.directMessages.length : 0,
      shopProducts: db.shopProducts ? db.shopProducts.length : 0,
      shopOrders: db.shopOrders ? db.shopOrders.length : 0,
      campaigns: db.campaigns ? db.campaigns.length : 0
    }
  });
});

// FORCE CLOUD PUSH (UPLOAD ALL LOCAL TO FIRESTORE)
app.post('/api/admin/db/force-cloud-push', async (req, res) => {
  const adminId = req.headers.authorization;
  const db = loadDB();
  const adminUser = (db.users || []).find(u => u.id === adminId && u.isAdmin);
  if (!adminUser) {
    return res.status(403).json({ error: 'Naka-loob lamang ito sa Admin.' });
  }

  try {
    initLastSyncedCache(db);
    await uploadToFirestore(db);
    res.json({ success: true, message: 'Matagumpay na na-upload ang lahat ng data sa Cloud Firestore!' });
  } catch (err) {
    res.status(500).json({ error: 'Nabigo ang cloud sync: ' + (err as any).message });
  }
});

// FORCE CLOUD PULL (PULL FROM FIRESTORE AND MERGE)
app.post('/api/admin/db/force-cloud-pull', async (req, res) => {
  const adminId = req.headers.authorization;
  const db = loadDB();
  const adminUser = (db.users || []).find(u => u.id === adminId && u.isAdmin);
  if (!adminUser) {
    return res.status(403).json({ error: 'Naka-loob lamang ito sa Admin.' });
  }

  try {
    await syncFromFirestore();
    const updated = loadDB();
    res.json({ 
      success: true, 
      message: 'Matagumpay na na-sync at na-merge ang lahat ng data mula sa Cloud Firestore!',
      counts: {
        users: updated.users?.length || 0,
        reels: updated.reels?.length || 0,
        stories: updated.stories?.length || 0,
        groupChats: updated.groupChats?.length || 0,
        groupMessages: updated.groupMessages?.length || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Nabigo ang cloud pull: ' + (err as any).message });
  }
});

// EXPORT DATABASE BACKUP (DOWNLOAD JSON)
app.get('/api/admin/db/export', (req, res) => {
  const adminId = req.query.token as string || req.headers.authorization;
  const db = loadDB();
  const adminUser = (db.users || []).find(u => u.id === adminId && u.isAdmin);
  if (!adminUser) {
    return res.status(403).json({ error: 'Naka-loob lamang ito sa Admin.' });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  res.setHeader('Content-Disposition', `attachment; filename=z-one-db-backup-${timestamp}.json`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(db, null, 2));
});

// IMPORT DATABASE BACKUP (RESTORE JSON)
app.post('/api/admin/db/import', (req, res) => {
  const adminId = req.headers.authorization;
  const { backupData } = req.body;
  const currentDB = loadDB();
  const adminUser = (currentDB.users || []).find(u => u.id === adminId && u.isAdmin);
  if (!adminUser) {
    return res.status(403).json({ error: 'Naka-loob lamang ito sa Admin.' });
  }

  if (!backupData || !Array.isArray(backupData.users) || backupData.users.length === 0) {
    return res.status(400).json({ error: 'Hindi balidong database backup JSON file.' });
  }

  try {
    saveDB(backupData, true);
    res.json({ success: true, message: 'Matagumpay na naibalik ang backup database at na-upload sa Cloud!' });
  } catch (err) {
    res.status(500).json({ error: 'Nabigo ang pag-restore ng database: ' + (err as any).message });
  }
});


// ============================================
//            Z-ONE SOCIAL PLATFORM APIs
// ============================================

const PROHIBITED_PORN_WORDS = [
  "porn", "pornography", "sex", "nude", "naked", "bold", "x-rated", "pussy", "dick", "tits", "suso", "kantutan", "kantot", "puke", "titi", "pepe", "pekpek", "bastos"
];

const SWEAR_WORDS = [
  "gago", "putangina", "tangina", "putang ina", "tang ina", "pukinangina", "tarantado", "ulol", "pakyaw", "pakyu", "fuck", "shit", "bitch", "asshole"
];

function containsInappropriateContent(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return PROHIBITED_PORN_WORDS.some(word => lower.includes(word));
}

function filterSwearWords(text: string): string {
  if (!text) return text;
  let filtered = text;
  for (const word of SWEAR_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  }
  return filtered;
}

// Check if user is banned helper
function isUserBanned(db: DBStructure, userId: string): boolean {
  const user = db.users.find(u => u.id === userId);
  return !!(user && user.isBanned);
}

// GET ONLINE USER IDS
app.get('/api/zone/online', (req, res) => {
  const now = Date.now();
  // Gather users active in the last 60 seconds (generous window for heartbeats/polling)
  const onlineIds = Object.keys(activeUsersMap).filter(id => now - activeUsersMap[id] < 60000);
  
  // Always include admin-rosco and user-juan as online mock users for visual reference
  if (!onlineIds.includes('admin-rosco')) {
    onlineIds.push('admin-rosco');
  }
  if (!onlineIds.includes('user-juan')) {
    onlineIds.push('user-juan');
  }
  
  // Keep user-clara as offline (unless she is logged in and active), so they see red dot!
  res.json({ onlineUserIds: onlineIds });
});

// --- PERMANENT CLOUDFLARE R2 S3-COMPATIBLE OBJECT STORAGE MEDIA ENGINE ---
interface UploadResult {
  url: string;
  path: string;
  size: number;
  mimeType: string;
  filename: string;
}

interface StorageDetailedResult {
  result: UploadResult | null;
  status: number;
  errorCode: string;
  errorMessage: string;
}

let r2ClientInstance: S3Client | null = null;

/**
 * Initializes and returns a cached S3Client instance configured strictly for Cloudflare R2.
 * Uses official Cloudflare S3 endpoint: https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com
 * Credentials remain server-side only and are never exposed to the frontend.
 */
function getR2Client(): S3Client | null {
  if (r2ClientInstance) return r2ClientInstance;

  const accountId = (process.env.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim();

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  try {
    r2ClientInstance = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
    console.log('⚡ [R2][AUTH] S3Client initialized successfully for Cloudflare R2 permanent media engine.');
    return r2ClientInstance;
  } catch (err: any) {
    console.error('❌ [R2][AUTH_ERROR] Failed to initialize Cloudflare R2 S3Client:', err.message);
    return null;
  }
}

/**
 * Resolves the public/production media domain (e.g. https://media.z-oneapp.ph or configured custom domain).
 */
function getR2PublicDomain(): string {
  const customDomain = (process.env.R2_PUBLIC_DOMAIN || '').trim();
  if (customDomain) {
    return customDomain.replace(/\/+$/, '');
  }
  return 'https://media.z-oneapp.ph';
}

/**
 * Resolves the target Cloudflare R2 bucket name.
 */
function getR2BucketName(): string {
  return (process.env.R2_BUCKET_NAME || 'z-oneapp-media').trim();
}

/**
 * Uploads media strictly to authenticated Cloudflare R2 Object Storage.
 * Saves ONLY metadata in Firestore (no binary). Never falls back to local disk /uploads/.
 */
async function uploadMediaToCloudflareR2Detailed(
  dataUrlOrBuffer: string | Buffer,
  category: 'stories' | 'posts' | 'group-chats' | 'direct-messages' | 'reels' | 'media' | 'va-banners' | string = 'media',
  entityId: string = 'general',
  customMimeType?: string
): Promise<StorageDetailedResult> {
  if (!dataUrlOrBuffer) {
    return { result: null, status: 400, errorCode: 'INVALID_DATA', errorMessage: 'No media data provided.' };
  }

  try {
    let buffer: Buffer;
    let mimeType = customMimeType || 'application/octet-stream';

    if (typeof dataUrlOrBuffer === 'string') {
      if (!dataUrlOrBuffer.startsWith('data:')) {
        // If it's already an external or cloud URL, return it directly
        return {
          result: {
            url: dataUrlOrBuffer,
            path: '',
            size: 0,
            mimeType: 'application/octet-stream',
            filename: path.basename(dataUrlOrBuffer)
          },
          status: 200,
          errorCode: '',
          errorMessage: ''
        };
      }

      const commaIndex = dataUrlOrBuffer.indexOf(',');
      if (commaIndex === -1) {
        return { result: null, status: 400, errorCode: 'INVALID_BASE64', errorMessage: 'Malformed base64 data URL.' };
      }

      const metaPart = dataUrlOrBuffer.substring(0, commaIndex);
      const base64Data = dataUrlOrBuffer.substring(commaIndex + 1);
      const mimeMatch = metaPart.match(/data:([^;]+)/);
      if (mimeMatch) {
        mimeType = mimeMatch[1].toLowerCase();
      }
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      buffer = dataUrlOrBuffer;
    }

    // Determine clean file extension for JPG, PNG, MP4, WEBP, GIF, MOV, etc.
    let extension = 'bin';
    if (mimeType.includes('/')) {
      extension = mimeType.split('/')[1];
    }
    if (extension.includes('+')) extension = extension.split('+')[0];
    if (extension.includes(';')) extension = extension.split(';')[0];
    if (extension === 'jpeg') extension = 'jpg';
    if (extension === 'quicktime') extension = 'mov';
    if (extension === 'x-matroska') extension = 'mkv';

    // Unique file identifier to prevent overwriting
    const uniqueFileId = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`;
    const safeEntityId = (entityId || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeCategory = (category || 'media').replace(/[^a-zA-Z0-9_-]/g, '-');
    
    // Deterministic permanent storage key in R2
    const storageKey = `${safeCategory}/${safeEntityId}/${uniqueFileId}`;
    const localFilename = `${safeCategory}-${safeEntityId}-${uniqueFileId}`;

    const sizeBytes = buffer.length;
    const sizeKB = (sizeBytes / 1024).toFixed(1);

    const s3Client = getR2Client();
    if (!s3Client) {
      const errMsg = 'Cloudflare R2 credentials are not configured in server environment. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.';
      console.error(`❌ [R2][AUTH_ERROR] Cannot upload ${storageKey}. Missing R2 credentials.`);
      return { result: null, status: 401, errorCode: 'R2_CONFIG_MISSING', errorMessage: errMsg };
    }

    const bucketName = getR2BucketName();
    const publicDomain = getR2PublicDomain();

    // Perform PutObjectCommand to Cloudflare R2
    try {
      const putCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType,
        Metadata: {
          category: safeCategory,
          entityId: safeEntityId,
          uploadedAt: new Date().toISOString()
        }
      });

      const putRes = await s3Client.send(putCommand);
      const isSuccess = !!putRes;

      if (!isSuccess) {
        console.error(`❌ [R2][UPLOAD_FAILED] PutObject returned empty response for ${storageKey}`);
        return { result: null, status: 502, errorCode: 'R2_UPLOAD_EMPTY', errorMessage: 'Cloudflare R2 returned empty response.' };
      }

      const permanentMediaUrl = `${publicDomain}/${storageKey}`;
      console.log(`✅ [R2][SUCCESS] Permanent Media Upload: ${storageKey} -> ${permanentMediaUrl} (${sizeKB} KB, MIME: ${mimeType})`);

      // Index metadata-only document in Cloud Firestore (URL / metadata only, strictly NO binary data)
      if (cloudDb.isActive) {
        try {
          await cloudDb.setDoc('media_storage', localFilename, {
            filename: localFilename,
            storageKey,
            storagePath: storageKey,
            downloadUrl: permanentMediaUrl,
            category: safeCategory,
            entityId: safeEntityId,
            size: buffer.length,
            mimeType,
            storageEngine: 'cloudflare-r2',
            uploadedAt: new Date().toISOString()
          });
        } catch (idxErr: any) {
          console.error(`⚠️ [R2][METADATA_WARNING] Error indexing media metadata in Cloud Firestore for ${localFilename}:`, idxErr.message);
        }
      }

      return {
        result: {
          url: permanentMediaUrl,
          path: storageKey,
          size: buffer.length,
          mimeType,
          filename: localFilename
        },
        status: 200,
        errorCode: '',
        errorMessage: ''
      };
    } catch (s3Err: any) {
      const httpStatus = s3Err.$metadata?.httpStatusCode || 502;
      const errorCode = s3Err.name || s3Err.Code || 'R2_S3_ERROR';
      const errorMsg = s3Err.message || 'Error communicating with Cloudflare R2 storage.';
      
      console.error(`❌ [R2][ERROR] S3 PutObject failed for ${storageKey}. Status: ${httpStatus}, Code: ${errorCode}, Message: ${errorMsg}`);
      return {
        result: null,
        status: httpStatus >= 400 && httpStatus <= 599 ? httpStatus : 502,
        errorCode,
        errorMessage: errorMsg
      };
    }
  } catch (err: any) {
    console.error('❌ [R2][FATAL_ERROR] Unexpected error in uploadMediaToCloudflareR2Detailed:', err.message);
    return { result: null, status: 500, errorCode: 'FATAL_ERROR', errorMessage: err.message };
  }
}

async function uploadMediaToCloudflareR2(
  dataUrlOrBuffer: string | Buffer,
  category: 'stories' | 'posts' | 'group-chats' | 'direct-messages' | 'reels' | 'media' | 'va-banners' | string = 'media',
  entityId: string = 'general',
  customMimeType?: string
): Promise<UploadResult | null> {
  const res = await uploadMediaToCloudflareR2Detailed(dataUrlOrBuffer, category, entityId, customMimeType);
  return res.result;
}

// Backward-compatible alias for existing sync/utility callers
const uploadMediaToFirebaseStorage = uploadMediaToCloudflareR2;
const uploadMediaToFirebaseStorageDetailed = uploadMediaToCloudflareR2Detailed;

// --- REUSABLE HELPER: Save base64 media strictly with Firebase Storage Cloud Persistence ---
function saveBase64ToUploadFile(dataUrl: string, prefix: string = 'media', entityId: string = 'general'): string | null {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return null;
  }
  if (!dataUrl.startsWith('data:')) {
    return dataUrl; // Already a permanent external or cloud URL
  }
  
  // Strict Cloud Storage: Do NOT generate ephemeral /uploads/ link as successful source
  return null;
}

// --- MEDIA UPLOAD ENDPOINT (Uploads strictly to authenticated Cloud Storage with permanent download URL) ---
app.post('/api/zone/upload', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Kailangan ng login upang mag-upload ng media.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === authHeader);
  const adminId = authHeader;
  const isAdmin = adminId === 'admin-id' || adminId === 'admin_secret_danilo_2026' || (user && user.isAdmin);

  if (!user && !isAdmin) {
    return res.status(401).json({ error: 'Unauthorized: Hindi nahanap ang authenticated user.' });
  }

  const userId = user ? user.id : 'admin';
  const { dataUrl, category = 'media', entityId } = req.body;

  if (!dataUrl || typeof dataUrl !== 'string') {
    return res.status(400).json({ error: 'Walang valid media data na natanggap.' });
  }

  if (!dataUrl.startsWith('data:')) {
    // Already a remote/cloud URL
    return res.json({ success: true, url: dataUrl });
  }

  try {
    const uploadDetail = await uploadMediaToCloudflareR2Detailed(dataUrl, category, entityId || userId);
    
    if (!uploadDetail.result || !uploadDetail.result.url) {
      const sanitizedStatus = uploadDetail.status || 502;
      return res.status(sanitizedStatus).json({ 
        error: 'Bigo ang pag-upload sa Cloudflare R2 Storage. Nananatili ang media sa iyong Outbox para i-retry nang ligtas.',
        cloudStatus: uploadDetail.status,
        cloudCode: uploadDetail.errorCode,
        cloudError: uploadDetail.errorMessage,
        canRetry: true 
      });
    }

    res.json({
      success: true,
      url: uploadDetail.result.url,
      storagePath: uploadDetail.result.path,
      size: uploadDetail.result.size,
      mimeType: uploadDetail.result.mimeType
    });
  } catch (err: any) {
    console.error('❌ [R2][ROUTE_ERROR] Error in /api/zone/upload:', err.message);
    res.status(502).json({ 
      error: 'Bigo ang pag-upload sa Cloudflare R2 Storage. Subukan muli.',
      canRetry: true 
    });
  }
});

// --- DYNAMIC GCASH QR CODE SERVICE WITH CLOUD FIRESTORE DURA-BACKUP ---
app.get('/admin_gcash_qr.png', async (req, res) => {
  // 1. Try to fetch from persistent cloud storage (Firestore) first so restarts never wipe it out
  if (cloudDb.isActive) {
    try {
      const data = await cloudDb.getDoc('app_settings', 'gcash_qr');
      if (data && data.base64) {
        const buffer = Buffer.from(data.base64, 'base64');
        res.setHeader('Content-Type', data.mimeType || 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.send(buffer);
      }
    } catch (err) {
      console.error('❌ Cloud DB QR recovery error:', err);
    }
  }

  // 2. Fallback to local files if Firestore document is not found or inactive
  const publicPath = path.join(process.cwd(), 'public', 'admin_gcash_qr.png');
  if (fs.existsSync(publicPath)) {
    return res.sendFile(publicPath);
  }

  const distPath = path.join(process.cwd(), 'dist', 'admin_gcash_qr.png');
  if (fs.existsSync(distPath)) {
    return res.sendFile(distPath);
  }

  res.status(404).send('QR Code image not found.');
});

// --- ADMIN ENDPOINT TO UPDATE GCASH QR CODE ---
app.post('/api/admin/update-qr', async (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Mag-login muna bilang admin.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'Bawal ma-access ito ng hindi admin.' });
  }

  const { dataUrl } = req.body;
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return res.status(400).json({ error: 'Walang valid image data na natanggap.' });
  }

  try {
    const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Hindi maproseso ang format ng larawan.' });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Save physically to public folder
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    fs.writeFileSync(path.join(publicDir, 'admin_gcash_qr.png'), buffer);

    // Save physically to dist folder (if exists)
    const distDir = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      fs.writeFileSync(path.join(distDir, 'admin_gcash_qr.png'), buffer);
    }

    // Save persistently to Firebase Storage
    uploadMediaToFirebaseStorage(buffer, 'app-settings', 'admin_gcash_qr', mimeType).catch(() => {});

    // Save persistently to Firestore
    if (cloudDb.isActive) {
      await cloudDb.setDoc('app_settings', 'gcash_qr', {
        base64: base64Data,
        mimeType,
        updatedAt: new Date().toISOString(),
        updatedBy: userId
      });
      console.log('☁️ Persistent custom GCash QR saved to Cloud DB.');
    }

    res.json({ success: true, message: 'Tagumpay na napalitan ang iyong GCash QR Code!' });
  } catch (err: any) {
    console.error('Error saving custom QR code:', err);
    res.status(500).json({ error: 'May naganap na error habang sine-save ang QR code.' });
  }
});

// Dynamic Interceptor for serving uploads with transparent Firebase Storage & Firestore recovery
app.get('/uploads/:filename', async (req, res) => {
  const filename = req.params.filename;
  const uploadDir = path.join(process.cwd(), 'uploads');
  const filePath = path.join(uploadDir, filename);

  // 1. If physical file exists locally on disk, serve it immediately (super fast)
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  // 2. If physical file was wiped by a server restart/redeploy, dynamically recover from Firebase Storage / Firestore
  if (cloudDb.isActive) {
    try {
      console.log(`🔍 Media Recovery: Checking Cloud Storage / Firestore for ${filename}...`);
      
      const metaDoc = await cloudDb.getDoc('media_storage', filename);
      if (metaDoc) {
        // Direct permanent R2 / Cloud Storage URL redirect
        if (metaDoc.downloadUrl && metaDoc.downloadUrl.startsWith('http')) {
          console.log(`✅ Media Recovery: Redirecting to permanent Cloud URL for ${filename}`);
          return res.redirect(metaDoc.downloadUrl);
        }

        // Chunk document recovery
        if (metaDoc.totalChunks) {
          const totalChunks = Number(metaDoc.totalChunks) || 1;
          const chunkFetchers: Promise<any>[] = [];
          for (let i = 0; i < totalChunks; i++) {
            chunkFetchers.push(cloudDb.getDoc('media_storage', `${filename}_chunk_${i}`));
          }
          const chunkDocs = await Promise.all(chunkFetchers);
          const validChunks = chunkDocs.filter(c => c && c.base64);

          if (validChunks.length === totalChunks) {
            validChunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
            const bufferChunks = validChunks.map(c => Buffer.from(c.base64, 'base64'));
            const fileBuffer = Buffer.concat(bufferChunks);

            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            fs.writeFileSync(filePath, fileBuffer);
            console.log(`✅ Media Recovery: Successfully restored ${filename} (${fileBuffer.length} bytes, ${totalChunks} chunks) from Cloud DB.`);
            
            // Migrate to Firebase Storage for permanent future access
            uploadMediaToFirebaseStorage(fileBuffer, 'media', 'migrated', metaDoc.mimeType).catch(() => {});

            return res.sendFile(filePath);
          }
        }
      }

      // Strategy B: Fallback query search for older uploaded media
      const chunks = await cloudDb.queryByField('media_storage', 'filename', filename);
      if (chunks && chunks.length > 0) {
        chunks.sort((a, b) => (a.chunkIndex || 0) - (b.chunkIndex || 0));
        const bufferChunks = chunks.map(c => Buffer.from(c.base64, 'base64'));
        const fileBuffer = Buffer.concat(bufferChunks);

        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        fs.writeFileSync(filePath, fileBuffer);
        console.log(`✅ Media Recovery (Fallback Query): Restored ${filename} (${fileBuffer.length} bytes) to local disk cache.`);
        return res.sendFile(filePath);
      } else {
        console.log(`⚠️ Media Recovery: No Cloud DB backup records found for filename ${filename}`);
      }
    } catch (err) {
      console.error(`❌ Media Recovery Error for filename ${filename}:`, err);
    }
  }

  // Fallback if not found on disk or Firestore
  res.status(404).send('Media Not Found');
});

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// --- MANILA BULLETIN BALITA RSS FEED INTEGRATION ---
const mbImageCache = new Map<string, string>();

function setCachedMBImage(url: string, img: string) {
  if (mbImageCache.size > 150) {
    const firstKey = mbImageCache.keys().next().value;
    if (firstKey) mbImageCache.delete(firstKey);
  }
  mbImageCache.set(url, img);
}

async function fetchExactManilaBulletinImage(articleUrl: string): Promise<string | null> {
  if (!articleUrl) return null;
  if (mbImageCache.has(articleUrl)) {
    return mbImageCache.get(articleUrl) || null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch('https://r.jina.ai/' + articleUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/plain, text/markdown, */*'
      }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const text = await res.text();

      // 1. Direct CloudFront WebP / Image upload from Manila Bulletin (featured article image)
      const cfMatches = text.match(/https:\/\/d1t2sru3bhidc1\.cloudfront\.net\/balita\/uploads\/images\/[^\s\)"'<>]+/g);
      if (cfMatches && cfMatches.length > 0) {
        const cleanUrl = cfMatches[0].trim();
        setCachedMBImage(articleUrl, cleanUrl);
        return cleanUrl;
      }

      // 2. Direct Manila Bulletin domain image
      const mbMatch = text.match(/!\[.*?\]\((https:\/\/[^\)]*(?:balita\.mb\.com\.ph|mb\.com\.ph)[^\)]+\.(?:jpg|jpeg|png|webp|avif))\)/i);
      if (mbMatch && mbMatch[1]) {
        const cleanUrl = mbMatch[1].trim();
        setCachedMBImage(articleUrl, cleanUrl);
        return cleanUrl;
      }

      // 3. Any standard media article photo excluding logos/icons
      const anyMatch = text.match(/!\[.*?\]\((https:\/\/[^\)]+\.(?:jpg|jpeg|png|webp|avif))\)/i);
      if (anyMatch && anyMatch[1] && !anyMatch[1].includes('logo') && !anyMatch[1].includes('arrow') && !anyMatch[1].includes('icon') && !anyMatch[1].includes('favicon')) {
        const cleanUrl = anyMatch[1].trim();
        setCachedMBImage(articleUrl, cleanUrl);
        return cleanUrl;
      }
    }
  } catch (err: any) {
    // Non-blocking timeout or fetch failure
  }

  return null;
}

function getBalitaNewsImageUrl(title: string, summary: string, rawItem: any): string | null {
  // 1. Check if rawItem has image, banner_image, enclosure or media:content directly in RSS
  if (rawItem?.image && typeof rawItem.image === 'string' && rawItem.image.startsWith('http')) {
    return rawItem.image;
  }
  if (rawItem?.banner_image && typeof rawItem.banner_image === 'string' && rawItem.banner_image.startsWith('http')) {
    return rawItem.banner_image;
  }
  if (rawItem?.attachments && Array.isArray(rawItem.attachments) && rawItem.attachments[0]?.url) {
    return rawItem.attachments[0].url;
  }
  if (rawItem?.content_html) {
    const imgMatch = rawItem.content_html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1] && imgMatch[1].startsWith('http')) {
      return imgMatch[1];
    }
  }
  return null;
}

async function fetchBalitaRSS(): Promise<any[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout

    const res = await fetch('https://feed2json.org/convert?url=https%3A%2F%2Fbalita.mb.com.ph%2Frssfeed%2F0%2F', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error(`Failed to fetch Balita RSS via feed2json: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json() as any;
    const items = data.items || [];
    const formattedPosts: any[] = [];

    // Process items in parallel batches to extract genuine Manila Bulletin images
    const processedItems = await Promise.all(
      items.slice(0, 30).map(async (item: any) => {
        const title = (item.title || '').trim();
        const link = item.url || item.guid || '';
        const summary = (item.summary || item.content_html || '').trim();
        const datePublished = item.date_published || new Date().toISOString();

        if (!title) return null;

        const uniqueInput = link || title;
        const cleanId = 'post-rss-' + Buffer.from(uniqueInput).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
        
        // Extract genuine photo from RSS fields or from actual article
        let mediaUrl = getBalitaNewsImageUrl(title, summary, item);
        if (!mediaUrl && link) {
          mediaUrl = await fetchExactManilaBulletinImage(link);
        }

        return {
          id: cleanId,
          userId: 'balita-rss-author',
          userName: 'Balita (Manila Bulletin)',
          userAvatar: '📰',
          text: `📰 **${title}**\n\n${summary}\n\n🔗 Basahin ang buong balita rito:\n${link}`,
          mediaUrl: mediaUrl || undefined,
          mediaType: mediaUrl ? 'image' : undefined,
          likes: [],
          comments: [],
          createdAt: datePublished,
          isRss: true,
          rssLink: link
        };
      })
    );

    for (const post of processedItems) {
      if (post) formattedPosts.push(post);
    }

    return formattedPosts;
  } catch (err) {
    console.error('Error fetching Balita RSS via feed2json:', err);
    return [];
  }
}

// --- PINOY TELESERYE REPLAY RSS & WP-JSON VIDEO EMBED INTEGRATION ---
const teleseryeDetailsCache = new Map<string, { poster: string | null; videoSources: string[]; videoType?: 'direct' | 'hls' | 'dailymotion' | 'youtube' | 'okru' | 'embed' }>();

// Helper to test if a URL is a genuine playable video stream or player embed URL (NOT the source website or blog page)
function isValidVideoSourceUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const url = rawUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;

  // STRICT RULE: Never embed or treat the source website, blog article, or tag/category page as a video stream
  if (/pinoytambayanteleserye\.com/i.test(url)) {
    // Only allow if it's a direct binary video asset file
    return /\.(mp4|webm|m3u8|ogg)(\?|$)/i.test(url);
  }

  // Check for direct video stream formats
  if (/\.(mp4|webm|m3u8|ogg|ts)(\?|$)/i.test(url)) {
    return true;
  }

  // Check for recognized, authentic video player embed hosts
  const validEmbedHosts = [
    /makkitv\.io\/(?:player|embed|e)/i,
    /playe\.makkitv\.io/i,
    /vkspeed\.(?:com|net|org|site)\/(?:embed-|e\/|v\/)/i,
    /blogger\.com\/video\.g/i,
    /dailymotion\.com\/(?:embed\/video|video)/i,
    /dai\.ly/i,
    /youtube\.com\/(?:embed|watch)/i,
    /youtube-nocookie\.com\/embed/i,
    /youtu\.be/i,
    /ok\.ru\/(?:videoembed|video)/i,
    /facebook\.com\/plugins\/video\.php/i,
    /streamwish\.(?:to|top|com|site|xyz|org|online)\/e\//i,
    /wishfast\.(?:top|net|com)\/e\//i,
    /doodstream\.(?:com|co|so|ws|to|watch)\/e\//i,
    /dood\.(?:to|so|ws|watch|li|la|pm|wf|re|cx)\/e\//i,
    /ds2play\.(?:com|net)\/e\//i,
    /filelions\.(?:to|online|site|com|co)\/v\//i,
    /vidhide\.(?:com|to|pro|net|site|biz)\/v\//i,
    /streamtape\.(?:com|to|net)\/e\//i,
    /mp4upload\.com\/embed-/i,
    /mixdrop\.(?:co|to|sx|bz|ag|is)\/e\//i,
    /supervideo\.(?:tv|cc)\/e\//i,
    /voe\.sx\/e\//i,
    /vidspeeds\.(?:com|net|me)\/e\//i,
    /embedgram\.com\/e\//i,
    /fembed\.(?:com|net)\/v\//i,
    /luluvdo\.(?:com|net|to)\/e\//i
  ];

  for (const hostRegex of validEmbedHosts) {
    if (hostRegex.test(url)) return true;
  }

  // Generic check for embed players (must have /embed/, /player/, /e/, /v/ or player.php in path)
  if (/\/(embed|player|e|v|videoembed)\//i.test(url) || /player\.php\?/i.test(url) || /embed\.php\?/i.test(url)) {
    if (!/wordpress|theme|plugin|wp-content|wp-includes|blog|news|article/i.test(url)) {
      return true;
    }
  }

  return false;
}

function normalizeVideoEmbedUrl(rawUrl: string): { url: string; type: 'direct' | 'hls' | 'dailymotion' | 'youtube' | 'okru' | 'embed' } {
  let url = rawUrl.trim();
  if (url.startsWith('//')) url = 'https:' + url;

  // Dailymotion conversion
  const dmMatch = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/i) || url.match(/dai\.ly\/([a-zA-Z0-9]+)/i);
  if (dmMatch && dmMatch[1]) {
    return { url: `https://www.dailymotion.com/embed/video/${dmMatch[1]}?autoplay=1&ui-logo=0`, type: 'dailymotion' };
  }
  if (/dailymotion\.com\/embed\/video/i.test(url)) {
    return { url, type: 'dailymotion' };
  }

  // YouTube conversion
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return { url: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`, type: 'youtube' };
  }

  // OK.ru conversion
  const okMatch = url.match(/ok\.ru\/video\/(\d+)/i) || url.match(/ok\.ru\/videoembed\/(\d+)/i);
  if (okMatch && okMatch[1]) {
    return { url: `https://ok.ru/videoembed/${okMatch[1]}`, type: 'okru' };
  }

  // HLS stream
  if (/\.m3u8(\?|$)/i.test(url)) {
    return { url, type: 'hls' };
  }

  // Direct MP4 / WebM
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) {
    return { url, type: 'direct' };
  }

  return { url, type: 'embed' };
}

async function fetchExactTeleseryeDetails(articleUrl: string): Promise<{ poster: string | null; videoSources: string[]; videoType?: 'direct' | 'hls' | 'dailymotion' | 'youtube' | 'okru' | 'embed' }> {
  if (!articleUrl) return { poster: null, videoSources: [] };
  if (teleseryeDetailsCache.has(articleUrl)) {
    return teleseryeDetailsCache.get(articleUrl)!;
  }

  let poster: string | null = null;
  const rawSources: string[] = [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(articleUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const html = await res.text();

      // 1. Poster extraction
      const ogMatch = html.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i);
      if (ogMatch && ogMatch[1] && ogMatch[1].startsWith('http')) {
        poster = ogMatch[1].trim();
      } else {
        const layzrMatch = html.match(/data-layzr=["'](https:\/\/pinoytambayanteleserye\.com\/wp-content\/uploads\/[^\s"']+\.(?:png|jpg|jpeg|webp))["']/i);
        if (layzrMatch && layzrMatch[1]) {
          poster = layzrMatch[1].trim();
        } else {
          const wpUploadMatch = html.match(/https:\/\/pinoytambayanteleserye\.com\/wp-content\/uploads\/[^\s"']+\.(?:jpg|jpeg|png|webp)/i);
          if (wpUploadMatch && wpUploadMatch[0]) {
            poster = wpUploadMatch[0].trim();
          }
        }
      }

      // 2. Video iframe extraction
      const iframes = [...html.matchAll(/<iframe[^>]+(?:src|data-src)=["']([^"']+)["']/gi)].map(m => m[1]);
      for (const ifr of iframes) {
        if (isValidVideoSourceUrl(ifr)) {
          rawSources.push(ifr);
        }
      }

      // 3. Direct HTML5 video / source extraction
      const videoSrcs = [...html.matchAll(/<(?:video|source)[^>]+(?:src|data-src)=["']([^"']+)["']/gi)].map(m => m[1]);
      for (const vSrc of videoSrcs) {
        if (isValidVideoSourceUrl(vSrc)) {
          rawSources.push(vSrc);
        }
      }

      // 4. Embedded player scripts / regex matches (e.g. MakkiTV, VKSpeed, DailyMotion, StreamWish, OK.ru embedded in JS)
      const scriptMatches = [...html.matchAll(/https?:\/\/[^\s"'<>]*(?:makkitv\.io\/(?:player|embed)|vkspeed\.com\/embed-|dailymotion\.com\/(?:embed\/video|video)|streamwish\.[a-z]+\/e|dood\.[a-z]+\/e|ok\.ru\/videoembed|filelions\.[a-z]+\/v|vidhide\.[a-z]+\/v)[^\s"'<>]*/gi)].map(m => m[0]);
      for (const sm of scriptMatches) {
        if (isValidVideoSourceUrl(sm)) {
          rawSources.push(sm);
        }
      }
    }
  } catch (err) {
    // Non-blocking timeout
  }

  // Normalize and deduplicate video sources
  const normalizedSources: string[] = [];
  let detectedType: 'direct' | 'hls' | 'dailymotion' | 'youtube' | 'okru' | 'embed' = 'embed';

  for (const src of rawSources) {
    const { url, type } = normalizeVideoEmbedUrl(src);
    if (url && !normalizedSources.includes(url)) {
      normalizedSources.push(url);
      if (normalizedSources.length === 1) {
        detectedType = type;
      }
    }
  }

  const result = {
    poster,
    videoSources: normalizedSources,
    videoType: normalizedSources.length > 0 ? detectedType : undefined
  };

  if (teleseryeDetailsCache.size > 200) {
    const firstKey = teleseryeDetailsCache.keys().next().value;
    if (firstKey) teleseryeDetailsCache.delete(firstKey);
  }
  teleseryeDetailsCache.set(articleUrl, result);

  return result;
}

// Master function to fetch Pinoy Teleserye episodes using WordPress REST API & RSS fallback
async function fetchTeleseryePosts(): Promise<any[]> {
  const formattedPosts: any[] = [];
  const seenLinks = new Set<string>();

  console.log('📺 [Teleserye Sync] Starting fetch from Pinoy Tambayan Teleserye WordPress REST API...');

  // 1. Primary Source: WordPress REST API (Fetches up to 60 posts with full _kp_videos meta)
  try {
    const pagesToFetch = [1, 2]; // Pages 1 and 2 fetch ~60-80 recent episodes
    for (const page of pagesToFetch) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`https://pinoytambayanteleserye.com/wp-json/wp/v2/posts?per_page=40&page=${page}&_embed`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn(`[Teleserye Sync] WP REST API page ${page} returned status ${res.status}`);
        break;
      }

      const wpPosts = await res.json();
      if (!Array.isArray(wpPosts) || wpPosts.length === 0) break;

      for (const p of wpPosts) {
        const rawTitle = p.title?.rendered ? p.title.rendered.replace(/&#(\d+);/g, (_m: any, dec: any) => String.fromCharCode(dec)).replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim() : '';
        const link = p.link ? p.link.trim() : '';
        const pubDate = p.date || new Date().toISOString();
        if (!rawTitle || !link || seenLinks.has(link)) continue;
        seenLinks.add(link);

        const cleanTitle = rawTitle.replace(/\s+/g, ' ');
        const slug = (link || cleanTitle).toLowerCase().replace(/https?:\/\/[^\/]+\/?/i, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const hash = crypto.createHash('md5').update(link || cleanTitle).digest('hex').slice(0, 12);
        const cleanId = `post-teleserye-${slug || hash}`;

        // 1. Extract poster image from WP featured media or Yoast OG image
        let posterUrl: string | null = null;
        if (p._embedded && p._embedded['wp:featuredmedia'] && p._embedded['wp:featuredmedia'][0]) {
          posterUrl = p._embedded['wp:featuredmedia'][0].source_url || p._embedded['wp:featuredmedia'][0].media_details?.sizes?.full?.source_url || null;
        }
        if (!posterUrl && p.yoast_head_json?.og_image && p.yoast_head_json.og_image[0]) {
          posterUrl = p.yoast_head_json.og_image[0].url;
        }

        // 2. Extract genuine video sources from custom meta `_kp_videos`
        const validSources: string[] = [];
        const kpVideos = p.meta?._kp_videos || [];
        if (Array.isArray(kpVideos)) {
          for (const item of kpVideos) {
            if (item && item.embed) {
              const ifrMatches = [...item.embed.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);
              for (const ifr of ifrMatches) {
                if (isValidVideoSourceUrl(ifr)) {
                  const { url } = normalizeVideoEmbedUrl(ifr);
                  if (url && !validSources.includes(url)) {
                    validSources.push(url);
                  }
                }
              }
            }
          }
        }

        // 3. Check content iframes
        const contentStr = p.content?.rendered || '';
        const contentIframes = [...contentStr.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);
        for (const ifr of contentIframes) {
          if (isValidVideoSourceUrl(ifr)) {
            const { url } = normalizeVideoEmbedUrl(ifr);
            if (url && !validSources.includes(url)) {
              validSources.push(url);
            }
          }
        }

        // If poster is still missing, extract from content
        if (!posterUrl) {
          const inlineImg = contentStr.match(/<img[^>]+src=["'](https:\/\/pinoytambayanteleserye\.com\/wp-content\/uploads\/[^"']+)["']/i);
          if (inlineImg && inlineImg[1]) {
            posterUrl = inlineImg[1];
          }
        }

        const hasValidVideo = validSources.length > 0;
        let detectedType: 'direct' | 'hls' | 'dailymotion' | 'youtube' | 'okru' | 'embed' = 'embed';
        if (hasValidVideo) {
          detectedType = normalizeVideoEmbedUrl(validSources[0]).type;
        }

        console.log(`📺 [Teleserye Diagnostic] "${cleanTitle}" | Video: ${hasValidVideo ? `READY (${validSources.length} server(s))` : 'PENDING AIRING / UPLOAD'} | Poster: ${posterUrl ? 'YES' : 'NO'}`);

        formattedPosts.push({
          id: cleanId,
          userId: 'teleserye-feed-author',
          userName: 'Pinoy Tambayan Teleserye',
          userAvatar: '📺',
          text: `📺 **${cleanTitle}** (Pinoy Tambayan Teleserye Replay)\n\nPanoorin ang pinakabagong episode ng **${cleanTitle}** dito sa Z-one Social Community Feed!\n\n${hasValidVideo ? '▶ Pindutin ang video player para panoorin ang libreng HD video stream.' : '⏳ Kasalukuyang pinoproseso o ina-update ang direct video stream para sa episode na ito mula sa source.'}\n\n🔗 Source: ${link}`,
          mediaUrl: posterUrl || undefined,
          mediaType: 'video',
          embedUrl: hasValidVideo ? validSources[0] : undefined,
          embedUrls: hasValidVideo ? validSources : undefined,
          videoSourceAvailable: hasValidVideo,
          videoStreamType: detectedType,
          episodeTitle: cleanTitle,
          likes: [],
          comments: [],
          createdAt: new Date(pubDate).toISOString(),
          isRss: true,
          rssLink: link,
          category: 'Teleserye'
        });
      }
    }
  } catch (wpErr) {
    console.error('Error fetching WP REST API:', wpErr);
  }

  // 2. Fallback to RSS Feed if WP REST API returned fewer than 5 posts
  if (formattedPosts.length < 5) {
    try {
      console.log('📺 [Teleserye Sync] Falling back to RSS feed ingestion...');
      const feedUrls = [
        'https://pinoytambayanteleserye.com/feed/',
        'https://pinoytambayanteleserye.com/feed/?paged=2',
        'https://pinoytambayanteleserye.com/category/pinoy-tambayan/pinoy-teleserye/feed/'
      ];

      for (const feedUrl of feedUrls) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const res = await fetch(feedUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
              'Accept': 'application/rss+xml, application/xml, text/xml, */*'
            },
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (!res.ok) continue;

          const xml = await res.text();
          const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
          if (itemMatches.length === 0) continue;

          const processed = await Promise.all(
            itemMatches.map(async (itemXml: string) => {
              const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || itemXml.match(/<title>(.*?)<\/title>/);
              const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
              const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
              const contentMatch = itemXml.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/) || itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/);

              const rawTitle = titleMatch ? titleMatch[1].trim() : '';
              const link = linkMatch ? linkMatch[1].trim() : '';
              const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();
              const content = contentMatch ? contentMatch[1] : '';

              if (!rawTitle || !link || seenLinks.has(link)) return null;
              seenLinks.add(link);

              const cleanTitle = rawTitle.replace(/\s+/g, ' ');
              const slug = (link || cleanTitle).toLowerCase().replace(/https?:\/\/[^\/]+\/?/i, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
              const hash = crypto.createHash('md5').update(link || cleanTitle).digest('hex').slice(0, 12);
              const cleanId = `post-teleserye-${slug || hash}`;

              const { poster, videoSources, videoType } = await fetchExactTeleseryeDetails(link);
              const hasValidVideo = videoSources.length > 0;

              return {
                id: cleanId,
                userId: 'teleserye-feed-author',
                userName: 'Pinoy Tambayan Teleserye',
                userAvatar: '📺',
                text: `📺 **${cleanTitle}** (Pinoy Tambayan Teleserye Replay)\n\nPanoorin ang pinakabagong episode ng **${cleanTitle}** dito sa Z-one Social Community Feed!\n\n${hasValidVideo ? '▶ Pindutin ang video player para panoorin ang libreng HD video stream.' : '⏳ Kasalukuyang pinoproseso o ina-update ang direct video stream para sa episode na ito mula sa source.'}\n\n🔗 Source: ${link}`,
                mediaUrl: poster || undefined,
                mediaType: 'video',
                embedUrl: hasValidVideo ? videoSources[0] : undefined,
                embedUrls: hasValidVideo ? videoSources : undefined,
                videoSourceAvailable: hasValidVideo,
                videoStreamType: videoType,
                episodeTitle: cleanTitle,
                likes: [],
                comments: [],
                createdAt: new Date(pubDate).toISOString(),
                isRss: true,
                rssLink: link,
                category: 'Teleserye'
              };
            })
          );

          for (const post of processed) {
            if (post) formattedPosts.push(post);
          }
        } catch (pageErr) {
          console.error(`Error fetching RSS page ${feedUrl}:`, pageErr);
        }
      }
    } catch (rssErr) {
      console.error('Error in fallback RSS fetch:', rssErr);
    }
  }

  const readyCount = formattedPosts.filter(p => p.videoSourceAvailable).length;
  console.log(`📺 [Teleserye Summary] Total episodes fetched: ${formattedPosts.length} | Playable video streams ready: ${readyCount}`);

  return formattedPosts;
}

let lastRssSyncTime = 0;

async function syncRssToDatabase() {
  try {
    const db = loadDB();
    if (!db.posts) db.posts = [];

    let hasUpdates = false;

    // Clean out legacy replayteleserye.su posts & sanitize any existing posts with website embeds
    const initialCount = db.posts.length;
    db.posts = db.posts.filter(p => {
      if (p.id === 'post-teleserye-aHR0cHM6Ly9yZXBsYXl0ZWxlc2VyeWUu') return false;
      if (p.rssLink && p.rssLink.includes('replayteleserye.su')) return false;
      if (p.mediaUrl && p.mediaUrl.includes('replayteleserye.su')) return false;
      if (p.text && p.text.includes('replayteleserye.su')) return false;
      return true;
    });
    if (db.posts.length !== initialCount) {
      hasUpdates = true;
    }

    // Sanitize all existing teleserye posts in DB:
    // Never allow the source website to be stored as embedUrl
    for (const post of db.posts) {
      if (post.userId === 'teleserye-feed-author' || (post as any).category === 'Teleserye') {
        if (post.embedUrl && !isValidVideoSourceUrl(post.embedUrl)) {
          post.embedUrl = undefined;
          hasUpdates = true;
        }
        if (post.embedUrls && Array.isArray(post.embedUrls)) {
          const valid = post.embedUrls.filter(u => isValidVideoSourceUrl(u));
          if (valid.length !== post.embedUrls.length) {
            post.embedUrls = valid.length > 0 ? valid : undefined;
            if (!post.embedUrl && valid.length > 0) post.embedUrl = valid[0];
            hasUpdates = true;
          }
        }
        const hasValidVideo = !!(post.embedUrl || (post.embedUrls && post.embedUrls.length > 0) || (post.mediaUrl && (post.mediaUrl.endsWith('.mp4') || post.mediaUrl.endsWith('.m3u8'))));
        if ((post as any).videoSourceAvailable !== hasValidVideo) {
          (post as any).videoSourceAvailable = hasValidVideo;
          hasUpdates = true;
        }
      }
    }

    // 1. Fetch fresh Manila Bulletin News articles
    const rssArticles = await fetchBalitaRSS();
    if (rssArticles.length > 0) {
      for (const article of rssArticles) {
        const existsIndex = db.posts.findIndex(p => p.id === article.id);
        if (existsIndex === -1) {
          db.posts.push(article);
          hasUpdates = true;
        } else {
          // If the post exists and has a new exact mediaUrl from Manila Bulletin
          if (article.mediaUrl && db.posts[existsIndex].mediaUrl !== article.mediaUrl) {
            db.posts[existsIndex].mediaUrl = article.mediaUrl;
            db.posts[existsIndex].mediaType = 'image';
            hasUpdates = true;
          }
        }
      }
    }

    // 2. Fetch ALL fresh Pinoy Teleserye Replay Video Episodes of the day via WP REST API & RSS
    const teleseryeArticles = await fetchTeleseryePosts();
    if (teleseryeArticles.length > 0) {
      for (const ep of teleseryeArticles) {
        const existsIndex = db.posts.findIndex(p => p.id === ep.id);
        if (existsIndex === -1) {
          db.posts.push(ep);
          hasUpdates = true;
        } else {
          // Update embedUrl, embedUrls, or mediaUrl if newly resolved
          let itemUpdated = false;
          if (ep.embedUrl && db.posts[existsIndex].embedUrl !== ep.embedUrl) {
            db.posts[existsIndex].embedUrl = ep.embedUrl;
            itemUpdated = true;
          }
          if (ep.embedUrls && JSON.stringify(db.posts[existsIndex].embedUrls) !== JSON.stringify(ep.embedUrls)) {
            db.posts[existsIndex].embedUrls = ep.embedUrls;
            itemUpdated = true;
          }
          if (ep.mediaUrl && db.posts[existsIndex].mediaUrl !== ep.mediaUrl) {
            db.posts[existsIndex].mediaUrl = ep.mediaUrl;
            itemUpdated = true;
          }
          if (ep.videoSourceAvailable !== undefined && db.posts[existsIndex].videoSourceAvailable !== ep.videoSourceAvailable) {
            db.posts[existsIndex].videoSourceAvailable = ep.videoSourceAvailable;
            itemUpdated = true;
          }
          if (ep.videoStreamType && db.posts[existsIndex].videoStreamType !== ep.videoStreamType) {
            db.posts[existsIndex].videoStreamType = ep.videoStreamType;
            itemUpdated = true;
          }
          if (ep.episodeTitle && db.posts[existsIndex].episodeTitle !== ep.episodeTitle) {
            db.posts[existsIndex].episodeTitle = ep.episodeTitle;
            itemUpdated = true;
          }
          if (itemUpdated) {
            db.posts[existsIndex].mediaType = 'video';
            hasUpdates = true;
          }
        }
      }
    }

    // Clean up any placeholder or non-authentic picsum photos from past RSS records
    for (const post of db.posts) {
      if ((post.isRss || post.userId === 'balita-rss-author') && post.mediaUrl && post.mediaUrl.includes('picsum.photos')) {
        // Attempt to fetch exact Manila Bulletin image if available, else clear
        const link = post.rssLink || (post.text.match(/https:\/\/balita\.mb\.com\.ph\/[^\s\n]+/i) ? post.text.match(/https:\/\/balita\.mb\.com\.ph\/[^\s\n]+/i)[0] : null);
        if (link && mbImageCache.has(link)) {
          post.mediaUrl = mbImageCache.get(link);
        } else {
          post.mediaUrl = undefined;
          post.mediaType = undefined;
        }
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      saveDB(db);
      console.log(`✅ Synced ${teleseryeArticles.length} Teleserye Replay Video Feeds & Balita News into Z-one DB!`);
    }
  } catch (err) {
    console.error('Error syncing RSS to DB:', err);
  }
}

// 1. GET ALL POSTS (Fast zero-lag response like Facebook)
app.get('/api/zone/posts', (req, res) => {
  // Sync RSS feed asynchronously in the background so client request is never blocked
  const now = Date.now();
  if (now - lastRssSyncTime > 10 * 60 * 1000) {
    lastRssSyncTime = now;
    syncRssToDatabase().catch(err => console.error('Background RSS sync failed:', err));
  }

  const db = loadDB();
  const posts = db.posts || [];

  // Sort posts: always newest first
  const sortedPosts = [...posts].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const page = parseInt(req.query.page as string) || 1;
  const limitParam = req.query.limit ? parseInt(req.query.limit as string) : (req.query.all === 'true' ? sortedPosts.length : 120);
  const limit = Math.min(Math.max(limitParam, 1), 500);
  const startIndex = (page - 1) * limit;
  const paginatedPosts = (req.query.all === 'true') ? sortedPosts : sortedPosts.slice(0, startIndex + limit);
  const hasMore = (startIndex + limit) < sortedPosts.length;

  res.json({ 
    posts: paginatedPosts,
    total: sortedPosts.length,
    hasMore,
    page
  });
});

// Explicit endpoint to force refresh RSS feeds on demand
app.post('/api/zone/posts/refresh-rss', async (req, res) => {
  try {
    lastRssSyncTime = Date.now();
    await syncRssToDatabase();
    const db = loadDB();
    const teleseryeCount = (db.posts || []).filter(p => p.userId === 'teleserye-feed-author' || p.category === 'Teleserye').length;
    res.json({ success: true, teleseryeCount, totalPosts: (db.posts || []).length, posts: db.posts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Explicit endpoint to re-check actual video stream for a specific episode post
app.post('/api/zone/posts/:id/check-stream', async (req, res) => {
  try {
    const { id } = req.params;
    const db = loadDB();
    const postIndex = (db.posts || []).findIndex(p => p.id === id);
    if (postIndex === -1) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = db.posts[postIndex];
    if (post.rssLink) {
      // Force bypass cache and re-fetch episode page details
      teleseryeDetailsCache.delete(post.rssLink);
      const { poster, videoSources, videoType } = await fetchExactTeleseryeDetails(post.rssLink);

      const hasValidVideo = videoSources.length > 0;
      post.embedUrl = hasValidVideo ? videoSources[0] : undefined;
      post.embedUrls = hasValidVideo ? videoSources : undefined;
      post.videoSourceAvailable = hasValidVideo;
      post.videoStreamType = videoType;
      if (poster && (!post.mediaUrl || post.mediaUrl.includes('picsum.photos'))) {
        post.mediaUrl = poster;
      }
      post.mediaType = 'video';

      saveDB(db);
      return res.json({ success: true, post, videoSourceAvailable: hasValidVideo });
    }

    res.json({ success: true, post, videoSourceAvailable: !!post.embedUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Real-time Teleserye stream diagnostic telemetry endpoint
app.get('/api/zone/teleserye-diagnostics', (_req, res) => {
  try {
    const db = loadDB();
    const teleseryePosts = (db.posts || []).filter(p => p.userId === 'teleserye-feed-author' || p.category === 'Teleserye');
    const withVideo = teleseryePosts.filter(p => p.videoSourceAvailable && (p.embedUrl || (p.embedUrls && p.embedUrls.length > 0)));
    const pending = teleseryePosts.filter(p => !p.videoSourceAvailable);

    const diagnostics = {
      totalEpisodes: teleseryePosts.length,
      playableVideoReady: withVideo.length,
      pendingUploadOrAiring: pending.length,
      samplePlayableEpisodes: withVideo.slice(0, 10).map(p => ({
        id: p.id,
        title: p.episodeTitle || p.text.slice(0, 40),
        streamType: p.videoStreamType,
        primaryEmbed: p.embedUrl,
        allSources: p.embedUrls,
        hasPoster: !!p.mediaUrl,
        date: p.createdAt
      })),
      samplePendingEpisodes: pending.slice(0, 5).map(p => ({
        id: p.id,
        title: p.episodeTitle || p.text.slice(0, 40),
        reason: 'Episode recently created / scheduled; video stream not yet uploaded by broadcaster',
        sourceLink: p.rssLink,
        date: p.createdAt
      }))
    };

    res.json({ success: true, diagnostics });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// UNIFIED HIGH-PERFORMANCE SYNC ROUTE WITH DELTA SYNCHRONIZATION
app.get('/api/zone/sync', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const sinceQuery = req.query.since ? String(req.query.since) : '';
  const sinceTime = sinceQuery ? new Date(sinceQuery).getTime() : 0;
  const isDelta = !isNaN(sinceTime) && sinceTime > 0;

  const db = loadDB();
  const allUserMessages = (db.directMessages || []).filter(m => m.senderId === userId || m.receiverId === userId);
  const messages = isDelta 
    ? allUserMessages.filter(m => new Date(m.createdAt).getTime() > sinceTime)
    : allUserMessages;
  
  if (!db.groupChats) db.groupChats = [];
  if (!db.groupMessages) db.groupMessages = [];

  // Ensure community group exists
  let commGroup = db.groupChats.find(g => g.id === 'gc-community-main');
  if (!commGroup) {
    commGroup = {
      id: 'gc-community-main',
      name: 'Ka-Zone Official Community GC 🌟',
      avatar: '🇵🇭',
      description: 'Opisyal na Group Chat ng lahat ng Ka-Zone members para sa kwentuhan, tulungan, at click-earning updates!',
      createdBy: 'admin-rosco',
      creatorName: 'System Administrator',
      members: ['admin-rosco', 'user-juan', 'user-clara'],
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.groupChats.push(commGroup);
    saveDB(db);
  }

  // Ensure current user is in the community group
  if (!commGroup.members.includes(userId)) {
    commGroup.members.push(userId);
    saveDB(db);
  }

  const myGroups = db.groupChats.filter(g => (g.members || []).includes(userId) || g.id === 'gc-community-main');
  const myGroupIds = myGroups.map(g => g.id);
  const allGroupMessages = (db.groupMessages || []).filter(m => myGroupIds.includes(m.groupId));
  const myGroupMessages = isDelta
    ? allGroupMessages.filter(m => new Date(m.createdAt).getTime() > sinceTime)
    : allGroupMessages;

  const now = Date.now();
  const activeCalls = (db.activeCalls || []).filter(c => 
    (c.callerId === userId || c.receiverId === userId) && 
    c.status !== 'ended' && 
    c.status !== 'declined' &&
    (now - new Date(c.createdAt).getTime() < 60000)
  );

  const onlineIds = Object.keys(activeUsersMap).filter(id => now - activeUsersMap[id] < 60000);
  if (!onlineIds.includes('admin-rosco')) onlineIds.push('admin-rosco');
  if (!onlineIds.includes('user-juan')) onlineIds.push('user-juan');

  // Format group chats with detailed member info & last message
  const userMap = new Map(db.users.map(u => [u.id, { id: u.id, name: u.name, avatar: u.avatar || '👤' }]));
  const formattedGroups = myGroups.map(g => {
    const groupMsgs = (db.groupMessages || []).filter(m => m.groupId === g.id);
    const lastMsg = groupMsgs.length > 0 ? groupMsgs[groupMsgs.length - 1] : null;
    return {
      ...g,
      memberDetails: (g.members || []).map(mid => userMap.get(mid) || { id: mid, name: 'Ka-Zone User', avatar: '👤' }),
      lastMessage: lastMsg ? lastMsg.text : '',
      lastMessageSender: lastMsg ? lastMsg.senderName : '',
      lastMessageTime: lastMsg ? lastMsg.createdAt : g.createdAt
    };
  });

  // Active stories within 24 hours
  if (!db.stories) db.stories = [];
  const activeStories = db.stories.filter(s => {
    const expires = new Date(s.expiresAt || 0).getTime();
    if (expires > now) return true;
    const created = new Date(s.createdAt || 0).getTime();
    return (now - created) < 24 * 60 * 60 * 1000;
  });
  const enrichedStories = activeStories.map(story => {
    const author = userMap.get(story.userId);
    return {
      ...story,
      userName: author ? author.name : story.userName,
      userAvatar: author ? (author.avatar || '👤') : story.userAvatar
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    isDelta,
    serverTime: new Date().toISOString(),
    messages,
    groups: formattedGroups,
    groupMessages: myGroupMessages,
    calls: activeCalls,
    onlineUserIds: onlineIds,
    stories: enrichedStories
  });
});

function extractMentionedUsers(text: string, users: UserSession[], authorId: string): UserSession[] {
  if (!text || typeof text !== 'string') return [];
  const mentioned: UserSession[] = [];
  const lowerText = text.toLowerCase();
  
  for (const u of users) {
    if (!u || u.id === authorId || !u.name) continue;
    const nameLower = u.name.toLowerCase().trim();
    const nameNoSpaces = nameLower.replace(/\s+/g, '');
    
    // Check if "@name" or "@namespaces" or "@username" is mentioned
    if (
      lowerText.includes(`@${nameLower}`) ||
      lowerText.includes(`@${nameNoSpaces}`) ||
      (u.email && lowerText.includes(`@${u.email.split('@')[0].toLowerCase()}`))
    ) {
      if (!mentioned.some(m => m.id === u.id)) {
        mentioned.push(u);
      }
    }
  }
  return mentioned;
}

// 2. CREATE A NEW POST
app.post('/api/zone/posts', async (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Mag-login muna upang makapag-post.' });
  }

  const { text, mediaUrl, mediaType, mediaUrls } = req.body;
  const db = loadDB();

  if (isUserBanned(db, userId)) {
    return res.status(403).json({ error: 'Ang iyong account ay banned sa system. Hindi ka pwedeng mag-post.' });
  }

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  // Auto-delete / Reject inappropriate posts (porn, nude, bastos)
  const isBase64Media = mediaUrl && (mediaUrl.startsWith('data:') || mediaUrl.startsWith('blob:'));
  let isMediaInappropriate = mediaUrl && !isBase64Media && containsInappropriateContent(mediaUrl);
  if (!isMediaInappropriate && mediaUrls && Array.isArray(mediaUrls)) {
    isMediaInappropriate = mediaUrls.some(url => {
      const isBase64 = url.startsWith('data:') || url.startsWith('blob:');
      return !isBase64 && containsInappropriateContent(url);
    });
  }

  if (containsInappropriateContent(text) || isMediaInappropriate) {
    return res.status(400).json({ 
      error: '⚠️ [AUTO-DELETE]: Ang post na ito ay hinarang at hindi inilathala dahil naglalaman ito ng malalaswang salita o pornographic content (Nude/Porn content are strictly forbidden!).' 
    });
  }

  // Clean swear words
  const cleanedText = filterSwearWords(text);

  let finalMediaUrl = mediaUrl;
  if (mediaUrl && (mediaUrl.startsWith('data:') || mediaUrl.startsWith('blob:'))) {
    const uploadResult = await uploadMediaToFirebaseStorage(mediaUrl, 'posts', user.id);
    if (!uploadResult || !uploadResult.url) {
      return res.status(502).json({ 
        error: 'Bigo ang pag-upload ng litrato/video sa Firebase Storage. Nananatili ang post sa Outbox para i-retry nang ligtas.',
        canRetry: true 
      });
    }
    finalMediaUrl = uploadResult.url;
  }

  let finalMediaUrls: string[] | undefined = undefined;
  if (mediaUrls && Array.isArray(mediaUrls)) {
    const uploadedList: string[] = [];
    for (const url of mediaUrls) {
      if (url && (url.startsWith('data:') || url.startsWith('blob:'))) {
        const uploadResult = await uploadMediaToFirebaseStorage(url, 'posts', user.id);
        if (!uploadResult || !uploadResult.url) {
          return res.status(502).json({ 
            error: 'Bigo ang pag-upload ng isa sa mga litrato sa Firebase Storage.',
            canRetry: true 
          });
        }
        uploadedList.push(uploadResult.url);
      } else if (url) {
        uploadedList.push(url);
      }
    }
    finalMediaUrls = uploadedList;
  }

  const newPost = {
    id: 'post-' + Date.now(),
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar || '👤',
    text: cleanedText,
    mediaUrl: finalMediaUrl || undefined,
    mediaType: mediaType || undefined,
    mediaUrls: finalMediaUrls || undefined,
    likes: [],
    comments: [],
    createdAt: new Date().toISOString()
  };

  if (!db.posts) {
    db.posts = [];
  }
  db.posts.push(newPost);
  saveDB(db, true);

  if (cloudDb.isActive) {
    const { id, ...pWithoutId } = newPost;
    cloudDb.setDoc('posts', newPost.id, pWithoutId).catch(err => {
      console.error('Direct cloud save error for Post:', err);
    });
  }

  // Push notifications for mentions in post
  const mentionedInPost = extractMentionedUsers(cleanedText, db.users, user.id);
  for (const mUser of mentionedInPost) {
    sendPushNotificationToUser(mUser.id, {
      title: `📢 Na-mention ka ni ${user.name}!`,
      body: `"${cleanedText.slice(0, 75)}"`,
      url: '/?tab=zone',
      tag: `post-mention-${newPost.id}`
    }).catch(() => {});
  }

  res.json({ success: true, post: newPost, message: 'Matagumpay na na-post sa Z-one!' });
});

// 3. TOGGLE LIKE (LIKE ONLY - NO UNLIKE & AWARD ₱0.05)
app.post('/api/zone/posts/:postId/like', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Mag-login upang mag-like at kumita ng ₱0.05.' });
  }

  const { postId } = req.params;
  const db = loadDB();

  if (isUserBanned(db, userId)) {
    return res.status(403).json({ error: 'Banned ka sa Z-one.' });
  }

  if (!db.posts) db.posts = [];
  const post = db.posts.find(p => p.id === postId);
  if (!post) {
    return res.status(404).json({ error: 'Hindi mahanap ang post.' });
  }

  post.likes = post.likes || [];
  const hasLiked = post.likes.includes(userId);
  if (hasLiked) {
    return res.status(400).json({ error: 'Naliked mo na ang post na ito! Hindi na ito pwedeng i-unlike.', likes: post.likes });
  }

  // Record user like (No unliking allowed)
  post.likes.push(userId);

  // Award ₱0.05 to registered user's balance
  const user = db.users.find(u => u.id === userId);
  if (user) {
    user.stats.balance = Number(((user.stats.balance || 0) + 0.05).toFixed(2));
    user.stats.completedTasksCount = (user.stats.completedTasksCount || 0) + 1;
    user.activityLogs = user.activityLogs || [];
    user.activityLogs.unshift({
      id: 'act-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      type: 'reward',
      title: '₱0.05 Social Post Like Reward',
      amount: 0.05,
      timestamp: new Date().toISOString(),
      details: 'Nakatanggap ng ₱0.05 reward sa pag-like ng post sa Z-one Social Feed.'
    });
  }

  saveDB(db, true);

  if (cloudDb.isActive) {
    const { id, ...pWithoutId } = post;
    cloudDb.setDoc('posts', post.id, pWithoutId).catch(() => {});
    if (user) {
      const { id: uid, ...uWithoutId } = user;
      cloudDb.setDoc('users', user.id, uWithoutId).catch(() => {});
    }
  }

  // Send push notification to post author if someone else liked the post
  if (post.userId && post.userId !== userId) {
    sendPushNotificationToUser(post.userId, {
      title: '❤️ Bagong Like sa iyong Post',
      body: `Nag-like si ${user ? user.name : 'isang user'} sa iyong post sa Z-one!`,
      url: '/?tab=zone',
      tag: `post-like-${postId}`
    }).catch(() => {});
  }

  res.json({ 
    success: true, 
    likes: post.likes, 
    reward: 0.05, 
    newBalance: user ? user.stats.balance : undefined, 
    message: '🎉 +₱0.05 Reward sa pag-like ng post!' 
  });
});

// 4. POST COMMENT
app.post('/api/zone/posts/:postId/comment', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Mag-login upang mag-comment.' });
  }

  const { postId } = req.params;
  const { text } = req.body;
  const db = loadDB();

  if (isUserBanned(db, userId)) {
    return res.status(403).json({ error: 'Banned ka sa Z-one.' });
  }

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Walang nilalaman ang iyong comment.' });
  }

  if (containsInappropriateContent(text)) {
    return res.status(400).json({ 
      error: '⚠️ [AUTO-DELETE COMMENT]: Hinarang ang iyong comment dahil naglalaman ito ng bastos o malalaswang salita.' 
    });
  }

  const cleanedComment = filterSwearWords(text);

  if (!db.posts) db.posts = [];
  const post = db.posts.find(p => p.id === postId);
  if (!post) {
    return res.status(404).json({ error: 'Hindi mahanap ang post.' });
  }

  const newComment = {
    id: 'comment-' + Date.now(),
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar || '👤',
    text: cleanedComment,
    createdAt: new Date().toISOString()
  };

  post.comments.push(newComment);
  saveDB(db, true);

  if (cloudDb.isActive) {
    const { id, ...pWithoutId } = post;
    cloudDb.setDoc('posts', post.id, pWithoutId).catch(() => {});
  }

  // Send push notification to post author if someone else commented
  if (post.userId && post.userId !== userId) {
    sendPushNotificationToUser(post.userId, {
      title: `💬 Bagong Komento mula kay ${user.name}`,
      body: `"${cleanedComment.slice(0, 70)}"`,
      url: '/?tab=zone',
      tag: `post-comment-${postId}`
    }).catch(() => {});
  }

  // Push notifications for mentions in comment
  const mentionedInComment = extractMentionedUsers(cleanedComment, db.users, user.id);
  for (const mUser of mentionedInComment) {
    if (mUser.id !== post.userId) {
      sendPushNotificationToUser(mUser.id, {
        title: `💬 Na-mention ka ni ${user.name} sa isang komento!`,
        body: `"${cleanedComment.slice(0, 75)}"`,
        url: '/?tab=zone',
        tag: `comment-mention-${postId}-${newComment.id}`
      }).catch(() => {});
    }
  }

  res.json({ success: true, comments: post.comments });
});

// 4b. SHARE POST
app.post('/api/zone/posts/:postId/share', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Mag-login muna upang makapag-share.' });
  }

  const { postId } = req.params;
  const { text } = req.body; // Optional text caption when sharing
  const db = loadDB();

  if (isUserBanned(db, userId)) {
    return res.status(403).json({ error: 'Banned ka sa Z-one.' });
  }

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  if (!db.posts) db.posts = [];
  const originalPost = db.posts.find(p => p.id === postId);
  if (!originalPost) {
    return res.status(404).json({ error: 'Hindi mahanap ang post na ishe-share.' });
  }

  // Auto-delete / Reject inappropriate captions
  const cleanedText = text ? filterSwearWords(text) : '';
  if (text && containsInappropriateContent(text)) {
    return res.status(400).json({ 
      error: '⚠️ [AUTO-DELETE]: Ang share caption ay hinarang dahil naglalaman ito ng malalaswang salita.' 
    });
  }

  // Create new post representing the share
  const newPost = {
    id: 'post-' + Date.now(),
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar || '👤',
    text: cleanedText,
    likes: [],
    comments: [],
    createdAt: new Date().toISOString(),
    sharedPost: {
      id: originalPost.sharedPost ? originalPost.sharedPost.id : originalPost.id,
      userId: originalPost.sharedPost ? originalPost.sharedPost.userId : originalPost.userId,
      userName: originalPost.sharedPost ? originalPost.sharedPost.userName : originalPost.userName,
      userAvatar: originalPost.sharedPost ? originalPost.sharedPost.userAvatar : originalPost.userAvatar,
      text: originalPost.sharedPost ? originalPost.sharedPost.text : originalPost.text,
      mediaUrl: originalPost.sharedPost ? originalPost.sharedPost.mediaUrl : originalPost.mediaUrl,
      mediaType: originalPost.sharedPost ? originalPost.sharedPost.mediaType : originalPost.mediaType,
      mediaUrls: originalPost.sharedPost ? originalPost.sharedPost.mediaUrls : originalPost.mediaUrls,
      createdAt: originalPost.sharedPost ? originalPost.sharedPost.createdAt : originalPost.createdAt
    }
  };

  db.posts.push(newPost);
  saveDB(db, true);

  if (cloudDb.isActive) {
    const { id, ...pWithoutId } = newPost;
    cloudDb.setDoc('posts', newPost.id, pWithoutId).catch(() => {});
  }

  res.json({ success: true, post: newPost, message: 'Matagumpay na na-share ang post!' });
});

// 4c. EDIT A POST
app.put('/api/zone/posts/:postId', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Mag-login muna.' });
  }

  const { postId } = req.params;
  const { text } = req.body;
  const db = loadDB();

  if (isUserBanned(db, userId)) {
    return res.status(403).json({ error: 'Banned ka sa Z-one.' });
  }

  if (!db.posts) db.posts = [];
  const post = db.posts.find(p => p.id === postId);
  if (!post) {
    return res.status(404).json({ error: 'Hindi mahanap ang post.' });
  }

  if (post.userId !== userId) {
    return res.status(403).json({ error: 'Wala kang pahintulot na i-edit ang post na ito.' });
  }

  // Check if post is older than 2 minutes (120000ms)
  const postTime = new Date(post.createdAt).getTime();
  if (Date.now() - postTime > 120000) {
    return res.status(400).json({ error: 'Hindi mo na pwedeng i-edit ang post na ito dahil lumagpas na ang 2 minuto.' });
  }

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Hindi pwedeng walang laman ang iyong post.' });
  }

  if (containsInappropriateContent(text)) {
    return res.status(400).json({ 
      error: '⚠️ [AUTO-DELETE]: Ang in-edit na nilalaman ay hinarang dahil naglalaman ito ng malalaswang salita.' 
    });
  }

  post.text = filterSwearWords(text);
  saveDB(db, true);

  if (cloudDb.isActive) {
    const { id, ...pWithoutId } = post;
    cloudDb.setDoc('posts', post.id, pWithoutId).catch(() => {});
  }

  res.json({ success: true, post, message: 'Matagumpay na na-update ang post!' });
});

// 4d. DELETE A POST
app.delete('/api/zone/posts/:postId', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Mag-login muna.' });
  }

  const { postId } = req.params;
  const db = loadDB();

  if (!db.posts) db.posts = [];
  const postIndex = db.posts.findIndex(p => p.id === postId);
  if (postIndex === -1) {
    return res.status(404).json({ error: 'Hindi mahanap ang post.' });
  }

  const post = db.posts[postIndex];
  const isMyOwnPost = post.userId === userId;

  if (isMyOwnPost) {
    // Check if post is older than 2 minutes (120000ms)
    const postTime = new Date(post.createdAt).getTime();
    if (Date.now() - postTime > 120000) {
      return res.status(400).json({ error: 'Hindi mo na pwedeng i-delete ang post na ito dahil lumagpas na ang 2 minuto.' });
    }
  }

  if (post.userId !== userId) {
    // Check if the user is admin as well
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Wala kang pahintulot na i-delete ang post na ito.' });
    }
  }

  db.posts.splice(postIndex, 1);
  saveDB(db, true);

  if (cloudDb.isActive) {
    cloudDb.deleteDoc('posts', postId).catch(() => {});
  }

  res.json({ success: true, message: 'Matagumpay na na-delete ang post!' });
});

// 4e. EDIT A COMMENT
app.put('/api/zone/posts/:postId/comments/:commentId', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Mag-login muna.' });
  }

  const { postId, commentId } = req.params;
  const { text } = req.body;
  const db = loadDB();

  if (isUserBanned(db, userId)) {
    return res.status(403).json({ error: 'Banned ka sa Z-one.' });
  }

  if (!db.posts) db.posts = [];
  const post = db.posts.find(p => p.id === postId);
  if (!post) {
    return res.status(404).json({ error: 'Hindi mahanap ang post.' });
  }

  const comment = post.comments.find((c: any) => c.id === commentId);
  if (!comment) {
    return res.status(404).json({ error: 'Hindi mahanap ang comment.' });
  }

  if (comment.userId !== userId) {
    return res.status(403).json({ error: 'Wala kang pahintulot na i-edit ang comment na ito.' });
  }

  // Check if comment is older than 2 minutes (120000ms)
  const commentTime = new Date(comment.createdAt).getTime();
  if (Date.now() - commentTime > 120000) {
    return res.status(400).json({ error: 'Hindi mo na pwedeng i-edit ang comment na ito dahil lumagpas na ang 2 minuto.' });
  }

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Hindi pwedeng walang laman ang comment.' });
  }

  if (containsInappropriateContent(text)) {
    return res.status(400).json({ 
      error: '⚠️ [AUTO-DELETE]: Ang comment ay hinarang dahil naglalaman ito ng malalaswang salita.' 
    });
  }

  comment.text = filterSwearWords(text);
  saveDB(db);

  res.json({ success: true, comments: post.comments, message: 'Matagumpay na na-edit ang comment!' });
});

// 4f. DELETE A COMMENT
app.delete('/api/zone/posts/:postId/comments/:commentId', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Mag-login muna.' });
  }

  const { postId, commentId } = req.params;
  const db = loadDB();

  if (!db.posts) db.posts = [];
  const post = db.posts.find(p => p.id === postId);
  if (!post) {
    return res.status(404).json({ error: 'Hindi mahanap ang post.' });
  }

  const commentIndex = post.comments.findIndex((c: any) => c.id === commentId);
  if (commentIndex === -1) {
    return res.status(404).json({ error: 'Hindi mahanap ang comment.' });
  }

  const comment = post.comments[commentIndex];
  const isMyOwnComment = comment.userId === userId;

  if (isMyOwnComment) {
    // Check if comment is older than 2 minutes (120000ms)
    const commentTime = new Date(comment.createdAt).getTime();
    if (Date.now() - commentTime > 120000) {
      return res.status(400).json({ error: 'Hindi mo na pwedeng i-delete ang comment na ito dahil lumagpas na ang 2 minuto.' });
    }
  }

  if (comment.userId !== userId) {
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Wala kang pahintulot na i-delete ang comment na ito.' });
    }
  }

  post.comments.splice(commentIndex, 1);
  saveDB(db);

  res.json({ success: true, comments: post.comments, message: 'Matagumpay na na-delete ang comment!' });
});

// 5. TOGGLE ZONE (FOLLOW)
app.post('/api/zone/users/:targetUserId/toggle-zone', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Mag-login muna.' });
  }

  const { targetUserId } = req.params;
  if (userId === targetUserId) {
    return res.status(400).json({ error: 'Hindi mo pwedeng i-Zone ang iyong sarili!' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  const targetUser = db.users.find(u => u.id === targetUserId);

  if (!user || !targetUser) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  if (!user.zonedUsers) {
    user.zonedUsers = [];
  }

  const zonedIndex = user.zonedUsers.indexOf(targetUserId);
  let isZoned = false;
  if (zonedIndex > -1) {
    user.zonedUsers.splice(zonedIndex, 1); // Unzone
  } else {
    user.zonedUsers.push(targetUserId); // Zone
    isZoned = true;
  }

  saveDB(db);
  res.json({ success: true, isZoned, zonedUsersCount: user.zonedUsers.length, zonedUsers: user.zonedUsers });
});

// 6. ADMIN GET ALL USERS FOR MODERATION
app.get('/api/admin/moderation/users', (req, res) => {
  const adminId = req.headers.authorization;
  if (!adminId) {
    return res.status(401).json({ error: 'Admin access required.' });
  }

  const db = loadDB();
  const adminUser = db.users.find(u => u.id === adminId && u.isAdmin);
  if (!adminUser) {
    return res.status(403).json({ error: 'Wala kang pahintulot na tingnan ito.' });
  }

  const safeUsers = db.users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar,
    isBanned: !!u.isBanned,
    isAdmin: !!u.isAdmin,
    createdAt: u.createdAt,
    zonedUsersCount: (u.zonedUsers || []).length
  }));

  res.json({ users: safeUsers });
});

// 7. ADMIN BAN/UNBAN USER
app.post('/api/admin/moderation/users/:userId/toggle-ban', (req, res) => {
  const adminId = req.headers.authorization;
  if (!adminId) {
    return res.status(401).json({ error: 'Admin access required.' });
  }

  const { userId } = req.params;
  const db = loadDB();
  const adminUser = db.users.find(u => u.id === adminId && u.isAdmin);
  if (!adminUser) {
    return res.status(403).json({ error: 'Wala kang pahintulot na gawin ito.' });
  }

  if (userId === adminId) {
    return res.status(400).json({ error: 'Hindi mo pwedeng i-ban ang iyong sarili.' });
  }

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  user.isBanned = !user.isBanned;

  if (!user.activityLogs) {
    user.activityLogs = [];
  }

  // Add notification inside user activity log
  user.activityLogs.unshift({
    id: 'ban-toggle-' + Date.now(),
    type: 'bonus',
    title: user.isBanned ? '🔴 ACCOUNT BANNED' : '🟢 ACCOUNT UNBANNED',
    amount: 0,
    timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
    details: user.isBanned 
      ? 'Ika-banned ng administrator ang iyong account dahil sa paglabag sa Community Rules ng Z-one.'
      : 'Binawi ng administrator ang pagka-ban sa iyong account. Sumunod po tayo sa community rules.'
  });

  saveDB(db);
  res.json({ success: true, isBanned: user.isBanned, message: `Matagumpay na ${user.isBanned ? 'banned' : 'unbanned'} ang user.` });
});


// SIMULATE TRIAL EXPIRATION FOR QUICK TESTING & DEMONSTRATION
app.post('/api/user/simulate-expire', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Mag-login muna.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  // Set registration date back 2 days so they are past the 1-day free trial limit
  user.createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  // Reset active subscription so they gets trial-expired block
  user.subscription = {
    status: 'none',
    planId: null,
    requestedPlanName: null,
    requestedAmount: null,
    requestedAt: null,
    expiresAt: null
  };

  user.activityLogs.unshift({
    id: 'sim-expire-' + Date.now(),
    type: 'bonus',
    title: 'Simulated 1-Day Trial Expiration',
    amount: 0,
    timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
    details: 'Tinapos ang iyong 1-day free trial para sa mabilisang pagsusuri ng subscription features.'
  });

  saveDB(db);
  const { password: _, ...userSafe } = user as any;
  res.json({ user: userSafe });
});


// ============================================
//       Z-ONE SOCIAL DMs & CALLS API
// ============================================

// GET ALL REGISTERED USERS (FOR MESSAGING DIRECTORY)
app.get('/api/zone/users', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }
  const db = loadDB();
  const list = (db.users || []).map(u => ({
    id: u.id,
    name: u.name,
    avatar: u.avatar || '👤'
  }));
  res.json({ users: list });
});

// 1. GET ALL MY DIRECT MESSAGES
app.get('/api/zone/messages', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }
  const db = loadDB();
  const messages = db.directMessages || [];
  const myMessages = messages.filter(m => m.senderId === userId || m.receiverId === userId);
  res.json({ messages: myMessages });
});

// --- SYSTEM ADMINISTRATOR (AI ASSISTANT) CHATBOT CONFIGURATION ---
const ZONE_APP_INFO = `
Z-oneApp (Z-one) is a modern social media and click-earning platform with these features:
1. **Social Media Feed**: Users can create, edit, or delete posts (with images/videos), like, comment, and "Zone" (follow) other users.
2. **Direct Messages (DM)**: Users can chat with each other in real-time.
3. **Voice & Video Calling**: Users can call other users directly through the DM chat interface.
4. **Click-Earning Campaigns / Tasks**: Users can complete tasks (reading guides on Shopee, GCash, Inquirer, JobStreet remote jobs, Biyaheng Pinas, DITO SIM, Piso WiFi, Pag-IBIG MP2, SSS Salary Loan, PhilHealth, DTI, Binondo Food Trip, Tagaytay, Lazada, etc.) to earn real monetary rewards in Philippine Pesos (₱). Each task has a timer (e.g., 10-20 seconds) and a reward amount (e.g., ₱1 to ₱15).
5. **Daily Check-in**: Users can check in daily to claim a bonus reward.
6. **Referral System**: Users can invite friends using their unique referral code and earn bonuses and commissions from their invited friends' earnings.
7. **Withdrawals**: Users can request withdrawals of their earnings to GCash, Maya, or bank accounts (processed/approved by an administrator).
8. **Subscription Tiers**: Users can upgrade their levels (e.g., Regular, Gold, Premium, VIP) to get higher benefits, subject to admin approval.
9. **Admin Panel**: Admins can ban users, moderate posts/comments, manage/create website campaigns, and approve/decline withdrawals and subscriptions.
10. **2-Minute Rule**: Direct messages, posts, and comments can only be edited or deleted (un-sent) within 2 minutes after they are created.

IMPORTANT BEHAVIOR RULES:
- You are the System Administrator of Z-oneApp.
- You must speak in a friendly, polite, and helpful tone, using conversational Tagalog, Taglish, or English (match the language of the user).
- **Rule 1 (Within Scope)**: If the user asks about Z-oneApp, its features, details, campaigns, how to earn, referrals, daily check-in, subscriptions, or rules, answer them accurately and fully based on the information above.
- **Rule 2 (Out of Scope)**: If the user asks about anything NOT related to Z-oneApp (e.g., general school questions, irrelevant tasks, unrelated products, personal problems, general knowledge, math, programming etc.), you MUST politely state that this is not within the scope of Z-oneApp and direct them to talk to the administrator or coach who invited them.
- Example response for Out of Scope: "Pasensya na po, ang inyong tanong ay hindi saklaw ng Z-oneApp. Mangyaring makipag-ugnayan o makipag-usap sa inyong administrator o coach na nag-invite sa inyo dahil hindi ito saklaw ng aming system administrator."
`;

let geminiClientInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClientInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not defined. AI automated replies will use fallback heuristics.");
      return null;
    }
    geminiClientInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return geminiClientInstance;
}

function getFallbackResponse(text: string): string {
  const lower = text.toLowerCase();
  
  // List of keywords related to Z-oneApp
  const zoneKeywords = [
    'z-one', 'zone', 'app', 'kita', 'earn', 'sweldo', 'pera', 'withdraw', 'daily', 'check', 'checkin', 
    'check-in', 'commission', 'referral', 'campaign', 'task', 'post', 'comment', 'message', 'call', 
    'pindot', 'click', 'shopee', 'gcash', 'maya', 'bank', 'subscription', 'gold', 'premium', 'vip', 'rule', 'banned'
  ];

  const isRelated = zoneKeywords.some(keyword => lower.includes(keyword));

  if (isRelated) {
    if (lower.includes('kita') || lower.includes('earn') || lower.includes('campaign') || lower.includes('task') || lower.includes('pindot')) {
      return "Salamat sa pagtatanong! Sa Z-oneApp, pwede kang kumita sa pamamagitan ng pagkumpleto ng mga Website Campaigns sa 'Campaigns' section. Pindutin lamang ang task, mag-antay matapos ang timer, at makukuha mo na ang reward sa iyong wallet! Pwede ka ring mag-check-in araw-araw at mag-imbita ng mga kaibigan para sa karagdagang bonus.";
    }
    if (lower.includes('withdraw') || lower.includes('pera') || lower.includes('sweldo')) {
      return "Para sa withdrawals, pumunta sa iyong Wallet page at i-request ang payout gamit ang iyong GCash, Maya, o Bank Account. Ipo-process ito ng administrator sa lalong madaling panahon.";
    }
    if (lower.includes('referral') || lower.includes('commission') || lower.includes('imbita') || lower.includes('invite')) {
      return "Maaari mong gamitin ang iyong natatanging Referral Code sa 'Profile/Wallet' tab. Ibahagi ito sa iyong mga kaibigan upang makakuha ka ng commission mula sa bawat natapos nilang campaigns!";
    }
    if (lower.includes('subscription') || lower.includes('upgrade') || lower.includes('gold') || lower.includes('premium') || lower.includes('vip')) {
      return "Maaari kang mag-request ng upgrade ng iyong subscription tier sa pamamagitan ng pagpindot ng 'Upgrade Account' sa dashboard. Susuriin at aaprubahan ito ng aming admin.";
    }
    return "Salamat sa pakikipag-ugnayan ukol sa Z-oneApp! Ang Z-one ay isang social media portal kung saan pwede kayong mag-post, mag-like, mag-comment, at mag-Zone habang kumikita sa pamamagitan ng pagkumpleto ng simpleng tasks at campaigns. Mayroon pa ba kayong ibang katanungan tungkol sa mga feature na ito?";
  } else {
    return "Pasensya na po, ang inyong tanong ay hindi saklaw ng Z-oneApp. Mangyaring makipag-ugnayan o makipag-usap sa inyong administrator o coach na nag-invite sa inyo dahil hindi ito saklaw ng aming system administrator.";
  }
}

async function handleAdminAutoReply(userSenderId: string, userText: string) {
  // Let it sleep for a short duration (e.g. 500ms) to look realistic
  await new Promise(resolve => setTimeout(resolve, 600));

  const db = loadDB();
  const user = db.users.find(u => u.id === userSenderId);
  if (!user) return;

  const messages = db.directMessages || [];
  const chatHistory = messages
    .filter(m => (m.senderId === userSenderId && m.receiverId === 'admin-rosco') || (m.senderId === 'admin-rosco' && m.receiverId === userSenderId))
    .slice(-10);

  const aiClient = getGeminiClient();
  let replyText = '';

  if (aiClient) {
    try {
      const formattedHistory = chatHistory.map(m => {
        const role = m.senderId === 'admin-rosco' ? 'model' : 'user';
        return {
          role,
          parts: [{ text: `${m.senderName}: ${m.text}` }]
        };
      });

      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          ...formattedHistory,
          { role: 'user', parts: [{ text: `${user.name}: ${userText}` }] }
        ],
        config: {
          systemInstruction: `You are the System Administrator of Z-oneApp (Z-one), acting like Meta. Stay strictly in character. If the user's question or topic is NOT related to or covered by Z-oneApp, strictly apply Rule 2 and direct them to talk to their administrator or coach who invited them because it is outside system support. Do not answer general knowledge, school questions, code, math, or other unrelated things.`
        }
      });

      replyText = response.text || '';
    } catch (apiErr) {
      console.error('Gemini API call failed, falling back to heuristic response:', apiErr);
      replyText = getFallbackResponse(userText);
    }
  } else {
    replyText = getFallbackResponse(userText);
  }

  replyText = filterSwearWords(replyText);

  const freshDb = loadDB();
  const adminReply: DirectMessage = {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
    senderId: 'admin-rosco',
    senderName: 'System Administrator',
    senderAvatar: '👑',
    receiverId: userSenderId,
    receiverName: user.name,
    receiverAvatar: user.avatar || '👤',
    text: replyText,
    createdAt: new Date().toISOString()
  };

  if (!freshDb.directMessages) {
    freshDb.directMessages = [];
  }
  freshDb.directMessages.push(adminReply);
  saveDB(freshDb);
}

// 2. SEND A DIRECT MESSAGE
app.post('/api/zone/messages', async (req, res) => {
  const senderId = req.headers.authorization;
  if (!senderId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }
  const { receiverId, text, mediaUrl, mediaType, clientMessageId, tempId } = req.body;
  if (!receiverId || ((!text || !text.trim()) && !mediaUrl)) {
    return res.status(400).json({ error: 'Kinakailangan ang receiver at mensahe o litrato/video.' });
  }

  const db = loadDB();

  // Server-Side Idempotency Protection: Prevent duplicate message creation on network retries
  const dedupId = (clientMessageId || tempId) ? String(clientMessageId || tempId).trim() : '';
  if (dedupId && Array.isArray(db.directMessages)) {
    const existingMsg = db.directMessages.find(
      m => (m.clientMessageId === dedupId || m.id === dedupId) && m.senderId === senderId
    );
    if (existingMsg) {
      return res.json({ success: true, message: existingMsg, deduped: true });
    }
  }

  const sender = db.users.find(u => u.id === senderId);
  const receiver = db.users.find(u => u.id === receiverId);

  if (!sender || !receiver) {
    return res.status(404).json({ error: 'Hindi mahanap ang sender o receiver.' });
  }

  if (isUserBanned(db, senderId)) {
    return res.status(403).json({ error: 'Ang iyong account ay banned sa system.' });
  }

  const filteredText = text ? filterSwearWords(text) : '';
  let processedMediaUrl = mediaUrl;
  if (mediaUrl && mediaUrl.startsWith('data:')) {
    const uploadResult = await uploadMediaToFirebaseStorage(mediaUrl, 'direct-messages', senderId);
    if (!uploadResult || !uploadResult.url) {
      return res.status(502).json({ 
        error: 'Bigo ang pag-upload ng media sa Firebase Storage. Nananatili ang mensahe sa iyong Outbox para i-retry.',
        canRetry: true 
      });
    }
    processedMediaUrl = uploadResult.url;
  }

  const newMsg: DirectMessage = {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
    clientMessageId: dedupId || undefined,
    senderId,
    senderName: sender.name,
    senderAvatar: sender.avatar,
    receiverId,
    receiverName: receiver.name,
    receiverAvatar: receiver.avatar,
    text: filteredText,
    mediaUrl: processedMediaUrl || undefined,
    mediaType: mediaType || (processedMediaUrl ? (processedMediaUrl.match(/\.(mp4|webm|mov|ogg)$/i) ? 'video' : 'image') : undefined),
    createdAt: new Date().toISOString()
  };

  if (!db.directMessages) {
    db.directMessages = [];
  }
  db.directMessages.push(newMsg);
  saveDB(db, true);

  if (cloudDb.isActive) {
    const { id, ...dmWithoutId } = newMsg;
    cloudDb.setDoc('direct_messages', newMsg.id, dmWithoutId).catch(err => {
      console.error('Direct cloud save error for Direct Message:', err);
    });
  }

  // Send background push notification to the receiver
  sendPushNotificationToUser(receiverId, {
    title: `💬 ${sender.name}`,
    body: filteredText || (newMsg.mediaType === 'video' ? '📹 Nagpadala ng video' : '📷 Nagpadala ng litrato'),
    url: '/?tab=zone&zoneTab=messages',
    tag: `dm-${senderId}`
  });

  // Trigger admin auto reply if sent to the System Administrator
  if (receiverId === 'admin-rosco') {
    handleAdminAutoReply(senderId, text || 'Nagpadala ng media attachment').catch(err => {
      console.error('Error generating admin auto reply:', err);
    });
  }

  res.json({ success: true, message: newMsg });
});

// 2b. EDIT A DIRECT MESSAGE
app.put('/api/zone/messages/:messageId', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const { messageId } = req.params;
  const { text } = req.body;
  const db = loadDB();

  if (isUserBanned(db, userId)) {
    return res.status(403).json({ error: 'Banned ka sa system.' });
  }

  if (!db.directMessages) db.directMessages = [];
  const msg = db.directMessages.find(m => m.id === messageId);
  if (!msg) {
    return res.status(404).json({ error: 'Hindi mahanap ang mensahe.' });
  }

  if (msg.senderId !== userId) {
    return res.status(403).json({ error: 'Wala kang pahintulot na i-edit ang mensaheng ito.' });
  }

  // Check if message is older than 2 minutes (120000ms)
  const messageTime = new Date(msg.createdAt).getTime();
  if (Date.now() - messageTime > 120000) {
    return res.status(400).json({ error: 'Hindi mo na pwedeng i-edit ang mensaheng ito dahil lumagpas na ang 2 minuto.' });
  }

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Hindi pwedeng walang laman ang mensahe.' });
  }

  msg.text = filterSwearWords(text);
  saveDB(db, true);

  if (cloudDb.isActive) {
    const { id, ...dmWithoutId } = msg;
    cloudDb.setDoc('direct_messages', msg.id, dmWithoutId).catch(() => {});
  }

  res.json({ success: true, message: msg, messageText: 'Matagumpay na na-edit ang mensahe!' });
});

// 2c. DELETE A DIRECT MESSAGE
app.delete('/api/zone/messages/:messageId', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const { messageId } = req.params;
  const db = loadDB();

  if (!db.directMessages) db.directMessages = [];
  const msgIndex = db.directMessages.findIndex(m => m.id === messageId);
  if (msgIndex === -1) {
    return res.status(404).json({ error: 'Hindi mahanap ang mensahe.' });
  }

  const msg = db.directMessages[msgIndex];
  if (msg.senderId !== userId) {
    return res.status(403).json({ error: 'Wala kang pahintulot na i-delete ang mensaheng ito.' });
  }

  // Check if message is older than 2 minutes (120000ms)
  const messageTime = new Date(msg.createdAt).getTime();
  if (Date.now() - messageTime > 120000) {
    return res.status(400).json({ error: 'Hindi mo na pwedeng i-unsend/delete ang mensaheng ito dahil lumagpas na ang 2 minuto.' });
  }

  db.directMessages.splice(msgIndex, 1);
  saveDB(db, true);

  if (cloudDb.isActive) {
    cloudDb.deleteDoc('direct_messages', messageId).catch(err => {
      console.error('Direct cloud delete error for Direct Message:', err);
    });
  }

  res.json({ success: true, message: 'Matagumpay na na-delete ang mensahe!' });
});

// --- GROUP CHAT (GC) ENDPOINTS ---

// 1. GET ALL GROUP CHATS FOR CURRENT USER
app.get('/api/zone/groups', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const db = loadDB();
  if (!db.groupChats) db.groupChats = [];
  if (!db.groupMessages) db.groupMessages = [];

  // Ensure community group exists
  let commGroup = db.groupChats.find(g => g.id === 'gc-community-main');
  if (!commGroup) {
    commGroup = {
      id: 'gc-community-main',
      name: 'Ka-Zone Official Community GC 🌟',
      avatar: '🇵🇭',
      description: 'Opisyal na Group Chat ng lahat ng Ka-Zone members para sa kwentuhan, tulungan, at click-earning updates!',
      createdBy: 'admin-rosco',
      creatorName: 'System Administrator',
      members: ['admin-rosco', 'user-juan', 'user-clara'],
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.groupChats.push(commGroup);
    saveDB(db);
  }

  if (!commGroup.members.includes(userId)) {
    commGroup.members.push(userId);
    saveDB(db);
  }

  const userMap = new Map(db.users.map(u => [u.id, { id: u.id, name: u.name, avatar: u.avatar || '👤' }]));
  const myGroups = db.groupChats.filter(g => (g.members || []).includes(userId) || g.id === 'gc-community-main');

  const formattedGroups = myGroups.map(g => {
    const groupMsgs = (db.groupMessages || []).filter(m => m.groupId === g.id);
    const lastMsg = groupMsgs.length > 0 ? groupMsgs[groupMsgs.length - 1] : null;
    return {
      ...g,
      memberDetails: (g.members || []).map(mid => userMap.get(mid) || { id: mid, name: 'Ka-Zone User', avatar: '👤' }),
      lastMessage: lastMsg ? lastMsg.text : '',
      lastMessageSender: lastMsg ? lastMsg.senderName : '',
      lastMessageTime: lastMsg ? lastMsg.createdAt : g.createdAt
    };
  });

  // Sort by last message time
  formattedGroups.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

  res.json({ groups: formattedGroups });
});

// 2. CREATE A NEW GROUP CHAT
app.post('/api/zone/groups', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const { name, avatar, memberIds, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Kinakailangan ang pangalan ng Group Chat.' });
  }

  const db = loadDB();
  if (isUserBanned(db, userId)) {
    return res.status(403).json({ error: 'Banned ka sa system.' });
  }

  const creator = db.users.find(u => u.id === userId);
  if (!creator) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  if (!db.groupChats) db.groupChats = [];
  if (!db.groupMessages) db.groupMessages = [];

  const allMembers = Array.from(new Set([userId, ...(Array.isArray(memberIds) ? memberIds : [])]));
  const cleanName = filterSwearWords(name.trim());
  const cleanDesc = description ? filterSwearWords(description.trim()) : '';

  const newGroup: GroupChat = {
    id: 'gc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
    name: cleanName,
    avatar: avatar || '👥',
    description: cleanDesc,
    createdBy: userId,
    creatorName: creator.name,
    members: allMembers,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.groupChats.push(newGroup);

  // Add initial system creation message
  const initialMsg: GroupMessage = {
    id: 'gmsg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
    groupId: newGroup.id,
    senderId: 'system',
    senderName: 'System Notice',
    senderAvatar: '📢',
    text: `${creator.name} created the group "${cleanName}". Welcome everyone!`,
    createdAt: new Date().toISOString()
  };
  db.groupMessages.push(initialMsg);

  saveDB(db, true);

  if (cloudDb.isActive) {
    const { id, ...gWithoutId } = newGroup;
    const { id: mid, ...gmWithoutId } = initialMsg;
    cloudDb.setDoc('group_chats', newGroup.id, gWithoutId).catch(() => {});
    cloudDb.setDoc('group_messages', initialMsg.id, gmWithoutId).catch(() => {});
  }

  const userMap = new Map(db.users.map(u => [u.id, { id: u.id, name: u.name, avatar: u.avatar || '👤' }]));
  const formattedGroup = {
    ...newGroup,
    memberDetails: (newGroup.members || []).map(mid => userMap.get(mid) || { id: mid, name: 'Ka-Zone User', avatar: '👤' }),
    lastMessage: initialMsg.text,
    lastMessageSender: initialMsg.senderName,
    lastMessageTime: initialMsg.createdAt
  };

  res.json({ success: true, group: formattedGroup });
});

// 3. GET MESSAGES FOR A GROUP CHAT
app.get('/api/zone/groups/:groupId/messages', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const { groupId } = req.params;
  const db = loadDB();
  if (!db.groupChats) db.groupChats = [];
  if (!db.groupMessages) db.groupMessages = [];

  const group = db.groupChats.find(g => g.id === groupId);
  if (!group) {
    return res.status(404).json({ error: 'Hindi mahanap ang Group Chat.' });
  }

  // Ensure membership if it's community group
  if (group.id === 'gc-community-main' && !group.members.includes(userId)) {
    group.members.push(userId);
    saveDB(db);
  }

  if (!group.members.includes(userId)) {
    return res.status(403).json({ error: 'Hindi ka miyembro ng Group Chat na ito.' });
  }

  const messages = db.groupMessages.filter(m => m.groupId === groupId);
  res.json({ messages });
});

// 4. SEND A MESSAGE IN GROUP CHAT
app.post('/api/zone/groups/:groupId/messages', async (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const { groupId } = req.params;
  const { text, mediaUrl, mediaType, clientMessageId, tempId } = req.body;
  if ((!text || !text.trim()) && !mediaUrl) {
    return res.status(400).json({ error: 'Kinakailangan ang mensahe o media file.' });
  }

  const db = loadDB();

  // Server-Side Idempotency Protection: Prevent duplicate group message creation on network retries
  const dedupId = (clientMessageId || tempId) ? String(clientMessageId || tempId).trim() : '';
  if (dedupId && Array.isArray(db.groupMessages)) {
    const existingMsg = db.groupMessages.find(
      m => (m.clientMessageId === dedupId || m.id === dedupId) && m.groupId === groupId && m.senderId === userId
    );
    if (existingMsg) {
      return res.json({ success: true, message: existingMsg, deduped: true });
    }
  }

  if (isUserBanned(db, userId)) {
    return res.status(403).json({ error: 'Ang iyong account ay banned sa system.' });
  }

  const sender = db.users.find(u => u.id === userId);
  if (!sender) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  if (!db.groupChats) db.groupChats = [];
  if (!db.groupMessages) db.groupMessages = [];

  const group = db.groupChats.find(g => g.id === groupId);
  if (!group) {
    return res.status(404).json({ error: 'Hindi mahanap ang Group Chat.' });
  }

  // Auto-join community group
  if (group.id === 'gc-community-main' && !group.members.includes(userId)) {
    group.members.push(userId);
  }

  if (!group.members.includes(userId)) {
    return res.status(403).json({ error: 'Hindi ka miyembro ng Group Chat na ito.' });
  }

  const filteredText = text ? filterSwearWords(text.trim()) : '';
  let processedMediaUrl = mediaUrl;
  if (mediaUrl && mediaUrl.startsWith('data:')) {
    const uploadResult = await uploadMediaToFirebaseStorage(mediaUrl, 'group-chats', groupId);
    if (!uploadResult || !uploadResult.url) {
      return res.status(502).json({ 
        error: 'Bigo ang pag-upload ng media sa Firebase Storage. Nananatili ang mensahe sa iyong Outbox para i-retry.',
        canRetry: true 
      });
    }
    processedMediaUrl = uploadResult.url;
  }

  const newMsg: GroupMessage = {
    id: 'gmsg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
    clientMessageId: dedupId || undefined,
    groupId,
    senderId: userId,
    senderName: sender.name,
    senderAvatar: sender.avatar,
    text: filteredText,
    mediaUrl: processedMediaUrl || undefined,
    mediaType: mediaType || (processedMediaUrl ? (processedMediaUrl.match(/\.(mp4|webm|mov|ogg)$/i) ? 'video' : 'image') : undefined),
    createdAt: new Date().toISOString()
  };

  db.groupMessages.push(newMsg);
  group.updatedAt = new Date().toISOString();
  saveDB(db, true);

  if (cloudDb.isActive) {
    const { id, ...gmWithoutId } = newMsg;
    const { id: gid, ...gWithoutId } = group;
    cloudDb.setDoc('group_messages', newMsg.id, gmWithoutId).catch(() => {});
    cloudDb.setDoc('group_chats', group.id, gWithoutId).catch(() => {});
  }

  // Send background push notifications to all other group members
  if (Array.isArray(group.members)) {
    for (const memberId of group.members) {
      if (memberId !== userId) {
        sendPushNotificationToUser(memberId, {
          title: `👥 ${group.name} - ${sender.name}`,
          body: filteredText || (newMsg.mediaType === 'video' ? '📹 Nagpadala ng video' : '📷 Nagpadala ng larawan'),
          url: '/?tab=zone&zoneTab=groups',
          tag: `gc-${groupId}`
        }).catch(() => {});
      }
    }
  }

  res.json({ success: true, message: newMsg });
});

// 5. EDIT A GROUP MESSAGE (within 2 minutes)
app.put('/api/zone/groups/:groupId/messages/:messageId', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const { groupId, messageId } = req.params;
  const { text } = req.body;
  const db = loadDB();

  if (isUserBanned(db, userId)) {
    return res.status(403).json({ error: 'Banned ka sa system.' });
  }

  if (!db.groupMessages) db.groupMessages = [];
  const msg = db.groupMessages.find(m => m.id === messageId && m.groupId === groupId);
  if (!msg) {
    return res.status(404).json({ error: 'Hindi mahanap ang mensahe.' });
  }

  if (msg.senderId !== userId) {
    return res.status(403).json({ error: 'Wala kang pahintulot na i-edit ang mensaheng ito.' });
  }

  // 2-minute rule
  const messageTime = new Date(msg.createdAt).getTime();
  if (Date.now() - messageTime > 120000) {
    return res.status(400).json({ error: 'Hindi mo na pwedeng i-edit ang mensaheng ito dahil lumagpas na ang 2 minuto.' });
  }

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Hindi pwedeng walang laman ang mensahe.' });
  }

  msg.text = filterSwearWords(text.trim());
  saveDB(db, true);

  if (cloudDb.isActive) {
    const { id, ...gmWithoutId } = msg;
    cloudDb.setDoc('group_messages', msg.id, gmWithoutId).catch(() => {});
  }

  res.json({ success: true, message: msg });
});

// 6. DELETE / UNSEND A GROUP MESSAGE (within 2 minutes)
app.delete('/api/zone/groups/:groupId/messages/:messageId', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const { groupId, messageId } = req.params;
  const db = loadDB();

  if (!db.groupMessages) db.groupMessages = [];
  const msgIndex = db.groupMessages.findIndex(m => m.id === messageId && m.groupId === groupId);
  if (msgIndex === -1) {
    return res.status(404).json({ error: 'Hindi mahanap ang mensahe.' });
  }

  const msg = db.groupMessages[msgIndex];
  if (msg.senderId !== userId) {
    return res.status(403).json({ error: 'Wala kang pahintulot na i-delete ang mensaheng ito.' });
  }

  // 2-minute rule
  const messageTime = new Date(msg.createdAt).getTime();
  if (Date.now() - messageTime > 120000) {
    return res.status(400).json({ error: 'Hindi mo na pwedeng i-unsend/delete ang mensaheng ito dahil lumagpas na ang 2 minuto.' });
  }

  db.groupMessages.splice(msgIndex, 1);
  saveDB(db, true);

  if (cloudDb.isActive) {
    cloudDb.deleteDoc('group_messages', messageId).catch(() => {});
  }

  res.json({ success: true, message: 'Matagumpay na na-delete ang mensahe!' });
});

// 7. ADD MEMBERS TO GROUP CHAT
app.post('/api/zone/groups/:groupId/members', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const { groupId } = req.params;
  const { memberIds } = req.body;
  if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
    return res.status(400).json({ error: 'Pumili ng miyembro na idadagdag.' });
  }

  const db = loadDB();
  if (!db.groupChats) db.groupChats = [];
  const group = db.groupChats.find(g => g.id === groupId);
  if (!group) {
    return res.status(404).json({ error: 'Hindi mahanap ang Group Chat.' });
  }

  const addedUsers = db.users.filter(u => memberIds.includes(u.id) && !group.members.includes(u.id));
  if (addedUsers.length === 0) {
    return res.status(400).json({ error: 'Lahat ng napili ay miyembro na ng group na ito.' });
  }

  addedUsers.forEach(u => group.members.push(u.id));
  group.updatedAt = new Date().toISOString();

  // Add system notice
  const actor = db.users.find(u => u.id === userId);
  const names = addedUsers.map(u => u.name).join(', ');
  if (!db.groupMessages) db.groupMessages = [];
  const addSysMsg: GroupMessage = {
    id: 'gmsg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
    groupId,
    senderId: 'system',
    senderName: 'System Notice',
    senderAvatar: '📢',
    text: `${actor ? actor.name : 'A member'} added ${names} to the group.`,
    createdAt: new Date().toISOString()
  };
  db.groupMessages.push(addSysMsg);

  saveDB(db, true);

  if (cloudDb.isActive) {
    const { id, ...gWithoutId } = group;
    const { id: mid, ...gmWithoutId } = addSysMsg;
    cloudDb.setDoc('group_chats', group.id, gWithoutId).catch(() => {});
    cloudDb.setDoc('group_messages', addSysMsg.id, gmWithoutId).catch(() => {});
  }

  const userMap = new Map(db.users.map(u => [u.id, { id: u.id, name: u.name, avatar: u.avatar || '👤' }]));
  const updatedGroup = {
    ...group,
    memberDetails: (group.members || []).map(mid => userMap.get(mid) || { id: mid, name: 'Ka-Zone User', avatar: '👤' })
  };

  res.json({ success: true, group: updatedGroup });
});

// 8. LEAVE GROUP CHAT
app.post('/api/zone/groups/:groupId/leave', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const { groupId } = req.params;
  const db = loadDB();
  if (!db.groupChats) db.groupChats = [];
  const group = db.groupChats.find(g => g.id === groupId);
  if (!group) {
    return res.status(404).json({ error: 'Hindi mahanap ang Group Chat.' });
  }

  if (group.id === 'gc-community-main') {
    return res.status(400).json({ error: 'Hindi maaaring umalis sa Opisyal na Community GC.' });
  }

  group.members = group.members.filter(id => id !== userId);
  group.updatedAt = new Date().toISOString();

  const leaver = db.users.find(u => u.id === userId);
  if (!db.groupMessages) db.groupMessages = [];
  const leaveSysMsg: GroupMessage = {
    id: 'gmsg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
    groupId,
    senderId: 'system',
    senderName: 'System Notice',
    senderAvatar: '📢',
    text: `${leaver ? leaver.name : 'A member'} left the group.`,
    createdAt: new Date().toISOString()
  };
  db.groupMessages.push(leaveSysMsg);

  saveDB(db, true);

  if (cloudDb.isActive) {
    const { id, ...gWithoutId } = group;
    const { id: mid, ...gmWithoutId } = leaveSysMsg;
    cloudDb.setDoc('group_chats', group.id, gWithoutId).catch(() => {});
    cloudDb.setDoc('group_messages', leaveSysMsg.id, gmWithoutId).catch(() => {});
  }

  res.json({ success: true, message: 'Nakaalis ka na sa group chat.' });
});

// 9. UPDATE GROUP CHAT (Name, Avatar, Description)
app.put('/api/zone/groups/:groupId', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const { groupId } = req.params;
  const { name, avatar, description } = req.body;
  const db = loadDB();
  if (!db.groupChats) db.groupChats = [];
  const group = db.groupChats.find(g => g.id === groupId);
  if (!group) {
    return res.status(404).json({ error: 'Hindi mahanap ang Group Chat.' });
  }

  if (!group.members.includes(userId)) {
    return res.status(403).json({ error: 'Hindi ka miyembro ng Group Chat na ito.' });
  }

  if (name && name.trim()) group.name = filterSwearWords(name.trim());
  if (avatar) group.avatar = avatar;
  if (description !== undefined) group.description = filterSwearWords(description.trim());
  group.updatedAt = new Date().toISOString();

  saveDB(db, true);

  if (cloudDb.isActive) {
    const { id, ...gWithoutId } = group;
    cloudDb.setDoc('group_chats', group.id, gWithoutId).catch(() => {});
  }

  const userMap = new Map(db.users.map(u => [u.id, { id: u.id, name: u.name, avatar: u.avatar || '👤' }]));
  const updatedGroup = {
    ...group,
    memberDetails: (group.members || []).map(mid => userMap.get(mid) || { id: mid, name: 'Ka-Zone User', avatar: '👤' })
  };

  res.json({ success: true, group: updatedGroup });
});

// ==========================================
// 📖 FACEBOOK-STYLE STORIES ("MY DAY") APIs
// ==========================================

// 1. GET ALL ACTIVE STORIES
app.get('/api/zone/stories', (req, res) => {
  const db = loadDB();
  if (!db.stories) db.stories = [];

  const now = Date.now();
  // Filter stories active in the last 24 hours
  const activeStories = db.stories.filter(s => {
    const expires = new Date(s.expiresAt || 0).getTime();
    if (expires > now) return true;
    const created = new Date(s.createdAt || 0).getTime();
    return (now - created) < 24 * 60 * 60 * 1000;
  });

  // Enrich with latest user info (avatar/name might have changed)
  const userMap = new Map(db.users.map(u => [u.id, u]));
  const enrichedStories = activeStories.map(story => {
    const author = userMap.get(story.userId);
    return {
      ...story,
      userName: author ? author.name : story.userName,
      userAvatar: author ? (author.avatar || '👤') : story.userAvatar
    };
  });

  // Sort newest stories first
  enrichedStories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ stories: enrichedStories });
});

// 2. CREATE A NEW STORY ("MY DAY")
app.post('/api/zone/stories', async (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const db = loadDB();
  if (isUserBanned(db, userId)) {
    return res.status(403).json({ error: 'Ang iyong account ay banned sa system.' });
  }

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang user profile.' });
  }

  const { mediaUrl, mediaType, text, backgroundColor, textColor, caption } = req.body;

  if (!mediaUrl && (!text || !text.trim())) {
    return res.status(400).json({ error: 'Kinakailangan ang litrato, video, o text para sa iyong My Day / Story.' });
  }

  let finalMediaUrl = mediaUrl;
  if (mediaUrl && mediaUrl.startsWith('data:')) {
    const uploadResult = await uploadMediaToFirebaseStorage(mediaUrl, 'stories', user.id);
    if (!uploadResult || !uploadResult.url) {
      return res.status(502).json({ 
        error: 'Bigo ang pag-upload ng Story media sa Firebase Storage. Nananatili ito sa iyong Outbox para i-retry.',
        canRetry: true 
      });
    }
    finalMediaUrl = uploadResult.url;
  }

  const cleanText = text ? filterSwearWords(text.trim()) : undefined;
  const cleanCaption = caption ? filterSwearWords(caption.trim()) : undefined;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const newStory: ZoneStory = {
    id: 'story-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar || '👤',
    mediaUrl: finalMediaUrl || undefined,
    mediaType: mediaType || (finalMediaUrl ? (finalMediaUrl.match(/\.(mp4|webm|mov|ogg)$/i) ? 'video' : 'image') : 'text'),
    text: cleanText,
    backgroundColor: backgroundColor || '#3b82f6',
    textColor: textColor || '#ffffff',
    caption: cleanCaption,
    viewers: [],
    viewerDetails: [],
    reactions: [],
    createdAt: now.toISOString(),
    expiresAt
  };

  if (!db.stories) db.stories = [];
  db.stories.unshift(newStory);
  saveDB(db, true);

  if (cloudDb.isActive) {
    const { id, ...sWithoutId } = newStory;
    cloudDb.setDoc('stories', newStory.id, sWithoutId).catch(err => {
      console.error('Direct cloud save error for Story:', err);
    });
  }

  res.json({ success: true, story: newStory, message: 'Matagumpay na na-post ang iyong My Day / Story!' });
});

// 3. DELETE A STORY
app.delete('/api/zone/stories/:storyId', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const { storyId } = req.params;
  const db = loadDB();
  if (!db.stories) db.stories = [];

  const index = db.stories.findIndex(s => s.id === storyId);
  if (index === -1) {
    return res.status(404).json({ error: 'Hindi mahanap ang Story.' });
  }

  const story = db.stories[index];
  const user = db.users.find(u => u.id === userId);
  const isAdmin = user?.isAdmin || userId === 'admin-rosco';

  if (story.userId !== userId && !isAdmin) {
    return res.status(403).json({ error: 'Wala kang pahintulot na i-delete ang Story na ito.' });
  }

  db.stories.splice(index, 1);
  saveDB(db, true);

  if (cloudDb.isActive) {
    cloudDb.deleteDoc('stories', storyId).catch(err => {
      console.error('Direct cloud delete error for Story:', err);
    });
  }

  res.json({ success: true, message: 'Na-delete na ang Story!' });
});

// 4. MARK STORY AS VIEWED
app.post('/api/zone/stories/:storyId/view', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const { storyId } = req.params;
  const db = loadDB();
  if (!db.stories) db.stories = [];

  const story = db.stories.find(s => s.id === storyId);
  if (!story) {
    return res.status(404).json({ error: 'Hindi mahanap ang Story.' });
  }

  const viewer = db.users.find(u => u.id === userId);
  if (!viewer) {
    return res.status(404).json({ error: 'Hindi mahanap ang viewer.' });
  }

  if (!story.viewers) story.viewers = [];
  if (!story.viewerDetails) story.viewerDetails = [];

  if (!story.viewers.includes(userId)) {
    story.viewers.push(userId);
    story.viewerDetails.push({
      id: viewer.id,
      name: viewer.name,
      avatar: viewer.avatar || '👤',
      viewedAt: new Date().toISOString()
    });
    saveDB(db);

    if (cloudDb.isActive) {
      const { id, ...sWithoutId } = story;
      cloudDb.setDoc('stories', story.id, sWithoutId).catch(() => {});
    }
  }

  res.json({ success: true, viewersCount: story.viewers.length });
});

// 5. REACT OR REPLY TO A STORY
app.post('/api/zone/stories/:storyId/react', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const { storyId } = req.params;
  const { emoji, replyMessage } = req.body;
  const db = loadDB();
  if (!db.stories) db.stories = [];

  const story = db.stories.find(s => s.id === storyId);
  if (!story) {
    return res.status(404).json({ error: 'Hindi mahanap ang Story.' });
  }

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  if (!story.reactions) story.reactions = [];

  // Add or update reaction
  const existingIdx = story.reactions.findIndex(r => r.userId === userId);
  const newReaction = {
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar || '👤',
    emoji: emoji || '❤️',
    createdAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    story.reactions[existingIdx] = newReaction;
  } else {
    story.reactions.push(newReaction);
  }

  // Also auto-add to viewers if not already viewed
  if (!story.viewers) story.viewers = [];
  if (!story.viewerDetails) story.viewerDetails = [];
  if (!story.viewers.includes(userId)) {
    story.viewers.push(userId);
    story.viewerDetails.push({
      id: user.id,
      name: user.name,
      avatar: user.avatar || '👤',
      viewedAt: new Date().toISOString()
    });
  }

  // Also send a direct message reply to the story author (like FB/IG story replies)
  if (story.userId !== userId && (emoji || replyMessage)) {
    if (!db.directMessages) db.directMessages = [];
    const author = db.users.find(u => u.id === story.userId);
    if (author) {
      const reactionText = replyMessage 
        ? `${emoji ? emoji + ' ' : ''}${replyMessage} (Tugon sa iyong My Day)`
        : `Nag-react ng ${emoji} sa iyong My Day / Story!`;
      
      const dmMsg: DirectMessage = {
        id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
        senderId: user.id,
        senderName: user.name,
        senderAvatar: user.avatar || '👤',
        receiverId: author.id,
        receiverName: author.name,
        receiverAvatar: author.avatar || '👤',
        text: reactionText,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType === 'text' ? undefined : story.mediaType,
        createdAt: new Date().toISOString()
      };
      db.directMessages.push(dmMsg);

      // Send push notification to story author
      sendPushNotificationToUser(author.id, {
        title: `✨ ${user.name} nag-react sa iyong My Day`,
        body: reactionText,
        url: '/?tab=zone',
        tag: `story-reaction-${storyId}`
      }).catch(() => {});
    }
  }

  saveDB(db, true);

  if (cloudDb.isActive) {
    const { id, ...sWithoutId } = story;
    cloudDb.setDoc('stories', story.id, sWithoutId).catch(() => {});
  }

  res.json({ success: true, reactions: story.reactions });
});

// 3. GET ACTIVE CALLS FOR USER (POLLING)
app.get('/api/zone/calls', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }
  const db = loadDB();
  const activeCalls = db.activeCalls || [];
  // Filter active calling/ringing/accepted sessions in the last 60 seconds
  const myCalls = activeCalls.filter(c => 
    (c.callerId === userId || c.receiverId === userId) && 
    c.status !== 'ended' && 
    c.status !== 'declined' &&
    (Date.now() - new Date(c.createdAt).getTime() < 60000)
  );
  res.json({ calls: myCalls });
});

// 4. INITIATE OR UPDATE CALL SESSION STATE
app.post('/api/zone/calls', (req, res) => {
  const callerId = req.headers.authorization;
  if (!callerId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }
  const { receiverId, type, status, callId } = req.body;
  const db = loadDB();

  if (!db.activeCalls) {
    db.activeCalls = [];
  }

  if (callId) {
    const call = db.activeCalls.find(c => c.id === callId);
    if (call) {
      if (status) call.status = status;
      if (req.body.callerSignal) call.callerSignal = req.body.callerSignal;
      if (req.body.receiverSignal) call.receiverSignal = req.body.receiverSignal;
      if (req.body.callerCandidates) call.callerCandidates = req.body.callerCandidates;
      if (req.body.receiverCandidates) call.receiverCandidates = req.body.receiverCandidates;
      saveDB(db);
      return res.json({ success: true, call });
    }
    return res.status(404).json({ error: 'Hindi mahanap ang call session.' });
  }

  if (!receiverId) {
    return res.status(400).json({ error: 'Kinakailangan ang receiverId.' });
  }

  const caller = db.users.find(u => u.id === callerId);
  const receiver = db.users.find(u => u.id === receiverId);

  if (!caller || !receiver) {
    return res.status(404).json({ error: 'Hindi mahanap ang users.' });
  }

  // Filter out and end existing calling session between these users
  db.activeCalls = db.activeCalls.filter(c => 
    !(c.callerId === callerId && c.receiverId === receiverId) &&
    !(c.callerId === receiverId && c.receiverId === callerId)
  );

  const newCall: ActiveCall = {
    id: 'call-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
    callerId,
    callerName: caller.name,
    callerAvatar: caller.avatar,
    receiverId,
    receiverName: receiver.name,
    receiverAvatar: receiver.avatar,
    type: type || 'voice',
    status: 'ringing',
    createdAt: new Date().toISOString()
  };

  db.activeCalls.push(newCall);
  saveDB(db);

  res.json({ success: true, call: newCall });
});

// 5. END ACTIVE CALL SESSION
app.post('/api/zone/calls/end', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }
  const { callId } = req.body;
  const db = loadDB();
  if (db.activeCalls) {
    const call = db.activeCalls.find(c => c.id === callId);
    if (call) {
      call.status = 'ended';
      saveDB(db);
      return res.json({ success: true });
    }
  }
  res.json({ success: false, message: 'Wala nang active call session.' });
});

// ==========================================
// USER PROFILE & ALBUM / PHOTO PRIVACY APIS
// ==========================================

// 1. GET USER PROFILE & STALK DETAILS
app.get('/api/zone/profile/:targetUserId', (req, res) => {
  const requesterId = req.headers.authorization;
  const { targetUserId } = req.params;
  const db = loadDB();

  const targetUser = db.users.find(u => u.id === targetUserId);
  if (!targetUser) {
    return res.status(404).json({ error: 'Hindi mahanap ang profile ng user.' });
  }

  const isOwner = requesterId === targetUserId;
  const allPosts = db.posts || [];
  const userPosts = allPosts.filter(p => p.userId === targetUserId);
  
  const allAlbums = db.albums || [];
  const userAlbums = allAlbums.filter(a => a.userId === targetUserId);

  // Filter albums according to privacy: only owner can see "only_me" albums and photos
  const filteredAlbums = userAlbums
    .filter(a => isOwner || a.privacy === 'public' || !a.privacy)
    .map(a => ({
      ...a,
      photos: (a.photos || []).filter(ph => isOwner || ph.privacy === 'public' || !ph.privacy)
    }));

  const totalPhotosCount = filteredAlbums.reduce((sum, a) => sum + (a.photos ? a.photos.length : 0), 0);

  // Online check
  const isOnline = Boolean(activeUsersMap[targetUserId]) || (targetUser.stats && targetUser.stats.balance !== undefined);

  res.json({
    success: true,
    profile: {
      id: targetUser.id,
      name: targetUser.name,
      avatar: targetUser.avatar || '👤',
      coverPhoto: targetUser.coverPhoto || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
      bio: targetUser.bio || 'Mabuhay! Malugod na pagdating sa aking Z-one profile ✨',
      isAdmin: !!targetUser.isAdmin,
      createdAt: targetUser.createdAt || new Date().toISOString(),
      isOnline,
      isOwner,
      postCount: userPosts.length,
      albumCount: filteredAlbums.length,
      photoCount: totalPhotosCount,
      albums: filteredAlbums,
      posts: userPosts
    }
  });
});

// 2. UPDATE PROFILE (BIO, COVER PHOTO, AVATAR)
app.put('/api/zone/profile', async (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Mag-login muna upang i-edit ang profile.' });
  }

  const { bio, coverPhoto, avatar } = req.body;
  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  if (typeof bio === 'string') {
    user.bio = filterSwearWords(bio.trim().slice(0, 300));
  }

  if (typeof avatar === 'string' && avatar.trim()) {
    if (avatar.startsWith('data:')) {
      const up = await uploadMediaToFirebaseStorage(avatar, 'avatars', user.id);
      if (up && up.url) {
        user.avatar = up.url;
      }
    } else {
      user.avatar = avatar.trim();
    }
  }

  if (typeof coverPhoto === 'string' && coverPhoto.trim()) {
    if (coverPhoto.startsWith('data:')) {
      const up = await uploadMediaToFirebaseStorage(coverPhoto, 'covers', user.id);
      if (up && up.url) {
        user.coverPhoto = up.url;
      }
    } else {
      user.coverPhoto = coverPhoto.trim();
    }
  }

  saveDB(db, true);

  if (cloudDb.isActive) {
    cloudDb.updateDoc('users', user.id, {
      bio: user.bio,
      avatar: user.avatar,
      coverPhoto: user.coverPhoto
    }).catch(err => console.error('Cloud DB user profile update error:', err));
  }

  res.json({
    success: true,
    message: 'Matagumpay na na-update ang iyong profile!',
    user: {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      coverPhoto: user.coverPhoto,
      bio: user.bio
    }
  });
});

// 3. GET ALBUMS FOR A USER
app.get('/api/zone/albums', (req, res) => {
  const requesterId = req.headers.authorization;
  const targetUserId = (req.query.userId as string) || requesterId;

  if (!targetUserId) {
    return res.status(400).json({ error: 'Kinakailangan ang userId.' });
  }

  const db = loadDB();
  const isOwner = requesterId === targetUserId;
  const allAlbums = db.albums || [];
  const userAlbums = allAlbums.filter(a => a.userId === targetUserId);

  const filteredAlbums = userAlbums
    .filter(a => isOwner || a.privacy === 'public' || !a.privacy)
    .map(a => ({
      ...a,
      photos: (a.photos || []).filter(ph => isOwner || ph.privacy === 'public' || !ph.privacy)
    }));

  res.json({ success: true, albums: filteredAlbums });
});

// 4. CREATE ALBUM
app.post('/api/zone/albums', async (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Mag-login muna upang gumawa ng album.' });
  }

  const { title, description, privacy, coverPhoto } = req.body;
  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Pakilagay ang pamagat (title) ng album.' });
  }

  let finalCover = coverPhoto;
  if (coverPhoto && coverPhoto.startsWith('data:')) {
    const up = await uploadMediaToFirebaseStorage(coverPhoto, 'album_covers', user.id);
    if (up && up.url) {
      finalCover = up.url;
    }
  }

  const newAlbum: UserAlbum = {
    id: 'album-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar,
    title: filterSwearWords(title.trim().slice(0, 100)),
    description: description ? filterSwearWords(description.trim().slice(0, 300)) : undefined,
    privacy: privacy === 'only_me' ? 'only_me' : 'public',
    coverPhoto: finalCover,
    photos: [],
    createdAt: new Date().toISOString()
  };

  if (!db.albums) db.albums = [];
  db.albums.push(newAlbum);
  saveDB(db, true);

  if (cloudDb.isActive) {
    const { id, ...aWithoutId } = newAlbum;
    cloudDb.setDoc('albums', newAlbum.id, aWithoutId).catch(err => {
      console.error('Cloud DB album create error:', err);
    });
  }

  res.json({ success: true, album: newAlbum, message: 'Matagumpay na nagawa ang album!' });
});

// 5. UPDATE ALBUM (TITLE, DESC, PRIVACY, COVER)
app.put('/api/zone/albums/:albumId', async (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const { albumId } = req.params;
  const { title, description, privacy, coverPhoto } = req.body;
  const db = loadDB();

  if (!db.albums) db.albums = [];
  const album = db.albums.find(a => a.id === albumId);
  if (!album) {
    return res.status(404).json({ error: 'Hindi mahanap ang album.' });
  }

  if (album.userId !== userId) {
    return res.status(403).json({ error: 'Wala kang pahintulot na i-edit ang album na ito.' });
  }

  if (title && title.trim()) album.title = filterSwearWords(title.trim().slice(0, 100));
  if (description !== undefined) album.description = description ? filterSwearWords(description.trim().slice(0, 300)) : '';
  if (privacy === 'public' || privacy === 'only_me') album.privacy = privacy;

  if (coverPhoto) {
    if (coverPhoto.startsWith('data:')) {
      const up = await uploadMediaToFirebaseStorage(coverPhoto, 'album_covers', userId);
      if (up && up.url) {
        album.coverPhoto = up.url;
      }
    } else {
      album.coverPhoto = coverPhoto;
    }
  }

  album.updatedAt = new Date().toISOString();
  saveDB(db, true);

  if (cloudDb.isActive) {
    const { id, ...aWithoutId } = album;
    cloudDb.setDoc('albums', album.id, aWithoutId).catch(err => {
      console.error('Cloud DB album update error:', err);
    });
  }

  res.json({ success: true, album, message: 'Na-update ang album!' });
});

// 6. DELETE ALBUM
app.delete('/api/zone/albums/:albumId', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const { albumId } = req.params;
  const db = loadDB();

  if (!db.albums) db.albums = [];
  const index = db.albums.findIndex(a => a.id === albumId);
  if (index === -1) {
    return res.status(404).json({ error: 'Hindi mahanap ang album.' });
  }

  if (db.albums[index].userId !== userId) {
    return res.status(403).json({ error: 'Wala kang pahintulot na burahin ang album na ito.' });
  }

  db.albums.splice(index, 1);
  saveDB(db, true);

  if (cloudDb.isActive) {
    cloudDb.deleteDoc('albums', albumId).catch(err => {
      console.error('Cloud DB album delete error:', err);
    });
  }

  res.json({ success: true, message: 'Matagumpay na nabura ang album.' });
});

// 7. ADD PHOTO TO ALBUM
app.post('/api/zone/albums/:albumId/photos', async (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const { albumId } = req.params;
  const { url, caption, privacy } = req.body;
  const db = loadDB();

  if (!db.albums) db.albums = [];
  const album = db.albums.find(a => a.id === albumId);
  if (!album) {
    return res.status(404).json({ error: 'Hindi mahanap ang album.' });
  }

  if (album.userId !== userId) {
    return res.status(403).json({ error: 'Wala kang pahintulot na magdagdag ng photo sa album na ito.' });
  }

  if (!url) {
    return res.status(400).json({ error: 'Kinakailangan ang photo image/url.' });
  }

  let finalUrl = url;
  if (url.startsWith('data:')) {
    const up = await uploadMediaToFirebaseStorage(url, 'album_photos', userId);
    if (!up || !up.url) {
      return res.status(500).json({ error: 'Bigo ang pag-save ng photo sa cloud storage.' });
    }
    finalUrl = up.url;
  }

  const newPhoto: UserPhoto = {
    id: 'photo-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    url: finalUrl,
    caption: caption ? filterSwearWords(caption.trim().slice(0, 200)) : undefined,
    privacy: privacy === 'only_me' ? 'only_me' : 'public',
    uploadedAt: new Date().toISOString()
  };

  if (!album.photos) album.photos = [];
  album.photos.unshift(newPhoto);

  // If album has no cover photo, set this as cover
  if (!album.coverPhoto) {
    album.coverPhoto = finalUrl;
  }

  album.updatedAt = new Date().toISOString();
  saveDB(db, true);

  if (cloudDb.isActive) {
    const { id, ...aWithoutId } = album;
    cloudDb.setDoc('albums', album.id, aWithoutId).catch(err => {
      console.error('Cloud DB album photo add error:', err);
    });
  }

  res.json({ success: true, photo: newPhoto, album, message: 'Matagumpay na naidagdag ang photo!' });
});

// 8. DELETE PHOTO FROM ALBUM
app.delete('/api/zone/albums/:albumId/photos/:photoId', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const { albumId, photoId } = req.params;
  const db = loadDB();

  if (!db.albums) db.albums = [];
  const album = db.albums.find(a => a.id === albumId);
  if (!album) {
    return res.status(404).json({ error: 'Hindi mahanap ang album.' });
  }

  if (album.userId !== userId) {
    return res.status(403).json({ error: 'Wala kang pahintulot na magbura sa album na ito.' });
  }

  if (!album.photos) album.photos = [];
  const photoIndex = album.photos.findIndex(p => p.id === photoId);
  if (photoIndex === -1) {
    return res.status(404).json({ error: 'Hindi mahanap ang litrato.' });
  }

  album.photos.splice(photoIndex, 1);
  album.updatedAt = new Date().toISOString();
  saveDB(db, true);

  if (cloudDb.isActive) {
    const { id, ...aWithoutId } = album;
    cloudDb.setDoc('albums', album.id, aWithoutId).catch(err => {
      console.error('Cloud DB album photo delete error:', err);
    });
  }

  res.json({ success: true, message: 'Matagumpay na nabura ang photo.' });
});

// 9. TOGGLE PHOTO PRIVACY (PUBLIC VS ONLY_ME)
app.put('/api/zone/albums/:albumId/photos/:photoId/privacy', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const { albumId, photoId } = req.params;
  const { privacy } = req.body;
  const db = loadDB();

  if (!db.albums) db.albums = [];
  const album = db.albums.find(a => a.id === albumId);
  if (!album) {
    return res.status(404).json({ error: 'Hindi mahanap ang album.' });
  }

  if (album.userId !== userId) {
    return res.status(403).json({ error: 'Wala kang pahintulot na baguhin ang photo na ito.' });
  }

  if (!album.photos) album.photos = [];
  const photo = album.photos.find(p => p.id === photoId);
  if (!photo) {
    return res.status(404).json({ error: 'Hindi mahanap ang litrato.' });
  }

  photo.privacy = privacy === 'only_me' ? 'only_me' : 'public';
  album.updatedAt = new Date().toISOString();
  saveDB(db, true);

  if (cloudDb.isActive) {
    const { id, ...aWithoutId } = album;
    cloudDb.setDoc('albums', album.id, aWithoutId).catch(err => {
      console.error('Cloud DB photo privacy update error:', err);
    });
  }

  res.json({ success: true, photo, message: `Naitakda ang photo privacy sa ${photo.privacy === 'only_me' ? 'Only Me (Pribado)' : 'Public (Lahat makakakita)'}!` });
});

// --- PROMPT-BASED VIDEO TOUR GENERATOR ENDPOINT ---
app.post('/api/gemini/generate-video-script', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Kinakailangan ang prompt parameter.' });
  }

  const aiClient = getGeminiClient();

  if (!aiClient) {
    console.warn("Gemini Client not available. Utilizing predefined high-quality Tagalog tour fallback scripts.");
    return res.json({
      success: true,
      fallback: true,
      scenes: getPredefinedTourScenes(prompt)
    });
  }

  try {
    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          role: 'user',
          parts: [{ text: `Generate a custom video script in Tagalog/Filipino for the prompt: "${prompt}"` }]
        }
      ],
      config: {
        systemInstruction: `You are an expert video creator and script writer for Z-oneApp (Z-one), a social earning platform in the Philippines.
Your task is to generate a custom-themed video tour script in Tagalog/Filipino based on the user's prompt.

You MUST detect and explain the actual, real implemented features of the Z-oneApp system without omitting any critical details:
1. Quick & Secure Registration/Login: fast 5-second mobile number based account setup.
2. Browse & Earn Campaigns (Browser Simulator): opening sponsor web links inside the app, completing a 5-second countdown timer, and instantly earning ₱5.00 cash directly to the wallet balance.
3. Lucky Spin Wheel of Fortune: spinning a colorful wheel to win extra coin credits and multipliers.
4. Z-one Social Feed & Community Hub: a lively social community to post text updates, upload device photos, react with hearts, and exchange comments with other Pinoy members.
5. Real-time Messaging & Call Simulator: secured direct text chats and live voice/video call simulations with active connectivity.
6. Secured GCash Cash-out / Wallet Withdrawal: direct secure payout once reaching the ₱100.00 minimum threshold, with SMS alert verification.
7. Referral Invitation System: sharing unique invite codes with friends to earn ₱10.00 referral bonuses.
8. Merchant Portal / Sponsor Platform: allowing local businesses to register, top up, launch traffic campaigns, and monitor statistics.

You MUST produce exactly 3 to 5 scenes in a JSON array.
Each scene MUST have:
1. "title": A short catchy Tagalog scene title (e.g. "1. Paano Kumita sa Campaigns").
2. "subtitle": A brief description of what is happening.
3. "narration": The spoken Tagalog voice-over text. Make it flow nicely, warm, enthusiastic, and natural (150-300 characters long).
4. "visualType": One of these specific visual presets:
   - "registration": Shows a clean registration form simulation with mobile number and password fields.
   - "campaigns": Shows browse & earn campaigns, task active simulation, or countdown reward cards (₱5.00).
   - "spin": Shows a colorful spin wheel of fortune with coin prizes.
   - "feed": Shows the social feed screen where users upload photos, write posts, and click hearts (likes).
   - "cashout": Shows GCash/wallet withdrawal completion with green success badges (₱100.00 cashout).
   - "info": Shows a general info card with charts, stats, or support details.

CRITICAL SECURITY RULE (MUTING THE ADMIN PANEL):
- NEVER mention, show, reference, or hint at anything about "system administrator", "admin console", "admin panel", "administrator role", "moderator panel", "banning users", or administrative controls. Keep all administrative features completely hidden. Focus 100% on the general user features, advertiser tools, community bonding, and earnings.

Write the narration text entirely in warm, clear, conversational Filipino/Tagalog (e.g. "Mabuhay! Gusto mo bang kumita habang sumasali sa aming komunidad?...").
Return ONLY a raw JSON array matching this typescript definition:
  Array<{ title: string; subtitle: string; narration: string; visualType: "registration" | "campaigns" | "spin" | "feed" | "cashout" | "info" }>
Do not output any markdown code blocks, backticks, or "json" labels in your output. Just return the clean JSON string.
`
      }
    });

    const rawText = (response.text || '').trim();
    // Strip markdown formatting if any was generated
    const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const scenes = JSON.parse(cleanJson);
    return res.json({ success: true, scenes });
  } catch (error) {
    console.error("Gemini video script generation failed, fallback to presets:", error);
    return res.json({
      success: true,
      fallback: true,
      scenes: getPredefinedTourScenes(prompt)
    });
  }
});

function getPredefinedTourScenes(prompt: string): any[] {
  const lower = prompt.toLowerCase();
  
  if (lower.includes('feed') || lower.includes('social') || lower.includes('komunidad') || lower.includes('santos') || lower.includes('post') || lower.includes('chat') || lower.includes('tawag') || lower.includes('call')) {
    return [
      {
        title: "1. Komunidad ng Z-one Social Feed",
        subtitle: "Sama-samang magbahagi ng magagandang alaala at status",
        narration: "Maligayang pagdating sa ating Pinoy komunidad! Sa Z-one Feed, maaari kang mag-post ng iyong paboritong larawan, sumulat ng makabuluhang status, mag-react ng puso, at mag-comment sa posts ng iba para sa mas masayang talakayan.",
        visualType: "feed"
      },
      {
        title: "2. Secured Direct Messaging at Calls",
        subtitle: "Libreng tawag, video call, at chat simulator",
        narration: "Bukod sa pag-post, maaari ka ring makipag-chat at makipag-tawagan gamit ang ating real-time voice at video call simulator. Manatiling konektado sa iyong mga kaibigan nang ligtas at mabilis.",
        visualType: "info"
      },
      {
        title: "3. Paano Sumali sa Pamilya",
        subtitle: "Mabilis na mobile registration sa loob ng 5 segundo",
        narration: "Huwag nang pahuhuli! Sumali na sa pinakamasayang komunidad ngayon. Magrehistro gamit ang iyong mobile number, gumawa ng secured password, at simulang maranasan ang tunay na ugnayang Pilipino.",
        visualType: "registration"
      }
    ];
  }

  if (lower.includes('cashout') || lower.includes('withdraw') || lower.includes('pera') || lower.includes('gcash') || lower.includes('payout') || lower.includes('wallet')) {
    return [
      {
        title: "1. Pag-ipon ng Wallet Balance",
        subtitle: "Tingnan ang iyong naipong rewards mula sa campaigns",
        narration: "Araw-araw, ang iyong mga tagumpay sa pagbisita sa sponsors ay awtomatikong naiipon sa iyong secure wallet balance. Ang bawat kumpletong visit ay katumbas ng Limang Piso.",
        visualType: "campaigns"
      },
      {
        title: "2. Mabilis na GCash Withdrawal",
        subtitle: "Pumunta sa Cash-out tab at ilagay ang detalye",
        narration: "Kapag umabot na sa Isang Daang Piso ang iyong kabuuang balanse, maaari mo na itong i-withdraw! Pumunta sa GCash Cash-out page, ilagay ang iyong GCash Name at Number, at i-click ang submit.",
        visualType: "cashout"
      },
      {
        title: "3. Secure Gateway Verification",
        subtitle: "Direktang payout na may kasamang SMS alert",
        narration: "Ang aming ligtas na server ay magpapadala ng iyong pondo diretso sa iyong GCash account. Makakatanggap ka rin ng simulated network SMS alert para kumpirmahin ang matagumpay na payout.",
        visualType: "cashout"
      }
    ];
  }

  if (lower.includes('spin') || lower.includes('gulong') || lower.includes('lucky') || lower.includes('wheel') || lower.includes('swerte')) {
    return [
      {
        title: "1. Spin Wheel of Fortune",
        subtitle: "Paikutin ang gulong para sa karagdagang premyo",
        narration: "Gusto mo pa ba ng mas maraming rewards? Subukan ang ating Lucky Spin! Dito ay may tsansa kang manalo ng karagdagang barya, wallet rewards, o multipliers na makakatulong sa iyo.",
        visualType: "spin"
      },
      {
        title: "2. Subukan ang Swerte Araw-araw",
        subtitle: "I-click lamang ang SPIN para makuha ang premyo",
        narration: "Walang limitasyon ang swerte! Araw-araw ay maaari mong subukan ang gulong ng kapalaran upang mapabilis ang iyong pag-abot sa withdrawal threshold na Isang Daang Piso.",
        visualType: "spin"
      },
      {
        title: "3. Direct Wallet Addition",
        subtitle: "Awtomatikong dagdag sa iyong wallet balance",
        narration: "Lahat ng iyong mapapanalunan sa Lucky Spin ay direktang papasok sa iyong wallet balance nang walang bawas, ligtas, at real-time para sa iyong kapanatagan.",
        visualType: "campaigns"
      }
    ];
  }

  if (lower.includes('merchant') || lower.includes('ads') || lower.includes('sponsor') || lower.includes('advertiser') || lower.includes('benta') || lower.includes('negosyo')) {
    return [
      {
        title: "1. Merchant Portal para sa Negosyo",
        subtitle: "Palaguin ang iyong traffic at online presence",
        narration: "Mayroon ka bang negosyo o website na nais mong i-promote? Maligayang pagdating sa ating Merchant Portal! Dito ay maaari mong i-advertise ang iyong brand sa libu-libong miyembro.",
        visualType: "info"
      },
      {
        title: "2. Pag-setup ng Traffic Campaigns",
        subtitle: "Ilagay ang iyong landing page link at badyet",
        narration: "Madali lamang gumawa ng traffic campaign. Mag-deposit lamang ng pondo, ilagay ang iyong URL link, at itakda ang reward. Ang bawat miyembro ay bibisita sa iyong site ng 5 segundo.",
        visualType: "campaigns"
      },
      {
        title: "3. Real-time Traffic Analytics",
        subtitle: "Subaybayan ang clicks at engagements ng iyong ad",
        narration: "Sa iyong dashboard, makikita mo ang real-time statistics ng iyong campaigns. Secure, transparent, at garantisadong totoong tao ang bumibisita sa iyong website.",
        visualType: "info"
      }
    ];
  }

  if (lower.includes('referral') || lower.includes('invite') || lower.includes('imbita') || lower.includes('code') || lower.includes('kaibigan')) {
    return [
      {
        title: "1. Referral Invitation System",
        subtitle: "Mag-imbita ng kaibigan at kumita ng Sampung Piso",
        narration: "Ibahagi ang saya ng Z-oneApp! Gamitin ang iyong unique referral code upang mag-imbita ng mga kaibigan, kapamilya, o kakilala na sumali sa ating lumalagong plataporma.",
        visualType: "registration"
      },
      {
        title: "2. Madaling Pag-track ng Reperals",
        subtitle: "Tingnan ang listahan ng mga matagumpay na inimbita",
        narration: "Sa iyong Referral Panel, makikita mo ang listahan ng lahat ng mga gumamit ng iyong code. Awtomatikong madaragdag ang Sampung Piso sa bawat matagumpay nilang pagpaparehistro.",
        visualType: "info"
      },
      {
        title: "3. Sabay-sabay na Pag-unlad",
        subtitle: "Tulungan ang bawat Pilipino na magkaroon ng kita",
        narration: "Habang dumarami ang iyong inirerekomenda, mas mabilis mong maaabot ang iyong pangarap na payout. Sama-sama nating tulungan ang bawat pamilyang Pilipino!",
        visualType: "cashout"
      }
    ];
  }

  // Default General Tour of all key user features (NO system admin mention whatsoever!)
  return [
    {
      title: "1. Z-oneApp Pangkabuhayan Tour",
      subtitle: "Ang bagong paraan para kumonekta at kumita",
      narration: "Mabuhay at maligayang pagdating sa Z-oneApp! Ang pinaka-bago at pinaka-secure na social earning system sa Pilipinas na naglalayong tulungan ang bawat Pilipino na kumonekta at kumita gamit ang kanilang mobile phone.",
      visualType: "registration"
    },
    {
      title: "2. Simple at Madaling Campaigns",
      subtitle: "Mag-browse ng sponsors para sa Limang Piso",
      narration: "Paano nga ba kumita? Simple lang! Pumunta sa Campaigns section at mag-open ng sponsor links. Maghintay lang ng limang segundo sa aming interactive simulator, at awtomatikong may Limang Piso ka na!",
      visualType: "campaigns"
    },
    {
      title: "3. Gulong ng Kapalaran",
      subtitle: "Subukan ang swerte sa Lucky Spin",
      narration: "Subukan ang iyong swerte sa aming interactive Spin Wheel! May tsansa kang manalo ng karagdagang wallet credits, coin multipliers, at mga kapana-panabik na surpresa bawat spin.",
      visualType: "spin"
    },
    {
      title: "4. Masiglang Komunidad at Messaging",
      subtitle: "Ibahagi ang saya sa Z-one Feed",
      narration: "Hindi lang ito pangkabuhayan, ito rin ay lugar para kumonekta! Mag-upload ng mga paboritong larawan, mag-comment sa posts, at mag-chat o mag-tawagan sa ating live-simulator.",
      visualType: "feed"
    },
    {
      title: "5. Ligtas na GCash Cash-out",
      subtitle: "I-withdraw ang iyong ipon sa isang click",
      narration: "Kapag naabot mo na ang Isang Daang Piso na minimum balance, madali mo na itong maiwi-withdraw diretso sa iyong sariling GCash wallet. Mabilis, ligtas, at garantisado!",
      visualType: "cashout"
    }
  ];
}





// ============================================================================
// 💼 Z-ONESHOP & VIRTUAL ASSISTANT (VA) HIRING & MARKETING BANNER ENGINE
// ============================================================================

const VA_REWARD_DEADLINE = '2026-11-15T23:59:59Z';
const VA_HIRING_TARGET = 500;
const VA_BOUNTY_REWARD = 3000.00;
const VA_VM_MIN_TRANSFER = 600.00;
const VA_SUB_PRICE = 100.00;

// Anti-fraud in-memory tracker for recent hire requests (IP & timestamps)
const hireRateLimitMap = new Map<string, number[]>();

function checkHireRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const timestamps = (hireRateLimitMap.get(ip) || []).filter(t => now - t < windowMs);
  if (timestamps.length >= 6) {
    return false; // Exceeded 6 hires per 10 mins
  }
  timestamps.push(now);
  hireRateLimitMap.set(ip, timestamps);
  return true;
}

// 1. GET /api/va/status - User VA status, metrics, progress & leaderboard summary
app.get('/api/va/status', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const db = loadDB();
  const user = db.users.find(u => u.id === token);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Initialize VA stats if not present
  if (!user.vaStats) {
    user.vaStats = {
      hiredCount: 0,
      virtualMoneyBalance: 0,
      totalVMEarned: 0,
      hiringRewardClaimed: false,
      isVaRegistered: true,
      hiredVAs: [],
      vaSubscription: { status: 'none' }
    };
  }

  // Auto-expire banners and check subscription expiry
  checkAndExpireBanners(db);
  checkAndSyncAllCartsToBaskets(db);
  saveDB(db);

  if (user.vaStats.vaSubscription?.status === 'active' && user.vaStats.vaSubscription.expiresAt) {
    if (new Date(user.vaStats.vaSubscription.expiresAt).getTime() <= Date.now()) {
      user.vaStats.vaSubscription.status = 'expired';
    }
  }

  const hiredCount = user.vaStats.hiredCount || (user.vaStats.hiredVAs ? user.vaStats.hiredVAs.length : 0);
  user.vaStats.hiredCount = hiredCount;

  const isDeadlinePassed = Date.now() > new Date(VA_REWARD_DEADLINE).getTime();
  const progressPercent = Math.min(100, Math.round((hiredCount / VA_HIRING_TARGET) * 100));

  const myBanners = (db.vaBanners || []).filter(b => b.vaUserId === user.id);
  const myActiveBannersCount = myBanners.filter(b => b.status === 'active').length;
  const unpaidBasketsCount = (db.shopBaskets || []).filter(b => b.status === 'unpaid').length;

  return res.json({
    success: true,
    vaStats: user.vaStats,
    referralCode: user.referralCode,
    hiringTarget: VA_HIRING_TARGET,
    rewardAmount: VA_BOUNTY_REWARD,
    rewardDeadline: VA_REWARD_DEADLINE,
    isDeadlinePassed,
    progressPercent,
    leaderboardWinner: db.vaLeaderboardWinner || null,
    isEligibleForReward: hiredCount >= VA_HIRING_TARGET && !isDeadlinePassed && (!db.vaLeaderboardWinner || db.vaLeaderboardWinner.userId === user.id),
    minVMTransferThreshold: VA_VM_MIN_TRANSFER,
    myActiveBannersCount,
    unpaidBasketsCount
  });
});

// 2. POST /api/va/hire - Process hiring of a Virtual Assistant via referral link/code
app.post('/api/va/hire', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { referralCode, candidateName, candidateEmail } = req.body;
  const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

  if (!referralCode) {
    return res.status(400).json({ error: 'Referral code / VA Code is required' });
  }

  // Anti-fraud rate limit
  if (!checkHireRateLimit(String(clientIp))) {
    return res.status(429).json({ error: 'Masyadong maraming requests mula sa iyong koneksyon. Subukan muli pagkatapos ng ilang minuto.' });
  }

  const db = loadDB();
  const referrer = db.users.find(u => u.referralCode && u.referralCode.toUpperCase() === String(referralCode).toUpperCase());

  if (!referrer) {
    return res.status(404).json({ error: 'Hindi natagpuan ang referral / VA link ng employer.' });
  }

  // Anti-self-referral prevention
  if (token && referrer.id === token) {
    return res.status(400).json({ error: 'Bawal i-hire ang sarili bilang sariling Virtual Assistant.' });
  }

  if (!referrer.vaStats) {
    referrer.vaStats = {
      hiredCount: 0,
      virtualMoneyBalance: 0,
      totalVMEarned: 0,
      hiringRewardClaimed: false,
      isVaRegistered: true,
      hiredVAs: [],
      vaSubscription: { status: 'none' }
    };
  }
  if (!referrer.vaStats.hiredVAs) {
    referrer.vaStats.hiredVAs = [];
  }

  // Check candidate duplication
  const targetEmail = candidateEmail ? candidateEmail.trim().toLowerCase() : null;
  const targetName = candidateName ? candidateName.trim() : `VA Assistant #${referrer.vaStats.hiredVAs.length + 1}`;

  if (targetEmail) {
    const alreadyHired = referrer.vaStats.hiredVAs.some(h => h.email && h.email.toLowerCase() === targetEmail);
    if (alreadyHired) {
      return res.status(400).json({ error: 'Ang VA applicant na ito ay nai-hire na dati.' });
    }
  }

  const newHireId = 'hire-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  const newHiredVA = {
    id: newHireId,
    userId: token || ('guest-' + Date.now()),
    name: targetName,
    avatar: ['👩‍💼', '👨‍💼', '💻', '🚀', '⭐', '🎧'][referrer.vaStats.hiredVAs.length % 6],
    email: targetEmail || undefined,
    hiredAt: new Date().toISOString(),
    status: 'active' as const
  };

  referrer.vaStats.hiredVAs.unshift(newHiredVA);
  referrer.vaStats.hiredCount = referrer.vaStats.hiredVAs.length;

  // Add notification & activity log to referrer
  if (!referrer.activityLogs) referrer.activityLogs = [];
  referrer.activityLogs.unshift({
    id: 'log-va-' + Date.now(),
    type: 'bonus',
    title: 'Bagong Hired Virtual Assistant! 🎉',
    amount: 0,
    timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
    details: `Matagumpay na na-hire si ${targetName} bilang iyong Virtual Assistant (${referrer.vaStats.hiredCount}/500 target)!`
  });

  saveDB(db);

  // Send push notification to referrer
  sendPushNotificationToUser(referrer.id, {
    title: '🎉 Bagong Hired Virtual Assistant!',
    body: `Na-hire mo si ${targetName}! Kasalukuyang Hired VAs: ${referrer.vaStats.hiredCount}/500.`
  }).catch(() => {});

  return res.json({
    success: true,
    message: `Matagumpay na nai-hire si ${targetName}!`,
    currentHiredCount: referrer.vaStats.hiredCount,
    progressPercent: Math.min(100, Math.round((referrer.vaStats.hiredCount / VA_HIRING_TARGET) * 100))
  });
});

// 3. GET /api/va/leaderboard - Live leaderboard of top hirers towards 500 VAs
app.get('/api/va/leaderboard', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const db = loadDB();

  const hirers = db.users
    .filter(u => !u.isAdmin)
    .map(u => {
      const count = u.vaStats?.hiredCount || (u.vaStats?.hiredVAs ? u.vaStats.hiredVAs.length : 0);
      return {
        userId: u.id,
        name: u.name,
        avatar: u.avatar || '👤',
        hiredCount: count,
        progressPercent: Math.min(100, Math.round((count / VA_HIRING_TARGET) * 100)),
        isCurrentUser: token ? u.id === token : false,
        hasClaimedReward: !!(u.vaStats?.hiringRewardClaimed)
      };
    })
    .sort((a, b) => b.hiredCount - a.hiredCount)
    .slice(0, 20)
    .map((item, index) => ({
      ...item,
      rank: index + 1
    }));

  return res.json({
    success: true,
    leaderboard: hirers,
    winner: db.vaLeaderboardWinner || null,
    target: VA_HIRING_TARGET,
    rewardAmount: VA_BOUNTY_REWARD,
    deadline: VA_REWARD_DEADLINE
  });
});

// 4. POST /api/va/claim-500-reward - First user reaching 500 hires claims ₱3,000
app.post('/api/va/claim-500-reward', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const db = loadDB();
  const user = db.users.find(u => u.id === token);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const hiredCount = user.vaStats?.hiredCount || (user.vaStats?.hiredVAs ? user.vaStats.hiredVAs.length : 0);

  if (hiredCount < VA_HIRING_TARGET) {
    return res.status(400).json({ 
      error: `Hindi pa sapat ang iyong hired VAs (${hiredCount}/${VA_HIRING_TARGET}). Kailangan mo ng ${VA_HIRING_TARGET - hiredCount} pang VAs!` 
    });
  }

  // Check deadline
  if (Date.now() > new Date(VA_REWARD_DEADLINE).getTime()) {
    return res.status(400).json({ error: 'Tapos na ang promo deadline para sa ₱3,000 Bounty noong November 15, 2026.' });
  }

  // Check if someone has already claimed
  if (db.vaLeaderboardWinner) {
    if (db.vaLeaderboardWinner.userId === user.id) {
      return res.status(400).json({ error: 'Nai-claim mo na ang ₱3,000 Hiring Bounty reward!' });
    }
    return res.status(400).json({ 
      error: `Paumanhin! Naunahan ka na ni ${db.vaLeaderboardWinner.userName} sa pag-abot ng 500 VAs at na-claim na ang solong ₱3,000 1st Prize Bounty.` 
    });
  }

  // Lock in winner
  const winnerRecord = {
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar || '🏆',
    hiredCount: hiredCount,
    claimedAt: new Date().toISOString(),
    rewardAmount: VA_BOUNTY_REWARD
  };

  db.vaLeaderboardWinner = winnerRecord;

  if (!user.vaStats) {
    user.vaStats = {
      hiredCount,
      virtualMoneyBalance: 0,
      totalVMEarned: 0,
      hiringRewardClaimed: true,
      isVaRegistered: true
    };
  } else {
    user.vaStats.hiringRewardClaimed = true;
    user.vaStats.hiringRewardClaimedAt = winnerRecord.claimedAt;
  }

  // Award ₱3,000 cash to user's real balance
  user.stats.balance = (user.stats.balance || 0) + VA_BOUNTY_REWARD;
  user.stats.lifetimeEarnings = (user.stats.lifetimeEarnings || 0) + VA_BOUNTY_REWARD;

  if (!user.activityLogs) user.activityLogs = [];
  user.activityLogs.unshift({
    id: 'log-bounty-' + Date.now(),
    type: 'bonus',
    title: '🏆 ₱3,000 500-VA Grand Champion Bounty Claimed!',
    amount: VA_BOUNTY_REWARD,
    timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
    details: `Unang nakarating sa 500 Hired Virtual Assistants bago ang Nov 15, 2026! Naidagdag na ang ₱3,000 sa iyong GCash wallet balance.`
  });

  saveDB(db);

  return res.json({
    success: true,
    message: '🎉 Maligayang pagbati! Matagumpay mong na-claim ang ₱3,000 Grand Hiring Bounty!',
    rewardAmount: VA_BOUNTY_REWARD,
    newBalance: user.stats.balance,
    winner: winnerRecord
  });
});

// 5. POST /api/va/subscribe - Subscribe to ₱100/mo Paid Banner Plan
app.post('/api/va/subscribe', checkIdempotency, (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { paymentMethod, gcashSenderNumber, gcashRefNo } = req.body;
  const db = loadDB();
  const user = db.users.find(u => u.id === token);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!user.vaStats) {
    user.vaStats = {
      hiredCount: 0,
      virtualMoneyBalance: 0,
      totalVMEarned: 0,
      hiringRewardClaimed: false,
      isVaRegistered: true,
      hiredVAs: [],
      vaSubscription: { status: 'none' }
    };
  }

  if (paymentMethod === 'balance') {
    if ((user.stats.balance || 0) < VA_SUB_PRICE) {
      return res.status(400).json({ error: `Kulang ang iyong wallet balance (₱${(user.stats.balance || 0).toFixed(2)}). Kailangan ng ₱${VA_SUB_PRICE.toFixed(2)}.` });
    }

    // Deduct ₱100 immediately
    user.stats.balance -= VA_SUB_PRICE;
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    user.vaStats.vaSubscription = {
      status: 'active',
      subscribedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      paymentMethod: 'balance'
    };

    if (!db.vaSubscriptions) db.vaSubscriptions = [];
    db.vaSubscriptions.unshift({
      id: 'vasub-' + Date.now(),
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      paymentType: 'balance',
      amount: VA_SUB_PRICE,
      status: 'active',
      createdAt: now.toISOString(),
      approvedAt: now.toISOString(),
      expiresAt: expires.toISOString()
    });

    if (!user.activityLogs) user.activityLogs = [];
    user.activityLogs.unshift({
      id: 'log-vasub-' + Date.now(),
      type: 'withdraw',
      title: 'VA Paid Banner Plan Subscribed',
      amount: VA_SUB_PRICE,
      timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
      details: 'Na-activate ang 30-Day Paid Banner Access (7 Days Visibility, 5.0% Virtual Money Commission).'
    });

    saveDB(db);

    return res.json({
      success: true,
      message: 'Matagumpay na na-activate ang Paid Banner Subscription (₱100/buwan)!',
      subscription: user.vaStats.vaSubscription,
      newBalance: user.stats.balance
    });
  } else if (paymentMethod === 'gcash') {
    if (!gcashRefNo || !gcashSenderNumber) {
      return res.status(400).json({ error: 'Pakilagay ang GCash Sender Mobile Number at Reference Number.' });
    }

    user.vaStats.vaSubscription = {
      status: 'pending',
      subscribedAt: new Date().toISOString(),
      paymentMethod: 'gcash',
      gcashSenderNumber,
      gcashRefNo
    };

    if (!db.vaSubscriptions) db.vaSubscriptions = [];
    db.vaSubscriptions.unshift({
      id: 'vasub-' + Date.now(),
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      paymentType: 'gcash',
      gcashSenderNumber,
      gcashRefNo,
      amount: VA_SUB_PRICE,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    saveDB(db);

    return res.json({
      success: true,
      message: 'Naipadala na ang iyong GCash payment reference sa Admin para sa validation!',
      subscription: user.vaStats.vaSubscription
    });
  } else {
    return res.status(400).json({ error: 'Pumili ng payment method (balance o gcash).' });
  }
});

// 6. GET /api/shop/unpaid-baskets - List unpaid baskets in Z-oneShop
app.get('/api/shop/unpaid-baskets', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const db = loadDB();
  checkAndExpireBanners(db);
  checkAndSyncAllCartsToBaskets(db);
  saveDB(db);

  const unpaidBaskets = (db.shopBaskets || [])
    .filter(b => b.status === 'unpaid')
    .map(b => {
      const activeBanner = (db.vaBanners || []).find(ban => ban.id === b.assignedBannerId && ban.status === 'active');
      return {
        ...b,
        hasActiveBanner: !!activeBanner,
        activeBanner: activeBanner || null,
        isMyBanner: activeBanner ? activeBanner.vaUserId === token : false
      };
    });

  return res.json({
    success: true,
    baskets: unpaidBaskets
  });
});

// 7. POST /api/va/place-banner - Place Free (3 days, 2.5%) or Paid (7 days, 5.0%) marketing banner
app.post('/api/va/place-banner', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { targetBasketId, bannerType, title, message, promoCode, discountPercent, imageUrl } = req.body;
  const db = loadDB();
  const user = db.users.find(u => u.id === token);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!targetBasketId || !title || !message) {
    return res.status(400).json({ error: 'Pakipunan ang lahat ng kinakailangang impormasyon ng Marketing Banner.' });
  }

  const basket = (db.shopBaskets || []).find(b => b.id === targetBasketId);
  if (!basket || basket.status !== 'unpaid') {
    return res.status(400).json({ error: 'Ang basket na ito ay wala na o nabayaran na.' });
  }

  // Check if basket is user's own basket (Disallow placing banner on own orders)
  if (basket.userId === user.id) {
    return res.status(400).json({ error: 'Hindi maaaring mag-place ng marketing banner sa sarili mong basket o shopping order.' });
  }

  // Check if basket already has an active banner
  const existingActiveBanner = (db.vaBanners || []).find(b => b.targetBasketId === targetBasketId && b.status === 'active');
  if (existingActiveBanner) {
    return res.status(400).json({ error: 'May aktibong banner na ang basket na ito mula sa ibang Virtual Assistant.' });
  }

  const isPaid = bannerType === 'paid';
  if (isPaid) {
    const sub = user.vaStats?.vaSubscription;
    if (!sub || sub.status !== 'active' || (sub.expiresAt && new Date(sub.expiresAt).getTime() <= Date.now())) {
      return res.status(403).json({ error: 'Kailangan ng aktibong Paid Plan (₱100/buwan) upang makapag-place ng 7-Day 5% Commission Paid Banners.' });
    }
  }

  const durationDays = isPaid ? 7 : 3;
  const commissionRate = isPaid ? 5.0 : 2.5;
  const potentialCommission = (basket.totalAmount * (commissionRate / 100));

  const now = new Date();
  const expires = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const newBanner = {
    id: 'ban-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    vaUserId: user.id,
    vaName: user.name,
    vaAvatar: user.avatar || '👩‍💼',
    bannerType: (isPaid ? 'paid' : 'free') as 'paid' | 'free',
    title: title.trim(),
    message: message.trim(),
    promoCode: promoCode ? promoCode.trim().toUpperCase() : undefined,
    discountPercent: discountPercent ? Number(discountPercent) : 10,
    imageUrl: imageUrl || undefined,
    targetBasketId: basket.id,
    targetUserId: basket.userId,
    targetCustomerName: basket.userName,
    targetOrderAmount: basket.totalAmount,
    commissionRate,
    potentialCommission,
    status: 'active' as const,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString()
  };

  if (!db.vaBanners) db.vaBanners = [];
  db.vaBanners.unshift(newBanner);

  basket.assignedBannerId = newBanner.id;
  basket.vaId = user.id;
  basket.vaName = user.name;

  // Send Push Notification / Activity Log to the Customer so they immediately see the discount offer!
  if (basket.userId) {
    const customerUser = db.users.find(u => u.id === basket.userId);
    if (customerUser) {
      if (!customerUser.activityLogs) customerUser.activityLogs = [];
      customerUser.activityLogs.unshift({
        id: 'log-ban-' + Date.now(),
        type: 'bonus',
        title: `🎁 ${newBanner.discountPercent || 10}% OFF Promo mula kay VA ${user.name}!`,
        amount: 0,
        timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
        details: `May inilagay na special promotional discount code (${newBanner.promoCode || 'ZONESPECIAL10'}) si Virtual Assistant ${user.name} sa iyong Z-oneShop cart: "${newBanner.title}"`
      });

      sendPushNotificationToUser(customerUser.id, {
        title: `🎁 May Promo Voucher ang Cart mo mula kay VA ${user.name}!`,
        body: `Gamitin ang code ${newBanner.promoCode || 'ZONESPECIAL10'} para makakuha ng ${newBanner.discountPercent || 10}% OFF sa iyong checkout!`
      }).catch(() => {});
    }
  }

  saveDB(db);

  return res.json({
    success: true,
    message: `Matagumpay na nailagay ang ${isPaid ? '7-Day Paid' : '3-Day Free'} Banner sa basket ni ${basket.userName}!`,
    banner: newBanner
  });
});

// 8. GET /api/va/my-banners - Get all marketing banners placed by current VA
app.get('/api/va/my-banners', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const db = loadDB();
  checkAndExpireBanners(db);

  const banners = (db.vaBanners || [])
    .filter(b => b.vaUserId === token)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({
    success: true,
    banners
  });
});

// 9. POST /api/va/convert-vm - Transfer Virtual Money to Wallet Balance (Minimum ₱600)
app.post('/api/va/convert-vm', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const db = loadDB();
  const user = db.users.find(u => u.id === token);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const currentVM = user.vaStats?.virtualMoneyBalance || 0;

  if (currentVM < VA_VM_MIN_TRANSFER) {
    return res.status(400).json({ 
      error: `Hindi pa umaabot sa minimum limit na ₱${VA_VM_MIN_TRANSFER.toFixed(2)} ang iyong Virtual Money (Kasalukuyang VM: ₱${currentVM.toFixed(2)}).` 
    });
  }

  const requestedAmount = req.body.amount ? Number(req.body.amount) : currentVM;

  if (requestedAmount < VA_VM_MIN_TRANSFER || requestedAmount > currentVM) {
    return res.status(400).json({ 
      error: `Ang halagang maaaring i-transfer ay mula ₱${VA_VM_MIN_TRANSFER.toFixed(2)} hanggang ₱${currentVM.toFixed(2)}.` 
    });
  }

  // Deduct from VM and credit to main wallet balance
  user.vaStats!.virtualMoneyBalance -= requestedAmount;
  user.stats.balance = (user.stats.balance || 0) + requestedAmount;
  user.stats.lifetimeEarnings = (user.stats.lifetimeEarnings || 0) + requestedAmount;

  if (!user.activityLogs) user.activityLogs = [];
  user.activityLogs.unshift({
    id: 'log-vm-' + Date.now(),
    type: 'bonus',
    title: 'Virtual Money Transferred to GCash Wallet! 💸',
    amount: requestedAmount,
    timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
    details: `Nai-lipat ang ₱${requestedAmount.toFixed(2)} Virtual Money Commission sa iyong regular Wallet Balance para sa GCash cashout.`
  });

  saveDB(db);

  return res.json({
    success: true,
    message: `Matagumpay na nailipat ang ₱${requestedAmount.toFixed(2)} sa iyong GCash Wallet Balance!`,
    transferredAmount: requestedAmount,
    newVMBalance: user.vaStats!.virtualMoneyBalance,
    newWalletBalance: user.stats.balance
  });
});

// 10. POST /api/shop/simulate-action - Customer payment & delivery or forced expiry (Admin only)
app.post('/api/shop/simulate-action', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { basketId, action } = req.body;
  const db = loadDB();

  const user = db.users.find(u => u.id === token);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden: Admin lamang ang maaaring mag-proseso ng Bayaran at I-deliver o Expire Lead.' });
  }

  const basket = (db.shopBaskets || []).find(b => b.id === basketId);
  if (!basket) return res.status(404).json({ error: 'Shopping basket not found' });

  if (action === 'customer_pay_deliver') {
    basket.status = 'paid_delivered';
    basket.paidAt = new Date().toISOString();
    basket.deliveredAt = new Date().toISOString();

    let earnedComm = 0;
    let vaName = '';

    // Check banner commission
    if (basket.assignedBannerId && db.vaBanners) {
      const banner = db.vaBanners.find(b => b.id === basket.assignedBannerId);
      if (banner && banner.status === 'active') {
        banner.status = 'success_paid';
        banner.completedAt = new Date().toISOString();
        earnedComm = basket.totalAmount * (banner.commissionRate / 100);
        banner.earnedCommission = earnedComm;

        // Credit to VA user
        const vaUser = db.users.find(u => u.id === banner.vaUserId);
        if (vaUser) {
          if (!vaUser.vaStats) {
            vaUser.vaStats = {
              hiredCount: 0,
              virtualMoneyBalance: 0,
              totalVMEarned: 0,
              hiringRewardClaimed: false,
              isVaRegistered: true
            };
          }
          vaUser.vaStats.virtualMoneyBalance = (vaUser.vaStats.virtualMoneyBalance || 0) + earnedComm;
          vaUser.vaStats.totalVMEarned = (vaUser.vaStats.totalVMEarned || 0) + earnedComm;
          vaName = vaUser.name;

          if (!vaUser.activityLogs) vaUser.activityLogs = [];
          vaUser.activityLogs.unshift({
            id: 'log-comm-' + Date.now(),
            type: 'bonus',
            title: `Commission Earned: ₱${earnedComm.toFixed(2)} VM! 🛍️`,
            amount: earnedComm,
            timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
            details: `Nabayaran at na-deliver ang order ni ${basket.userName} (₱${basket.totalAmount.toFixed(2)}). Pumasok ang ${banner.commissionRate}% commission sa iyong Virtual Money wallet.`
          });

          sendPushNotificationToUser(vaUser.id, {
            title: '🛍️ Z-oneShop Commission Credited!',
            body: `Kumita ka ng ₱${earnedComm.toFixed(2)} Virtual Money mula sa nabayarang cart ni ${basket.userName}!`
          }).catch(() => {});
        }
      }
    }

    saveDB(db);

    return res.json({
      success: true,
      message: `Nabayaran at nai-deliver na ang order ni ${basket.userName}!`,
      earnedCommission: earnedComm,
      vaName,
      basket
    });
  } else if (action === 'force_expire') {
    basket.status = 'expired_bad_order';

    if (basket.assignedBannerId && db.vaBanners) {
      const banner = db.vaBanners.find(b => b.id === basket.assignedBannerId);
      if (banner && banner.status === 'active') {
        banner.status = 'bad_order_expired';
        banner.completedAt = new Date().toISOString();
      }
    }

    saveDB(db);

    return res.json({
      success: true,
      message: 'Na-marka bilang Bad Order / Expired Lead ang basket.',
      basket
    });
  } else {
    return res.status(400).json({ error: 'Invalid action' });
  }
});

// 11. GET /api/shop/products - Get all shop catalogue products
app.get('/api/shop/products', (req, res) => {
  const db = loadDB();
  const token = req.headers.authorization?.replace('Bearer ', '');
  const currentUser = token ? db.users.find(u => u.id === token) : null;
  const isAdmin = currentUser?.isAdmin || false;

  let products = db.shopProducts || INITIAL_SHOP_PRODUCTS;
  if (!isAdmin) {
    products = products.filter(p => p.isActive !== false);
  }

  return res.json({
    success: true,
    products
  });
});

// 11b. POST /api/admin/shop/products - Admin add new product to catalogue
app.post('/api/admin/shop/products', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const db = loadDB();
  const admin = db.users.find(u => u.id === token && u.isAdmin);
  if (!admin) return res.status(403).json({ error: 'Admin access required' });

  const { name, price, originalPrice, image, category, description, stock, tags } = req.body;
  if (!name || price === undefined || !image) {
    return res.status(400).json({ error: 'Product name, price, and image URL are required.' });
  }

  const newProduct = {
    id: 'prod-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    name: name.trim(),
    price: Number(price),
    originalPrice: originalPrice ? Number(originalPrice) : Math.round(Number(price) * 1.5),
    image: image.trim(),
    category: category || 'Gadgets',
    description: (description || '').trim(),
    stock: Number(stock) || 50,
    rating: 5.0,
    isActive: true,
    salesCount: 0,
    tags: Array.isArray(tags) ? tags : ['New Arrival'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (!db.shopProducts) db.shopProducts = [];
  db.shopProducts.unshift(newProduct);

  saveDB(db);

  return res.json({
    success: true,
    message: `Matagumpay na naidagdag ang "${newProduct.name}" sa Z-oneShop catalogue!`,
    product: newProduct
  });
});

// 11c. PUT /api/admin/shop/products/:id - Admin edit product
app.put('/api/admin/shop/products/:id', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const db = loadDB();
  const admin = db.users.find(u => u.id === token && u.isAdmin);
  if (!admin) return res.status(403).json({ error: 'Admin access required' });

  const productId = req.params.id;
  const prodIndex = (db.shopProducts || []).findIndex(p => p.id === productId);
  if (prodIndex === -1) return res.status(404).json({ error: 'Product not found' });

  const { name, price, originalPrice, image, category, description, stock, tags, isActive } = req.body;

  const existing = db.shopProducts![prodIndex];
  db.shopProducts![prodIndex] = {
    ...existing,
    name: name !== undefined ? name.trim() : existing.name,
    price: price !== undefined ? Number(price) : existing.price,
    originalPrice: originalPrice !== undefined ? Number(originalPrice) : existing.originalPrice,
    image: image !== undefined ? image.trim() : existing.image,
    category: category !== undefined ? category : existing.category,
    description: description !== undefined ? description.trim() : existing.description,
    stock: stock !== undefined ? Number(stock) : existing.stock,
    tags: tags !== undefined ? tags : existing.tags,
    isActive: isActive !== undefined ? Boolean(isActive) : (existing.isActive !== false),
    updatedAt: new Date().toISOString()
  };

  saveDB(db);

  return res.json({
    success: true,
    message: 'Nai-update ang impormasyon ng produkto!',
    product: db.shopProducts![prodIndex]
  });
});

// 11d. DELETE /api/admin/shop/products/:id - Admin delete product
app.delete('/api/admin/shop/products/:id', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const db = loadDB();
  const admin = db.users.find(u => u.id === token && u.isAdmin);
  if (!admin) return res.status(403).json({ error: 'Admin access required' });

  const productId = req.params.id;
  const initialLen = (db.shopProducts || []).length;
  db.shopProducts = (db.shopProducts || []).filter(p => p.id !== productId);

  if (db.shopProducts.length === initialLen) {
    return res.status(404).json({ error: 'Product not found' });
  }

  saveDB(db);

  return res.json({
    success: true,
    message: 'Matagumpay na nabura ang produkto sa Z-oneShop.'
  });
});

// 11e. PATCH /api/admin/shop/products/:id/toggle-status - Admin toggle active/deactivate
app.patch('/api/admin/shop/products/:id/toggle-status', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const db = loadDB();
  const admin = db.users.find(u => u.id === token && u.isAdmin);
  if (!admin) return res.status(403).json({ error: 'Admin access required' });

  const productId = req.params.id;
  const prod = (db.shopProducts || []).find(p => p.id === productId);
  if (!prod) return res.status(404).json({ error: 'Product not found' });

  prod.isActive = prod.isActive === false ? true : false;
  prod.updatedAt = new Date().toISOString();

  saveDB(db);

  return res.json({
    success: true,
    message: `Ang produkto ay ${prod.isActive ? 'naka-ACTIVATE na sa customer catalogue' : 'naka-DEACTIVATE na (tago)'}!`,
    product: prod
  });
});

// 12. GET /api/shop/cart - Get user shopping cart items and customer active marketing banner
app.get('/api/shop/cart', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const db = loadDB();
  const user = db.users.find(u => u.id === token);
  if (!user) return res.status(404).json({ error: 'User not found' });

  checkAndExpireBanners(db);
  checkAndSyncAllCartsToBaskets(db);

  if (!db.shopCarts) db.shopCarts = {};
  const userCart = db.shopCarts[user.id] || [];

  // Find active marketing banner for this user
  const userBasket = (db.shopBaskets || []).find(b => b.userId === user.id && b.status === 'unpaid');
  let activeBanner = null;
  if (userBasket && userBasket.assignedBannerId) {
    activeBanner = (db.vaBanners || []).find(b => b.id === userBasket.assignedBannerId && b.status === 'active');
  }
  if (!activeBanner) {
    activeBanner = (db.vaBanners || []).find(b => 
      (b.targetUserId === user.id || (userBasket && b.targetBasketId === userBasket.id)) && 
      b.status === 'active'
    );
  }

  return res.json({
    success: true,
    cart: userCart,
    activeBanner: activeBanner || null
  });
});

// 12a-2. GET /api/shop/active-banner - Get active marketing banner for current user
app.get('/api/shop/active-banner', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const db = loadDB();
  const user = db.users.find(u => u.id === token);
  if (!user) return res.status(404).json({ error: 'User not found' });

  checkAndExpireBanners(db);

  const userBasket = (db.shopBaskets || []).find(b => b.userId === user.id && b.status === 'unpaid');
  let activeBanner = null;
  if (userBasket && userBasket.assignedBannerId) {
    activeBanner = (db.vaBanners || []).find(b => b.id === userBasket.assignedBannerId && b.status === 'active');
  }
  if (!activeBanner) {
    activeBanner = (db.vaBanners || []).find(b => 
      (b.targetUserId === user.id || (userBasket && b.targetBasketId === userBasket.id)) && 
      b.status === 'active'
    );
  }

  return res.json({
    success: true,
    activeBanner: activeBanner || null
  });
});

// 12a-3. POST /api/shop/validate-voucher - Check and validate promo code
app.post('/api/shop/validate-voucher', (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Maglagay ng voucher code.' });

  const db = loadDB();
  checkAndExpireBanners(db);

  const cleanCode = String(code).trim().toUpperCase();

  // 1. Check against active VA banners
  const banner = (db.vaBanners || []).find(b => b.status === 'active' && b.promoCode && b.promoCode.toUpperCase() === cleanCode);
  if (banner) {
    return res.json({
      success: true,
      valid: true,
      code: banner.promoCode,
      discountPercent: banner.discountPercent || 10,
      vaName: banner.vaName,
      bannerTitle: banner.title,
      message: `🎉 Nailapat ang ${banner.discountPercent || 10}% Discount mula sa promo banner ni VA ${banner.vaName}!`
    });
  }

  // 2. Standard system vouchers
  if (cleanCode === 'ZONEDISCOUNT' || cleanCode === 'WELCOME10') {
    return res.json({
      success: true,
      valid: true,
      code: cleanCode,
      discountPercent: 10,
      message: '🎉 10% Welcome Discount Voucher applied!'
    });
  }

  if (cleanCode.startsWith('VA-') || cleanCode.includes('VA') || cleanCode.includes('SPECIAL')) {
    return res.json({
      success: true,
      valid: true,
      code: cleanCode,
      discountPercent: 8,
      message: '🎉 VA Exclusive Promo Voucher applied: 8% Discount!'
    });
  }

  return res.status(404).json({
    success: false,
    valid: false,
    error: 'Hindi matagpuan o expired na ang voucher code na ito.'
  });
});

// 12b. POST /api/shop/cart/add - Add item to cart
app.post('/api/shop/cart/add', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { productId, quantity = 1 } = req.body;
  if (!productId) return res.status(400).json({ error: 'Product ID is required' });

  const db = loadDB();
  const user = db.users.find(u => u.id === token);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const product = (db.shopProducts || INITIAL_SHOP_PRODUCTS).find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  if (!db.shopCarts) db.shopCarts = {};
  if (!db.shopCarts[user.id]) db.shopCarts[user.id] = [];

  const cart = db.shopCarts[user.id];
  const existingIdx = cart.findIndex(it => it.productId === productId);

  const addQty = Math.max(1, Number(quantity) || 1);

  if (existingIdx !== -1) {
    cart[existingIdx].quantity += addQty;
    cart[existingIdx].selected = true;
  } else {
    cart.unshift({
      id: 'cart-item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      productId: product.id,
      productName: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      quantity: addQty,
      image: product.image,
      category: product.category,
      stock: product.stock,
      selected: true
    });
  }

  syncUserCartToBasket(db, user.id);
  saveDB(db);

  return res.json({
    success: true,
    message: `Naidagdag ang "${product.name}" sa iyong cart!`,
    cart
  });
});

// 12c. POST /api/shop/cart/update - Update cart item qty or selection
app.post('/api/shop/cart/update', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { itemId, productId, quantity, selected } = req.body;
  const targetId = itemId || productId;
  const db = loadDB();
  const user = db.users.find(u => u.id === token);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!db.shopCarts) db.shopCarts = {};
  if (!db.shopCarts[user.id]) db.shopCarts[user.id] = [];

  const cart = db.shopCarts[user.id];
  const itemIdx = cart.findIndex(it => it.id === targetId || it.productId === targetId);

  if (itemIdx === -1) {
    return res.json({ success: true, cart });
  }

  if (quantity !== undefined) {
    const numQty = Number(quantity);
    if (numQty <= 0) {
      cart.splice(itemIdx, 1);
    } else {
      cart[itemIdx].quantity = numQty;
    }
  }

  if (selected !== undefined && cart[itemIdx]) {
    cart[itemIdx].selected = Boolean(selected);
  }

  syncUserCartToBasket(db, user.id);
  saveDB(db);

  return res.json({
    success: true,
    cart
  });
});

// Alias for PUT /api/shop/cart/update-quantity
app.put('/api/shop/cart/update-quantity', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { productId, itemId, quantity } = req.body;
  const targetId = productId || itemId;
  const db = loadDB();
  const user = db.users.find(u => u.id === token);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!db.shopCarts) db.shopCarts = {};
  if (!db.shopCarts[user.id]) db.shopCarts[user.id] = [];

  const cart = db.shopCarts[user.id];
  const itemIdx = cart.findIndex(it => it.id === targetId || it.productId === targetId);

  if (itemIdx !== -1) {
    const numQty = Number(quantity);
    if (numQty <= 0) {
      cart.splice(itemIdx, 1);
    } else {
      cart[itemIdx].quantity = numQty;
    }
    syncUserCartToBasket(db, user.id);
    saveDB(db);
  }

  return res.json({ success: true, cart });
});

// Alias for PATCH /api/shop/cart/toggle-select
app.patch('/api/shop/cart/toggle-select', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { productId, itemId, selected } = req.body;
  const targetId = productId || itemId;
  const db = loadDB();
  const user = db.users.find(u => u.id === token);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!db.shopCarts) db.shopCarts = {};
  if (!db.shopCarts[user.id]) db.shopCarts[user.id] = [];

  const cart = db.shopCarts[user.id];
  const itemIdx = cart.findIndex(it => it.id === targetId || it.productId === targetId);

  if (itemIdx !== -1) {
    cart[itemIdx].selected = Boolean(selected);
    syncUserCartToBasket(db, user.id);
    saveDB(db);
  }

  return res.json({ success: true, cart });
});

// 12d. POST /api/shop/cart/select-all - Toggle select all in cart
app.post('/api/shop/cart/select-all', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { selected } = req.body;
  const db = loadDB();
  const user = db.users.find(u => u.id === token);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!db.shopCarts) db.shopCarts = {};
  if (!db.shopCarts[user.id]) db.shopCarts[user.id] = [];

  db.shopCarts[user.id].forEach(item => {
    item.selected = Boolean(selected);
  });

  syncUserCartToBasket(db, user.id);
  saveDB(db);

  return res.json({
    success: true,
    cart: db.shopCarts[user.id]
  });
});

// 12e. POST /api/shop/cart/remove - Remove single item from cart
app.post('/api/shop/cart/remove', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { itemId, productId } = req.body;
  const targetId = itemId || productId;
  const db = loadDB();
  const user = db.users.find(u => u.id === token);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (db.shopCarts && db.shopCarts[user.id]) {
    db.shopCarts[user.id] = db.shopCarts[user.id].filter(it => it.id !== targetId && it.productId !== targetId);
    syncUserCartToBasket(db, user.id);
    saveDB(db);
  }

  return res.json({
    success: true,
    cart: db.shopCarts ? (db.shopCarts[user.id] || []) : []
  });
});

// Alias for DELETE /api/shop/cart/item/:productId
app.delete('/api/shop/cart/item/:productId', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { productId } = req.params;
  const db = loadDB();
  const user = db.users.find(u => u.id === token);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (db.shopCarts && db.shopCarts[user.id]) {
    db.shopCarts[user.id] = db.shopCarts[user.id].filter(it => it.id !== productId && it.productId !== productId);
    syncUserCartToBasket(db, user.id);
    saveDB(db);
  }

  return res.json({
    success: true,
    cart: db.shopCarts ? (db.shopCarts[user.id] || []) : []
  });
});

// 12f. POST /api/shop/cart/clear - Clear user's cart (POST or DELETE)
app.all('/api/shop/cart/clear', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const db = loadDB();
  const user = db.users.find(u => u.id === token);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!db.shopCarts) db.shopCarts = {};
  db.shopCarts[user.id] = [];
  syncUserCartToBasket(db, user.id);
  saveDB(db);

  return res.json({
    success: true,
    cart: []
  });
});

// 12g. POST /api/shop/checkout - Shopee-style Checkout with GCash or Wallet balance
app.post('/api/shop/checkout', checkIdempotency, (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const db = loadDB();
  const user = db.users.find(u => u.id === token);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const {
    items,
    shippingAddress,
    paymentMethod = 'gcash',
    gcashSenderName,
    gcashSenderNumber,
    gcashRefNo,
    receiptUrl,
    promoCode,
    targetBasketId
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Kailangan ng kahit isang item para mag-checkout.' });
  }

  if (!shippingAddress || !shippingAddress.recipientName || !shippingAddress.phoneNumber || !shippingAddress.streetAddress || !shippingAddress.city) {
    return res.status(400).json({ error: 'Pakikumpleto ang lahat ng delivery address details (Pangalan, Phone, Kalye, Lungsod).' });
  }

  // Calculate order items and subtotal
  let subtotal = 0;
  let itemCount = 0;
  const processedItems = items.map((item: any) => {
    const prod = (db.shopProducts || INITIAL_SHOP_PRODUCTS).find(p => p.id === item.productId);
    const unitPrice = prod ? prod.price : Number(item.price || 0);
    const qty = Math.max(1, Number(item.quantity || 1));
    subtotal += unitPrice * qty;
    itemCount += qty;

    // Decrement stock if product exists
    if (prod) {
      prod.stock = Math.max(0, (prod.stock || 50) - qty);
      prod.salesCount = (prod.salesCount || 0) + qty;
    }

    return {
      productId: item.productId,
      productName: prod ? prod.name : item.productName,
      price: unitPrice,
      quantity: qty,
      image: prod ? prod.image : item.image,
      category: prod ? prod.category : item.category
    };
  });

  // Calculate shipping fee and discount
  const shippingFee = subtotal >= 1200 ? 0 : 50;
  let discount = 0;
  let appliedPromo = promoCode ? promoCode.trim().toUpperCase() : undefined;
  let vaId: string | undefined = undefined;
  let vaName: string | undefined = undefined;
  let vaCommissionAmount = 0;

  // Check if promo matches a VA Banner or general promo
  if (appliedPromo) {
    const activeBanner = (db.vaBanners || []).find(b => b.status === 'active' && b.promoCode && b.promoCode.toUpperCase() === appliedPromo);
    if (activeBanner) {
      discount = Math.round(subtotal * ((activeBanner.discountPercent || 5) / 100));
      vaId = activeBanner.vaUserId;
      vaName = activeBanner.vaName;
      vaCommissionAmount = Math.round(subtotal * (activeBanner.commissionRate / 100));
    } else if (appliedPromo === 'ZONEDISCOUNT' || appliedPromo === 'WELCOME10') {
      discount = Math.round(subtotal * 0.10);
    } else if (appliedPromo.startsWith('VA-')) {
      discount = Math.round(subtotal * 0.05);
    }
  }

  const totalAmount = Math.max(0, subtotal + shippingFee - discount);

  // Validate payment method
  if (paymentMethod === 'wallet') {
    if ((user.stats.balance || 0) < totalAmount) {
      return res.status(400).json({
        error: `Kulang ang iyong Wallet Balance (₱${(user.stats.balance || 0).toFixed(2)}) para sa kabuuang bayarin na ₱${totalAmount.toFixed(2)}. Mangyaring gamitin ang GCash Payment.`
      });
    }

    // Deduct from wallet balance
    user.stats.balance -= totalAmount;
    if (!user.activityLogs) user.activityLogs = [];
    user.activityLogs.unshift({
      id: 'log-shop-pay-' + Date.now(),
      type: 'withdraw',
      title: 'Z-oneShop Order Paid via Wallet Balance 🛍️',
      amount: totalAmount,
      timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
      details: `Nabayaran ang ₱${totalAmount.toFixed(2)} para sa Z-oneShop Order gamit ang iyong in-app earnings.`
    });
  } else if (paymentMethod === 'gcash') {
    if (!gcashRefNo || String(gcashRefNo).trim().length < 4) {
      return res.status(400).json({ error: 'Pakilagay ang valid na GCash Reference Number mula sa iyong resibo.' });
    }
  }

  const orderNumber = 'ZONE-ORD-' + Math.floor(10000 + Math.random() * 90000);
  const trackingNumber = 'ZEX-' + Math.floor(10000000 + Math.random() * 90000000);
  const nowStr = new Date().toISOString();

  const newOrder = {
    id: 'ord-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    orderNumber,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    userAvatar: user.avatar || '🛍️',
    items: processedItems,
    itemCount,
    subtotal,
    shippingFee,
    discount,
    promoCode: appliedPromo,
    totalAmount,
    paymentMethod,
    paymentStatus: 'paid' as const,
    gcashSenderName: gcashSenderName || user.name,
    gcashSenderNumber: gcashSenderNumber || '',
    gcashRefNo: gcashRefNo || '',
    receiptUrl: receiptUrl || '',
    shippingAddress,
    trackingNumber,
    courierName: 'Z-one Express',
    riderName: 'Kuya Elmer (0918-555-1234)',
    riderPhone: '09185551234',
    status: 'order_placed' as const,
    statusTimeline: [
      {
        status: 'order_placed',
        title: 'Order Placed & Payment Verified',
        description: `Matagumpay na natanggap ang order (${paymentMethod === 'wallet' ? 'Paid via Wallet' : `GCash Ref #${gcashRefNo}`}). Inihahanda na para sa packing.`,
        timestamp: nowStr,
        location: 'Z-oneShop Central Warehouse'
      }
    ],
    createdAt: nowStr,
    updatedAt: nowStr,
    paidAt: nowStr,
    vaId,
    vaName,
    vaCommissionAmount
  };

  if (!db.shopOrders) db.shopOrders = [];
  db.shopOrders.unshift(newOrder);

  // Clear checked-out items from user cart
  if (db.shopCarts && db.shopCarts[user.id]) {
    const checkedOutProductIds = new Set(processedItems.map(p => p.productId));
    db.shopCarts[user.id] = db.shopCarts[user.id].filter(it => !checkedOutProductIds.has(it.productId) && !it.selected);
    syncUserCartToBasket(db, user.id);
  }

  // If basket linked, update basket
  if (targetBasketId && db.shopBaskets) {
    const basket = db.shopBaskets.find(b => b.id === targetBasketId);
    if (basket) {
      basket.status = 'paid_delivered';
      basket.paidAt = nowStr;
    }
  } else if (db.shopBaskets) {
    // If no specific targetBasketId was passed but this user had an unpaid basket, mark it paid_delivered if their cart is now empty
    const userUnpaidBasket = db.shopBaskets.find(b => b.userId === user.id && b.status === 'unpaid');
    if (userUnpaidBasket && (!db.shopCarts[user.id] || db.shopCarts[user.id].length === 0)) {
      userUnpaidBasket.status = 'paid_delivered';
      userUnpaidBasket.paidAt = nowStr;
    }
  }

  // Push notification to buyer
  sendPushNotificationToUser(user.id, {
    title: '🛍️ Order Confirmed! (#' + orderNumber + ')',
    body: `Nai-proseso na ang iyong order na nagkakahalagang ₱${totalAmount.toFixed(2)}. Maaari mo nang i-track ang delivery status sa My Orders page!`
  }).catch(() => {});

  saveDB(db);

  return res.json({
    success: true,
    message: `Matagumpay na nailagay ang iyong order (#${orderNumber})!`,
    order: newOrder
  });
});

// 12h. GET /api/shop/orders & /api/shop/my-orders - Get customer orders
app.get(['/api/shop/orders', '/api/shop/my-orders'], (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const db = loadDB();
  const user = db.users.find(u => u.id === token);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!db.shopOrders) db.shopOrders = INITIAL_SHOP_ORDERS;

  const userOrders = db.shopOrders.filter(o => 
    o.userId === user.id || 
    (user.email && o.userEmail === user.email) ||
    (o.userName && o.userName.toLowerCase() === user.name.toLowerCase())
  );

  return res.json({
    success: true,
    orders: userOrders
  });
});

// 12i. GET /api/shop/orders/:id & /api/shop/order/:id - Get single order tracking details
app.get(['/api/shop/orders/:id', '/api/shop/order/:id'], (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const db = loadDB();
  const user = db.users.find(u => u.id === token);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!db.shopOrders) db.shopOrders = INITIAL_SHOP_ORDERS;

  const orderId = req.params.id;
  const order = db.shopOrders.find(o => o.id === orderId || o.orderNumber === orderId);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Check authorization (buyer or admin)
  const isOwner = order.userId === user.id || 
    (user.email && order.userEmail === user.email) ||
    (order.userName && order.userName.toLowerCase() === user.name.toLowerCase());

  if (!isOwner && !user.isAdmin) {
    return res.status(403).json({ error: 'Access denied to this order' });
  }

  return res.json({
    success: true,
    order
  });
});

// 12j. POST /api/shop/orders/:id/cancel & /api/shop/order/:id/cancel - Buyer cancels order before packing
app.post(['/api/shop/orders/:id/cancel', '/api/shop/order/:id/cancel'], (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const db = loadDB();
  const user = db.users.find(u => u.id === token);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!db.shopOrders) db.shopOrders = INITIAL_SHOP_ORDERS;

  const orderId = req.params.id;
  const order = db.shopOrders.find(o => 
    (o.id === orderId || o.orderNumber === orderId) && 
    (o.userId === user.id || (user.email && o.userEmail === user.email) || (o.userName && o.userName.toLowerCase() === user.name.toLowerCase()))
  );

  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (order.status !== 'order_placed') {
    return res.status(400).json({ error: 'Hindi na maaaring ikansela ang order dahil ito ay nai-pack o na-dispatch na ng warehouse.' });
  }

  const { reason = 'Customer request' } = req.body;
  const nowStr = new Date().toISOString();

  order.status = 'cancelled_by_buyer';
  order.cancelledAt = nowStr;
  order.cancellationReason = reason;
  order.updatedAt = nowStr;

  order.statusTimeline.push({
    status: 'cancelled_by_buyer',
    title: 'Order Cancelled by Customer',
    description: `Kinansela ng customer ang order. Dahilan: ${reason}`,
    timestamp: nowStr,
    location: 'Z-oneShop Central Warehouse'
  });

  // Restore stock
  if (Array.isArray(order.items) && db.shopProducts) {
    order.items.forEach((it: any) => {
      const prod = db.shopProducts!.find(p => p.id === it.productId);
      if (prod) {
        prod.stock = (prod.stock || 0) + (it.quantity || 1);
        prod.salesCount = Math.max(0, (prod.salesCount || 0) - (it.quantity || 1));
      }
    });
  }

  // Refund if wallet
  if (order.paymentMethod === 'wallet') {
    user.stats.balance += order.totalAmount;
    if (!user.activityLogs) user.activityLogs = [];
    user.activityLogs.unshift({
      id: 'log-shop-refund-' + Date.now(),
      type: 'bonus',
      title: 'Z-oneShop Order Refunded 🔄',
      amount: order.totalAmount,
      timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
      details: `Nai-balik ang ₱${order.totalAmount.toFixed(2)} sa iyong wallet balance mula sa kinanselang order #${order.orderNumber}.`
    });
  }

  saveDB(db);

  return res.json({
    success: true,
    message: 'Matagumpay na nakansela ang iyong order.',
    order
  });
});

// 12k. GET /api/admin/shop/orders - Admin get all orders
app.get('/api/admin/shop/orders', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const db = loadDB();
  const admin = db.users.find(u => u.id === token && u.isAdmin);
  if (!admin) return res.status(403).json({ error: 'Admin access required' });

  const orders = db.shopOrders || INITIAL_SHOP_ORDERS;

  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled_by_seller' && o.status !== 'cancelled_by_buyer')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const pendingPackingCount = orders.filter(o => o.status === 'order_placed' || o.status === 'for_packing').length;
  const toShipCount = orders.filter(o => o.status === 'sorting_hub' || o.status === 'rider_pickup' || o.status === 'to_ship').length;
  const deliveredCount = orders.filter(o => o.status === 'shipped_success').length;
  const cancelledCount = orders.filter(o => o.status === 'cancelled_by_seller' || o.status === 'cancelled_by_buyer').length;

  return res.json({
    success: true,
    orders,
    stats: {
      totalOrders: orders.length,
      totalRevenue,
      pendingPackingCount,
      toShipCount,
      deliveredCount,
      cancelledCount
    }
  });
});

// 12l. POST /api/admin/shop/order/update-status & /api/admin/shop/orders/update-status - Admin advance order tracking or cancel
app.post(['/api/admin/shop/order/update-status', '/api/admin/shop/orders/update-status'], (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const db = loadDB();
  const admin = db.users.find(u => u.id === token && u.isAdmin);
  if (!admin) return res.status(403).json({ error: 'Admin access required' });

  const {
    orderId,
    newStatus,
    trackingNumber,
    courierName,
    riderName,
    riderPhone,
    location,
    customNote,
    cancellationReason
  } = req.body;

  if (!db.shopOrders) db.shopOrders = INITIAL_SHOP_ORDERS;

  const order = db.shopOrders.find(o => o.id === orderId || o.orderNumber === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const nowStr = new Date().toISOString();
  order.status = newStatus;
  order.updatedAt = nowStr;

  if (trackingNumber) order.trackingNumber = trackingNumber;
  if (courierName) order.courierName = courierName;
  if (riderName) order.riderName = riderName;
  if (riderPhone) order.riderPhone = riderPhone;

  let title = '';
  let description = '';

  switch (newStatus) {
    case 'for_packing':
      title = 'Package is Being Prepared & Packed';
      description = customNote || 'Warehouse team is packing your items safely in bubble wrap with fragile tags.';
      break;
    case 'sorting_hub':
      title = 'Arrived at Central Sorting Hub';
      description = customNote || `Parcel arrived at Pasig/Bulacan Central Sorting Hub and scanned for dispatch route (${order.courierName || 'Z-one Express'}).`;
      break;
    case 'rider_pickup':
      title = 'Picked Up by Courier Rider';
      description = customNote || `Assigned rider ${order.riderName || 'Kuya Rider'} has picked up the package from sorting hub.`;
      break;
    case 'to_ship':
      title = 'Out for Delivery (To Ship)';
      description = customNote || `Rider ${order.riderName || 'Kuya Elmer'} is currently out for delivery to ${order.shippingAddress?.city || 'destination'}. Please keep your phone reachable!`;
      order.shippedAt = nowStr;
      break;
    case 'shipped_success':
      title = 'Parcel Delivered Successfully! 🎉';
      description = customNote || `Package received and signed by ${order.shippingAddress?.recipientName || order.userName}. Salamat sa pagtangkilik sa Z-oneShop!`;
      order.deliveredAt = nowStr;

      // Award VA Commission if linked
      if (order.vaId && order.vaCommissionAmount > 0) {
        const vaUser = db.users.find(u => u.id === order.vaId);
        if (vaUser) {
          if (!vaUser.vaStats) {
            vaUser.vaStats = {
              hiredCount: 0,
              virtualMoneyBalance: 0,
              totalVMEarned: 0,
              hiringRewardClaimed: false,
              isVaRegistered: true
            };
          }
          vaUser.vaStats.virtualMoneyBalance = (vaUser.vaStats.virtualMoneyBalance || 0) + order.vaCommissionAmount;
          vaUser.vaStats.totalVMEarned = (vaUser.vaStats.totalVMEarned || 0) + order.vaCommissionAmount;

          if (!vaUser.activityLogs) vaUser.activityLogs = [];
          vaUser.activityLogs.unshift({
            id: 'log-shop-comm-' + Date.now(),
            type: 'bonus',
            title: `Order Commission Credited: ₱${order.vaCommissionAmount.toFixed(2)} VM! 🛍️`,
            amount: order.vaCommissionAmount,
            timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
            details: `Nai-deliver na ang Order #${order.orderNumber} ni ${order.userName}. Pumasok ang ₱${order.vaCommissionAmount.toFixed(2)} commission sa iyong Virtual Money wallet!`
          });

          sendPushNotificationToUser(vaUser.id, {
            title: '🛍️ Z-oneShop Order Delivered - Commission Credited!',
            body: `Pumasok na ang ₱${order.vaCommissionAmount.toFixed(2)} Virtual Money commission mula sa Order #${order.orderNumber}!`
          }).catch(() => {});
        }
      }
      break;
    case 'cancelled_by_seller':
      title = 'Order Cancelled by Seller';
      description = cancellationReason ? `Kinansela ng seller: ${cancellationReason}` : 'Kinansela ng pamunuan ng Z-oneShop dahil sa stock unavailability o shipping issue.';
      order.cancelledAt = nowStr;
      order.cancellationReason = cancellationReason || 'Cancelled by seller';

      // Restore stock
      if (Array.isArray(order.items) && db.shopProducts) {
        order.items.forEach((it: any) => {
          const prod = db.shopProducts!.find(p => p.id === it.productId);
          if (prod) {
            prod.stock = (prod.stock || 0) + (it.quantity || 1);
            prod.salesCount = Math.max(0, (prod.salesCount || 0) - (it.quantity || 1));
          }
        });
      }

      // Refund if wallet
      const targetBuyer = db.users.find(u => u.id === order.userId);
      if (order.paymentMethod === 'wallet' && targetBuyer) {
        targetBuyer.stats.balance += order.totalAmount;
        if (!targetBuyer.activityLogs) targetBuyer.activityLogs = [];
        targetBuyer.activityLogs.unshift({
          id: 'log-seller-cancel-refund-' + Date.now(),
          type: 'bonus',
          title: 'Order Refunded to Wallet Balance 🔄',
          amount: order.totalAmount,
          timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
          details: `Nai-refund ang ₱${order.totalAmount.toFixed(2)} para sa kinanselang Order #${order.orderNumber}.`
        });
      }
      break;
    default:
      title = `Order Status Updated: ${newStatus}`;
      description = customNote || 'Na-update ang estado ng order sa Z-oneShop system.';
  }

  order.statusTimeline.push({
    status: newStatus,
    title,
    description,
    timestamp: nowStr,
    location: location || (newStatus === 'shipped_success' ? `${order.shippingAddress?.city || 'Customer Delivery Address'}` : 'Z-one Hub Logistics')
  });

  // Notify buyer of status update
  sendPushNotificationToUser(order.userId, {
    title: `📦 Order #${order.orderNumber} Status: ${title}`,
    body: description
  }).catch(() => {});

  saveDB(db);

  return res.json({
    success: true,
    message: `Matagumpay na nai-update ang status ng Order #${order.orderNumber} patungong "${title}"!`,
    order
  });
});

// 13. GET /api/admin/va-management - Admin control data for VA & Z-oneShop
app.get('/api/admin/va-management', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const db = loadDB();
  const admin = db.users.find(u => u.id === token && u.isAdmin);
  if (!admin) return res.status(403).json({ error: 'Forbidden: Admin access required' });

  checkAndExpireBanners(db);

  const vaUsers = db.users.filter(u => u.vaStats && u.vaStats.hiredCount > 0);
  const pendingSubs = (db.vaSubscriptions || []).filter(s => s.status === 'pending');
  const allBanners = db.vaBanners || [];
  const allBaskets = db.shopBaskets || [];

  return res.json({
    success: true,
    vaUsersCount: vaUsers.length,
    pendingSubs,
    allSubscriptions: db.vaSubscriptions || [],
    bannersCount: allBanners.length,
    activeBannersCount: allBanners.filter(b => b.status === 'active').length,
    basketsCount: allBaskets.length,
    unpaidBasketsCount: allBaskets.filter(b => b.status === 'unpaid').length,
    winner: db.vaLeaderboardWinner || null,
    banners: allBanners.slice(0, 50),
    baskets: allBaskets.slice(0, 50)
  });
});

// 14. POST /api/admin/approve-va-subscription - Admin approves/declines ₱100/mo sub
app.post('/api/admin/approve-va-subscription', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { subscriptionId, decision } = req.body;
  const db = loadDB();
  const admin = db.users.find(u => u.id === token && u.isAdmin);
  if (!admin) return res.status(403).json({ error: 'Forbidden: Admin access required' });

  const sub = (db.vaSubscriptions || []).find(s => s.id === subscriptionId);
  if (!sub) return res.status(404).json({ error: 'Subscription request not found' });

  const targetUser = db.users.find(u => u.id === sub.userId);

  if (decision === 'approve') {
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    sub.status = 'active';
    sub.approvedAt = now.toISOString();
    sub.expiresAt = expires.toISOString();

    if (targetUser) {
      if (!targetUser.vaStats) {
        targetUser.vaStats = {
          hiredCount: 0,
          virtualMoneyBalance: 0,
          totalVMEarned: 0,
          hiringRewardClaimed: false,
          isVaRegistered: true
        };
      }
      targetUser.vaStats.vaSubscription = {
        status: 'active',
        subscribedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        paymentMethod: 'gcash'
      };

      if (!targetUser.activityLogs) targetUser.activityLogs = [];
      targetUser.activityLogs.unshift({
        id: 'log-vasub-appr-' + Date.now(),
        type: 'bonus',
        title: 'Paid VA Banner Subscription Approved! 💎',
        amount: 0,
        timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
        details: 'Inaprubahan ng Admin ang iyong ₱100 GCash subscription. Aktibo na ang iyong 7-Day 5% Commission Banners.'
      });

      sendPushNotificationToUser(targetUser.id, {
        title: '💎 VA Subscription Approved!',
        body: 'Inaprubahan na ang iyong 30-Day Paid Banner Access (7 Days Visibility, 5% Commission).'
      }).catch(() => {});
    }
  } else {
    sub.status = 'declined';
    if (targetUser && targetUser.vaStats?.vaSubscription) {
      targetUser.vaStats.vaSubscription.status = 'expired';
    }
  }

  saveDB(db);

  return res.json({
    success: true,
    message: `Subscription ${decision === 'approve' ? 'approved' : 'declined'} successfully!`,
    subscription: sub
  });
});

// --- SERVE APP STORE PAGE ---
app.get('/appstore.html', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'appstore.html'));
});

app.get('/appstore', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'appstore.html'));
});


// ============================================
//            VITE MIDDLEWARE SETUP
// ============================================

const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  console.log('🔄 Sini-synchronize ang database sa live Cloud Firestore...');
  await syncFromFirestore();

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('sw.js') || filePath.endsWith('manifest.json')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else if (filePath.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 GCash Click-Earn running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
