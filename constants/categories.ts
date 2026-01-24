import { IngredientCategory } from '@/types';

interface CategoryInfo {
  label: string;
  icon: string;
  color: string;
  keywords: string[];
}

export const CATEGORIES: Record<IngredientCategory, CategoryInfo> = {
  produce: {
    label: 'Produce',
    icon: 'carrot',
    color: '#22C55E',
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
  meat_seafood: {
    label: 'Meat & Seafood',
    icon: 'beef',
    color: '#DC2626',
    keywords: [
      'chicken', 'beef', 'pork', 'lamb', 'turkey', 'bacon', 'ham',
      'sausage', 'ground beef', 'ground turkey', 'steak', 'ribs',
      'salmon', 'tuna', 'shrimp', 'prawns', 'crab', 'lobster',
      'fish', 'cod', 'tilapia', 'halibut', 'scallops', 'mussels',
      'clams', 'oysters', 'anchovies', 'sardines', 'duck', 'veal',
      'prosciutto', 'pepperoni', 'salami', 'chorizo',
    ],
  },
  dairy: {
    label: 'Dairy',
    icon: 'milk',
    color: '#60A5FA',
    keywords: [
      'milk', 'cheese', 'butter', 'cream', 'yogurt', 'sour cream',
      'cream cheese', 'cottage cheese', 'ricotta', 'mozzarella',
      'parmesan', 'cheddar', 'feta', 'goat cheese', 'brie',
      'half and half', 'heavy cream', 'whipping cream', 'ghee',
      'buttermilk', 'egg', 'eggs', 'greek yogurt',
    ],
  },
  bakery: {
    label: 'Bakery',
    icon: 'wheat',
    color: '#A16207',
    keywords: [
      'bread', 'tortilla', 'tortillas', 'baguette', 'rolls', 'buns',
      'pita', 'naan', 'croissant', 'bagel', 'english muffin',
      'flatbread', 'ciabatta', 'sourdough', 'brioche', 'focaccia',
      'crackers', 'breadcrumbs', 'panko',
    ],
  },
  frozen: {
    label: 'Frozen',
    icon: 'snowflake',
    color: '#38BDF8',
    keywords: [
      'frozen', 'ice cream', 'frozen vegetables', 'frozen fruit',
      'frozen pizza', 'frozen dinner', 'popsicle', 'sorbet',
      'frozen berries', 'frozen peas', 'frozen corn',
    ],
  },
  pantry: {
    label: 'Pantry',
    icon: 'package',
    color: '#F59E0B',
    keywords: [
      'pasta', 'rice', 'beans', 'lentils', 'quinoa', 'oats',
      'flour', 'sugar', 'brown sugar', 'honey', 'maple syrup',
      'olive oil', 'vegetable oil', 'coconut oil', 'sesame oil',
      'vinegar', 'balsamic', 'soy sauce', 'fish sauce',
      'tomato sauce', 'tomato paste', 'canned tomatoes',
      'chicken broth', 'beef broth', 'vegetable broth', 'stock',
      'coconut milk', 'peanut butter', 'almond butter', 'jam',
      'mustard', 'ketchup', 'mayonnaise', 'hot sauce', 'sriracha',
      'worcestershire', 'tahini', 'miso', 'curry paste',
      'canned beans', 'chickpeas', 'nuts', 'almonds', 'walnuts',
      'pecans', 'cashews', 'peanuts', 'seeds', 'dried fruit',
      'raisins', 'chocolate', 'cocoa', 'vanilla', 'baking powder',
      'baking soda', 'yeast', 'cornstarch', 'breadcrumbs',
    ],
  },
  spices: {
    label: 'Spices',
    icon: 'flame',
    color: '#EA580C',
    keywords: [
      'salt', 'pepper', 'black pepper', 'cumin', 'paprika',
      'oregano', 'basil', 'thyme', 'rosemary', 'cinnamon',
      'nutmeg', 'ginger', 'turmeric', 'cayenne', 'chili powder',
      'garlic powder', 'onion powder', 'italian seasoning',
      'taco seasoning', 'curry powder', 'garam masala',
      'coriander', 'cardamom', 'cloves', 'allspice', 'bay leaves',
      'red pepper flakes', 'smoked paprika', 'everything bagel',
    ],
  },
  beverages: {
    label: 'Beverages',
    icon: 'cup',
    color: '#A855F7',
    keywords: [
      'water', 'juice', 'orange juice', 'apple juice', 'wine',
      'beer', 'coffee', 'tea', 'soda', 'sparkling water', 'milk',
      'almond milk', 'oat milk', 'coconut water', 'lemonade',
    ],
  },
  other: {
    label: 'Other',
    icon: 'box',
    color: '#78716C',
    keywords: [],
  },
};

export function getCategoryForIngredient(ingredientName: string): IngredientCategory {
  const lowerName = ingredientName.toLowerCase();

  for (const [category, info] of Object.entries(CATEGORIES)) {
    if (info.keywords.some(keyword => lowerName.includes(keyword))) {
      return category as IngredientCategory;
    }
  }

  return 'other';
}
