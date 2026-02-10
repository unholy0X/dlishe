# DLISHE

## Inspiration

I’ve always loved cooking. For four years, I lived alone, and cooking was the one thing that kept me grounded. It gave rhythm to my days and made quiet evenings feel meaningful.

After getting married, cooking became something we shared. My wife is a real foodie; she constantly sends me recipes from TikTok, YouTube, and random websites—sometimes while I’m working, sometimes weeks or months before we plan to cook.

And then one day she’ll say: "Do you remember that recipe I sent you three months ago? I want you to cook it."

That’s when the chaos starts. Endless scrolling through messages, lost links, forgotten videos. Even when we finally find the recipe, we still struggle with grocery lists, missing ingredients, lost notes, and realizing halfway through cooking that something important is missing.

Dlishe was born from this everyday frustration.

## What it does

Dlishe turns recipes from anywhere—videos, links, or photos—into a personal cookbook you can actually use. It transforms food inspiration into clear steps, structured ingredients, and practical cooking details.

From there, Dlishe automatically creates shopping lists, tracks pantry items, and helps you decide what you can cook with what you already have. You can even scan what’s in your kitchen so recipes adapt to your pantry, not the other way around.

## How we built it

We built Dlishe using Gemini 3 / Antigravity as the core intelligence behind the experience.

Gemini 3 is used to understand recipes across different formats—videos, images, and HTML—and convert them into structured, usable cooking instructions. It also reasons about ingredients, quantities, and pantry context to generate shopping lists and match recipes to what’s available at home.

The focus was not just extraction, but reasoning: understanding what a recipe really needs and how it fits into real life.

## Challenges we ran into

The biggest challenge was making complex intelligence feel invisible. Behind the scenes, the system processes videos, images, and text, reasons about ingredients, adapts recipes, and calculates nutritional data. But the user experience had to stay calm, simple, and human. Cooking should never feel technical, rushed, or overwhelming. Balancing powerful AI capabilities with a peaceful, kitchen-first experience took a lot of iteration.

## Key Features

*   **Universal Recipe Extraction**: Import from Instagram, TikTok, YouTube, or any website.
*   **Pantry Tracker**: Manage what you have; the app suggests recipes based on your stock.
*   **Smart Shopping List**: AI-powered merging and categorization of grocery items.
*   **Kitchen Scanner**: Take a photo of your fridge/pantry to automatically populate your inventory.

## AI Deep Dive: Powered by Gemini 3

Dlishe leverages **Google Gemini 3** (specifically the `gemini-3.0-pro` model) as its central reasoning engine. Unlike simple wrapper apps, we use the model's native multimodal capabilities for:

1.  **Multimodal Extraction**:
    The backend sends video frames and image data directly to Gemini 3. The model serves as a "visual reasoner," watching the cooking video to identify implicit steps, techniques, and ingredients that might be mentioned quickly or shown but not listed.

2.  **Ingredient Reasoning**:
    When "Smart Merging" shopping lists, Gemini 3 understands culinary context. It knows that "1 clove of garlic" and "garlic powder" are different, but "1 onion" and "large onion" should likely be merged on a shopping list. It handles unit conversions (Imperial/Metric) intelligently based on user preference.

3.  **Pantry Logic**:
    The "What can I cook?" feature isn't a simple keyword match. Gemini 3 evaluates your pantry inventory against recipe requirements to determine *viability*. It understands substitutions (e.g., using Greek yogurt instead of sour cream) to surface recipes you can actually make without a store run.

## Challenges we ran into

## What we learned

We learned that multimodal AI becomes truly powerful when it disappears into the background. Using Gemini 3 taught us how reasoning across video, images, and text can solve real problems when applied thoughtfully. The best AI experience doesn’t feel like “AI”—it feels like help.

## What's next for DLISHE

Next, we want to go beyond assisting and help users become creators themselves.

Dlishe is not just about saving recipes, but about evolving with them. As people cook, adapt, and improve recipes, they gain ownership and confidence. Over time, their personal versions become new recipes, shaped by real experience, not perfection.

As this happens, a natural creator dynamic emerges. Some users start sharing versions that others love—clearer steps, better substitutions, smarter shortcuts. Dlishe enables those creators to be recognized and supported, including through simple, optional tipping. Not as influencers, but as real people helping others cook better.

The next step is turning that progress into community. Sharing variations, tips, and personal twists creates a healthy engagement loop, learning from others while contributing your own cooking journey.

Our goal is to make Dlishe a place where recipes don’t just get saved, but evolve, where everyday cooks can grow, be valued, and even earn from what they genuinely enjoy doing, powered by real kitchens and shared experience.

---

## Technical Overview

### Project Structure

*   **/mobile**: React Native (Expo) application for iOS and Android.
*   **/backend**: Go (Golang) API server handling recipe extraction and data.
*   **/web-dashboard**: Next.js dashboard for testing and admin tasks.

### Getting Started

1.  **Mobile**:
    The backend is already deployed at `dlishe.com`. You can run the mobile app directly without setting up the backend locally.
    
    Run `npm install --legacy-peer-deps` and `npx expo start` in the `mobile` directory.

2.  **Backend (Optional)**:
    If you want to contribute to the backend, run `make dev` in the `backend` directory to start the server and database services.

3.  **Environment**:
    Ensure `.env` files are configured with `GEMINI_API_KEY` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.
