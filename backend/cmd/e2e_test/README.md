# E2E Recipe Extraction Test

This directory contains end-to-end tests for the DishFlow recipe extraction service.

## Quick Start

```bash
# Set your Gemini API key
export GEMINI_API_KEY="your-api-key-here"

# Run the tests
make e2e-test

# Or run directly
go run cmd/e2e_test/main.go
```

## What It Tests

The e2e test suite validates recipe extraction from:

### Webpage Recipes
- ✅ Sesame Schnitzel with Loaded Salad
- ✅ Caprese Pizza  
- ✅ Peanut Butter Swirl Brownies

### TikTok Videos
- ⏭️  Video extraction (requires download step - not yet implemented in e2e)

## Output

The test suite provides:
- **Console output**: Real-time test progress with pass/fail status
- **Detailed results**: Recipe title, ingredients count, steps count, timing
- **JSON export**: `e2e_results.json` with all test results

## Example Output

```
🧪 DishFlow E2E Recipe Extraction Test Suite
============================================================

✅ Gemini API connected

Test 1/5: Sesame Schnitzel
URL: https://www.eitanbernath.com/2024/06/06/sesame-schnitzel-topped-with-loaded-salad/
Type: webpage
------------------------------------------------------------
✅ PASSED - Extracted 'Sesame Schnitzel with Loaded Salad'
   Ingredients: 15 | Steps: 8 | Time: 3.24s

Test 2/5: Caprese Pizza
...

📊 Test Summary: 3 passed, 0 failed out of 5 total
============================================================

📝 Detailed Results:

🍳 Sesame Schnitzel
   Title: Sesame Schnitzel with Loaded Salad
   Servings: 4
   Time: 15min prep + 20min cook
   
   🥗 Ingredients (15):
      - 4  chicken breasts
      - 1 cup panko breadcrumbs
      ... and 10 more
   
   📋 Steps (8):
      1. Pound chicken breasts until even thickness
      2. Set up breading station with flour, eggs, and panko
      ... and 6 more steps
```

## Adding New Tests

Edit `cmd/e2e_test/main.go` and add to the `testCases` array:

```go
{
    Name:        "Your Recipe Name",
    URL:         "https://example.com/recipe",
    Type:        "webpage",  // or "video"
    Description: "Brief description",
},
```

## Requirements

- Go 1.23+
- Valid `GEMINI_API_KEY` environment variable
- Internet connection

## Limitations

- Video extraction tests are currently skipped (require download infrastructure)
- Tests require actual API calls (not mocked)
- Rate limits may apply based on your Gemini API quota
