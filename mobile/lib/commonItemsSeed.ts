// Seed data for common items catalog
// Optimized based on US/Europe consumption statistics 2024
// Categories and items ordered by household consumption frequency (90%+ households)
//
// Data sources:
// - Statista: 64% buy fruits/vegetables, 60% buy eggs regularly
// - USDA: Chicken #1 meat in US (68.1 lbs/person), Beef #2 (56.2 lbs)
// - Europe: Pork #1 (35.5 kg/capita), Chicken #2
// - Breakfast: 38% eat eggs daily, bread/coffee are staples
// - Dinner: 91% of adults consume, mixed dishes most common

import type { CommonItem } from '@/types';

export const commonItemsSeed: Omit<CommonItem, 'id'>[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 🥛 DAIRY - #1 Priority (60%+ households buy eggs regularly)
  // Breakfast essentials, baking staples, daily consumption
  // ═══════════════════════════════════════════════════════════════════════════

  // Eggs - 38% eat daily for breakfast, essential baking ingredient
  { name: 'Eggs (Large)', category: 'dairy', defaultQuantity: 12, defaultUnit: 'pcs', keywords: ['eggs', 'large', 'dozen'], usageCount: 100, sortOrder: 1 },
  { name: 'Eggs (Free Range)', category: 'dairy', defaultQuantity: 12, defaultUnit: 'pcs', keywords: ['eggs', 'free range', 'organic'], usageCount: 80, sortOrder: 2 },

  // Milk - daily staple for cereal, coffee, cooking
  { name: 'Milk (Whole)', category: 'dairy', defaultQuantity: 1, defaultUnit: 'L', keywords: ['milk', 'whole', '3.25%'], usageCount: 95, sortOrder: 3 },
  { name: 'Milk (Semi-Skimmed)', category: 'dairy', defaultQuantity: 1, defaultUnit: 'L', keywords: ['milk', '2%', 'semi', 'reduced fat'], usageCount: 90, sortOrder: 4 },
  { name: 'Milk (Skimmed)', category: 'dairy', defaultQuantity: 1, defaultUnit: 'L', keywords: ['milk', 'skim', 'fat free'], usageCount: 70, sortOrder: 5 },

  // Plant milks - growing 15% yearly
  { name: 'Oat Milk', category: 'dairy', defaultQuantity: 1, defaultUnit: 'L', keywords: ['oat', 'milk', 'plant based', 'oatly'], usageCount: 75, sortOrder: 6 },
  { name: 'Almond Milk', category: 'dairy', defaultQuantity: 1, defaultUnit: 'L', keywords: ['almond', 'milk', 'plant based'], usageCount: 70, sortOrder: 7 },

  // Butter - essential for cooking and baking
  { name: 'Butter (Salted)', category: 'dairy', defaultQuantity: 250, defaultUnit: 'g', keywords: ['butter', 'salted'], usageCount: 90, sortOrder: 8 },
  { name: 'Butter (Unsalted)', category: 'dairy', defaultQuantity: 250, defaultUnit: 'g', keywords: ['butter', 'unsalted', 'baking'], usageCount: 85, sortOrder: 9 },

  // Cheese - essential for sandwiches, cooking
  { name: 'Cheddar Cheese', category: 'dairy', defaultQuantity: 250, defaultUnit: 'g', keywords: ['cheese', 'cheddar'], usageCount: 88, sortOrder: 10 },
  { name: 'Mozzarella', category: 'dairy', defaultQuantity: 250, defaultUnit: 'g', keywords: ['cheese', 'mozzarella', 'pizza'], usageCount: 85, sortOrder: 11 },
  { name: 'Parmesan', category: 'dairy', defaultQuantity: 150, defaultUnit: 'g', keywords: ['cheese', 'parmesan', 'parmigiano'], usageCount: 80, sortOrder: 12 },
  { name: 'Cream Cheese', category: 'dairy', defaultQuantity: 200, defaultUnit: 'g', keywords: ['cream cheese', 'philadelphia'], usageCount: 75, sortOrder: 13 },
  { name: 'Feta Cheese', category: 'dairy', defaultQuantity: 200, defaultUnit: 'g', keywords: ['cheese', 'feta', 'greek'], usageCount: 65, sortOrder: 14 },

  // Yogurt - breakfast staple
  { name: 'Greek Yogurt (Plain)', category: 'dairy', defaultQuantity: 500, defaultUnit: 'g', keywords: ['yogurt', 'greek', 'plain'], usageCount: 85, sortOrder: 15 },
  { name: 'Greek Yogurt (Honey)', category: 'dairy', defaultQuantity: 500, defaultUnit: 'g', keywords: ['yogurt', 'greek', 'honey'], usageCount: 75, sortOrder: 16 },
  { name: 'Natural Yogurt', category: 'dairy', defaultQuantity: 500, defaultUnit: 'g', keywords: ['yogurt', 'natural', 'plain'], usageCount: 70, sortOrder: 17 },

  // Cream - cooking essential
  { name: 'Heavy Cream', category: 'dairy', defaultQuantity: 250, defaultUnit: 'mL', keywords: ['cream', 'heavy', 'whipping', 'double'], usageCount: 70, sortOrder: 18 },
  { name: 'Sour Cream', category: 'dairy', defaultQuantity: 200, defaultUnit: 'g', keywords: ['sour cream'], usageCount: 65, sortOrder: 19 },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🥬 PRODUCE - #2 Priority (64% buy fruits/vegetables regularly)
  // Fresh fruits and vegetables - highest purchase frequency
  // ═══════════════════════════════════════════════════════════════════════════

  // === TOP FRUITS (ordered by consumption) ===
  // Bananas - #1 most purchased fruit in US
  { name: 'Bananas', category: 'produce', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['banana'], usageCount: 100, sortOrder: 1 },
  { name: 'Apples', category: 'produce', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['apple', 'gala', 'fuji', 'granny smith'], usageCount: 95, sortOrder: 2 },
  { name: 'Oranges', category: 'produce', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['orange', 'navel'], usageCount: 85, sortOrder: 3 },
  { name: 'Lemons', category: 'produce', defaultQuantity: 4, defaultUnit: 'pcs', keywords: ['lemon'], usageCount: 90, sortOrder: 4 },
  { name: 'Limes', category: 'produce', defaultQuantity: 4, defaultUnit: 'pcs', keywords: ['lime'], usageCount: 75, sortOrder: 5 },
  { name: 'Grapes', category: 'produce', defaultQuantity: 500, defaultUnit: 'g', keywords: ['grape', 'red', 'green'], usageCount: 70, sortOrder: 6 },

  // Berries - breakfast/snack favorites
  { name: 'Strawberries', category: 'produce', defaultQuantity: 400, defaultUnit: 'g', keywords: ['strawberry', 'berries'], usageCount: 80, sortOrder: 7 },
  { name: 'Blueberries', category: 'produce', defaultQuantity: 200, defaultUnit: 'g', keywords: ['blueberry', 'berries'], usageCount: 75, sortOrder: 8 },
  { name: 'Raspberries', category: 'produce', defaultQuantity: 150, defaultUnit: 'g', keywords: ['raspberry', 'berries'], usageCount: 65, sortOrder: 9 },

  // Other popular fruits
  { name: 'Avocados', category: 'produce', defaultQuantity: 3, defaultUnit: 'pcs', keywords: ['avocado', 'hass'], usageCount: 85, sortOrder: 10 },
  { name: 'Pears', category: 'produce', defaultQuantity: 4, defaultUnit: 'pcs', keywords: ['pear'], usageCount: 60, sortOrder: 11 },
  { name: 'Mangoes', category: 'produce', defaultQuantity: 2, defaultUnit: 'pcs', keywords: ['mango'], usageCount: 55, sortOrder: 12 },
  { name: 'Pineapple', category: 'produce', defaultQuantity: 1, defaultUnit: 'pc', keywords: ['pineapple'], usageCount: 50, sortOrder: 13 },
  { name: 'Watermelon', category: 'produce', defaultQuantity: 1, defaultUnit: 'pc', keywords: ['watermelon', 'melon'], usageCount: 55, sortOrder: 14 },

  // === TOP VEGETABLES (ordered by consumption) ===
  // Potatoes - most consumed vegetable
  { name: 'Potatoes', category: 'produce', defaultQuantity: 2, defaultUnit: 'kg', keywords: ['potato', 'russet', 'baking'], usageCount: 95, sortOrder: 15 },
  { name: 'Sweet Potatoes', category: 'produce', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['sweet potato', 'yam'], usageCount: 70, sortOrder: 16 },

  // Onions & Garlic - cooking essentials (used in 80%+ of savory dishes)
  { name: 'Onions (Yellow)', category: 'produce', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['onion', 'yellow'], usageCount: 98, sortOrder: 17 },
  { name: 'Onions (Red)', category: 'produce', defaultQuantity: 500, defaultUnit: 'g', keywords: ['onion', 'red'], usageCount: 80, sortOrder: 18 },
  { name: 'Garlic', category: 'produce', defaultQuantity: 2, defaultUnit: 'bulbs', keywords: ['garlic', 'fresh'], usageCount: 95, sortOrder: 19 },
  { name: 'Shallots', category: 'produce', defaultQuantity: 4, defaultUnit: 'pcs', keywords: ['shallot'], usageCount: 50, sortOrder: 20 },

  // Tomatoes - salads, cooking, sandwiches
  { name: 'Tomatoes', category: 'produce', defaultQuantity: 500, defaultUnit: 'g', keywords: ['tomato', 'vine'], usageCount: 90, sortOrder: 21 },
  { name: 'Cherry Tomatoes', category: 'produce', defaultQuantity: 300, defaultUnit: 'g', keywords: ['tomato', 'cherry'], usageCount: 75, sortOrder: 22 },

  // Salad greens
  { name: 'Lettuce (Romaine)', category: 'produce', defaultQuantity: 1, defaultUnit: 'head', keywords: ['lettuce', 'romaine', 'cos'], usageCount: 80, sortOrder: 23 },
  { name: 'Mixed Salad Leaves', category: 'produce', defaultQuantity: 150, defaultUnit: 'g', keywords: ['salad', 'mixed', 'leaves'], usageCount: 85, sortOrder: 24 },
  { name: 'Spinach (Baby)', category: 'produce', defaultQuantity: 200, defaultUnit: 'g', keywords: ['spinach', 'baby', 'fresh'], usageCount: 80, sortOrder: 25 },
  { name: 'Arugula', category: 'produce', defaultQuantity: 100, defaultUnit: 'g', keywords: ['arugula', 'rocket'], usageCount: 60, sortOrder: 26 },

  // Carrots - versatile vegetable
  { name: 'Carrots', category: 'produce', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['carrot'], usageCount: 88, sortOrder: 27 },

  // Peppers
  { name: 'Bell Peppers (Mixed)', category: 'produce', defaultQuantity: 3, defaultUnit: 'pcs', keywords: ['pepper', 'bell', 'capsicum'], usageCount: 80, sortOrder: 28 },

  // Cucumbers
  { name: 'Cucumber', category: 'produce', defaultQuantity: 2, defaultUnit: 'pcs', keywords: ['cucumber'], usageCount: 80, sortOrder: 29 },

  // Cooking vegetables
  { name: 'Celery', category: 'produce', defaultQuantity: 1, defaultUnit: 'bunch', keywords: ['celery', 'stalk'], usageCount: 70, sortOrder: 30 },
  { name: 'Broccoli', category: 'produce', defaultQuantity: 500, defaultUnit: 'g', keywords: ['broccoli'], usageCount: 75, sortOrder: 31 },
  { name: 'Cauliflower', category: 'produce', defaultQuantity: 1, defaultUnit: 'head', keywords: ['cauliflower'], usageCount: 65, sortOrder: 32 },
  { name: 'Zucchini', category: 'produce', defaultQuantity: 2, defaultUnit: 'pcs', keywords: ['zucchini', 'courgette'], usageCount: 65, sortOrder: 33 },
  { name: 'Mushrooms (Button)', category: 'produce', defaultQuantity: 250, defaultUnit: 'g', keywords: ['mushroom', 'button', 'white'], usageCount: 75, sortOrder: 34 },
  { name: 'Green Beans', category: 'produce', defaultQuantity: 300, defaultUnit: 'g', keywords: ['beans', 'green', 'french'], usageCount: 60, sortOrder: 35 },
  { name: 'Asparagus', category: 'produce', defaultQuantity: 250, defaultUnit: 'g', keywords: ['asparagus'], usageCount: 50, sortOrder: 36 },
  { name: 'Cabbage', category: 'produce', defaultQuantity: 1, defaultUnit: 'head', keywords: ['cabbage', 'green'], usageCount: 55, sortOrder: 37 },
  { name: 'Eggplant', category: 'produce', defaultQuantity: 1, defaultUnit: 'pc', keywords: ['eggplant', 'aubergine'], usageCount: 50, sortOrder: 38 },

  // Fresh herbs
  { name: 'Fresh Basil', category: 'produce', defaultQuantity: 1, defaultUnit: 'bunch', keywords: ['basil', 'fresh'], usageCount: 70, sortOrder: 39 },
  { name: 'Fresh Parsley', category: 'produce', defaultQuantity: 1, defaultUnit: 'bunch', keywords: ['parsley', 'fresh'], usageCount: 75, sortOrder: 40 },
  { name: 'Fresh Cilantro', category: 'produce', defaultQuantity: 1, defaultUnit: 'bunch', keywords: ['cilantro', 'coriander', 'fresh'], usageCount: 70, sortOrder: 41 },
  { name: 'Fresh Ginger', category: 'produce', defaultQuantity: 100, defaultUnit: 'g', keywords: ['ginger', 'fresh', 'root'], usageCount: 75, sortOrder: 42 },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🥩 PROTEINS - #3 Priority
  // Chicken #1 in US (68.1 lbs/person), Pork #1 in Europe (35.5 kg/capita)
  // ═══════════════════════════════════════════════════════════════════════════

  // === CHICKEN - Most consumed meat in US ===
  { name: 'Chicken Breast', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['chicken', 'breast', 'boneless'], usageCount: 100, sortOrder: 1 },
  { name: 'Chicken Thighs', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['chicken', 'thigh'], usageCount: 90, sortOrder: 2 },
  { name: 'Whole Chicken', category: 'proteins', defaultQuantity: 1.5, defaultUnit: 'kg', keywords: ['chicken', 'whole', 'roaster'], usageCount: 75, sortOrder: 3 },
  { name: 'Chicken Wings', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['chicken', 'wings'], usageCount: 65, sortOrder: 4 },
  { name: 'Chicken Drumsticks', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['chicken', 'drumstick', 'leg'], usageCount: 60, sortOrder: 5 },
  { name: 'Ground Chicken', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['chicken', 'ground', 'mince'], usageCount: 55, sortOrder: 6 },

  // === BEEF - #2 in US, popular globally ===
  { name: 'Ground Beef', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['beef', 'ground', 'mince'], usageCount: 95, sortOrder: 7 },
  { name: 'Beef Steak (Sirloin)', category: 'proteins', defaultQuantity: 400, defaultUnit: 'g', keywords: ['beef', 'steak', 'sirloin'], usageCount: 70, sortOrder: 8 },
  { name: 'Beef Steak (Ribeye)', category: 'proteins', defaultQuantity: 400, defaultUnit: 'g', keywords: ['beef', 'steak', 'ribeye'], usageCount: 65, sortOrder: 9 },
  { name: 'Stewing Beef', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['beef', 'stew', 'cubed'], usageCount: 60, sortOrder: 10 },
  { name: 'Beef Roast', category: 'proteins', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['beef', 'roast', 'joint'], usageCount: 50, sortOrder: 11 },

  // === PORK - #1 in Europe ===
  { name: 'Bacon', category: 'proteins', defaultQuantity: 300, defaultUnit: 'g', keywords: ['bacon', 'rashers'], usageCount: 90, sortOrder: 12 },
  { name: 'Pork Chops', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['pork', 'chop'], usageCount: 70, sortOrder: 13 },
  { name: 'Pork Tenderloin', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['pork', 'tenderloin', 'fillet'], usageCount: 60, sortOrder: 14 },
  { name: 'Ground Pork', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['pork', 'ground', 'mince'], usageCount: 65, sortOrder: 15 },
  { name: 'Ham', category: 'proteins', defaultQuantity: 200, defaultUnit: 'g', keywords: ['ham', 'sliced'], usageCount: 75, sortOrder: 16 },

  // === SAUSAGES - Popular breakfast/dinner ===
  { name: 'Breakfast Sausages', category: 'proteins', defaultQuantity: 400, defaultUnit: 'g', keywords: ['sausage', 'breakfast', 'links'], usageCount: 80, sortOrder: 17 },
  { name: 'Italian Sausage', category: 'proteins', defaultQuantity: 400, defaultUnit: 'g', keywords: ['sausage', 'italian'], usageCount: 65, sortOrder: 18 },

  // === TURKEY ===
  { name: 'Ground Turkey', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['turkey', 'ground', 'mince'], usageCount: 70, sortOrder: 19 },
  { name: 'Turkey Breast (Sliced)', category: 'proteins', defaultQuantity: 200, defaultUnit: 'g', keywords: ['turkey', 'breast', 'deli'], usageCount: 65, sortOrder: 20 },

  // === SEAFOOD ===
  { name: 'Salmon Fillet', category: 'proteins', defaultQuantity: 400, defaultUnit: 'g', keywords: ['salmon', 'fish', 'fillet'], usageCount: 80, sortOrder: 21 },
  { name: 'Cod Fillet', category: 'proteins', defaultQuantity: 400, defaultUnit: 'g', keywords: ['cod', 'fish', 'white'], usageCount: 65, sortOrder: 22 },
  { name: 'Tuna (Canned)', category: 'proteins', defaultQuantity: 160, defaultUnit: 'g', keywords: ['tuna', 'canned', 'tin'], usageCount: 85, sortOrder: 23 },
  { name: 'Shrimp', category: 'proteins', defaultQuantity: 400, defaultUnit: 'g', keywords: ['shrimp', 'prawns'], usageCount: 70, sortOrder: 24 },
  { name: 'White Fish Fillet', category: 'proteins', defaultQuantity: 400, defaultUnit: 'g', keywords: ['fish', 'white', 'tilapia', 'haddock'], usageCount: 60, sortOrder: 25 },

  // === PLANT-BASED (growing category) ===
  { name: 'Tofu (Firm)', category: 'proteins', defaultQuantity: 400, defaultUnit: 'g', keywords: ['tofu', 'firm'], usageCount: 50, sortOrder: 26 },
  { name: 'Tempeh', category: 'proteins', defaultQuantity: 200, defaultUnit: 'g', keywords: ['tempeh'], usageCount: 35, sortOrder: 27 },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🥖 BAKERY - #4 Priority
  // Bread is staple in 80%+ of European/US households
  // ═══════════════════════════════════════════════════════════════════════════

  { name: 'Bread (White Sliced)', category: 'bakery', defaultQuantity: 1, defaultUnit: 'loaf', keywords: ['bread', 'white', 'sliced', 'sandwich'], usageCount: 95, sortOrder: 1 },
  { name: 'Bread (Whole Wheat)', category: 'bakery', defaultQuantity: 1, defaultUnit: 'loaf', keywords: ['bread', 'whole wheat', 'brown', 'wholemeal'], usageCount: 90, sortOrder: 2 },
  { name: 'Sourdough Bread', category: 'bakery', defaultQuantity: 1, defaultUnit: 'loaf', keywords: ['bread', 'sourdough'], usageCount: 70, sortOrder: 3 },
  { name: 'Baguette', category: 'bakery', defaultQuantity: 1, defaultUnit: 'pc', keywords: ['baguette', 'french bread'], usageCount: 65, sortOrder: 4 },
  { name: 'Bagels', category: 'bakery', defaultQuantity: 6, defaultUnit: 'pcs', keywords: ['bagel'], usageCount: 70, sortOrder: 5 },
  { name: 'English Muffins', category: 'bakery', defaultQuantity: 6, defaultUnit: 'pcs', keywords: ['english muffin', 'breakfast'], usageCount: 65, sortOrder: 6 },
  { name: 'Croissants', category: 'bakery', defaultQuantity: 4, defaultUnit: 'pcs', keywords: ['croissant', 'pastry'], usageCount: 60, sortOrder: 7 },
  { name: 'Tortillas (Flour)', category: 'bakery', defaultQuantity: 8, defaultUnit: 'pcs', keywords: ['tortilla', 'flour', 'wrap'], usageCount: 80, sortOrder: 8 },
  { name: 'Tortillas (Corn)', category: 'bakery', defaultQuantity: 12, defaultUnit: 'pcs', keywords: ['tortilla', 'corn'], usageCount: 65, sortOrder: 9 },
  { name: 'Pita Bread', category: 'bakery', defaultQuantity: 6, defaultUnit: 'pcs', keywords: ['pita', 'pocket bread'], usageCount: 60, sortOrder: 10 },
  { name: 'Naan Bread', category: 'bakery', defaultQuantity: 4, defaultUnit: 'pcs', keywords: ['naan', 'indian'], usageCount: 55, sortOrder: 11 },
  { name: 'Burger Buns', category: 'bakery', defaultQuantity: 6, defaultUnit: 'pcs', keywords: ['bun', 'burger', 'brioche'], usageCount: 70, sortOrder: 12 },
  { name: 'Hot Dog Buns', category: 'bakery', defaultQuantity: 8, defaultUnit: 'pcs', keywords: ['bun', 'hot dog'], usageCount: 55, sortOrder: 13 },

  // ═══════════════════════════════════════════════════════════════════════════
  // 📦 PANTRY - #5 Priority
  // Long-lasting staples: rice, pasta, oil, canned goods
  // ═══════════════════════════════════════════════════════════════════════════

  // === GRAINS & PASTA - Dinner staples ===
  { name: 'Pasta (Spaghetti)', category: 'pantry', defaultQuantity: 500, defaultUnit: 'g', keywords: ['pasta', 'spaghetti'], usageCount: 95, sortOrder: 1 },
  { name: 'Pasta (Penne)', category: 'pantry', defaultQuantity: 500, defaultUnit: 'g', keywords: ['pasta', 'penne'], usageCount: 85, sortOrder: 2 },
  { name: 'Pasta (Fusilli)', category: 'pantry', defaultQuantity: 500, defaultUnit: 'g', keywords: ['pasta', 'fusilli', 'rotini'], usageCount: 75, sortOrder: 3 },
  { name: 'Rice (White Long Grain)', category: 'pantry', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['rice', 'white', 'long grain'], usageCount: 90, sortOrder: 4 },
  { name: 'Rice (Basmati)', category: 'pantry', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['rice', 'basmati'], usageCount: 80, sortOrder: 5 },
  { name: 'Rice (Brown)', category: 'pantry', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['rice', 'brown', 'wholegrain'], usageCount: 65, sortOrder: 6 },
  { name: 'Quinoa', category: 'pantry', defaultQuantity: 500, defaultUnit: 'g', keywords: ['quinoa'], usageCount: 55, sortOrder: 7 },
  { name: 'Couscous', category: 'pantry', defaultQuantity: 500, defaultUnit: 'g', keywords: ['couscous'], usageCount: 50, sortOrder: 8 },

  // === BREAKFAST ===
  { name: 'Oats (Rolled)', category: 'pantry', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['oats', 'rolled', 'oatmeal', 'porridge'], usageCount: 85, sortOrder: 9 },
  { name: 'Cereal (Cornflakes)', category: 'pantry', defaultQuantity: 500, defaultUnit: 'g', keywords: ['cereal', 'cornflakes', 'breakfast'], usageCount: 75, sortOrder: 10 },
  { name: 'Granola', category: 'pantry', defaultQuantity: 500, defaultUnit: 'g', keywords: ['granola', 'muesli'], usageCount: 70, sortOrder: 11 },

  // === COOKING OILS ===
  { name: 'Olive Oil (Extra Virgin)', category: 'pantry', defaultQuantity: 500, defaultUnit: 'mL', keywords: ['oil', 'olive', 'extra virgin'], usageCount: 95, sortOrder: 12 },
  { name: 'Vegetable Oil', category: 'pantry', defaultQuantity: 1, defaultUnit: 'L', keywords: ['oil', 'vegetable', 'canola', 'sunflower'], usageCount: 85, sortOrder: 13 },
  { name: 'Coconut Oil', category: 'pantry', defaultQuantity: 500, defaultUnit: 'mL', keywords: ['oil', 'coconut'], usageCount: 55, sortOrder: 14 },

  // === CANNED GOODS ===
  { name: 'Canned Tomatoes (Diced)', category: 'pantry', defaultQuantity: 400, defaultUnit: 'g', keywords: ['tomato', 'canned', 'diced', 'chopped'], usageCount: 90, sortOrder: 15 },
  { name: 'Canned Tomatoes (Crushed)', category: 'pantry', defaultQuantity: 400, defaultUnit: 'g', keywords: ['tomato', 'canned', 'crushed'], usageCount: 80, sortOrder: 16 },
  { name: 'Tomato Paste', category: 'pantry', defaultQuantity: 150, defaultUnit: 'g', keywords: ['tomato', 'paste', 'puree'], usageCount: 85, sortOrder: 17 },
  { name: 'Pasta Sauce (Marinara)', category: 'pantry', defaultQuantity: 500, defaultUnit: 'g', keywords: ['sauce', 'pasta', 'marinara', 'tomato'], usageCount: 85, sortOrder: 18 },
  { name: 'Canned Beans (Black)', category: 'pantry', defaultQuantity: 400, defaultUnit: 'g', keywords: ['beans', 'black', 'canned'], usageCount: 75, sortOrder: 19 },
  { name: 'Canned Beans (Kidney)', category: 'pantry', defaultQuantity: 400, defaultUnit: 'g', keywords: ['beans', 'kidney', 'canned'], usageCount: 70, sortOrder: 20 },
  { name: 'Canned Chickpeas', category: 'pantry', defaultQuantity: 400, defaultUnit: 'g', keywords: ['chickpeas', 'garbanzo', 'canned'], usageCount: 75, sortOrder: 21 },
  { name: 'Canned Corn', category: 'pantry', defaultQuantity: 340, defaultUnit: 'g', keywords: ['corn', 'sweetcorn', 'canned'], usageCount: 70, sortOrder: 22 },

  // === BROTH & STOCK ===
  { name: 'Chicken Broth', category: 'pantry', defaultQuantity: 1, defaultUnit: 'L', keywords: ['broth', 'chicken', 'stock'], usageCount: 85, sortOrder: 23 },
  { name: 'Vegetable Broth', category: 'pantry', defaultQuantity: 1, defaultUnit: 'L', keywords: ['broth', 'vegetable', 'stock'], usageCount: 70, sortOrder: 24 },
  { name: 'Beef Broth', category: 'pantry', defaultQuantity: 1, defaultUnit: 'L', keywords: ['broth', 'beef', 'stock'], usageCount: 60, sortOrder: 25 },

  // === BAKING ===
  { name: 'Flour (All-Purpose)', category: 'pantry', defaultQuantity: 1.5, defaultUnit: 'kg', keywords: ['flour', 'all purpose', 'plain'], usageCount: 85, sortOrder: 26 },
  { name: 'Flour (Self-Rising)', category: 'pantry', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['flour', 'self rising'], usageCount: 60, sortOrder: 27 },
  { name: 'Sugar (White)', category: 'pantry', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['sugar', 'white', 'granulated'], usageCount: 85, sortOrder: 28 },
  { name: 'Sugar (Brown)', category: 'pantry', defaultQuantity: 500, defaultUnit: 'g', keywords: ['sugar', 'brown'], usageCount: 70, sortOrder: 29 },
  { name: 'Honey', category: 'pantry', defaultQuantity: 500, defaultUnit: 'g', keywords: ['honey'], usageCount: 80, sortOrder: 30 },
  { name: 'Maple Syrup', category: 'pantry', defaultQuantity: 250, defaultUnit: 'mL', keywords: ['maple', 'syrup'], usageCount: 65, sortOrder: 31 },
  { name: 'Baking Powder', category: 'pantry', defaultQuantity: 100, defaultUnit: 'g', keywords: ['baking', 'powder'], usageCount: 70, sortOrder: 32 },
  { name: 'Baking Soda', category: 'pantry', defaultQuantity: 200, defaultUnit: 'g', keywords: ['baking', 'soda', 'bicarbonate'], usageCount: 65, sortOrder: 33 },
  { name: 'Vanilla Extract', category: 'pantry', defaultQuantity: 100, defaultUnit: 'mL', keywords: ['vanilla', 'extract'], usageCount: 70, sortOrder: 34 },
  { name: 'Cocoa Powder', category: 'pantry', defaultQuantity: 200, defaultUnit: 'g', keywords: ['cocoa', 'chocolate', 'powder'], usageCount: 55, sortOrder: 35 },

  // === NUTS & DRIED FRUITS ===
  { name: 'Peanut Butter', category: 'pantry', defaultQuantity: 500, defaultUnit: 'g', keywords: ['peanut butter', 'pb'], usageCount: 85, sortOrder: 36 },
  { name: 'Almonds', category: 'pantry', defaultQuantity: 200, defaultUnit: 'g', keywords: ['almonds', 'nuts'], usageCount: 65, sortOrder: 37 },
  { name: 'Walnuts', category: 'pantry', defaultQuantity: 200, defaultUnit: 'g', keywords: ['walnuts', 'nuts'], usageCount: 55, sortOrder: 38 },
  { name: 'Raisins', category: 'pantry', defaultQuantity: 250, defaultUnit: 'g', keywords: ['raisins', 'dried fruit'], usageCount: 55, sortOrder: 39 },

  // ═══════════════════════════════════════════════════════════════════════════
  // ☕ BEVERAGES - #6 Priority
  // Coffee #1 morning beverage, tea popular in Europe
  // ═══════════════════════════════════════════════════════════════════════════

  { name: 'Coffee (Ground)', category: 'beverages', defaultQuantity: 500, defaultUnit: 'g', keywords: ['coffee', 'ground'], usageCount: 95, sortOrder: 1 },
  { name: 'Coffee (Beans)', category: 'beverages', defaultQuantity: 500, defaultUnit: 'g', keywords: ['coffee', 'beans', 'whole'], usageCount: 80, sortOrder: 2 },
  { name: 'Instant Coffee', category: 'beverages', defaultQuantity: 200, defaultUnit: 'g', keywords: ['coffee', 'instant', 'nescafe'], usageCount: 70, sortOrder: 3 },
  { name: 'Tea (Black)', category: 'beverages', defaultQuantity: 100, defaultUnit: 'bags', keywords: ['tea', 'black', 'english breakfast'], usageCount: 85, sortOrder: 4 },
  { name: 'Tea (Green)', category: 'beverages', defaultQuantity: 50, defaultUnit: 'bags', keywords: ['tea', 'green'], usageCount: 65, sortOrder: 5 },
  { name: 'Tea (Herbal)', category: 'beverages', defaultQuantity: 50, defaultUnit: 'bags', keywords: ['tea', 'herbal', 'chamomile', 'peppermint'], usageCount: 60, sortOrder: 6 },
  { name: 'Orange Juice', category: 'beverages', defaultQuantity: 1, defaultUnit: 'L', keywords: ['juice', 'orange', 'oj'], usageCount: 80, sortOrder: 7 },
  { name: 'Apple Juice', category: 'beverages', defaultQuantity: 1, defaultUnit: 'L', keywords: ['juice', 'apple'], usageCount: 65, sortOrder: 8 },
  { name: 'Sparkling Water', category: 'beverages', defaultQuantity: 1.5, defaultUnit: 'L', keywords: ['water', 'sparkling', 'fizzy'], usageCount: 70, sortOrder: 9 },
  { name: 'Bottled Water', category: 'beverages', defaultQuantity: 6, defaultUnit: 'bottles', keywords: ['water', 'still', 'mineral'], usageCount: 75, sortOrder: 10 },
  { name: 'Soda (Cola)', category: 'beverages', defaultQuantity: 2, defaultUnit: 'L', keywords: ['soda', 'cola', 'coke', 'pepsi'], usageCount: 65, sortOrder: 11 },
  { name: 'Wine (Red)', category: 'beverages', defaultQuantity: 750, defaultUnit: 'mL', keywords: ['wine', 'red'], usageCount: 60, sortOrder: 12 },
  { name: 'Wine (White)', category: 'beverages', defaultQuantity: 750, defaultUnit: 'mL', keywords: ['wine', 'white'], usageCount: 55, sortOrder: 13 },
  { name: 'Beer', category: 'beverages', defaultQuantity: 6, defaultUnit: 'bottles', keywords: ['beer', 'lager', 'ale'], usageCount: 60, sortOrder: 14 },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🫙 CONDIMENTS - #7 Priority
  // Essential flavor enhancers
  // ═══════════════════════════════════════════════════════════════════════════

  { name: 'Ketchup', category: 'condiments', defaultQuantity: 500, defaultUnit: 'g', keywords: ['ketchup', 'tomato'], usageCount: 90, sortOrder: 1 },
  { name: 'Mayonnaise', category: 'condiments', defaultQuantity: 400, defaultUnit: 'g', keywords: ['mayo', 'mayonnaise'], usageCount: 85, sortOrder: 2 },
  { name: 'Mustard (Yellow)', category: 'condiments', defaultQuantity: 250, defaultUnit: 'g', keywords: ['mustard', 'yellow', 'american'], usageCount: 75, sortOrder: 3 },
  { name: 'Mustard (Dijon)', category: 'condiments', defaultQuantity: 200, defaultUnit: 'g', keywords: ['mustard', 'dijon', 'french'], usageCount: 70, sortOrder: 4 },
  { name: 'Soy Sauce', category: 'condiments', defaultQuantity: 250, defaultUnit: 'mL', keywords: ['soy sauce', 'shoyu'], usageCount: 80, sortOrder: 5 },
  { name: 'Hot Sauce', category: 'condiments', defaultQuantity: 150, defaultUnit: 'mL', keywords: ['hot sauce', 'tabasco', 'sriracha', 'franks'], usageCount: 75, sortOrder: 6 },
  { name: 'BBQ Sauce', category: 'condiments', defaultQuantity: 500, defaultUnit: 'g', keywords: ['bbq', 'barbecue', 'sauce'], usageCount: 70, sortOrder: 7 },
  { name: 'Worcestershire Sauce', category: 'condiments', defaultQuantity: 150, defaultUnit: 'mL', keywords: ['worcestershire'], usageCount: 60, sortOrder: 8 },
  { name: 'Balsamic Vinegar', category: 'condiments', defaultQuantity: 250, defaultUnit: 'mL', keywords: ['vinegar', 'balsamic'], usageCount: 70, sortOrder: 9 },
  { name: 'Red Wine Vinegar', category: 'condiments', defaultQuantity: 250, defaultUnit: 'mL', keywords: ['vinegar', 'red wine'], usageCount: 55, sortOrder: 10 },
  { name: 'Apple Cider Vinegar', category: 'condiments', defaultQuantity: 500, defaultUnit: 'mL', keywords: ['vinegar', 'apple cider', 'acv'], usageCount: 65, sortOrder: 11 },
  { name: 'Salsa', category: 'condiments', defaultQuantity: 400, defaultUnit: 'g', keywords: ['salsa', 'mexican'], usageCount: 70, sortOrder: 12 },
  { name: 'Ranch Dressing', category: 'condiments', defaultQuantity: 350, defaultUnit: 'mL', keywords: ['ranch', 'dressing'], usageCount: 65, sortOrder: 13 },
  { name: 'Italian Dressing', category: 'condiments', defaultQuantity: 350, defaultUnit: 'mL', keywords: ['italian', 'dressing', 'vinaigrette'], usageCount: 55, sortOrder: 14 },
  { name: 'Hummus', category: 'condiments', defaultQuantity: 250, defaultUnit: 'g', keywords: ['hummus', 'chickpea'], usageCount: 70, sortOrder: 15 },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🧂 SPICES - #8 Priority
  // Essential seasonings ordered by frequency of use
  // ═══════════════════════════════════════════════════════════════════════════

  { name: 'Salt', category: 'spices', defaultQuantity: 500, defaultUnit: 'g', keywords: ['salt', 'table', 'sea'], usageCount: 100, sortOrder: 1 },
  { name: 'Black Pepper', category: 'spices', defaultQuantity: 100, defaultUnit: 'g', keywords: ['pepper', 'black', 'ground'], usageCount: 98, sortOrder: 2 },
  { name: 'Garlic Powder', category: 'spices', defaultQuantity: 80, defaultUnit: 'g', keywords: ['garlic', 'powder'], usageCount: 90, sortOrder: 3 },
  { name: 'Onion Powder', category: 'spices', defaultQuantity: 80, defaultUnit: 'g', keywords: ['onion', 'powder'], usageCount: 85, sortOrder: 4 },
  { name: 'Paprika', category: 'spices', defaultQuantity: 50, defaultUnit: 'g', keywords: ['paprika'], usageCount: 80, sortOrder: 5 },
  { name: 'Italian Seasoning', category: 'spices', defaultQuantity: 30, defaultUnit: 'g', keywords: ['italian', 'seasoning', 'herbs'], usageCount: 75, sortOrder: 6 },
  { name: 'Cumin', category: 'spices', defaultQuantity: 50, defaultUnit: 'g', keywords: ['cumin', 'ground'], usageCount: 75, sortOrder: 7 },
  { name: 'Chili Powder', category: 'spices', defaultQuantity: 50, defaultUnit: 'g', keywords: ['chili', 'powder'], usageCount: 70, sortOrder: 8 },
  { name: 'Oregano (Dried)', category: 'spices', defaultQuantity: 30, defaultUnit: 'g', keywords: ['oregano', 'dried'], usageCount: 75, sortOrder: 9 },
  { name: 'Basil (Dried)', category: 'spices', defaultQuantity: 30, defaultUnit: 'g', keywords: ['basil', 'dried'], usageCount: 70, sortOrder: 10 },
  { name: 'Thyme (Dried)', category: 'spices', defaultQuantity: 30, defaultUnit: 'g', keywords: ['thyme', 'dried'], usageCount: 65, sortOrder: 11 },
  { name: 'Rosemary (Dried)', category: 'spices', defaultQuantity: 30, defaultUnit: 'g', keywords: ['rosemary', 'dried'], usageCount: 60, sortOrder: 12 },
  { name: 'Cinnamon', category: 'spices', defaultQuantity: 50, defaultUnit: 'g', keywords: ['cinnamon', 'ground'], usageCount: 75, sortOrder: 13 },
  { name: 'Cayenne Pepper', category: 'spices', defaultQuantity: 30, defaultUnit: 'g', keywords: ['cayenne', 'pepper', 'hot'], usageCount: 55, sortOrder: 14 },
  { name: 'Red Pepper Flakes', category: 'spices', defaultQuantity: 50, defaultUnit: 'g', keywords: ['red pepper', 'flakes', 'crushed'], usageCount: 65, sortOrder: 15 },
  { name: 'Bay Leaves', category: 'spices', defaultQuantity: 10, defaultUnit: 'g', keywords: ['bay', 'leaves'], usageCount: 55, sortOrder: 16 },
  { name: 'Curry Powder', category: 'spices', defaultQuantity: 50, defaultUnit: 'g', keywords: ['curry', 'powder'], usageCount: 60, sortOrder: 17 },
  { name: 'Ginger (Ground)', category: 'spices', defaultQuantity: 40, defaultUnit: 'g', keywords: ['ginger', 'ground'], usageCount: 55, sortOrder: 18 },
  { name: 'Nutmeg', category: 'spices', defaultQuantity: 30, defaultUnit: 'g', keywords: ['nutmeg', 'ground'], usageCount: 50, sortOrder: 19 },
  { name: 'Taco Seasoning', category: 'spices', defaultQuantity: 40, defaultUnit: 'g', keywords: ['taco', 'seasoning', 'mexican'], usageCount: 70, sortOrder: 20 },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🍿 SNACKS - #9 Priority
  // ═══════════════════════════════════════════════════════════════════════════

  { name: 'Potato Chips', category: 'snacks', defaultQuantity: 200, defaultUnit: 'g', keywords: ['chips', 'potato', 'crisps'], usageCount: 80, sortOrder: 1 },
  { name: 'Tortilla Chips', category: 'snacks', defaultQuantity: 300, defaultUnit: 'g', keywords: ['chips', 'tortilla', 'nachos'], usageCount: 75, sortOrder: 2 },
  { name: 'Popcorn', category: 'snacks', defaultQuantity: 300, defaultUnit: 'g', keywords: ['popcorn'], usageCount: 70, sortOrder: 3 },
  { name: 'Pretzels', category: 'snacks', defaultQuantity: 250, defaultUnit: 'g', keywords: ['pretzel'], usageCount: 55, sortOrder: 4 },
  { name: 'Crackers', category: 'snacks', defaultQuantity: 250, defaultUnit: 'g', keywords: ['crackers'], usageCount: 70, sortOrder: 5 },
  { name: 'Granola Bars', category: 'snacks', defaultQuantity: 6, defaultUnit: 'pcs', keywords: ['granola', 'bar', 'energy'], usageCount: 75, sortOrder: 6 },
  { name: 'Trail Mix', category: 'snacks', defaultQuantity: 250, defaultUnit: 'g', keywords: ['trail mix', 'nuts'], usageCount: 55, sortOrder: 7 },
  { name: 'Chocolate (Dark)', category: 'snacks', defaultQuantity: 100, defaultUnit: 'g', keywords: ['chocolate', 'dark'], usageCount: 65, sortOrder: 8 },
  { name: 'Chocolate (Milk)', category: 'snacks', defaultQuantity: 100, defaultUnit: 'g', keywords: ['chocolate', 'milk'], usageCount: 70, sortOrder: 9 },
  { name: 'Cookies', category: 'snacks', defaultQuantity: 300, defaultUnit: 'g', keywords: ['cookies', 'biscuits'], usageCount: 70, sortOrder: 10 },

  // ═══════════════════════════════════════════════════════════════════════════
  // ❄️ FROZEN - #10 Priority
  // ═══════════════════════════════════════════════════════════════════════════

  { name: 'Frozen Peas', category: 'frozen', defaultQuantity: 500, defaultUnit: 'g', keywords: ['peas', 'frozen'], usageCount: 80, sortOrder: 1 },
  { name: 'Frozen Corn', category: 'frozen', defaultQuantity: 500, defaultUnit: 'g', keywords: ['corn', 'frozen'], usageCount: 75, sortOrder: 2 },
  { name: 'Frozen Broccoli', category: 'frozen', defaultQuantity: 500, defaultUnit: 'g', keywords: ['broccoli', 'frozen'], usageCount: 70, sortOrder: 3 },
  { name: 'Frozen Mixed Vegetables', category: 'frozen', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['vegetables', 'mixed', 'frozen'], usageCount: 75, sortOrder: 4 },
  { name: 'Frozen Berries', category: 'frozen', defaultQuantity: 500, defaultUnit: 'g', keywords: ['berries', 'frozen', 'mixed'], usageCount: 80, sortOrder: 5 },
  { name: 'Frozen Spinach', category: 'frozen', defaultQuantity: 500, defaultUnit: 'g', keywords: ['spinach', 'frozen'], usageCount: 60, sortOrder: 6 },
  { name: 'Ice Cream (Vanilla)', category: 'frozen', defaultQuantity: 1, defaultUnit: 'L', keywords: ['ice cream', 'vanilla'], usageCount: 75, sortOrder: 7 },
  { name: 'Ice Cream (Chocolate)', category: 'frozen', defaultQuantity: 1, defaultUnit: 'L', keywords: ['ice cream', 'chocolate'], usageCount: 70, sortOrder: 8 },
  { name: 'Frozen Pizza', category: 'frozen', defaultQuantity: 1, defaultUnit: 'pc', keywords: ['pizza', 'frozen'], usageCount: 70, sortOrder: 9 },
  { name: 'Frozen French Fries', category: 'frozen', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['fries', 'french', 'frozen', 'chips'], usageCount: 75, sortOrder: 10 },
  { name: 'Frozen Fish Fillets', category: 'frozen', defaultQuantity: 500, defaultUnit: 'g', keywords: ['fish', 'frozen', 'fillet'], usageCount: 60, sortOrder: 11 },
  { name: 'Frozen Shrimp', category: 'frozen', defaultQuantity: 500, defaultUnit: 'g', keywords: ['shrimp', 'prawns', 'frozen'], usageCount: 55, sortOrder: 12 },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🏠 HOUSEHOLD - #11 Priority
  // ═══════════════════════════════════════════════════════════════════════════

  { name: 'Paper Towels', category: 'household', defaultQuantity: 6, defaultUnit: 'rolls', keywords: ['paper towels', 'kitchen roll'], usageCount: 90, sortOrder: 1 },
  { name: 'Toilet Paper', category: 'household', defaultQuantity: 12, defaultUnit: 'rolls', keywords: ['toilet paper', 'tissue'], usageCount: 95, sortOrder: 2 },
  { name: 'Dish Soap', category: 'household', defaultQuantity: 500, defaultUnit: 'mL', keywords: ['dish', 'soap', 'washing up liquid'], usageCount: 90, sortOrder: 3 },
  { name: 'Laundry Detergent', category: 'household', defaultQuantity: 1, defaultUnit: 'L', keywords: ['laundry', 'detergent', 'washing powder'], usageCount: 85, sortOrder: 4 },
  { name: 'Trash Bags', category: 'household', defaultQuantity: 30, defaultUnit: 'pcs', keywords: ['trash', 'bags', 'garbage', 'bin liners'], usageCount: 85, sortOrder: 5 },
  { name: 'All-Purpose Cleaner', category: 'household', defaultQuantity: 750, defaultUnit: 'mL', keywords: ['cleaner', 'all purpose', 'spray'], usageCount: 80, sortOrder: 6 },
  { name: 'Aluminum Foil', category: 'household', defaultQuantity: 1, defaultUnit: 'roll', keywords: ['foil', 'aluminum', 'tin'], usageCount: 80, sortOrder: 7 },
  { name: 'Plastic Wrap', category: 'household', defaultQuantity: 1, defaultUnit: 'roll', keywords: ['plastic wrap', 'cling film'], usageCount: 75, sortOrder: 8 },
  { name: 'Ziplock Bags', category: 'household', defaultQuantity: 50, defaultUnit: 'pcs', keywords: ['ziplock', 'bags', 'freezer bags'], usageCount: 75, sortOrder: 9 },
  { name: 'Sponges', category: 'household', defaultQuantity: 4, defaultUnit: 'pcs', keywords: ['sponge', 'scrub'], usageCount: 80, sortOrder: 10 },
  { name: 'Hand Soap', category: 'household', defaultQuantity: 500, defaultUnit: 'mL', keywords: ['soap', 'hand'], usageCount: 90, sortOrder: 11 },
];

export async function seedCommonItems(database: any, generateId: () => string) {
  for (const item of commonItemsSeed) {
    const id = generateId();
    await database.runAsync(
      `INSERT OR IGNORE INTO common_items (id, name, category, default_quantity, default_unit, keywords, usage_count, icon, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, item.name, item.category, item.defaultQuantity ?? null, item.defaultUnit ?? null, item.keywords ? JSON.stringify(item.keywords) : null, item.usageCount, item.icon ?? null, item.sortOrder]
    );
  }
}
