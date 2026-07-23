import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { Firestore } from '@google-cloud/firestore';
import { INITIAL_CAMPAIGNS } from './src/data/campaigns';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

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

const DB_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'db.json');

// --- FIREBASE CONFIGURATION & INITIALIZATION ---
let firebaseConfigObj = {
  projectId: "feisty-listener-3d2jw",
  appId: "1:828078909829:web:ce668cbe71588119b33cec",
  apiKey: "AIzaSyCxS9Nt3GHIfo82RSuDEvzYrdJtpJSFTHk",
  authDomain: "feisty-listener-3d2jw.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-a97ac6ad-011f-411e-9d04-596438effa7f",
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

let isFirestoreActive = false;
let firestore: any = null;

const rawServiceAccountValue = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
let serviceAccountData: any = null;

if (rawServiceAccountValue) {
  if (rawServiceAccountValue.startsWith('{')) {
    // Sa tingin natin ito ay raw JSON string
    try {
      serviceAccountData = JSON.parse(rawServiceAccountValue);
      console.log('🗝️ GCP: Na-parse ang raw JSON credentials mula sa FIREBASE_SERVICE_ACCOUNT environment variable.');
    } catch (err) {
      console.error('⚠️ GCP: Failed parsing inline JSON from FIREBASE_SERVICE_ACCOUNT. Susubukan nating basahin bilang file path kung ito ay path pala...', err);
    }
  }
  
  // Kung hindi pa rin na-parse at baka ito ay file path (e.g. Render Secret File)
  if (!serviceAccountData) {
    try {
      const fs = require('fs');
      if (fs.existsSync(rawServiceAccountValue)) {
        const fileContent = fs.readFileSync(rawServiceAccountValue, 'utf-8');
        serviceAccountData = JSON.parse(fileContent);
        console.log('🗝️ GCP: Matagumpay na nabasa ang credentials mula sa tinuturong file path sa FIREBASE_SERVICE_ACCOUNT:', rawServiceAccountValue);
      }
    } catch (err) {
      console.error('⚠️ GCP: Failed reading service account file from specfied path:', err);
    }
  }
}

const hasServiceAccount = !!serviceAccountData;
const isOnGoogleCloud = !!process.env.K_SERVICE || !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (hasServiceAccount || isOnGoogleCloud) {
  try {
    const isCustomProject = hasServiceAccount && serviceAccountData?.project_id && (serviceAccountData.project_id !== firebaseConfigObj.projectId);
    
    const firestoreOptions: any = {
      projectId: hasServiceAccount ? (serviceAccountData.project_id || firebaseConfigObj.projectId) : firebaseConfigObj.projectId,
    };

    // If it's a custom deployed project (like on Render), use its default database,
    // otherwise use the workspace-specific firestoreDatabaseId if defined.
    if (!isCustomProject && firebaseConfigObj.firestoreDatabaseId) {
      firestoreOptions.databaseId = firebaseConfigObj.firestoreDatabaseId;
    }

    if (hasServiceAccount) {
      firestoreOptions.credentials = serviceAccountData;
      console.log(`🗝️ GCP: Gagamitin ang nahanap na FIREBASE_SERVICE_ACCOUNT para sa project: ${firestoreOptions.projectId}`);
    }

    firestore = new Firestore(firestoreOptions);
    isFirestoreActive = true;
    console.log('☁️ Firestore client initialized successfully.');
  } catch (err) {
    console.error('⚠️ Failed to initialize Firestore client. Falling back to local storage:', err);
    isFirestoreActive = false;
    firestore = null;
  }
} else {
  console.log('⚠️ No Firebase credentials detected (please configure FIREBASE_SERVICE_ACCOUNT env var on Render.com). Falling back to local db.json storage.');
  isFirestoreActive = false;
  firestore = null;
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
  referralCode: string;
  invitedBy?: string; // referralCode of referrer
  isAdmin: boolean;
  isBanned?: boolean; // banned from Z-one or app
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
}

interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  text: string;
  createdAt: string;
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

interface DBStructure {
  users: UserSession[];
  campaigns?: any[];
  posts?: any[];
  directMessages?: DirectMessage[];
  activeCalls?: ActiveCall[];
  merchantAds?: MerchantAd[];
}

// --- HELPER TO INITIALIZE AND GET DATABASE ---
let cachedDB: DBStructure | null = null;

function loadDB(): DBStructure {
  if (cachedDB) {
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

  if (fs.existsSync(DB_FILE_PATH)) {
    try {
      const data = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const loaded: DBStructure = JSON.parse(data);
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
        try {
          fs.writeFileSync(DB_FILE_PATH, JSON.stringify(loaded, null, 2));
        } catch (writeErr) {
          console.error('Failed to write back updated campaigns to db.json', writeErr);
        }
      }
      if (!loaded.posts) {
        loaded.posts = [
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
        ];
      }
      cachedDB = loaded;
      return loaded;
    } catch (e) {
      console.error('Error reading database file, resetting...', e);
    }
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
        invitedBy: 'ADMIN-ROSCO', // Admin can claim bonus for Clara if Clara earnings reach 500!
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
    merchantAds: []
  };

  // Add Maria Clara as admin's referred friend at the start
  defaultDB.users[0].referredFriends.push({
    id: 'user-clara',
    name: 'Maria Clara Santos',
    avatar: '👩‍⚕️',
    currentEarnings: 530.00, // already reached 500! Ready to claim!
    bonusClaimed: false,
    joinedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toLocaleDateString('fil-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  });

  fs.writeFileSync(DB_FILE_PATH, JSON.stringify(defaultDB, null, 2), 'utf-8');
  cachedDB = defaultDB;
  return defaultDB;
}

const lastSyncedCache = {
  users: new Map<string, string>(),
  campaigns: new Map<string, string>(),
  posts: new Map<string, string>(),
  directMessages: new Map<string, string>(),
  merchantAds: new Map<string, string>()
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
}

function saveDB(data: DBStructure) {
  cachedDB = data;
  fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  uploadToFirestore(data).catch(err => {
    console.error('Error uploading db changes to Firestore:', err);
  });
}

async function uploadToFirestore(data: DBStructure) {
  if (!isFirestoreActive || !firestore) {
    return;
  }
  
  initLastSyncedCache(data);

  try {
    const userPromises: Promise<any>[] = [];
    for (const u of data.users) {
      const uStr = JSON.stringify(u);
      if (lastSyncedCache.users.get(u.id) !== uStr) {
        userPromises.push((async () => {
          try {
            const uDocRef = firestore!.collection('users').doc(u.id);
            const { id, ...uWithoutId } = u;
            if (uWithoutId.avatar && uWithoutId.avatar.startsWith('data:') && uWithoutId.avatar.length > 500000) {
              uWithoutId.avatar = '👤';
            }
            await uDocRef.set(uWithoutId);
            lastSyncedCache.users.set(u.id, uStr);
          } catch (userErr) {
            console.error(`Error saving user ${u.id} to Firestore:`, userErr);
          }
        })());
      }
    }

    const campPromises: Promise<any>[] = [];
    if (data.campaigns) {
      for (const c of data.campaigns) {
        const cStr = JSON.stringify(c);
        if (lastSyncedCache.campaigns.get(c.id) !== cStr) {
          campPromises.push((async () => {
            try {
              const cDocRef = firestore!.collection('campaigns').doc(c.id);
              const { id, ...cWithoutId } = c;
              await cDocRef.set(cWithoutId);
              lastSyncedCache.campaigns.set(c.id, cStr);
            } catch (campErr) {
              console.error(`Error saving campaign ${c.id} to Firestore:`, campErr);
            }
          })());
        }
      }
    }

    const postPromises: Promise<any>[] = [];
    if (data.posts) {
      for (const p of data.posts) {
        const pStr = JSON.stringify(p);
        if (lastSyncedCache.posts.get(p.id) !== pStr) {
          postPromises.push((async () => {
            try {
              const pDocRef = firestore!.collection('posts').doc(p.id);
              const { id, ...pWithoutId } = p;
              if (pWithoutId.mediaUrl && pWithoutId.mediaUrl.startsWith('data:') && pWithoutId.mediaUrl.length > 500000) {
                if (pWithoutId.mediaType === 'video') {
                  pWithoutId.mediaUrl = 'https://assets.mixkit.co/videos/preview/mixkit-holding-a-smartphone-with-a-green-screen-34440-large.mp4';
                } else {
                  pWithoutId.mediaUrl = 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&auto=format&fit=crop&q=60';
                }
              }
              if (pWithoutId.mediaUrls && Array.isArray(pWithoutId.mediaUrls)) {
                pWithoutId.mediaUrls = pWithoutId.mediaUrls.map(url => {
                  if (url.startsWith('data:') && url.length > 500000) {
                    return 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&auto=format&fit=crop&q=60';
                  }
                  return url;
                });
              }
              await pDocRef.set(pWithoutId);
              lastSyncedCache.posts.set(p.id, pStr);
            } catch (postErr) {
              console.error(`Error saving post ${p.id} to Firestore:`, postErr);
            }
          })());
        }
      }
    }

    const dmPromises: Promise<any>[] = [];
    if (data.directMessages) {
      for (const dm of data.directMessages) {
        const dmStr = JSON.stringify(dm);
        if (lastSyncedCache.directMessages.get(dm.id) !== dmStr) {
          dmPromises.push((async () => {
            try {
              const dmDocRef = firestore!.collection('direct_messages').doc(dm.id);
              const { id, ...dmWithoutId } = dm;
              await dmDocRef.set(dmWithoutId);
              lastSyncedCache.directMessages.set(dm.id, dmStr);
            } catch (dmErr) {
              console.error(`Error saving DM ${dm.id} to Firestore:`, dmErr);
            }
          })());
        }
      }
    }

    const maPromises: Promise<any>[] = [];
    if (data.merchantAds) {
      for (const ma of data.merchantAds) {
        const maStr = JSON.stringify(ma);
        if (lastSyncedCache.merchantAds.get(ma.id) !== maStr) {
          maPromises.push((async () => {
            try {
              const maDocRef = firestore!.collection('merchant_ads').doc(ma.id);
              const { id, ...maWithoutId } = ma;
              await maDocRef.set(maWithoutId);
              lastSyncedCache.merchantAds.set(ma.id, maStr);
            } catch (maErr) {
              console.error(`Error saving Merchant Ad ${ma.id} to Firestore:`, maErr);
            }
          })());
        }
      }
    }

    const deletionPromises: Promise<any>[] = [];
    
    const currentPostIds = new Set(data.posts ? data.posts.map(p => p.id) : []);
    for (const cachedId of lastSyncedCache.posts.keys()) {
      if (!currentPostIds.has(cachedId)) {
        deletionPromises.push((async () => {
          try {
            await firestore!.collection('posts').doc(cachedId).delete();
            lastSyncedCache.posts.delete(cachedId);
          } catch (delErr) {
            console.error(`Error deleting post ${cachedId} from Firestore:`, delErr);
          }
        })());
      }
    }

    const currentDmIds = new Set(data.directMessages ? data.directMessages.map(dm => dm.id) : []);
    for (const cachedId of lastSyncedCache.directMessages.keys()) {
      if (!currentDmIds.has(cachedId)) {
        deletionPromises.push((async () => {
          try {
            await firestore!.collection('direct_messages').doc(cachedId).delete();
            lastSyncedCache.directMessages.delete(cachedId);
          } catch (delErr) {
            console.error(`Error deleting DM ${cachedId} from Firestore:`, delErr);
          }
        })());
      }
    }

    const currentMaIds = new Set(data.merchantAds ? data.merchantAds.map(ma => ma.id) : []);
    for (const cachedId of lastSyncedCache.merchantAds.keys()) {
      if (!currentMaIds.has(cachedId)) {
        deletionPromises.push((async () => {
          try {
            await firestore!.collection('merchant_ads').doc(cachedId).delete();
            lastSyncedCache.merchantAds.delete(cachedId);
          } catch (delErr) {
            console.error(`Error deleting Merchant Ad ${cachedId} from Firestore:`, delErr);
          }
        })());
      }
    }

    const currentUserIds = new Set(data.users.map(u => u.id));
    for (const cachedId of lastSyncedCache.users.keys()) {
      if (!currentUserIds.has(cachedId)) {
        deletionPromises.push((async () => {
          try {
            await firestore!.collection('users').doc(cachedId).delete();
            lastSyncedCache.users.delete(cachedId);
          } catch (delErr) {
            console.error(`Error deleting user ${cachedId} from Firestore:`, delErr);
          }
        })());
      }
    }

    const allPromises = [...userPromises, ...campPromises, ...postPromises, ...dmPromises, ...maPromises, ...deletionPromises];
    if (allPromises.length > 0) {
      await Promise.all(allPromises);
      console.log(`☁️ GCash Click-Earn: Firestore cloud backup completed. Synced ${allPromises.length} updates/deletes.`);
    }
  } catch (err) {
    console.error('❌ Failed background write to Firestore:', err);
  }
}

async function syncFromFirestore() {
  if (!isFirestoreActive || !firestore) {
    console.log('ℹ️ Local fallback active: Sini-synchronize ay lalaktawan dahil walang nakitang Firebase credentials.');
    return;
  }
  try {
    const envAdminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const envAdminPassword = process.env.ADMIN_PASSWORD || 'AdminSecurePassword123';
    const envAdminName = process.env.ADMIN_NAME || 'System Administrator';

    // Ensure directory exists
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const usersColRef = firestore.collection('users');
    const qSnapshot = await usersColRef.get();
    
    const dbUsers: any[] = [];
    qSnapshot.forEach((docSnap) => {
      dbUsers.push({ id: docSnap.id, ...docSnap.data() });
    });

    const campaignsColRef = firestore.collection('campaigns');
    const cSnapshot = await campaignsColRef.get();
    const dbCampaigns: any[] = [];
    cSnapshot.forEach((docSnap) => {
      dbCampaigns.push({ id: docSnap.id, ...docSnap.data() });
    });

    const postsColRef = firestore.collection('posts');
    const pSnapshot = await postsColRef.get();
    const dbPosts: any[] = [];
    pSnapshot.forEach((docSnap) => {
      dbPosts.push({ id: docSnap.id, ...docSnap.data() });
    });

    const dmColRef = firestore.collection('direct_messages');
    let dbDMs: any[] = [];
    try {
      const dmSnapshot = await dmColRef.get();
      dmSnapshot.forEach((docSnap) => {
        dbDMs.push({ id: docSnap.id, ...docSnap.data() });
      });
    } catch (e) {
      console.log('No direct_messages collection yet in Firestore');
    }

    const maColRef = firestore.collection('merchant_ads');
    let dbMerchantAds: any[] = [];
    try {
      const maSnapshot = await maColRef.get();
      maSnapshot.forEach((docSnap) => {
        dbMerchantAds.push({ id: docSnap.id, ...docSnap.data() });
      });
    } catch (e) {
      console.log('No merchant_ads collection yet in Firestore');
    }

    if (dbUsers.length > 0) {
      console.log(`📱 Found ${dbUsers.length} users in Firestore. Overwriting local cache...`);
      const loadedDB: DBStructure = { 
        users: dbUsers,
        campaigns: dbCampaigns.length > 0 ? dbCampaigns : INITIAL_CAMPAIGNS,
        posts: dbPosts.length > 0 ? dbPosts : undefined,
        directMessages: dbDMs.length > 0 ? dbDMs : undefined,
        merchantAds: dbMerchantAds.length > 0 ? dbMerchantAds : undefined
      };
      
      // Update/synchronize admin details if needed
      const admin = loadedDB.users.find(u => u.isAdmin);
      if (admin) {
        admin.email = envAdminEmail;
        admin.password = envAdminPassword;
        admin.name = envAdminName;
      }
      if (!loadedDB.posts) {
        const temp = loadDB();
        loadedDB.posts = temp.posts;
      }
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(loadedDB, null, 2), 'utf-8');
      cachedDB = loadedDB;
    } else {
      console.log('🌱 Firestore cloud database is empty. Seeding defaults from local template...');
      // Load local database or create a new one using loadDB
      const localDB = loadDB(); // This creates db.json locally if empty
      
      // Now seed Firestore
      const batchPromises = localDB.users.map(async (u) => {
        const uDocRef = firestore.collection('users').doc(u.id);
        const { id, ...uWithoutId } = u;
        await uDocRef.set(uWithoutId);
      });

      let seedCampPromises: Promise<any>[] = [];
      if (localDB.campaigns) {
        seedCampPromises = localDB.campaigns.map(async (c) => {
          const cDocRef = firestore.collection('campaigns').doc(c.id);
          const { id, ...cWithoutId } = c;
          await cDocRef.set(cWithoutId);
        });
      }

      let seedPostPromises: Promise<any>[] = [];
      if (localDB.posts) {
        seedPostPromises = localDB.posts.map(async (p) => {
          const pDocRef = firestore.collection('posts').doc(p.id);
          const { id, ...pWithoutId } = p;
          await pDocRef.set(pWithoutId);
        });
      }

      let seedDmPromises: Promise<any>[] = [];
      if (localDB.directMessages) {
        seedDmPromises = localDB.directMessages.map(async (dm) => {
          const dmDocRef = firestore.collection('direct_messages').doc(dm.id);
          const { id, ...dmWithoutId } = dm;
          await dmDocRef.set(dmWithoutId);
        });
      }

      let seedMerchantPromises: Promise<any>[] = [];
      if (localDB.merchantAds) {
        seedMerchantPromises = localDB.merchantAds.map(async (ma) => {
          const maDocRef = firestore.collection('merchant_ads').doc(ma.id);
          const { id, ...maWithoutId } = ma;
          await maDocRef.set(maWithoutId);
        });
      }

      await Promise.all([
        ...batchPromises, 
        ...seedCampPromises, 
        ...seedPostPromises, 
        ...seedDmPromises, 
        ...seedMerchantPromises
      ]);
      console.log('✅ Seeding of Firestore complete.');
    }
  } catch (err) {
    console.error('⚠️ Could not sync with Firestore at startup. Using local database fallback:', err);
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
//               AUTHENTICATION
// ============================================

// REGISTER
app.post('/api/auth/register', (req, res) => {
  const { email, password, name, avatar, referralCode } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Kailangan ibigay ang email, password, at pangalan.' });
  }

  const db = loadDB();
  const lowerEmail = email.toLowerCase().trim();

  const userExists = db.users.find(u => u.email.toLowerCase() === lowerEmail);
  if (userExists) {
    return res.status(400).json({ error: 'Ang email na ito ay may rehistradong account na.' });
  }

  // Generate individual referral code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let myCode = 'REF-';
  for (let i = 0; i < 6; i++) {
    myCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const userId = 'user-api-' + Date.now();
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
        title: 'Salamat sa pagre-register! Libreng Pang-umpisang Pera',
        amount: 25.00,
        timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
        details: 'Nakatanggap ka ng libreng ₱25.00 bilang Welcome Gift.'
      }
    ],
    referredFriends: []
  };

  // If registering with a referral code
  if (referralCode) {
    const codeClean = referralCode.trim().toUpperCase();
    const referrer = db.users.find(u => u.referralCode === codeClean);
    if (referrer) {
      newUser.invitedBy = codeClean;
      // Add this new user to the referrer's referred list!
      referrer.referredFriends.push({
        id: userId,
        name: newUser.name,
        avatar: newUser.avatar,
        currentEarnings: 25.00, // Starts with their initial balance
        bonusClaimed: false,
        joinedAt: new Date().toLocaleDateString('fil-PH', { month: 'short', day: 'numeric', year: 'numeric' })
      });
      
      // Also notify referrer with a customized activity log
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

  const user = db.users.find(u => u.email.toLowerCase() === lowerEmail);

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
  const { email, password, name, avatar, stats, withdrawals, activityLogs, referredFriends } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Kailangan ibigay ang email, password, at pangalan.' });
  }

  const db = loadDB();
  const lowerEmail = email.toLowerCase().trim();

  let user = db.users.find(u => u.email.toLowerCase() === lowerEmail);

  if (!user) {
    // Re-create and restore the exact profile state from localStorage credentials
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let myCode = 'REF-';
    for (let i = 0; i < 6; i++) {
      myCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    user = {
      id: 'user-restore-' + Date.now(),
      email: email.trim(),
      password: password,
      name: name.trim(),
      avatar: avatar || '👤',
      referralCode: myCode,
      isAdmin: false,
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

    db.users.push(user);
    saveDB(db);
  } else {
    // If user already exists inside current session memory, verify passwords
    if (user.password !== password) {
      return res.status(401).json({ error: 'Suriing mabuti ang email at password.' });
    }
  }

  const { password: _, ...userSafe } = user as any;
  res.json({ user: userSafe, token: generateToken(user.id) });
});

// GOOGLE SIGN IN OR SIGN UP SIMULATION
app.post('/api/auth/google', (req, res) => {
  const { email, name, avatar, referralCode } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'Kailangan ibigay ang Google account details.' });
  }

  const db = loadDB();
  const lowerEmail = email.toLowerCase().trim();

  let user = db.users.find(u => u.email.toLowerCase() === lowerEmail);

  // If user doesn't exist, create it on-the-fly (Sign Up)
  if (!user) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let myCode = 'REF-';
    for (let i = 0; i < 6; i++) {
      myCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const userId = 'user-google-' + Date.now();
    const defaultAvatar = avatar || '🌐';

    user = {
      id: userId,
      email: email.trim(),
      // No standard password since they used Google Sign-In
      name: name.trim(),
      avatar: defaultAvatar,
      referralCode: myCode,
      isAdmin: false,
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

    // Referrer tracking
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
          details: `${user.name} ay gumawa ng account gamit ang Google Sign-In at iyong referral link. Makakakuha ka ng ₱5.00 kapag naka-ipon siya ng kanyang unang ₱100.00!`
        });
      }
    }

    db.users.push(user);
    saveDB(db);
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
  const user = db.users.find(u => u.id === userId);
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

  // Update referred friends' progress live in referrer's profile screen
  // By matching referredFriends with their actual current earnings on our DB!
  let isFriendListModified = false;
  const synchronizedReferredFriends = user.referredFriends.map(friend => {
    const actualFriendUser = db.users.find(u => u.id === friend.id);
    if (actualFriendUser && actualFriendUser.stats.lifetimeEarnings !== friend.currentEarnings) {
      isFriendListModified = true;
      return {
        ...friend,
        currentEarnings: actualFriendUser.stats.lifetimeEarnings
      };
    }
    return friend;
  });

  if (isFriendListModified) {
    user.referredFriends = synchronizedReferredFriends;
    dbChanged = true;
  }

  if (dbChanged) {
    saveDB(db);
  }

  const { password: _, ...userSafe } = user as any;
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

  // If firestore is active, also delete the document from Firestore campaigns collection
  if (isFirestoreActive && firestore) {
    try {
      await firestore.collection('campaigns').doc(campaignId).delete();
      console.log(`🗑️ Deleted campaign ${campaignId} from Firestore collection.`);
    } catch (err) {
      console.error(`❌ Failed to delete campaign ${campaignId} from Firestore:`, err);
    }
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

  // Sync campaign and post to Firestore if active
  if (isFirestoreActive && firestore) {
    try {
      firestore.collection('campaigns').doc(newCampaign.id).set(newCampaign).catch((e: any) => console.error(e));
      firestore.collection('posts').doc(sponsorPost.id).set(sponsorPost).catch((e: any) => console.error(e));
      console.log(`🔥 Synced new merchant campaign and sponsor post to Firestore.`);
    } catch (fsErr) {
      console.error(`❌ Firestore sync error for merchant ad approval:`, fsErr);
    }
  }

  res.json({ success: true, ad });
});

// COMPLETED TASK REWARD SYNC
app.post('/api/user/task-complete', (req, res) => {
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
    if (actualReward >= 1.00 && actualReward <= 1.99) {
      // Allowed for expired users
    } else {
      return res.status(403).json({ error: 'Expired na ang iyong trial o subscription. Ang maaari mo lamang buksan at makumpleto ay mga website campaign na may reward na ₱1.00 up to ₱1.99 lamang.' });
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
        
        // Sync with Firestore if active
        if (isFirestoreActive && firestore) {
          try {
            firestore.collection('campaigns').doc(campaignId).update({ clicks: merchantCamp.clicks }).catch((e: any) => console.error(e));
          } catch (fsErr) {
            console.error('❌ Firestore click count update error:', fsErr);
          }
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
app.post('/api/user/withdraw', (req, res) => {
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
app.post('/api/user/daily-checkin', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) return res.status(401).json({ error: 'Access Denied.' });

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  // Allowed for both active and expired users to participate in daily earning features (1.00 check-in reward is in the allowed 1.00-1.99 range)

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

app.post('/api/user/spin-wheel', (req, res) => {
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
    withdrawals: pendingAndAllWithdrawals
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

// --- MEDIA UPLOAD ENDPOINT (Saves base64 media to server disk, keeping database small) ---
app.post('/api/zone/upload', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Mag-login muna.' });
  }

  const { dataUrl } = req.body;
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return res.status(400).json({ error: 'Walang valid media data na natanggap.' });
  }

  try {
    const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Hindi maproseso ang media format.' });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const extension = mimeType.split('/')[1] || 'bin';
    const filename = `media-${Date.now()}-${Math.floor(Math.random() * 1000000)}.${extension}`;
    const uploadDir = path.join(process.cwd(), 'uploads');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    // Dynamic Chunked Upload to Firestore for Persistent Storage (Solution B)
    if (isFirestoreActive && firestore) {
      const chunkSize = 800 * 1024; // Safe 800 KB chunk sizes to stay under 1MB document limits
      const totalChunks = Math.ceil(buffer.length / chunkSize);
      
      console.log(`📦 Media Upload: Saving ${filename} (${buffer.length} bytes) to Firestore in ${totalChunks} chunks...`);
      
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, buffer.length);
        const chunkBuffer = buffer.subarray(start, end);
        const chunkBase64 = chunkBuffer.toString('base64');
        
        const chunkDocId = `${filename}_chunk_${i}`;
        firestore.collection('media_storage').doc(chunkDocId).set({
          filename,
          chunkIndex: i,
          totalChunks,
          base64: chunkBase64,
          mimeType,
          uploadedAt: new Date().toISOString()
        }).catch((e: any) => console.error(`❌ Error uploading chunk ${i} for ${filename}:`, e));
      }
    }

    res.json({ success: true, url: `/uploads/${filename}` });
  } catch (err: any) {
    console.error('Error writing uploaded file:', err);
    res.status(500).json({ error: 'Hindi naisulat ang media file sa server.' });
  }
});

// --- DYNAMIC GCASH QR CODE SERVICE WITH CLOUD FIRESTORE DURA-BACKUP ---
app.get('/admin_gcash_qr.png', async (req, res) => {
  // 1. Try to fetch from persistent cloud storage (Firestore) first so restarts never wipe it out
  if (isFirestoreActive && firestore) {
    try {
      const doc = await firestore.collection('app_settings').doc('gcash_qr').get();
      if (doc.exists) {
        const data = doc.data();
        if (data && data.base64) {
          const buffer = Buffer.from(data.base64, 'base64');
          res.setHeader('Content-Type', data.mimeType || 'image/png');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          return res.send(buffer);
        }
      }
    } catch (err) {
      console.error('❌ Firestore QR recovery error:', err);
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

    // Save persistently to Firestore
    if (isFirestoreActive && firestore) {
      await firestore.collection('app_settings').doc('gcash_qr').set({
        base64: base64Data,
        mimeType,
        updatedAt: new Date().toISOString(),
        updatedBy: userId
      });
      console.log('☁️ Persistent custom GCash QR saved to Cloud Firestore.');
    }

    res.json({ success: true, message: 'Tagumpay na napalitan ang iyong GCash QR Code!' });
  } catch (err: any) {
    console.error('Error saving custom QR code:', err);
    res.status(500).json({ error: 'May naganap na error habang sine-save ang QR code.' });
  }
});

// Dynamic Interceptor for serving uploads with transparent Firestore Chunk recovery
app.get('/uploads/:filename', async (req, res) => {
  const filename = req.params.filename;
  const uploadDir = path.join(process.cwd(), 'uploads');
  const filePath = path.join(uploadDir, filename);

  // 1. If physical file exists locally on disk, serve it immediately (super fast)
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  // 2. If physical file was wiped out by a server restart, dynamically reconstruct from Firestore
  if (isFirestoreActive && firestore) {
    try {
      console.log(`🔍 Media Recovery: Recovering ${filename} from Firestore media_storage collection...`);
      const snapshot = await firestore.collection('media_storage')
        .where('filename', '==', filename)
        .get();

      if (!snapshot.empty) {
        const chunks: any[] = [];
        snapshot.forEach((doc: any) => {
          chunks.push(doc.data());
        });

        // Sort chunks sequentially by index
        chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

        // Reconstruct raw file buffer from base64 chunks
        const bufferChunks = chunks.map(c => Buffer.from(c.base64, 'base64'));
        const fileBuffer = Buffer.concat(bufferChunks);

        // Ensure target directory exists on container disk
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Cache file back to local storage so subsequent reads are instant
        fs.writeFileSync(filePath, fileBuffer);
        console.log(`✅ Media Recovery: Restored ${filename} (${fileBuffer.length} bytes) to local disk cache.`);

        // Serve the reconstructed file
        return res.sendFile(filePath);
      } else {
        console.log(`⚠️ Media Recovery: No Firestore backup records found for filename ${filename}`);
      }
    } catch (err) {
      console.error(`❌ Media Recovery Error for filename ${filename}:`, err);
    }
  }

  // Fallback if not found on disk or Firestore
  res.status(404).send('Not Found');
});

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// --- MANILA BULLETIN BALITA RSS FEED INTEGRATION ---
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

    for (const item of items) {
      const title = (item.title || '').trim();
      const link = item.url || item.guid || '';
      const summary = (item.summary || item.content_html || '').trim();
      const datePublished = item.date_published || new Date().toISOString();

      if (!title) continue;

      const uniqueInput = link || title;
      const cleanId = 'post-rss-' + Buffer.from(uniqueInput).toString('base64').replace(/[^a-zA-Z0-9]/g, '');

      formattedPosts.push({
        id: cleanId,
        userId: 'balita-rss-author',
        userName: 'Balita (Manila Bulletin)',
        userAvatar: '📰',
        text: `📰 **${title}**\n\n${summary}\n\n🔗 Basahin ang buong balita rito:\n${link}`,
        likes: [],
        comments: [],
        createdAt: datePublished,
        isRss: true,
        rssLink: link
      });
    }

    return formattedPosts;
  } catch (err) {
    console.error('Error fetching Balita RSS via feed2json:', err);
    return [];
  }
}

let lastRssSyncTime = 0;

async function syncRssToDatabase() {
  try {
    const rssArticles = await fetchBalitaRSS();
    if (rssArticles.length === 0) return;

    const db = loadDB();
    if (!db.posts) db.posts = [];

    let hasNew = false;
    for (const article of rssArticles) {
      const exists = db.posts.some(p => p.id === article.id);
      if (!exists) {
        db.posts.push(article);
        hasNew = true;
      }
    }

    if (hasNew) {
      saveDB(db);
      console.log(`✅ Synced new Balita RSS articles to DB!`);
    }
  } catch (err) {
    console.error('Error syncing RSS to DB:', err);
  }
}

// 1. GET ALL POSTS
app.get('/api/zone/posts', async (req, res) => {
  // Sync RSS feed before loading posts if expired, so we get them instantly on load!
  const now = Date.now();
  if (now - lastRssSyncTime > 5 * 60 * 1000) {
    lastRssSyncTime = now;
    console.log('🔄 Performing real-time Manila Bulletin RSS sync...');
    await syncRssToDatabase().catch(err => console.error('Real-time RSS sync failed:', err));
  }

  const db = loadDB();
  const posts = db.posts || [];
  const userId = req.headers.authorization;

  // Sort posts: always newest first
  const sortedPosts = [...posts].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  res.json({ posts: sortedPosts });
});

// 2. CREATE A NEW POST
app.post('/api/zone/posts', (req, res) => {
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

  const newPost = {
    id: 'post-' + Date.now(),
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar || '👤',
    text: cleanedText,
    mediaUrl: mediaUrl || undefined,
    mediaType: mediaType || undefined,
    mediaUrls: mediaUrls || undefined,
    likes: [],
    comments: [],
    createdAt: new Date().toISOString()
  };

  if (!db.posts) {
    db.posts = [];
  }
  db.posts.push(newPost);
  saveDB(db);

  res.json({ success: true, post: newPost, message: 'Matagumpay na na-post sa Z-one!' });
});

// 3. TOGGLE LIKE
app.post('/api/zone/posts/:postId/like', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Mag-login upang mag-like.' });
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

  const likeIndex = post.likes.indexOf(userId);
  if (likeIndex > -1) {
    post.likes.splice(likeIndex, 1); // Unlike
  } else {
    post.likes.push(userId); // Like
  }

  saveDB(db);
  res.json({ success: true, likes: post.likes });
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
  saveDB(db);

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
  saveDB(db);
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
  saveDB(db);

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
  saveDB(db);

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
app.post('/api/zone/messages', (req, res) => {
  const senderId = req.headers.authorization;
  if (!senderId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }
  const { receiverId, text } = req.body;
  if (!receiverId || !text || !text.trim()) {
    return res.status(400).json({ error: 'Kinakailangan ang receiver at mensahe.' });
  }

  const db = loadDB();
  const sender = db.users.find(u => u.id === senderId);
  const receiver = db.users.find(u => u.id === receiverId);

  if (!sender || !receiver) {
    return res.status(404).json({ error: 'Hindi mahanap ang sender o receiver.' });
  }

  if (isUserBanned(db, senderId)) {
    return res.status(403).json({ error: 'Ang iyong account ay banned sa system.' });
  }

  const filteredText = filterSwearWords(text);

  const newMsg: DirectMessage = {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
    senderId,
    senderName: sender.name,
    senderAvatar: sender.avatar,
    receiverId,
    receiverName: receiver.name,
    receiverAvatar: receiver.avatar,
    text: filteredText,
    createdAt: new Date().toISOString()
  };

  if (!db.directMessages) {
    db.directMessages = [];
  }
  db.directMessages.push(newMsg);
  saveDB(db);

  // Trigger admin auto reply if sent to the System Administrator
  if (receiverId === 'admin-rosco') {
    handleAdminAutoReply(senderId, text).catch(err => {
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
  saveDB(db);

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
  saveDB(db);

  res.json({ success: true, message: 'Matagumpay na na-delete ang mensahe!' });
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
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 GCash Click-Earn running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
