# Video-to-Recipe Integration: Deep Analysis & Implementation Plan

## Document Metadata
- **Author**: Senior Product Owner / Staff Tech Lead
- **Date**: 2026-01-28
- **Status**: Analysis Complete, Ready for Review
- **Source Repo**: [Ga0512/video-analysis](https://github.com/Ga0512/video-analysis) (KlipMind)
- **Target**: DishFlow "Add Recipe" feature enhancement
- **License**: MIT (fully permissive for commercial integration)

---

## Part 1: Deep Analysis of KlipMind (video-analysis repo)

### 1.1 What It Is

KlipMind is a **multimodal video analysis pipeline** that extracts transcriptions, visual descriptions, and intelligent summaries from any video. It works in two modes: fully local (no API keys) or via cloud APIs (Groq + Gemini).

### 1.2 Architecture Overview

```
VIDEO INPUT (file or URL)
       |
       v
  +-----------+
  | yt-dlp    |  <-- Downloads from YouTube/Instagram/TikTok/any URL
  +-----------+
       |
       v
  +-----------+
  | FFmpeg    |  <-- Extracts audio track (WAV, 16kHz, mono)
  +-----------+
       |
       v
  +------------------+
  | Whisper STT      |  <-- Full audio transcription with segment timestamps
  | (Groq API or     |      Returns: [{start, end, text}, ...]
  |  faster-whisper)  |
  +------------------+
       |
       v
  +------------------------+
  | Smart Block Builder    |  <-- Groups segments into ~30s blocks
  | (sentence-aware split) |      Respects sentence boundaries
  +------------------------+
       |
       v  (for each block)
  +------------------+     +------------------+
  | Frame Extractor  |     | Context Chain    |
  | (OpenCV @ mid-   |     | (prev_summary    |
  |  point of block) |     |  feeds next)     |
  +------------------+     +------------------+
       |                          |
       v                          v
  +------------------+     +------------------+
  | Vision Model     |     | LLM Summarizer   |
  | (Gemini Flash or |     | (Groq LLM or     |
  |  BLIP captioning)|     |  Ollama/LLaMA)   |
  +------------------+     +------------------+
       |                          |
       +----------+---------------+
                  |
                  v
  +----------------------------+
  | Block Output               |
  | {start_time, end_time,     |
  |  transcription,            |
  |  frame_description,        |
  |  audio_summary}            |
  +----------------------------+
       |
       v  (all blocks aggregated)
  +----------------------------+
  | Final Summary Generator    |
  | (all block summaries -->   |
  |  single cohesive summary)  |
  +----------------------------+
```

### 1.3 Key Innovation: Smart Block Processing

The most valuable technical insight is the **block-by-block processing with context chaining**:

```python
# Pseudocode of the core algorithm
prev_summary = ""
for each block in video:
    transcription = whisper_transcribe(block.audio)
    frame_desc = vision_model(block.middle_frame)

    # THIS IS THE KEY: multimodal fusion with context
    summary_input = f"""
        Previous summary (context): {prev_summary}
        Current block transcription: {transcription}
        Visual description: {frame_desc}
    """
    summary = llm_summarize(summary_input)
    prev_summary = summary  # chain to next block
```

This means:
- **Block N understands Block N-1** -- continuity is preserved
- **Audio + Visual are fused** -- the LLM sees both what was said AND what was shown
- **Sentence boundaries are respected** -- no mid-sentence cuts
- **Configurable granularity** -- 30s blocks for detail, 120s for speed

### 1.4 File-by-File Breakdown

#### `api-models/main.py` (Cloud API pipeline)
| Function | Purpose | APIs Used |
|----------|---------|-----------|
| `get_video_info()` | Opens video with OpenCV, extracts FPS, frame count, duration | OpenCV |
| `transcribe_segments()` | FFmpeg extracts audio to WAV, sends to Groq Whisper API, returns timestamped segments | FFmpeg, Groq (whisper-large-v3-turbo) |
| `describe_frame()` | Extracts mid-block frame via OpenCV, converts to PNG bytes, sends to Gemini for 1-line description | OpenCV, Pillow, Gemini 2.0 Flash-Lite |
| `split_into_sentences()` | Regex-based sentence splitter (uppercase start + punctuation end) | Pure Python (regex) |
| `create_blocks_smart()` | Core orchestrator -- builds time blocks respecting sentences, chains context, fuses audio+visual | All of the above |
| `summarize_text_llama()` | Sends multimodal input to Groq LLM with persona/language/size params | Groq (openai/gpt-oss-120b) |
| `final_video_summary()` | Aggregates all block summaries into one final summary | Groq LLM |

#### `local-models/main.py` (Local pipeline -- same logic, different backends)
| Function | Backend | Notes |
|----------|---------|-------|
| `transcribe_segments()` | faster-whisper (medium) | Runs fully local, no API key |
| `describe_frame()` | Salesforce BLIP | Image captioning, runs on CPU/GPU |
| `summarize_text_llama()` | Ollama (llama3.2:3b) | Local LLM, no network required |

#### `utils/download_url.py`
- Uses **yt-dlp** to download from YouTube, Instagram, TikTok, etc.
- Saves to `downloads/` folder with original title
- Returns local file path for pipeline consumption

### 1.5 Configuration Parameters

```python
BLOCK_DURATION = 30       # seconds per block (granularity)
LANGUAGE = "english"      # output language
SIZE = "short"|"medium"|"large"  # maps to 200/700/1600 max tokens
PERSONA = "Expert"        # tone/style of summaries
EXTRA_PROMPTS = "..."     # custom instructions appended to system prompt
```

### 1.6 Output Structure (per block)

```typescript
interface VideoBlock {
  start_time: number;      // seconds
  end_time: number;        // seconds
  transcription: string;   // raw speech text
  frame_description: string; // visual description
  audio_summary: string;   // multimodal summary
}
```

### 1.7 Strengths

1. **Multimodal fusion** -- doesn't just transcribe, understands visuals too
2. **Context chaining** -- each block knows what came before
3. **Sentence-aware splitting** -- clean, natural block boundaries
4. **Dual mode** -- works cloud (fast) or local (private)
5. **URL support** -- paste a YouTube/TikTok link, it handles download
6. **Configurable persona/language/size** -- adaptable to any domain

### 1.8 Limitations / Gaps

1. **Single frame per block** -- only captures the midpoint frame (misses transitions)
2. **No structured output** -- returns free text, not JSON/typed data
3. **No recipe-specific understanding** -- generic summarizer, not food-aware
4. **Python-only** -- needs a server/backend to run (can't run in React Native)
5. **No streaming/progress** -- blocks until complete
6. **No error recovery** -- if block N fails, the whole pipeline stops
7. **Sentence regex is naive** -- `[A-Z][^.!?]*[.!?]` fails on abbreviations, numbers, etc.

---

## Part 2: Integration Vision for DishFlow

### 2.1 The Opportunity

Users discover recipes through **cooking videos** on YouTube, TikTok, Instagram Reels. Today, they manually:
1. Watch the video
2. Pause repeatedly to note ingredients
3. Type ingredients and steps into their app
4. Miss quantities, timings, techniques

**With this integration**: Paste a URL -> AI watches the video -> structured recipe appears, ready to review and save.

### 2.2 User Flow (Product Design)

```
                    DishFlow "Add Recipe" Screen
                    ============================

    +-----------------------------------------+
    |  Add Recipe              [x]            |
    |                                         |
    |  How would you like to add?             |
    |                                         |
    |  +-----------------------------------+  |
    |  | [pen]  Write Manually             |  |
    |  +-----------------------------------+  |
    |  | [camera] Scan from Photo          |  |
    |  +-----------------------------------+  |
    |  | [video] Import from Video    NEW  |  |
    |  +-----------------------------------+  |
    |  | [sparkles] Generate with AI       |  |
    |  +-----------------------------------+  |
    |                                         |
    +-----------------------------------------+

         User taps "Import from Video"
                    |
                    v

    +-----------------------------------------+
    |  Import Recipe from Video               |
    |                                         |
    |  Paste a cooking video URL:             |
    |  +-----------------------------------+  |
    |  | https://youtube.com/watch?v=...   |  |
    |  +-----------------------------------+  |
    |                                         |
    |  Supported: YouTube, TikTok,            |
    |  Instagram Reels                        |
    |                                         |
    |  [     Analyze Video     ]              |
    |                                         |
    +-----------------------------------------+

                    |
                    v

    +-----------------------------------------+
    |  Analyzing Video...                     |
    |                                         |
    |  [=====>        ] 35%                   |
    |                                         |
    |  Step 1/4: Downloading video...     OK  |
    |  Step 2/4: Transcribing audio...   ...  |
    |  Step 3/4: Analyzing visuals...         |
    |  Step 4/4: Extracting recipe...         |
    |                                         |
    |  This may take a moment for             |
    |  longer videos                          |
    +-----------------------------------------+

                    |
                    v

    +-----------------------------------------+
    |  Recipe Found!                          |
    |                                         |
    |  [thumbnail from video]                 |
    |                                         |
    |  Creamy Garlic Tuscan Chicken           |
    |  from @cookingchannel                   |
    |  Serves: 4  |  Time: 35 min            |
    |                                         |
    |  --- Ingredients (12) ---               |
    |  [x] 4 chicken breasts                  |
    |  [x] 3 cloves garlic, minced            |
    |  [x] 1 cup heavy cream                  |
    |  [x] 2 cups spinach                     |
    |  ... (scrollable)                       |
    |                                         |
    |  --- Steps (6) ---                      |
    |  1. Season chicken with salt & pepper   |
    |     [0:30 - 1:15]                       |
    |  2. Sear chicken 5 min per side         |
    |     [1:15 - 3:45]                       |
    |  ... (scrollable)                       |
    |                                         |
    |  [  Edit & Save Recipe  ]               |
    |  [ Save as Draft ]  [ Discard ]         |
    +-----------------------------------------+
```

### 2.3 What Makes This "Smart"

We don't just transcribe -- we apply KlipMind's multimodal approach adapted for cooking:

| Signal | What We Extract | How |
|--------|----------------|-----|
| **Audio** | Ingredient names, quantities, timing cues ("cook for 5 minutes"), step narration | Whisper transcription |
| **Visual** | Cooking techniques (searing, chopping), ingredient appearance, doneness cues | Gemini Vision on key frames |
| **Combined** | Structured recipe with steps mapped to timestamps, ingredients with quantities | Recipe-specific LLM prompt |

### 2.4 Adapted Pipeline for Recipes

```
COOKING VIDEO URL
       |
       v
  +-----------+
  | Download  |  Backend downloads via yt-dlp
  +-----------+
       |
       v
  +------------------+
  | Whisper STT      |  Full transcription with timestamps
  +------------------+
       |
       v
  +------------------------+
  | Smart Block Builder    |  30s blocks, sentence-aware
  | (from KlipMind)        |
  +------------------------+
       |
       v  (for each block)
  +------------------+     +------------------+
  | Multi-Frame      |     | Recipe-Aware     |
  | Extraction       |     | Context Chain    |
  | (3 frames/block  |     | (prev ingredients|
  |  not just 1)     |     |  + steps carry   |
  +------------------+     |  forward)        |
       |                   +------------------+
       v
  +------------------+
  | Gemini Vision    |  "What cooking action is shown?
  | (recipe-tuned    |   What ingredients are visible?
  |  prompts)        |   What technique is being used?"
  +------------------+
       |
       v
  +----------------------------+
  | Recipe Extraction LLM      |
  | (Gemini, recipe-specific   |
  |  system prompt)            |
  |                            |
  | Input:                     |
  | - Block transcription      |
  | - Visual descriptions      |
  | - Previous context         |
  |                            |
  | Output (structured JSON):  |
  | - ingredients_mentioned[]  |
  | - step_description         |
  | - cooking_technique        |
  | - timing_info              |
  | - temperature              |
  +----------------------------+
       |
       v  (all blocks)
  +----------------------------+
  | Recipe Assembler           |
  | Deduplicates ingredients,  |
  | orders steps logically,    |
  | merges quantities,         |
  | generates title/metadata   |
  +----------------------------+
       |
       v
  +----------------------------+
  | Structured Recipe JSON     |
  | Ready for DishFlow UI      |
  +----------------------------+
```

---

## Part 3: Technical Integration Plan

### 3.1 Architecture Decision: Backend Service Required

DishFlow is a React Native (Expo) app. The video analysis pipeline requires:
- FFmpeg (native binary)
- yt-dlp (Python)
- OpenCV (Python, native)
- Whisper API or local model
- Heavy compute (minutes per video)

**Decision**: We need a **lightweight backend service** that the mobile app calls.

#### Option A: Serverless Function (Recommended for MVP)
```
Mobile App  -->  Cloud Function  -->  Gemini API (STT + Vision + LLM)
                 (Vercel/Supabase       ^
                  Edge Function)        |
                                   No yt-dlp needed if we
                                   use Gemini's native
                                   video understanding
```

#### Option B: Dedicated Python Backend
```
Mobile App  -->  FastAPI Server  -->  Groq (Whisper) + Gemini (Vision + LLM)
                 (Railway/Fly.io)     FFmpeg + yt-dlp on server
```

#### Option C: Gemini-Native (Simplest -- Recommended)
```
Mobile App  -->  Gemini API directly
                 (Gemini 2.0 Flash accepts video files/URLs natively)
                 No FFmpeg, no yt-dlp, no Whisper needed
```

**Recommendation: Option C for v1, Option B for v2.**

Gemini 2.0 Flash and 2.5 Pro can **natively ingest video** (up to 2 hours), understand both audio and visuals, and output structured JSON. This eliminates the entire FFmpeg/Whisper/OpenCV pipeline for the MVP. We adapt KlipMind's *conceptual approach* (block processing, multimodal fusion, context chaining) into Gemini's native capabilities.

### 3.2 Why Gemini-Native is Superior for Our Case

| KlipMind Approach | Gemini-Native Approach | Advantage |
|-------------------|----------------------|-----------|
| FFmpeg extract audio | Gemini ingests video directly | No server-side FFmpeg needed |
| Whisper transcribe | Gemini transcribes natively | Single API, same quality |
| OpenCV extract frames | Gemini sees all frames | Better visual understanding |
| BLIP/Gemini describe 1 frame | Gemini understands full motion | Catches techniques, transitions |
| Separate LLM for summary | Same Gemini call does everything | 1 API call vs 3+N calls |
| Block-by-block processing | Can process entire video at once | Simpler, faster for short videos |
| Python backend required | Can call from TypeScript directly | No backend for MVP |

### 3.3 What We Borrow from KlipMind (Conceptually)

Even with Gemini-native, KlipMind's architecture teaches us:

1. **Block Processing for Long Videos**: For videos > 10 min, process in chunks with context chaining
2. **Multimodal Fusion Prompting**: Always combine "what was said" + "what was shown"
3. **Sentence-Aware Boundaries**: Don't cut recipe steps mid-instruction
4. **Context Chaining**: Each chunk knows what came before (ingredients already mentioned, steps already covered)
5. **Configurable Output**: Size/language/persona parameters
6. **Progressive Processing**: Show progress to user per block

### 3.4 Implementation Phases

#### Phase 1: Gemini Video-to-Recipe (MVP)

**What**: User pastes YouTube URL, Gemini analyzes video, returns structured recipe.

**Files to create/modify**:
```
dishflow/
├── lib/
│   └── ai/
│       ├── gemini.ts              # (existing) Gemini client
│       ├── pantryScanner.ts       # (existing) Pantry image scanning
│       └── videoRecipeExtractor.ts # NEW: Video-to-recipe pipeline
├── app/
│   ├── recipe/
│   │   ├── add.tsx                # MODIFY: Add "Import from Video" option
│   │   ├── from-video.tsx         # NEW: Video URL input screen
│   │   ├── video-processing.tsx   # NEW: Processing/progress screen
│   │   └── video-review.tsx       # NEW: Review extracted recipe
├── store/
│   └── recipeStore.ts             # MODIFY: Add video import actions
├── types/
│   └── index.ts                   # MODIFY: Add VideoRecipe types
└── constants/
    └── prompts.ts                 # NEW: Recipe extraction prompts
```

**Core Implementation -- `videoRecipeExtractor.ts`**:

```typescript
// Conceptual API (what we build)

interface VideoRecipeRequest {
  videoUrl: string;
  language?: string;        // 'english' | 'french' | 'auto-detect'
  detailLevel?: 'quick' | 'detailed';  // maps to KlipMind's SIZE
}

interface ExtractedRecipe {
  title: string;
  description: string;
  servings: number;
  prepTime: number;         // minutes
  cookTime: number;         // minutes
  totalTime: number;        // minutes
  difficulty: 'easy' | 'medium' | 'hard';
  cuisine: string;

  ingredients: ExtractedIngredient[];
  steps: ExtractedStep[];

  // Video metadata
  sourceUrl: string;
  thumbnailUrl?: string;
  videoTitle?: string;
  channelName?: string;
}

interface ExtractedIngredient {
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;  // maps to DishFlow's 12 categories
  isOptional: boolean;
  notes?: string;               // "finely diced", "room temperature"
  timestampMentioned?: number;  // when it first appears in video
}

interface ExtractedStep {
  stepNumber: number;
  instruction: string;
  duration?: number;            // seconds this step takes
  technique?: string;           // "sear", "fold", "whisk"
  temperature?: string;         // "350F", "medium-high heat"
  videoTimestamp: {
    start: number;              // seconds
    end: number;                // seconds
  };
  visualDescription?: string;   // what the frame shows
}
```

**The Gemini Prompt (recipe-specific, adapted from KlipMind's approach)**:

```typescript
const RECIPE_EXTRACTION_PROMPT = `
You are a professional chef and recipe analyst. Analyze this cooking video
and extract a complete, structured recipe.

IMPORTANT INSTRUCTIONS:
1. Watch and listen to the ENTIRE video
2. Extract ALL ingredients with exact quantities and units
3. Map each cooking step to its video timestamp
4. Note cooking techniques, temperatures, and timing
5. Identify the cuisine type and difficulty level

OUTPUT FORMAT (strict JSON):
{
  "title": "...",
  "description": "1-2 sentence summary",
  "servings": 4,
  "prepTime": 15,
  "cookTime": 25,
  "difficulty": "easy|medium|hard",
  "cuisine": "...",
  "ingredients": [
    {
      "name": "chicken breast",
      "quantity": 4,
      "unit": "pieces",
      "category": "proteins",
      "isOptional": false,
      "notes": "boneless, skinless"
    }
  ],
  "steps": [
    {
      "stepNumber": 1,
      "instruction": "Season chicken with salt and pepper on both sides",
      "duration": 60,
      "technique": "seasoning",
      "temperature": null,
      "videoTimestamp": { "start": 30, "end": 90 },
      "visualDescription": "Hands sprinkling seasoning over raw chicken on cutting board"
    }
  ]
}

CATEGORY MAPPING (use these exact values):
- dairy, produce, proteins, bakery, pantry, spices, condiments, beverages, snacks, frozen, household, other

Be precise with quantities. If the chef says "a splash of olive oil", estimate "1 tablespoon".
If a step has a wait time (e.g., "let it rest for 10 minutes"), include that in the duration.
`;
```

#### Phase 2: Block Processing for Long Videos

For videos > 5 minutes, adapt KlipMind's block approach:

```typescript
// For long videos, we process in segments
// This mirrors KlipMind's create_blocks_smart() but via Gemini

async function processLongVideo(videoUrl: string): Promise<ExtractedRecipe> {
  // Step 1: Get video metadata + full transcript
  const metadata = await getVideoMetadata(videoUrl);

  if (metadata.duration <= 300) {
    // Short video: single Gemini call (Phase 1 approach)
    return extractRecipeSinglePass(videoUrl);
  }

  // Long video: block processing (KlipMind approach)
  const blocks = splitIntoBlocks(metadata.duration, 60); // 60s blocks for recipes

  let context = { ingredients: [], stepsCompleted: 0, prevSummary: "" };
  const allBlocks: RecipeBlock[] = [];

  for (const block of blocks) {
    // Process each block with context from previous blocks
    const result = await processVideoBlock(videoUrl, block, context);
    allBlocks.push(result);

    // Update context chain (KlipMind's key insight)
    context = {
      ingredients: [...context.ingredients, ...result.newIngredients],
      stepsCompleted: context.stepsCompleted + result.steps.length,
      prevSummary: result.summary,
    };

    // Report progress to UI
    onProgress(block.index / blocks.length);
  }

  // Final assembly (KlipMind's final_video_summary equivalent)
  return assembleRecipe(allBlocks);
}
```

#### Phase 3: Enhanced Features

- **Thumbnail extraction**: Pull a representative food image for the recipe card
- **Shopping list integration**: "Add missing ingredients to shopping list" button
- **Pantry check**: Cross-reference extracted ingredients with pantry inventory
- **Recipe variations**: "I don't have heavy cream" -> suggest substitutions
- **Video bookmarks**: Save timestamps for each step, allow playback

### 3.5 Backend Architecture (if needed for Phase 2+)

```
+------------------+       +-------------------+       +------------------+
|  DishFlow App    |  -->  | Supabase Edge     |  -->  | Gemini API       |
|  (React Native)  |       | Function          |       | (Video + LLM)   |
|                  |       | OR                |       |                  |
|  Sends: videoUrl |       | Vercel Serverless |       | Processes video  |
|  Gets: recipe{}  |       | (TypeScript)      |       | Returns JSON     |
+------------------+       +-------------------+       +------------------+
                                    |
                                    v  (Phase 2 only)
                           +-------------------+
                           | yt-dlp + FFmpeg    |
                           | (for platforms     |
                           |  Gemini can't      |
                           |  access directly)  |
                           +-------------------+
```

### 3.6 Gemini API Capabilities Check

Gemini 2.0 Flash and 2.5 Pro support:
- **Direct video URL ingestion** (YouTube supported natively)
- **Video file upload** (up to 2GB, 2 hours)
- **Audio understanding** (transcribes internally)
- **Visual understanding** (sees all frames, not just snapshots)
- **Structured JSON output** (response_mime_type: "application/json")
- **Timestamps** in video understanding

This means for YouTube videos specifically, we may not need yt-dlp at all -- Gemini can analyze the video directly from the URL.

For TikTok/Instagram where direct URL access is restricted, we'd need the download step (Phase 2 backend).

---

## Part 4: What We Need

### 4.1 Dependencies

#### Already Have (DishFlow)
- Gemini API key and client (`lib/gemini.ts`)
- Recipe data model (`types/index.ts`)
- Recipe store (`store/recipeStore.ts`)
- Category system (12 categories, perfectly maps to ingredients)
- Common items catalog (200 items for ingredient matching)

#### Need to Add
| Dependency | Purpose | Install |
|------------|---------|---------|
| None for Phase 1 | Gemini handles everything | -- |
| `expo-clipboard` (optional) | Paste URL from clipboard | `npx expo install expo-clipboard` |
| Backend (Phase 2) | For yt-dlp + long video processing | Supabase/Vercel |

### 4.2 API Costs Estimate

| Operation | Model | Cost (approx) | Per Recipe |
|-----------|-------|---------------|------------|
| Video analysis | Gemini 2.0 Flash | $0.01-0.05 per video (5 min) | ~$0.03 |
| Video analysis | Gemini 2.5 Pro | $0.05-0.25 per video (5 min) | ~$0.15 |
| Recipe refinement | Gemini 2.0 Flash | $0.001-0.005 per call | ~$0.002 |

**Budget**: ~$0.03 per recipe extraction with Flash model. Very affordable.

### 4.3 Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Gemini can't access certain video URLs | High | Phase 2 backend with yt-dlp as fallback |
| Extraction quality varies by video | Medium | Let user edit/correct before saving |
| Long videos (30+ min) hit API limits | Medium | Block processing (KlipMind approach) |
| Non-cooking videos submitted | Low | Pre-validate with quick classification call |
| Multiple recipes in one video | Low | Ask user which recipe to extract |
| Non-English videos | Low | Gemini handles multilingual natively |
| Rate limiting on Gemini API | Low | Queue with exponential backoff |

### 4.4 Database Schema Changes

```sql
-- Add video source tracking to recipes table
ALTER TABLE recipes ADD COLUMN source_type TEXT DEFAULT 'manual';
-- source_type: 'manual' | 'ai_generated' | 'video_import' | 'photo_scan'

ALTER TABLE recipes ADD COLUMN source_url TEXT;
-- The original video URL

ALTER TABLE recipes ADD COLUMN source_metadata TEXT;
-- JSON: { channelName, videoTitle, thumbnailUrl, extractedAt }
```

### 4.5 Type Changes

```typescript
// types/index.ts additions

interface Recipe {
  // ... existing fields ...
  sourceType?: 'manual' | 'ai_generated' | 'video_import' | 'photo_scan';
  sourceUrl?: string;
  sourceMetadata?: {
    channelName?: string;
    videoTitle?: string;
    thumbnailUrl?: string;
    extractedAt?: string;
  };
}

interface RecipeStep {
  // ... existing fields ...
  videoTimestamp?: {
    start: number;
    end: number;
  };
  technique?: string;
  visualDescription?: string;
}
```

---

## Part 5: Implementation Roadmap

### Phase 1 -- MVP Video Import (Direct Gemini)
**Scope**: YouTube URL -> Structured recipe -> Save

| # | Task | Effort |
|---|------|--------|
| 1.1 | Create `lib/ai/videoRecipeExtractor.ts` with Gemini video analysis | Core |
| 1.2 | Create `constants/prompts.ts` with recipe extraction prompt | Small |
| 1.3 | Add `VideoRecipeRequest` / `ExtractedRecipe` types | Small |
| 1.4 | Create `app/recipe/from-video.tsx` -- URL input screen | Medium |
| 1.5 | Create `app/recipe/video-processing.tsx` -- progress screen | Medium |
| 1.6 | Create `app/recipe/video-review.tsx` -- review & edit extracted recipe | Large |
| 1.7 | Modify recipe add flow to include "Import from Video" option | Small |
| 1.8 | Add `importFromVideo()` action to recipeStore | Medium |
| 1.9 | Update database schema for source tracking | Small |
| 1.10 | Map extracted ingredients to DishFlow's category system | Medium |

### Phase 2 -- Enhanced Processing
**Scope**: Long videos, non-YouTube platforms, block processing

| # | Task | Effort |
|---|------|--------|
| 2.1 | Build backend service (Supabase Edge Function or Vercel) | Large |
| 2.2 | Implement KlipMind block processing in TypeScript | Large |
| 2.3 | Add yt-dlp integration for TikTok/Instagram | Medium |
| 2.4 | Add progress streaming (SSE or polling) | Medium |
| 2.5 | Support video file upload from device gallery | Medium |

### Phase 3 -- Smart Integration
**Scope**: Cross-feature connections

| # | Task | Effort |
|---|------|--------|
| 3.1 | "Add missing ingredients to shopping list" from extracted recipe | Medium |
| 3.2 | Cross-reference with pantry ("You already have 6/12 ingredients") | Medium |
| 3.3 | Thumbnail extraction as recipe cover image | Small |
| 3.4 | Step-by-step video playback (tap step -> jump to timestamp) | Large |
| 3.5 | Recipe variation suggestions based on pantry inventory | Medium |

---

## Part 6: UX Design Specifications

### 6.1 Video Import Entry Points

1. **Recipe tab** -> "+" button -> "Import from Video"
2. **Share sheet** (future) -> Share YouTube link to DishFlow
3. **Clipboard detection** (future) -> "We noticed a video URL, import recipe?"

### 6.2 Processing Screen Design (Luxury Boheme)

```
Background: stone[50] (#F7F3EE)
Progress bar: honey[400] (#C19A6B) with subtle shimmer animation
Step indicators: sage[200] (#7D7A68) for completed, stone[300] for pending
Icon: Lucide 'ChefHat' or 'Clapperboard' (1.5px stroke)
Typography: "Analyzing Recipe..." in Cormorant Garamond h2
Substeps: Inter bodySmall, text.secondary
```

### 6.3 Review Screen Design

The review screen should feel like the normal recipe editor but pre-filled:
- Yellow/honey highlight on AI-extracted fields (subtle, to show "this was auto-detected")
- Editable inline -- user can tap any field to correct
- Confidence indicators: High confidence = solid, Low confidence = dashed border
- "Re-analyze" button if extraction quality is poor

### 6.4 Error States

| State | Screen |
|-------|--------|
| Invalid URL | Inline validation, "Please enter a valid video URL" |
| Video too long (>30min) | "This video is quite long. Analysis may be less accurate." + proceed anyway |
| Not a cooking video | "We couldn't find a recipe in this video. It may not be a cooking video." |
| API error | "Something went wrong. Please try again." + retry button |
| Partial extraction | Show what was found, highlight missing fields |

---

## Part 7: Key Decisions Required

### Decision 1: Backend or Direct API?
- **Option A**: Direct Gemini from mobile (simplest, YouTube only)
- **Option B**: Backend service (supports all platforms, more robust)
- **Recommended**: Start with A, add B when users request TikTok/Instagram

### Decision 2: Gemini Model Selection
- **Gemini 2.0 Flash**: Cheaper ($0.03/video), faster, good enough for most recipes
- **Gemini 2.5 Pro**: Better extraction quality, more expensive ($0.15/video)
- **Recommended**: Flash for default, Pro as optional "detailed analysis" mode

### Decision 3: Video Length Limit
- **Conservative**: 10 minutes max (single API call)
- **Moderate**: 30 minutes max (with block processing)
- **Aggressive**: No limit (full KlipMind block pipeline)
- **Recommended**: 15 minutes for Phase 1, extend in Phase 2

### Decision 4: Ingredient Matching Strategy
- **Exact match**: Map to common items catalog (200 items)
- **Fuzzy match**: Use string similarity + category inference
- **AI match**: Let Gemini output the category directly
- **Recommended**: AI match (Gemini outputs category) + fuzzy match against common items for known items

---

## Part 8: Summary

### What KlipMind Gives Us
A proven architecture for multimodal video understanding: block processing with context chaining, audio-visual fusion, and configurable summarization. The pipeline design is sound and well-tested.

### What We Adapt
We take the conceptual architecture (not the Python code) and implement it in TypeScript using Gemini's native video capabilities, which are more powerful than the original FFmpeg+Whisper+BLIP stack for our use case.

### What We Add
Recipe-domain expertise: structured ingredient extraction, step-timestamp mapping, category classification, pantry/shopping integration, and a luxury boheme review UI.

### The Result
DishFlow becomes the first recipe app where you can paste a cooking video URL and get a perfectly structured, editable recipe in seconds -- with ingredients mapped to your pantry categories, ready to add missing items to your shopping list.

---

## Part 9: Critical SDK Gap & Migration (UPDATED 2026-01-28)

### 9.1 The Discovery

Gemini's **native video analysis** with `Part.from_uri()` + **controlled generation** (`response_schema`) makes KlipMind's entire multi-step pipeline unnecessary. One API call does everything -- audio transcription, visual understanding, structured extraction -- with **guaranteed valid JSON** matching a strict schema.

### 9.2 Three Approaches Compared

```
APPROACH 1: KlipMind (what video-analysis repo does)
═══════════════════════════════════════════════════
Video URL → yt-dlp download → FFmpeg extract audio → Whisper transcribe
  → OpenCV extract frames → Gemini describe 1 frame per block
  → Groq LLM summarize each block → Groq LLM final summary

  5+ tools, N+2 API calls, Python backend required
  Complex, slow, many failure points

APPROACH 2: DishFlow Current Gemini Usage (pantry scanner)
═══════════════════════════════════════════════════════════
Image files → base64 encode → geminiModel.generateContent([prompt, ...images])
  → Parse response text as JSON (hope it's valid) → fuzzy match items

  Old SDK (@google/generative-ai), images only, no schema enforcement
  Works but fragile JSON parsing, zero video support

APPROACH 3: Gemini Native Video (Google's recommended approach) ← TARGET
═══════════════════════════════════════════════════════════════════════
Video URL → Part.from_uri(youtube_url) → client.models.generate_content(
    contents=[prompt, video_part],
    config={ response_mime_type: "application/json", response_schema: recipe_schema }
)
  → Guaranteed valid JSON matching exact schema

  1 API call, no backend needed, schema-enforced output
  Simplest, most reliable, best quality
```

### 9.3 DishFlow SDK Migration Required

DishFlow currently uses the **legacy** npm package:

```typescript
// CURRENT (lib/gemini.ts) — legacy SDK
import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(API_KEY);
export const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Usage: no controlled generation, no video support
const result = await geminiModel.generateContent([prompt, ...imageParts]);
const text = result.response.text(); // raw text, must parse JSON manually
```

Must migrate to the **new** SDK:

```typescript
// TARGET (lib/gemini.ts) — new SDK
import { GoogleGenAI, Type } from "@google/genai";
const client = new GoogleGenAI({ apiKey: API_KEY });

// Usage: controlled generation + native video URL
const response = await client.models.generateContent({
  model: "gemini-2.0-flash",
  contents: [
    { text: RECIPE_EXTRACTION_PROMPT },
    { fileData: { fileUri: youtubeUrl, mimeType: "video/mp4" } },
  ],
  config: {
    responseMimeType: "application/json",
    responseSchema: RECIPE_RESPONSE_SCHEMA,    // ← guarantees valid JSON
  },
});

const recipe = JSON.parse(response.text); // always valid, always matches schema
```

### 9.4 SDK Comparison Table

| Feature | `@google/generative-ai` (current) | `@google/genai` (target) |
|---------|-----------------------------------|--------------------------|
| Video URL input | Not supported | `Part.from_uri(fileUri, mimeType)` |
| Video file upload | Via File API (complex) | Via File API (simpler) |
| Controlled generation | `generationConfig.responseMimeType` | `config.responseMimeType` + `responseSchema` |
| Schema enforcement | Partial (responseMimeType only) | Full (responseMimeType + responseSchema with enums) |
| Streaming | Supported | Supported |
| Audio understanding | Not directly | Via video parts |
| API surface | `genAI.getGenerativeModel().generateContent()` | `client.models.generateContent()` |
| npm package | `@google/generative-ai` | `@google/genai` |

### 9.5 Migration Impact on Existing Code

The pantry scanner (`lib/ai/pantryScanner.ts`) currently uses the old SDK:

```typescript
// pantryScanner.ts — CURRENT
import { geminiModel } from '@/lib/gemini';

const result = await geminiModel.generateContent([PANTRY_SCAN_PROMPT, ...imageParts]);
const response = await result.response;
const responseText = response.text();
// Then manually parse JSON with regex cleanup (fragile)
```

After migration:

```typescript
// pantryScanner.ts — AFTER MIGRATION
import { geminiClient } from '@/lib/gemini';

const response = await geminiClient.models.generateContent({
  model: "gemini-2.0-flash",
  contents: [
    { text: PANTRY_SCAN_PROMPT },
    ...imageParts.map(p => ({ inlineData: p.inlineData })),
  ],
  config: {
    responseMimeType: "application/json",
    responseSchema: PANTRY_SCAN_SCHEMA,  // ← enforced schema, no more regex cleanup
  },
});

const items = JSON.parse(response.text); // guaranteed valid JSON array
```

This also **fixes the fragile JSON parsing** in `parseAIResponse()` which currently does:
```typescript
// CURRENT — fragile, can break
if (cleanedText.startsWith('```json')) cleanedText = cleanedText.slice(7);
if (cleanedText.endsWith('```')) cleanedText = cleanedText.slice(0, -3);
const parsed = JSON.parse(cleanedText); // may still fail
```

With controlled generation, this cleanup is **completely unnecessary** — the API guarantees valid JSON.

### 9.6 Exact Recipe Extraction Schema (for controlled generation)

```typescript
// This schema is passed to Gemini's response_schema parameter
// It GUARANTEES the output matches this exact structure

const RECIPE_VIDEO_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    description: { type: "STRING" },
    servings: { type: "INTEGER" },
    prepTime: { type: "INTEGER" },
    cookTime: { type: "INTEGER" },
    difficulty: {
      type: "STRING",
      enum: ["easy", "medium", "hard"],
    },
    cuisine: { type: "STRING" },
    ingredients: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          quantity: { type: "NUMBER" },
          unit: { type: "STRING" },
          category: {
            type: "STRING",
            enum: [
              "dairy", "produce", "proteins", "bakery", "pantry",
              "spices", "condiments", "beverages", "snacks",
              "frozen", "household", "other"
            ],
          },
          isOptional: { type: "BOOLEAN" },
          notes: { type: "STRING" },
        },
        required: ["name", "quantity", "unit", "category"],
      },
    },
    steps: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          stepNumber: { type: "INTEGER" },
          instruction: { type: "STRING" },
          durationSeconds: { type: "INTEGER" },
          technique: { type: "STRING" },
          temperature: { type: "STRING" },
          videoTimestampStart: { type: "NUMBER" },
          videoTimestampEnd: { type: "NUMBER" },
        },
        required: ["stepNumber", "instruction"],
      },
    },
    tags: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
  required: ["title", "ingredients", "steps"],
};
```

Key: The `category` field has an `enum` constraint matching DishFlow's exact 12 categories. Gemini is **forced** to output one of these values — no fuzzy matching needed.

### 9.7 Complete Video-to-Recipe Call (final implementation)

```typescript
// lib/ai/videoRecipeExtractor.ts

import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({ apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY });

const VIDEO_RECIPE_PROMPT = `You are a professional chef and recipe extraction expert.
Analyze this cooking video completely — watch and listen to the ENTIRE video.

Extract a full structured recipe including:
- Recipe title and description
- All ingredients with exact quantities, units, and categories
- Step-by-step instructions mapped to video timestamps
- Cooking techniques, temperatures, and timing for each step
- Prep time, cook time, servings, difficulty level
- Cuisine type and relevant tags

Rules:
- If the chef says "a pinch of salt", estimate: quantity=0.25, unit="tsp"
- If the chef says "some olive oil", estimate: quantity=1, unit="tbsp"
- Map every ingredient to exactly one of the 12 category values in the schema
- Every step must have a stepNumber and instruction at minimum
- Video timestamps should be in seconds from the start of the video
- If information isn't stated, make reasonable culinary estimates`;

export async function extractRecipeFromVideo(videoUrl: string): Promise<ExtractedRecipe> {
  const response = await client.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      { text: VIDEO_RECIPE_PROMPT },
      {
        fileData: {
          fileUri: videoUrl,
          mimeType: "video/mp4",
        },
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: RECIPE_VIDEO_SCHEMA,
      temperature: 0.1,      // low temperature for factual extraction
      maxOutputTokens: 8192,  // recipes can be long
    },
  });

  // Guaranteed valid JSON matching our schema — no cleanup needed
  const recipe: ExtractedRecipe = JSON.parse(response.text);
  return recipe;
}
```

### 9.8 Revised Implementation Priority

Given this discovery, the implementation order changes:

```
STEP 1: Migrate SDK (@google/generative-ai → @google/genai)
        ├── Update lib/gemini.ts to new client
        ├── Update lib/ai/pantryScanner.ts to use new API + controlled generation
        ├── Remove fragile JSON parsing (parseAIResponse regex cleanup)
        └── Add PANTRY_SCAN_SCHEMA for controlled generation
        BENEFIT: Existing pantry scanner becomes more reliable immediately

STEP 2: Add video extraction module
        ├── Create lib/ai/videoRecipeExtractor.ts
        ├── Define RECIPE_VIDEO_SCHEMA with enum constraints
        ├── Implement extractRecipeFromVideo() with Part.from_uri
        └── Add types for ExtractedRecipe, ExtractedIngredient, ExtractedStep
        BENEFIT: Core video-to-recipe pipeline works

STEP 3: Build UI screens
        ├── app/recipe/from-video.tsx (URL input)
        ├── app/recipe/video-processing.tsx (progress)
        └── app/recipe/video-review.tsx (review + edit + save)
        BENEFIT: Users can actually use the feature

STEP 4: Wire to existing systems
        ├── Map extracted ingredients to common items catalog
        ├── Add "Add to shopping list" from extracted recipe
        ├── Cross-reference with pantry inventory
        └── Save recipe with source metadata
        BENEFIT: Full DishFlow integration
```

### 9.9 KlipMind's Value After This Discovery

With Gemini handling everything natively, KlipMind's value shifts from "code to port" to "architecture lessons":

| KlipMind Concept | Still Valuable? | Why |
|-----------------|-----------------|-----|
| Block processing with context chain | Yes (Phase 2) | For videos > 2hrs or edge cases |
| Multimodal fusion prompting | Conceptually yes | Gemini does this internally now |
| Sentence-aware splitting | No | Gemini handles this natively |
| FFmpeg audio extraction | No | Gemini understands audio directly |
| OpenCV frame extraction | No | Gemini sees all frames |
| yt-dlp download | Yes (Phase 2) | For TikTok/Instagram URLs Gemini can't access |
| Configurable persona/language/size | Yes | We adapt these as prompt parameters |

---

**Document Status**: Complete analysis with SDK migration path
**Critical Action**: Migrate `@google/generative-ai` to `@google/genai` (Step 1)
**Next Step**: Decide on Phase 1 scope, then begin SDK migration + video extraction
**Last Updated**: 2026-01-28
