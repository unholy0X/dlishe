// Shared Categories - Single Source of Truth
// Used by Shopping, Pantry, and Recipe features
// Ordered by household consumption frequency (US/Europe 2024 data)
//
// Priority based on:
// - Statista: 64% buy produce, 60% buy eggs regularly
// - USDA/EFSA consumption statistics
// - Breakfast/lunch/dinner frequency data

import type { IngredientCategory } from '@/types';

export interface CategoryInfo {
  value: IngredientCategory;
  label: string;
  keywords: string[];
}

// Categories ordered by purchase frequency (90%+ household consumption)
export const CATEGORIES: CategoryInfo[] = [
  // #1 - Dairy: 60%+ buy eggs regularly, milk/cheese daily staples
  {
    value: 'dairy',
    label: 'Dairy & Eggs',
    keywords: [
      'milk', 'cheese', 'butter', 'cream', 'yogurt', 'sour cream',
      'cream cheese', 'cottage cheese', 'ricotta', 'mozzarella',
      'parmesan', 'cheddar', 'feta', 'goat cheese', 'brie',
      'half and half', 'heavy cream', 'whipping cream', 'ghee',
      'buttermilk', 'egg', 'eggs', 'greek yogurt', 'almond milk', 'oat milk',
    ],
  },
  // #2 - Produce: 64% buy fruits/vegetables regularly (highest category)
  {
    value: 'produce',
    label: 'Produce',
    keywords: [
      'lettuce', 'tomato', 'tomatoes', 'onion', 'onions', 'garlic',
      'pepper', 'peppers', 'carrot', 'carrots', 'broccoli', 'spinach',
      'kale', 'cucumber', 'celery', 'mushroom', 'mushrooms', 'potato',
      'potatoes', 'zucchini', 'squash', 'corn', 'peas', 'beans',
      'avocado', 'lemon', 'lime', 'orange', 'apple', 'banana',
      'berries', 'strawberry', 'blueberry', 'grape', 'grapes',
      'mango', 'pineapple', 'ginger', 'cilantro', 'parsley', 'basil',
      'mint', 'rosemary', 'thyme', 'scallion', 'scallions', 'shallot',
      'cabbage', 'asparagus', 'eggplant', 'beet', 'radish',
    ],
  },
  // #3 - Proteins: Chicken #1 US (68.1 lbs/person), Pork #1 Europe
  {
    value: 'proteins',
    label: 'Proteins',
    keywords: [
      'chicken', 'beef', 'pork', 'lamb', 'turkey', 'bacon', 'ham',
      'sausage', 'ground beef', 'ground turkey', 'steak', 'ribs',
      'salmon', 'tuna', 'shrimp', 'prawns', 'crab', 'lobster',
      'fish', 'cod', 'tilapia', 'halibut', 'scallops', 'mussels',
      'clams', 'oysters', 'anchovies', 'sardines', 'duck', 'veal',
      'prosciutto', 'pepperoni', 'salami', 'chorizo', 'tofu', 'tempeh',
      'seitan', 'meat', 'seafood',
    ],
  },
  // #4 - Bakery: Bread staple in 80%+ households
  {
    value: 'bakery',
    label: 'Bakery',
    keywords: [
      'bread', 'tortilla', 'tortillas', 'baguette', 'rolls', 'buns',
      'pita', 'naan', 'croissant', 'bagel', 'english muffin',
      'flatbread', 'ciabatta', 'sourdough', 'brioche', 'focaccia',
      'muffin', 'wrap',
    ],
  },
  // #5 - Pantry: Rice, pasta, oils - cooking essentials
  {
    value: 'pantry',
    label: 'Pantry',
    keywords: [
      'pasta', 'rice', 'beans', 'lentils', 'quinoa', 'oats',
      'flour', 'sugar', 'brown sugar', 'honey', 'maple syrup',
      'olive oil', 'vegetable oil', 'coconut oil', 'sesame oil',
      'tomato sauce', 'tomato paste', 'canned tomatoes',
      'chicken broth', 'beef broth', 'vegetable broth', 'stock',
      'coconut milk', 'canned beans', 'chickpeas',
      'baking powder', 'baking soda', 'yeast', 'cornstarch',
    ],
  },
  // #6 - Beverages: Coffee #1 breakfast beverage
  {
    value: 'beverages',
    label: 'Beverages',
    keywords: [
      'water', 'juice', 'orange juice', 'apple juice', 'wine',
      'beer', 'coffee', 'tea', 'soda', 'sparkling water',
      'lemonade', 'cola', 'espresso',
    ],
  },
  // #7 - Condiments: Essential flavor enhancers
  {
    value: 'condiments',
    label: 'Condiments',
    keywords: [
      'ketchup', 'mustard', 'mayonnaise', 'mayo', 'soy sauce',
      'hot sauce', 'sriracha', 'bbq sauce', 'barbecue', 'worcestershire',
      'vinegar', 'balsamic', 'ranch', 'dressing', 'peanut butter',
      'almond butter', 'jam', 'jelly', 'tahini', 'miso', 'fish sauce',
    ],
  },
  // #8 - Spices: Salt & pepper in 100% of households
  {
    value: 'spices',
    label: 'Spices',
    keywords: [
      'salt', 'pepper', 'black pepper', 'cumin', 'paprika',
      'oregano', 'basil', 'thyme', 'rosemary', 'cinnamon',
      'nutmeg', 'ginger', 'turmeric', 'cayenne', 'chili powder',
      'garlic powder', 'onion powder', 'italian seasoning',
      'taco seasoning', 'curry powder', 'garam masala',
      'coriander', 'cardamom', 'cloves', 'allspice', 'bay leaves',
      'red pepper flakes', 'smoked paprika',
    ],
  },
  // #9 - Snacks
  {
    value: 'snacks',
    label: 'Snacks',
    keywords: [
      'chips', 'crackers', 'pretzels', 'popcorn', 'nuts', 'almonds',
      'walnuts', 'pecans', 'cashews', 'peanuts', 'trail mix',
      'granola', 'chocolate', 'candy', 'cookies', 'dried fruit', 'raisins',
    ],
  },
  // #10 - Frozen
  {
    value: 'frozen',
    label: 'Frozen',
    keywords: [
      'frozen', 'ice cream', 'frozen vegetables', 'frozen fruit',
      'frozen pizza', 'frozen dinner', 'popsicle', 'sorbet',
      'frozen berries', 'frozen peas', 'frozen corn', 'waffles', 'fries',
    ],
  },
  // #11 - Household
  {
    value: 'household',
    label: 'Household',
    keywords: [
      'dish soap', 'laundry', 'detergent', 'paper towel', 'toilet paper',
      'trash bag', 'garbage', 'foil', 'aluminum', 'plastic wrap',
      'sponge', 'cleaner', 'hand soap', 'soap',
    ],
  },
  // #12 - Other (catch-all)
  {
    value: 'other',
    label: 'Other',
    keywords: [],
  },
];

// Map for quick lookup by category value
export const CATEGORY_MAP: Record<IngredientCategory, CategoryInfo> =
  CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = cat;
    return acc;
  }, {} as Record<IngredientCategory, CategoryInfo>);

// Get category label
export function getCategoryLabel(category: IngredientCategory): string {
  return CATEGORY_MAP[category]?.label ?? 'Other';
}

// Detect category from ingredient name
export function getCategoryForIngredient(ingredientName: string): IngredientCategory {
  const lowerName = ingredientName.toLowerCase();

  for (const category of CATEGORIES) {
    if (category.keywords.some(keyword => lowerName.includes(keyword))) {
      return category.value;
    }
  }

  return 'other';
}

// Default category for unknown items
export const DEFAULT_CATEGORY: IngredientCategory = 'other';
