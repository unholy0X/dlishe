/**
 * Meal category definitions and client-side recipe filter.
 *
 * Matching logic per recipe:
 *  1. Primary — check recipe.dietaryInfo.mealTypes against category mealTypes
 *  2. Fallback — check recipe.tags for substring match against tagKeywords
 *  3. "more" is a catch-all: its own keywords PLUS anything unmatched by the
 *     three main categories (breakfast/lunch/dinner).
 */

export const CATEGORIES = {
  breakfast: {
    label: "Breakfast",
    mealTypes: ["breakfast"],
    tagKeywords: [
      "breakfast", "brunch", "morning",
      "pancake", "pancakes", "waffle", "waffles",
      "omelette", "omelet", "oatmeal", "porridge", "cereal",
      "granola", "muesli", "french toast",
      "smoothie bowl", "acai bowl", "eggs benedict",
      "scrambled eggs", "fried eggs", "poached eggs",
      "muffin", "muffins", "scone", "scones",
      "bagel", "bagels", "croissant", "croissants",
      "toast", "overnight oats", "shakshuka",
      "frittata", "quiche", "crepe", "crepes",
    ],
  },

  lunch: {
    label: "Lunch",
    mealTypes: ["lunch"],
    tagKeywords: [
      "lunch", "lunchbox",
      "sandwich", "sandwiches", "panini",
      "wrap", "wraps", "burrito", "burritos",
      "salad", "salads", "soup", "soups",
      "chowder", "bisque", "gazpacho",
      "bowl", "bowls", "buddha bowl", "poke bowl", "grain bowl",
      "bento", "meal prep", "light meal", "midday",
      "quesadilla", "taco", "tacos",
      "rice bowl", "noodle bowl",
    ],
  },

  dinner: {
    label: "Dinner",
    mealTypes: ["dinner"],
    tagKeywords: [
      "dinner", "supper", "main course", "main dish",
      "entree", "entrée",
      "roast", "roasted", "stew", "stews",
      "braise", "braised", "casserole", "casseroles",
      "curry", "curries", "stir fry",
      "grilled", "grill", "baked", "oven-baked",
      "lasagna", "risotto", "paella", "pot roast",
      "slow cooker", "feast", "family meal", "family dinner",
      "thanksgiving", "holiday",
    ],
  },

  more: {
    label: "More",
    mealTypes: ["snack", "dessert"],
    tagKeywords: [
      // Desserts
      "dessert", "desserts", "sweet", "sweets",
      "cake", "cakes", "cupcake", "cupcakes",
      "cookie", "cookies", "biscuit", "biscuits",
      "pie", "pies", "tart", "tarts",
      "pastry", "pastries", "pudding", "puddings",
      "mousse", "ice cream", "gelato", "sorbet",
      "chocolate", "brownie", "brownies",
      "cheesecake", "tiramisu", "flan", "crème brûlée",
      "baking", "donut", "donuts", "doughnut",
      // Snacks
      "snack", "snacks", "appetizer", "appetizers",
      "starter", "starters", "finger food",
      "dip", "dips", "hummus", "guacamole", "salsa",
      "side dish", "chips", "popcorn", "nuts", "trail mix",
      "energy balls", "protein balls",
      "crackers", "bruschetta", "crostini",
      // Drinks
      "drink", "drinks", "beverage", "beverages",
      "smoothie", "smoothies", "milkshake",
      "juice", "juices", "lemonade",
      "coffee", "latte", "espresso",
      "tea", "chai", "matcha",
      "cocktail", "cocktails", "mocktail", "mocktails",
    ],
  },
};

/** Priority order — first match wins, recipe goes to ONE category only. */
const PRIORITY = ["breakfast", "lunch", "dinner", "more"];

function matchesCategory(recipe, catDef) {
  const mealTypes = recipe.dietaryInfo?.mealTypes;
  if (Array.isArray(mealTypes) && mealTypes.length > 0) {
    const lower = mealTypes.map((t) => t.toLowerCase());
    if (catDef.mealTypes.some((mt) => lower.includes(mt))) return true;
  }

  const tags = recipe.tags;
  if (Array.isArray(tags) && tags.length > 0) {
    const lowerTags = tags.map((t) => t.toLowerCase());
    if (
      catDef.tagKeywords.some((kw) =>
        lowerTags.some((tag) => tag.includes(kw))
      )
    )
      return true;
  }

  return false;
}

/**
 * Assign a recipe to its first matching category (priority order).
 * Returns the category key or "more" as catch-all.
 */
function assignCategory(recipe) {
  for (const key of PRIORITY) {
    if (matchesCategory(recipe, CATEGORIES[key])) return key;
  }
  return "more"; // no match → catch-all
}

/**
 * Filter recipes by meal category key.
 * Each recipe belongs to exactly one category (first match wins in priority
 * order: breakfast → lunch → dinner → more). Unmatched recipes fall into "more".
 *
 * @param {Array} recipes — full recipe list
 * @param {string} key — one of "breakfast", "lunch", "dinner", "more"
 * @returns {Array} filtered recipes
 */
export function filterByMealCategory(recipes, key) {
  if (!Array.isArray(recipes) || recipes.length === 0) return [];
  if (!CATEGORIES[key]) return [];

  return recipes.filter((r) => assignCategory(r) === key);
}
