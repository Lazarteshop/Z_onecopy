# Z-ONEAPP — AI Video Creator (Talking Photo & Video Generator)

Replace the existing "AI Comic Video" feature in the Z-oneApp Create (+) action sheet with a fully functional, zero-cost **AI Video Creator**. The new feature enables users to upload any portrait photo from their mobile gallery, enter a script in Filipino, Tagalog, Taglish, or English, select natural neural voices and expressive animation styles, and generate, preview, and download a lip-synchronized talking video (MP4) with optional 1-click posting to Z-one Reels.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The implementation strictly replaces only the "AI Comic Video" entry, modal, and dedicated endpoints. All other systems (Reels camera, classic video upload, posts, authentication, wallet, GCash withdrawals, Firebase, and Cloudflare R2) remain 100% untouched.

- **Confirmed Decision 1 (Facial Presets)**: User confirmed the complete preset suite: **Natural Conversational**, **Masaya (Joyful Storyteller)**, **Balita (News Anchor)**, and **Masigla (Energetic Creator)**.
- **Confirmed Decision 2 (Zero-Cost Hybrid Architecture)**: Combine free open-source AI model connectors (HuggingFace Gradio LivePortrait / SadTalker spaces) with a built-in real-time audio-reactive landmark lip-sync engine and server-side FFmpeg MP4 multiplexer. This guarantees 100% reliable generation even when public GPU queues are busy or offline, with zero subscription fees or invented API keys.
- **Confirmed Decision 3 (Multilingual Neural Voices)**: Provide natural Tagalog, Filipino, Taglish, and English voices powered by Edge-TTS / Web Speech synthesis with instant audio preview.

---

## 1. Overview & Core Concept

### What It Does
1. **Photo Upload & Pre-sets**: Users select a photo from their mobile gallery or choose from curated Pinoy digital avatar presets (Host, Creator, News Caster, Teacher).
2. **Multilingual Scripting & Voice Selection**: Users type their script or pick ready-made Pinoy templates (greetings, motivational, promos, announcements), choose a voice (Male / Female Tagalog & English), and test audio playback.
3. **Facial Animation & Expression Styling**: Users choose one of four expressive animation styles (Natural, Masaya, Balita, Masigla) controlling blink rate, head tilt dynamics, and mouth motion intensity.
4. **Talking Video Generation & Lip-Sync**: The engine renders lip-synced video frames synchronized with audio phonemes and pitch frequencies.
5. **Preview, Download & Share**: Interactive video preview with instant `.mp4` file download to phone storage and 1-click direct publish to Z-one Reels.

### Target Audience & Persona
- Pinoy content creators, micro-influencers, shop sellers, and social media users who want to create talking presenter videos without expensive equipment or paid AI subscriptions.

---

## 2. Visual Design & Ergonomic Direction

In compliance with mobile touch ergonomics (`frontend-design` mobile touch standard):
- **Entry Point**: Replaces option 1 in the Create (+) bottom sheet modal (`src/App.tsx`).
  - Label: **AI Video Creator**
  - Badge: `Free • AI` (clean text metadata, unboxed)
  - Description: `Gawing animated talking video ang iyong litrato gamit ang AI`
  - Icon: Vibrant gradient violet/indigo camera wand (`Sparkles` / `Video`)
- **Studio Modal Layout**:
  - Full mobile viewport responsive container (`max-w-2xl` on tablet/desktop, smooth slide-up on mobile).
  - Clean step-by-step progress indicator (Photo -> Script & Voice -> Style -> Generate).
  - High-contrast accessible text with WCAG AA compliance (slate-900 / white / cyan-400 / violet-400).
  - Clear thumb-zone primary action bar with full-width CTA buttons (`min-h-[48px]`).
  - Real-time generation progress bar with live percentage and step status text.

---

## 3. Technical Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Z-ONEAPP CREATE (+) MENU                        │
│                 [AI Video Creator (Free • AI)]                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ opens
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  ZoneAIVideoCreatorModal (React SPA)                   │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ 1. Portrait Photo Input │  │ 2. Multilingual Script & TTS Audio  │  │
│  │  - Gallery / Camera     │  │  - Tagalog / Taglish / English      │  │
│  │  - Preset Avatars       │  │  - Natural Neural Voice Presets     │  │
│  └────────────┬────────────┘  └──────────────────┬──────────────────┘  │
│               │                                  │                     │
│               ▼                                  ▼                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 3. Expression Preset (Natural / Masaya / Balita / Masigla)       │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │ generates
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│             OPEN-SOURCE AI TALKING-PHOTO & VIDEO GENERATION SUITE      │
│                                                                        │
│  [Talking-Photo Animation (SadTalker)]                                  │
│   - Open-source model for full head pose, eye blinking, & 3D dynamics │
│                                                                        │
│  [Lip Synchronization (MuseTalk / Wav2Lip)]                            │
│   - Real-time latent lip synchronization with speech audio input       │
│                                                                        │
│  [Facial Animation & Expression (LivePortrait)]                        │
│   - Stitching & expression retargeting (Natural, Masaya, Balita, etc) │
│                                                                        │
│  [Text-to-Speech Engine (Filipino/Tagalog/Taglish/English)]            │
│   - Multilingual neural TTS with natural pitch, pacing & phonemes      │
│   - Built-in audio-frequency viseme analyzer for zero-latency preview  │
│                                                                        │
│  [High-Performance Resilient Fallback Engine]                          │
│   - Audio-reactive facial landmark canvas animator (ensures 100%       │
│     availability even during external model GPU rate limits)           │
└─────────────────────────────────────┬──────────────────────────────────┘
                                      │ sends audio + canvas stream
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│               SERVER-SIDE FFMPEG BACKEND MULTIPLEXER                   │
│             POST /api/ai-video-creator/finalize-video                  │
│                                                                        │
│  - Merges synthesized speech audio track with animated visual frames   │
│  - Encodes standard H.264 / AAC MP4 video at 1080x1920 or 720x1280    │
│  - Returns downloadable, broadcast-ready MP4 file                      │
└─────────────────────────────────────┬──────────────────────────────────┘
                                      │ returns final MP4
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        PREVIEW & EXPORT ACTIONS                        │
│  • Instant In-App Video Playback with seek & fullscreen                │
│  • One-Tap Direct MP4 Download (`Z-ONE-AIVideo-<timestamp>.mp4`)       │
│  • One-Tap Direct Post to Z-one Reels feed                             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Implementation Steps

### Step 1: Backend Audio & Video Engine (`server/aiVideoCreator.ts` & `server.ts`)
- Implement `handleAIVideoGenerateTTS`: Generates high-fidelity synthesized speech audio for Tagalog/Filipino/English scripts.
- Implement `handleAIVideoFinalize`: Uses `/usr/bin/ffmpeg` to multiplex animated talking-head frames with the speech audio track into a pristine MP4 container with `-c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest`.
- Mount `/api/ai-video-creator/*` routes in `server.ts`.

### Step 2: Facial Animation & Lip-Sync Engine (`src/utils/aiVideoEngine.ts`)
- Implement audio-reactive landmark mesh mapping:
  - Natural head bobbing and sway driven by speech cadence.
  - Periodic realistic blinking (2.5–4.5s intervals).
  - Audio amplitude-to-viseme mouth opening, smile shaping, and brow elevation.
  - Expression preset modifiers (Masaya increases mouth corners, Balita stabilizes head, Masigla elevates brow and speed).
- Export canvas-to-video recording utilities.

### Step 3: UI Component (`src/components/aivideo/ZoneAIVideoCreatorModal.tsx`)
- Build the rich creator interface:
  - Photo uploader with preview & crop/aspect selector.
  - Preset avatar cards for quick testing.
  - Script input with Tagalog prompt suggestions.
  - Voice selector with "Pakinggan ang Boses" audio preview.
  - Expression preset cards (Natural, Masaya, Balita, Masigla).
  - Progress bar with animated percentage and step description during baking.
  - Final video preview player, "I-download ang MP4" button, and "I-post sa Reels" button.

### Step 4: Create (+) Menu Integration (`src/App.tsx`)
- Replace the `AI Comic Video` button in the Create (+) sheet with `AI Video Creator`.
- Wire state `showAIVideoCreator` and modal `<ZoneAIVideoCreatorModal />`.
- Cleanly replace or retire legacy comic studio components without affecting any other feature.

---

## 5. Verification & Validation Plan

1. **Compilation & Syntax**: Run `tsc --noEmit` and Vite build check (`npm run build`) to ensure 0 errors.
2. **Audio & Video Pipeline Test**: Execute an automated node test verifying:
   - TTS audio generation for Filipino/English text.
   - FFmpeg multiplexing returning a valid MP4 with 1 video track and 1 audio track.
3. **End-to-End User Flow**:
   - Open Create (+) menu -> click `AI Video Creator`.
   - Upload sample photo, enter Tagalog script, select "Masaya" preset.
   - Verify video bake progress and successful MP4 playback and download.
