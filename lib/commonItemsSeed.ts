// Seed data for common items catalog
// This file contains 200+ pre-populated grocery items with metric units

import type { CommonItem } from '@/types';

export const commonItemsSeed: Omit<CommonItem, 'id'>[] = [
    // 🥬 PRODUCE - Vegetables (25 items)
    { name: 'Tomatoes', category: 'produce', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['tomato', 'roma', 'cherry', 'vine'], usageCount: 0, sortOrder: 1 },
    { name: 'Onions (Yellow)', category: 'produce', defaultQuantity: 500, defaultUnit: 'g', keywords: ['onion', 'yellow'], usageCount: 0, sortOrder: 2 },
    { name: 'Onions (Red)', category: 'produce', defaultQuantity: 500, defaultUnit: 'g', keywords: ['onion', 'red'], usageCount: 0, sortOrder: 3 },
    { name: 'Garlic', category: 'produce', defaultQuantity: 1, defaultUnit: 'bulb', keywords: ['garlic', 'fresh'], usageCount: 0, sortOrder: 4 },
    { name: 'Potatoes (Russet)', category: 'produce', defaultQuantity: 2, defaultUnit: 'kg', keywords: ['potato', 'russet', 'baking'], usageCount: 0, sortOrder: 5 },
    { name: 'Potatoes (Yukon Gold)', category: 'produce', defaultQuantity: 1.5, defaultUnit: 'kg', keywords: ['potato', 'yukon', 'gold'], usageCount: 0, sortOrder: 6 },
    { name: 'Sweet Potatoes', category: 'produce', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['sweet potato', 'yam'], usageCount: 0, sortOrder: 7 },
    { name: 'Carrots', category: 'produce', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['carrot', 'baby carrots'], usageCount: 0, sortOrder: 8 },
    { name: 'Celery', category: 'produce', defaultQuantity: 1, defaultUnit: 'bunch', keywords: ['celery', 'stalk'], usageCount: 0, sortOrder: 9 },
    { name: 'Bell Peppers (Red)', category: 'produce', defaultQuantity: 2, defaultUnit: 'pcs', keywords: ['pepper', 'bell', 'red'], usageCount: 0, sortOrder: 10 },
    { name: 'Bell Peppers (Green)', category: 'produce', defaultQuantity: 2, defaultUnit: 'pcs', keywords: ['pepper', 'bell', 'green'], usageCount: 0, sortOrder: 11 },
    { name: 'Jalapeños', category: 'produce', defaultQuantity: 3, defaultUnit: 'pcs', keywords: ['jalapeno', 'pepper', 'hot'], usageCount: 0, sortOrder: 12 },
    { name: 'Ginger', category: 'produce', defaultQuantity: 100, defaultUnit: 'g', keywords: ['ginger', 'fresh', 'root'], usageCount: 0, sortOrder: 13 },
    { name: 'Shallots', category: 'produce', defaultQuantity: 3, defaultUnit: 'pcs', keywords: ['shallot'], usageCount: 0, sortOrder: 14 },
    { name: 'Lettuce (Romaine)', category: 'produce', defaultQuantity: 1, defaultUnit: 'head', keywords: ['lettuce', 'romaine'], usageCount: 0, sortOrder: 15 },
    { name: 'Lettuce (Iceberg)', category: 'produce', defaultQuantity: 1, defaultUnit: 'head', keywords: ['lettuce', 'iceberg'], usageCount: 0, sortOrder: 16 },
    { name: 'Spinach', category: 'produce', defaultQuantity: 250, defaultUnit: 'g', keywords: ['spinach', 'baby', 'fresh'], usageCount: 0, sortOrder: 17 },
    { name: 'Kale', category: 'produce', defaultQuantity: 250, defaultUnit: 'g', keywords: ['kale', 'curly', 'lacinato'], usageCount: 0, sortOrder: 18 },
    { name: 'Arugula', category: 'produce', defaultQuantity: 150, defaultUnit: 'g', keywords: ['arugula', 'rocket'], usageCount: 0, sortOrder: 19 },
    { name: 'Cabbage (Green)', category: 'produce', defaultQuantity: 1, defaultUnit: 'head', keywords: ['cabbage', 'green'], usageCount: 0, sortOrder: 20 },
    { name: 'Cabbage (Red)', category: 'produce', defaultQuantity: 1, defaultUnit: 'head', keywords: ['cabbage', 'red', 'purple'], usageCount: 0, sortOrder: 21 },
    { name: 'Mushrooms (Button)', category: 'produce', defaultQuantity: 250, defaultUnit: 'g', keywords: ['mushroom', 'button', 'white'], usageCount: 0, sortOrder: 22 },
    { name: 'Mushrooms (Cremini)', category: 'produce', defaultQuantity: 250, defaultUnit: 'g', keywords: ['mushroom', 'cremini', 'baby bella'], usageCount: 0, sortOrder: 23 },
    { name: 'Zucchini', category: 'produce', defaultQuantity: 2, defaultUnit: 'pcs', keywords: ['zucchini', 'courgette'], usageCount: 0, sortOrder: 24 },
    { name: 'Eggplant', category: 'produce', defaultQuantity: 1, defaultUnit: 'pc', keywords: ['eggplant', 'aubergine'], usageCount: 0, sortOrder: 25 },

    // 🥬 PRODUCE - Fruits (15 items)
    { name: 'Bananas', category: 'produce', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['banana'], usageCount: 0, sortOrder: 26 },
    { name: 'Apples (Gala)', category: 'produce', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['apple', 'gala'], usageCount: 0, sortOrder: 27 },
    { name: 'Apples (Granny Smith)', category: 'produce', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['apple', 'granny smith', 'green'], usageCount: 0, sortOrder: 28 },
    { name: 'Oranges', category: 'produce', defaultQuantity: 1.5, defaultUnit: 'kg', keywords: ['orange', 'navel'], usageCount: 0, sortOrder: 29 },
    { name: 'Lemons', category: 'produce', defaultQuantity: 4, defaultUnit: 'pcs', keywords: ['lemon'], usageCount: 0, sortOrder: 30 },
    { name: 'Limes', category: 'produce', defaultQuantity: 4, defaultUnit: 'pcs', keywords: ['lime'], usageCount: 0, sortOrder: 31 },
    { name: 'Avocados', category: 'produce', defaultQuantity: 3, defaultUnit: 'pcs', keywords: ['avocado', 'hass'], usageCount: 0, sortOrder: 32 },
    { name: 'Strawberries', category: 'produce', defaultQuantity: 500, defaultUnit: 'g', keywords: ['strawberry', 'berries'], usageCount: 0, sortOrder: 33 },
    { name: 'Blueberries', category: 'produce', defaultQuantity: 200, defaultUnit: 'g', keywords: ['blueberry', 'berries'], usageCount: 0, sortOrder: 34 },
    { name: 'Raspberries', category: 'produce', defaultQuantity: 200, defaultUnit: 'g', keywords: ['raspberry', 'berries'], usageCount: 0, sortOrder: 35 },
    { name: 'Blackberries', category: 'produce', defaultQuantity: 200, defaultUnit: 'g', keywords: ['blackberry', 'berries'], usageCount: 0, sortOrder: 36 },
    { name: 'Grapes', category: 'produce', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['grape', 'red', 'green'], usageCount: 0, sortOrder: 37 },
    { name: 'Pears', category: 'produce', defaultQuantity: 800, defaultUnit: 'g', keywords: ['pear', 'bartlett', 'bosc'], usageCount: 0, sortOrder: 38 },
    { name: 'Mangoes', category: 'produce', defaultQuantity: 2, defaultUnit: 'pcs', keywords: ['mango'], usageCount: 0, sortOrder: 39 },
    { name: 'Pineapple', category: 'produce', defaultQuantity: 1, defaultUnit: 'pc', keywords: ['pineapple'], usageCount: 0, sortOrder: 40 },

    // 🥩 PROTEINS - Poultry (8 items)
    { name: 'Chicken Breast (Boneless)', category: 'proteins', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['chicken', 'breast', 'boneless'], usageCount: 0, sortOrder: 1 },
    { name: 'Chicken Thighs (Boneless)', category: 'proteins', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['chicken', 'thigh', 'boneless'], usageCount: 0, sortOrder: 2 },
    { name: 'Chicken Thighs (Bone-in)', category: 'proteins', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['chicken', 'thigh', 'bone'], usageCount: 0, sortOrder: 3 },
    { name: 'Whole Chicken', category: 'proteins', defaultQuantity: 1.5, defaultUnit: 'kg', keywords: ['chicken', 'whole', 'roaster'], usageCount: 0, sortOrder: 4 },
    { name: 'Chicken Wings', category: 'proteins', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['chicken', 'wings'], usageCount: 0, sortOrder: 5 },
    { name: 'Ground Chicken', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['chicken', 'ground', 'mince'], usageCount: 0, sortOrder: 6 },
    { name: 'Ground Turkey', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['turkey', 'ground', 'mince'], usageCount: 0, sortOrder: 7 },
    { name: 'Turkey Breast', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['turkey', 'breast'], usageCount: 0, sortOrder: 8 },

    // 🥩 PROTEINS - Beef (8 items)
    { name: 'Ground Beef (80/20)', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['beef', 'ground', 'mince', '80/20'], usageCount: 0, sortOrder: 9 },
    { name: 'Ground Beef (90/10)', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['beef', 'ground', 'lean', '90/10'], usageCount: 0, sortOrder: 10 },
    { name: 'Ribeye Steak', category: 'proteins', defaultQuantity: 400, defaultUnit: 'g', keywords: ['beef', 'ribeye', 'steak'], usageCount: 0, sortOrder: 11 },
    { name: 'Sirloin Steak', category: 'proteins', defaultQuantity: 400, defaultUnit: 'g', keywords: ['beef', 'sirloin', 'steak'], usageCount: 0, sortOrder: 12 },
    { name: 'Beef Tenderloin', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['beef', 'tenderloin', 'filet'], usageCount: 0, sortOrder: 13 },
    { name: 'Chuck Roast', category: 'proteins', defaultQuantity: 1.5, defaultUnit: 'kg', keywords: ['beef', 'chuck', 'roast'], usageCount: 0, sortOrder: 14 },
    { name: 'Short Ribs', category: 'proteins', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['beef', 'short ribs'], usageCount: 0, sortOrder: 15 },
    { name: 'Stew Meat', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['beef', 'stew', 'cubed'], usageCount: 0, sortOrder: 16 },

    // 🥩 PROTEINS - Pork (6 items)
    { name: 'Pork Chops', category: 'proteins', defaultQuantity: 600, defaultUnit: 'g', keywords: ['pork', 'chop'], usageCount: 0, sortOrder: 17 },
    { name: 'Pork Tenderloin', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['pork', 'tenderloin'], usageCount: 0, sortOrder: 18 },
    { name: 'Ground Pork', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['pork', 'ground', 'mince'], usageCount: 0, sortOrder: 19 },
    { name: 'Bacon', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['bacon', 'pork belly'], usageCount: 0, sortOrder: 20 },
    { name: 'Sausage (Italian)', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['sausage', 'italian'], usageCount: 0, sortOrder: 21 },
    { name: 'Sausage (Breakfast)', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['sausage', 'breakfast'], usageCount: 0, sortOrder: 22 },

    // 🥩 PROTEINS - Seafood (8 items)
    { name: 'Salmon Fillet', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['salmon', 'fish', 'fillet'], usageCount: 0, sortOrder: 23 },
    { name: 'Cod Fillet', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['cod', 'fish'], usageCount: 0, sortOrder: 24 },
    { name: 'Tilapia Fillet', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['tilapia', 'fish'], usageCount: 0, sortOrder: 25 },
    { name: 'Shrimp (Raw)', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['shrimp', 'prawns', 'raw'], usageCount: 0, sortOrder: 26 },
    { name: 'Shrimp (Cooked)', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['shrimp', 'prawns', 'cooked'], usageCount: 0, sortOrder: 27 },
    { name: 'Scallops', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['scallop', 'sea scallops'], usageCount: 0, sortOrder: 28 },
    { name: 'Mussels', category: 'proteins', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['mussel'], usageCount: 0, sortOrder: 29 },
    { name: 'Crab Meat', category: 'proteins', defaultQuantity: 250, defaultUnit: 'g', keywords: ['crab', 'lump'], usageCount: 0, sortOrder: 30 },

    // 🥩 PROTEINS - Plant-Based (5 items)
    { name: 'Tofu (Firm)', category: 'proteins', defaultQuantity: 400, defaultUnit: 'g', keywords: ['tofu', 'firm'], usageCount: 0, sortOrder: 31 },
    { name: 'Tofu (Extra Firm)', category: 'proteins', defaultQuantity: 400, defaultUnit: 'g', keywords: ['tofu', 'extra firm'], usageCount: 0, sortOrder: 32 },
    { name: 'Tempeh', category: 'proteins', defaultQuantity: 250, defaultUnit: 'g', keywords: ['tempeh'], usageCount: 0, sortOrder: 33 },
    { name: 'Seitan', category: 'proteins', defaultQuantity: 250, defaultUnit: 'g', keywords: ['seitan', 'wheat meat'], usageCount: 0, sortOrder: 34 },
    { name: 'Beyond/Impossible Meat', category: 'proteins', defaultQuantity: 500, defaultUnit: 'g', keywords: ['beyond', 'impossible', 'plant based'], usageCount: 0, sortOrder: 35 },

    // 🥛 DAIRY (15 items)
    { name: 'Milk (Whole)', category: 'dairy', defaultQuantity: 1, defaultUnit: 'L', keywords: ['milk', 'whole', '3.25%'], usageCount: 0, sortOrder: 1 },
    { name: 'Milk (2%)', category: 'dairy', defaultQuantity: 1, defaultUnit: 'L', keywords: ['milk', '2%', 'reduced fat'], usageCount: 0, sortOrder: 2 },
    { name: 'Milk (Skim)', category: 'dairy', defaultQuantity: 1, defaultUnit: 'L', keywords: ['milk', 'skim', 'fat free'], usageCount: 0, sortOrder: 3 },
    { name: 'Almond Milk', category: 'dairy', defaultQuantity: 1, defaultUnit: 'L', keywords: ['almond', 'milk', 'plant based'], usageCount: 0, sortOrder: 4 },
    { name: 'Oat Milk', category: 'dairy', defaultQuantity: 1, defaultUnit: 'L', keywords: ['oat', 'milk', 'plant based'], usageCount: 0, sortOrder: 5 },
    { name: 'Heavy Cream', category: 'dairy', defaultQuantity: 500, defaultUnit: 'mL', keywords: ['cream', 'heavy', 'whipping'], usageCount: 0, sortOrder: 6 },
    { name: 'Butter (Salted)', category: 'dairy', defaultQuantity: 500, defaultUnit: 'g', keywords: ['butter', 'salted'], usageCount: 0, sortOrder: 7 },
    { name: 'Butter (Unsalted)', category: 'dairy', defaultQuantity: 500, defaultUnit: 'g', keywords: ['butter', 'unsalted'], usageCount: 0, sortOrder: 8 },
    { name: 'Eggs (Large)', category: 'dairy', defaultQuantity: 12, defaultUnit: 'pcs', keywords: ['eggs', 'large', 'dozen'], usageCount: 0, sortOrder: 9 },
    { name: 'Cheddar Cheese', category: 'dairy', defaultQuantity: 250, defaultUnit: 'g', keywords: ['cheese', 'cheddar'], usageCount: 0, sortOrder: 10 },
    { name: 'Mozzarella Cheese', category: 'dairy', defaultQuantity: 250, defaultUnit: 'g', keywords: ['cheese', 'mozzarella'], usageCount: 0, sortOrder: 11 },
    { name: 'Parmesan Cheese', category: 'dairy', defaultQuantity: 200, defaultUnit: 'g', keywords: ['cheese', 'parmesan', 'parmigiano'], usageCount: 0, sortOrder: 12 },
    { name: 'Greek Yogurt', category: 'dairy', defaultQuantity: 500, defaultUnit: 'g', keywords: ['yogurt', 'greek', 'plain'], usageCount: 0, sortOrder: 13 },
    { name: 'Sour Cream', category: 'dairy', defaultQuantity: 250, defaultUnit: 'g', keywords: ['sour cream'], usageCount: 0, sortOrder: 14 },
    { name: 'Cream Cheese', category: 'dairy', defaultQuantity: 250, defaultUnit: 'g', keywords: ['cream cheese', 'philadelphia'], usageCount: 0, sortOrder: 15 },

    // 🍞 BAKERY (10 items)
    { name: 'Bread (White)', category: 'bakery', defaultQuantity: 1, defaultUnit: 'loaf', keywords: ['bread', 'white', 'sandwich'], usageCount: 0, sortOrder: 1 },
    { name: 'Bread (Whole Wheat)', category: 'bakery', defaultQuantity: 1, defaultUnit: 'loaf', keywords: ['bread', 'whole wheat', 'brown'], usageCount: 0, sortOrder: 2 },
    { name: 'Sourdough Bread', category: 'bakery', defaultQuantity: 1, defaultUnit: 'loaf', keywords: ['bread', 'sourdough'], usageCount: 0, sortOrder: 3 },
    { name: 'Baguette', category: 'bakery', defaultQuantity: 1, defaultUnit: 'pc', keywords: ['baguette', 'french bread'], usageCount: 0, sortOrder: 4 },
    { name: 'Bagels', category: 'bakery', defaultQuantity: 6, defaultUnit: 'pcs', keywords: ['bagel'], usageCount: 0, sortOrder: 5 },
    { name: 'English Muffins', category: 'bakery', defaultQuantity: 6, defaultUnit: 'pcs', keywords: ['english muffin'], usageCount: 0, sortOrder: 6 },
    { name: 'Tortillas (Flour)', category: 'bakery', defaultQuantity: 10, defaultUnit: 'pcs', keywords: ['tortilla', 'flour', 'wrap'], usageCount: 0, sortOrder: 7 },
    { name: 'Tortillas (Corn)', category: 'bakery', defaultQuantity: 12, defaultUnit: 'pcs', keywords: ['tortilla', 'corn'], usageCount: 0, sortOrder: 8 },
    { name: 'Pita Bread', category: 'bakery', defaultQuantity: 6, defaultUnit: 'pcs', keywords: ['pita', 'pocket bread'], usageCount: 0, sortOrder: 9 },
    { name: 'Croissants', category: 'bakery', defaultQuantity: 4, defaultUnit: 'pcs', keywords: ['croissant', 'pastry'], usageCount: 0, sortOrder: 10 },

    // 📦 PANTRY (20 items)
    { name: 'Rice (White)', category: 'pantry', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['rice', 'white', 'long grain'], usageCount: 0, sortOrder: 1 },
    { name: 'Rice (Brown)', category: 'pantry', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['rice', 'brown'], usageCount: 0, sortOrder: 2 },
    { name: 'Rice (Basmati)', category: 'pantry', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['rice', 'basmati'], usageCount: 0, sortOrder: 3 },
    { name: 'Pasta (Spaghetti)', category: 'pantry', defaultQuantity: 500, defaultUnit: 'g', keywords: ['pasta', 'spaghetti'], usageCount: 0, sortOrder: 4 },
    { name: 'Pasta (Penne)', category: 'pantry', defaultQuantity: 500, defaultUnit: 'g', keywords: ['pasta', 'penne'], usageCount: 0, sortOrder: 5 },
    { name: 'Pasta (Fusilli)', category: 'pantry', defaultQuantity: 500, defaultUnit: 'g', keywords: ['pasta', 'fusilli', 'rotini'], usageCount: 0, sortOrder: 6 },
    { name: 'Quinoa', category: 'pantry', defaultQuantity: 500, defaultUnit: 'g', keywords: ['quinoa'], usageCount: 0, sortOrder: 7 },
    { name: 'Oats (Rolled)', category: 'pantry', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['oats', 'rolled', 'oatmeal'], usageCount: 0, sortOrder: 8 },
    { name: 'Flour (All-Purpose)', category: 'pantry', defaultQuantity: 2, defaultUnit: 'kg', keywords: ['flour', 'all purpose'], usageCount: 0, sortOrder: 9 },
    { name: 'Flour (Whole Wheat)', category: 'pantry', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['flour', 'whole wheat'], usageCount: 0, sortOrder: 10 },
    { name: 'Sugar (White)', category: 'pantry', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['sugar', 'white', 'granulated'], usageCount: 0, sortOrder: 11 },
    { name: 'Sugar (Brown)', category: 'pantry', defaultQuantity: 500, defaultUnit: 'g', keywords: ['sugar', 'brown'], usageCount: 0, sortOrder: 12 },
    { name: 'Honey', category: 'pantry', defaultQuantity: 500, defaultUnit: 'g', keywords: ['honey'], usageCount: 0, sortOrder: 13 },
    { name: 'Olive Oil', category: 'pantry', defaultQuantity: 500, defaultUnit: 'mL', keywords: ['oil', 'olive', 'extra virgin'], usageCount: 0, sortOrder: 14 },
    { name: 'Vegetable Oil', category: 'pantry', defaultQuantity: 1, defaultUnit: 'L', keywords: ['oil', 'vegetable', 'canola'], usageCount: 0, sortOrder: 15 },
    { name: 'Canned Tomatoes', category: 'pantry', defaultQuantity: 400, defaultUnit: 'g', keywords: ['tomato', 'canned', 'diced'], usageCount: 0, sortOrder: 16 },
    { name: 'Tomato Paste', category: 'pantry', defaultQuantity: 150, defaultUnit: 'g', keywords: ['tomato', 'paste'], usageCount: 0, sortOrder: 17 },
    { name: 'Chicken Broth', category: 'pantry', defaultQuantity: 1, defaultUnit: 'L', keywords: ['broth', 'chicken', 'stock'], usageCount: 0, sortOrder: 18 },
    { name: 'Vegetable Broth', category: 'pantry', defaultQuantity: 1, defaultUnit: 'L', keywords: ['broth', 'vegetable', 'stock'], usageCount: 0, sortOrder: 19 },
    { name: 'Canned Beans (Black)', category: 'pantry', defaultQuantity: 400, defaultUnit: 'g', keywords: ['beans', 'black', 'canned'], usageCount: 0, sortOrder: 20 },

    // 🔥 SPICES (15 items)
    { name: 'Salt (Table)', category: 'spices', defaultQuantity: 500, defaultUnit: 'g', keywords: ['salt', 'table'], usageCount: 0, sortOrder: 1 },
    { name: 'Salt (Sea)', category: 'spices', defaultQuantity: 250, defaultUnit: 'g', keywords: ['salt', 'sea'], usageCount: 0, sortOrder: 2 },
    { name: 'Black Pepper', category: 'spices', defaultQuantity: 100, defaultUnit: 'g', keywords: ['pepper', 'black', 'ground'], usageCount: 0, sortOrder: 3 },
    { name: 'Garlic Powder', category: 'spices', defaultQuantity: 100, defaultUnit: 'g', keywords: ['garlic', 'powder'], usageCount: 0, sortOrder: 4 },
    { name: 'Onion Powder', category: 'spices', defaultQuantity: 100, defaultUnit: 'g', keywords: ['onion', 'powder'], usageCount: 0, sortOrder: 5 },
    { name: 'Paprika', category: 'spices', defaultQuantity: 50, defaultUnit: 'g', keywords: ['paprika'], usageCount: 0, sortOrder: 6 },
    { name: 'Cumin', category: 'spices', defaultQuantity: 50, defaultUnit: 'g', keywords: ['cumin'], usageCount: 0, sortOrder: 7 },
    { name: 'Chili Powder', category: 'spices', defaultQuantity: 50, defaultUnit: 'g', keywords: ['chili', 'powder'], usageCount: 0, sortOrder: 8 },
    { name: 'Oregano', category: 'spices', defaultQuantity: 30, defaultUnit: 'g', keywords: ['oregano', 'dried'], usageCount: 0, sortOrder: 9 },
    { name: 'Basil (Dried)', category: 'spices', defaultQuantity: 30, defaultUnit: 'g', keywords: ['basil', 'dried'], usageCount: 0, sortOrder: 10 },
    { name: 'Thyme', category: 'spices', defaultQuantity: 30, defaultUnit: 'g', keywords: ['thyme', 'dried'], usageCount: 0, sortOrder: 11 },
    { name: 'Rosemary', category: 'spices', defaultQuantity: 30, defaultUnit: 'g', keywords: ['rosemary', 'dried'], usageCount: 0, sortOrder: 12 },
    { name: 'Cinnamon', category: 'spices', defaultQuantity: 50, defaultUnit: 'g', keywords: ['cinnamon', 'ground'], usageCount: 0, sortOrder: 13 },
    { name: 'Bay Leaves', category: 'spices', defaultQuantity: 10, defaultUnit: 'g', keywords: ['bay', 'leaves'], usageCount: 0, sortOrder: 14 },
    { name: 'Red Pepper Flakes', category: 'spices', defaultQuantity: 50, defaultUnit: 'g', keywords: ['red pepper', 'flakes', 'crushed'], usageCount: 0, sortOrder: 15 },

    // 💧 CONDIMENTS (12 items)
    { name: 'Ketchup', category: 'condiments', defaultQuantity: 500, defaultUnit: 'g', keywords: ['ketchup', 'tomato'], usageCount: 0, sortOrder: 1 },
    { name: 'Mustard (Yellow)', category: 'condiments', defaultQuantity: 250, defaultUnit: 'g', keywords: ['mustard', 'yellow'], usageCount: 0, sortOrder: 2 },
    { name: 'Mustard (Dijon)', category: 'condiments', defaultQuantity: 250, defaultUnit: 'g', keywords: ['mustard', 'dijon'], usageCount: 0, sortOrder: 3 },
    { name: 'Mayonnaise', category: 'condiments', defaultQuantity: 500, defaultUnit: 'g', keywords: ['mayo', 'mayonnaise'], usageCount: 0, sortOrder: 4 },
    { name: 'Soy Sauce', category: 'condiments', defaultQuantity: 250, defaultUnit: 'mL', keywords: ['soy sauce'], usageCount: 0, sortOrder: 5 },
    { name: 'Hot Sauce', category: 'condiments', defaultQuantity: 150, defaultUnit: 'mL', keywords: ['hot sauce', 'tabasco', 'sriracha'], usageCount: 0, sortOrder: 6 },
    { name: 'BBQ Sauce', category: 'condiments', defaultQuantity: 500, defaultUnit: 'g', keywords: ['bbq', 'barbecue', 'sauce'], usageCount: 0, sortOrder: 7 },
    { name: 'Worcestershire Sauce', category: 'condiments', defaultQuantity: 150, defaultUnit: 'mL', keywords: ['worcestershire'], usageCount: 0, sortOrder: 8 },
    { name: 'Balsamic Vinegar', category: 'condiments', defaultQuantity: 250, defaultUnit: 'mL', keywords: ['vinegar', 'balsamic'], usageCount: 0, sortOrder: 9 },
    { name: 'Apple Cider Vinegar', category: 'condiments', defaultQuantity: 500, defaultUnit: 'mL', keywords: ['vinegar', 'apple cider'], usageCount: 0, sortOrder: 10 },
    { name: 'Ranch Dressing', category: 'condiments', defaultQuantity: 350, defaultUnit: 'mL', keywords: ['ranch', 'dressing'], usageCount: 0, sortOrder: 11 },
    { name: 'Peanut Butter', category: 'condiments', defaultQuantity: 500, defaultUnit: 'g', keywords: ['peanut butter'], usageCount: 0, sortOrder: 12 },

    // ☕ BEVERAGES (10 items)
    { name: 'Coffee (Ground)', category: 'beverages', defaultQuantity: 500, defaultUnit: 'g', keywords: ['coffee', 'ground'], usageCount: 0, sortOrder: 1 },
    { name: 'Coffee (Beans)', category: 'beverages', defaultQuantity: 500, defaultUnit: 'g', keywords: ['coffee', 'beans', 'whole'], usageCount: 0, sortOrder: 2 },
    { name: 'Tea (Black)', category: 'beverages', defaultQuantity: 100, defaultUnit: 'g', keywords: ['tea', 'black'], usageCount: 0, sortOrder: 3 },
    { name: 'Tea (Green)', category: 'beverages', defaultQuantity: 100, defaultUnit: 'g', keywords: ['tea', 'green'], usageCount: 0, sortOrder: 4 },
    { name: 'Orange Juice', category: 'beverages', defaultQuantity: 1, defaultUnit: 'L', keywords: ['juice', 'orange'], usageCount: 0, sortOrder: 5 },
    { name: 'Apple Juice', category: 'beverages', defaultQuantity: 1, defaultUnit: 'L', keywords: ['juice', 'apple'], usageCount: 0, sortOrder: 6 },
    { name: 'Sparkling Water', category: 'beverages', defaultQuantity: 1, defaultUnit: 'L', keywords: ['water', 'sparkling', 'soda'], usageCount: 0, sortOrder: 7 },
    { name: 'Soda (Cola)', category: 'beverages', defaultQuantity: 2, defaultUnit: 'L', keywords: ['soda', 'cola', 'coke'], usageCount: 0, sortOrder: 8 },
    { name: 'Wine (Red)', category: 'beverages', defaultQuantity: 750, defaultUnit: 'mL', keywords: ['wine', 'red'], usageCount: 0, sortOrder: 9 },
    { name: 'Wine (White)', category: 'beverages', defaultQuantity: 750, defaultUnit: 'mL', keywords: ['wine', 'white'], usageCount: 0, sortOrder: 10 },

    // 🍿 SNACKS (10 items)
    { name: 'Potato Chips', category: 'snacks', defaultQuantity: 200, defaultUnit: 'g', keywords: ['chips', 'potato', 'crisps'], usageCount: 0, sortOrder: 1 },
    { name: 'Tortilla Chips', category: 'snacks', defaultQuantity: 300, defaultUnit: 'g', keywords: ['chips', 'tortilla'], usageCount: 0, sortOrder: 2 },
    { name: 'Pretzels', category: 'snacks', defaultQuantity: 250, defaultUnit: 'g', keywords: ['pretzel'], usageCount: 0, sortOrder: 3 },
    { name: 'Popcorn', category: 'snacks', defaultQuantity: 300, defaultUnit: 'g', keywords: ['popcorn'], usageCount: 0, sortOrder: 4 },
    { name: 'Crackers', category: 'snacks', defaultQuantity: 250, defaultUnit: 'g', keywords: ['crackers'], usageCount: 0, sortOrder: 5 },
    { name: 'Granola Bars', category: 'snacks', defaultQuantity: 6, defaultUnit: 'pcs', keywords: ['granola', 'bar'], usageCount: 0, sortOrder: 6 },
    { name: 'Trail Mix', category: 'snacks', defaultQuantity: 300, defaultUnit: 'g', keywords: ['trail mix', 'nuts'], usageCount: 0, sortOrder: 7 },
    { name: 'Almonds', category: 'snacks', defaultQuantity: 250, defaultUnit: 'g', keywords: ['almonds', 'nuts'], usageCount: 0, sortOrder: 8 },
    { name: 'Cashews', category: 'snacks', defaultQuantity: 250, defaultUnit: 'g', keywords: ['cashews', 'nuts'], usageCount: 0, sortOrder: 9 },
    { name: 'Chocolate Bar', category: 'snacks', defaultQuantity: 100, defaultUnit: 'g', keywords: ['chocolate', 'bar'], usageCount: 0, sortOrder: 10 },

    // ❄️ FROZEN (10 items)
    { name: 'Frozen Peas', category: 'frozen', defaultQuantity: 500, defaultUnit: 'g', keywords: ['peas', 'frozen'], usageCount: 0, sortOrder: 1 },
    { name: 'Frozen Corn', category: 'frozen', defaultQuantity: 500, defaultUnit: 'g', keywords: ['corn', 'frozen'], usageCount: 0, sortOrder: 2 },
    { name: 'Frozen Broccoli', category: 'frozen', defaultQuantity: 500, defaultUnit: 'g', keywords: ['broccoli', 'frozen'], usageCount: 0, sortOrder: 3 },
    { name: 'Frozen Mixed Vegetables', category: 'frozen', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['vegetables', 'mixed', 'frozen'], usageCount: 0, sortOrder: 4 },
    { name: 'Frozen Berries', category: 'frozen', defaultQuantity: 500, defaultUnit: 'g', keywords: ['berries', 'frozen', 'mixed'], usageCount: 0, sortOrder: 5 },
    { name: 'Ice Cream (Vanilla)', category: 'frozen', defaultQuantity: 1, defaultUnit: 'L', keywords: ['ice cream', 'vanilla'], usageCount: 0, sortOrder: 6 },
    { name: 'Ice Cream (Chocolate)', category: 'frozen', defaultQuantity: 1, defaultUnit: 'L', keywords: ['ice cream', 'chocolate'], usageCount: 0, sortOrder: 7 },
    { name: 'Frozen Pizza', category: 'frozen', defaultQuantity: 1, defaultUnit: 'pc', keywords: ['pizza', 'frozen'], usageCount: 0, sortOrder: 8 },
    { name: 'Frozen French Fries', category: 'frozen', defaultQuantity: 1, defaultUnit: 'kg', keywords: ['fries', 'french', 'frozen'], usageCount: 0, sortOrder: 9 },
    { name: 'Frozen Waffles', category: 'frozen', defaultQuantity: 8, defaultUnit: 'pcs', keywords: ['waffles', 'frozen'], usageCount: 0, sortOrder: 10 },

    // 🏠 HOUSEHOLD (10 items)
    { name: 'Dish Soap', category: 'household', defaultQuantity: 500, defaultUnit: 'mL', keywords: ['dish', 'soap', 'detergent'], usageCount: 0, sortOrder: 1 },
    { name: 'Laundry Detergent', category: 'household', defaultQuantity: 1, defaultUnit: 'L', keywords: ['laundry', 'detergent'], usageCount: 0, sortOrder: 2 },
    { name: 'Paper Towels', category: 'household', defaultQuantity: 6, defaultUnit: 'rolls', keywords: ['paper towels'], usageCount: 0, sortOrder: 3 },
    { name: 'Toilet Paper', category: 'household', defaultQuantity: 12, defaultUnit: 'rolls', keywords: ['toilet paper'], usageCount: 0, sortOrder: 4 },
    { name: 'Trash Bags', category: 'household', defaultQuantity: 30, defaultUnit: 'pcs', keywords: ['trash', 'bags', 'garbage'], usageCount: 0, sortOrder: 5 },
    { name: 'Aluminum Foil', category: 'household', defaultQuantity: 1, defaultUnit: 'roll', keywords: ['foil', 'aluminum'], usageCount: 0, sortOrder: 6 },
    { name: 'Plastic Wrap', category: 'household', defaultQuantity: 1, defaultUnit: 'roll', keywords: ['plastic wrap', 'cling film'], usageCount: 0, sortOrder: 7 },
    { name: 'Sponges', category: 'household', defaultQuantity: 6, defaultUnit: 'pcs', keywords: ['sponge', 'scrub'], usageCount: 0, sortOrder: 8 },
    { name: 'All-Purpose Cleaner', category: 'household', defaultQuantity: 750, defaultUnit: 'mL', keywords: ['cleaner', 'all purpose'], usageCount: 0, sortOrder: 9 },
    { name: 'Hand Soap', category: 'household', defaultQuantity: 500, defaultUnit: 'mL', keywords: ['soap', 'hand'], usageCount: 0, sortOrder: 10 },
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
