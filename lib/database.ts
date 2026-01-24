// DishFlow SQLite Database Setup
import * as SQLite from 'expo-sqlite';
import type { Recipe, Ingredient, Instruction, PantryItem, ShoppingItem, IngredientCategory } from '@/types';

const DB_NAME = 'dishflow.db';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await initializeDatabase(db);
  }
  return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    -- Recipes table
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      source_url TEXT,
      source_type TEXT,
      thumbnail_url TEXT,
      prep_time INTEGER,
      cook_time INTEGER,
      servings INTEGER,
      difficulty TEXT,
      cuisine TEXT,
      tags TEXT,
      notes TEXT,
      is_favorite INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      cooked_count INTEGER DEFAULT 0,
      last_cooked_at TEXT
    );

    -- Ingredients table
    CREATE TABLE IF NOT EXISTS ingredients (
      id TEXT PRIMARY KEY,
      recipe_id TEXT NOT NULL,
      name TEXT NOT NULL,
      amount REAL,
      unit TEXT,
      notes TEXT,
      is_optional INTEGER DEFAULT 0,
      category TEXT,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );

    -- Instructions table
    CREATE TABLE IF NOT EXISTS instructions (
      id TEXT PRIMARY KEY,
      recipe_id TEXT NOT NULL,
      step_number INTEGER NOT NULL,
      text TEXT NOT NULL,
      duration INTEGER,
      image_url TEXT,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );

    -- Pantry items table
    CREATE TABLE IF NOT EXISTS pantry_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity REAL,
      unit TEXT,
      expires_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Shopping items table
    CREATE TABLE IF NOT EXISTS shopping_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity REAL,
      unit TEXT,
      is_checked INTEGER DEFAULT 0,
      recipe_id TEXT,
      recipe_name TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_ingredients_recipe ON ingredients(recipe_id);
    CREATE INDEX IF NOT EXISTS idx_instructions_recipe ON instructions(recipe_id);
    CREATE INDEX IF NOT EXISTS idx_pantry_category ON pantry_items(category);
    CREATE INDEX IF NOT EXISTS idx_shopping_checked ON shopping_items(is_checked);
  `);
}

// Helper to generate unique IDs
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Recipe CRUD Operations
export async function createRecipe(recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'cookedCount'>): Promise<Recipe> {
  const database = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();

  const newRecipe: Recipe = {
    ...recipe,
    id,
    createdAt: now,
    updatedAt: now,
    cookedCount: 0,
    isFavorite: recipe.isFavorite ?? false,
  };

  await database.runAsync(
    `INSERT INTO recipes (id, title, description, source_url, source_type, thumbnail_url, prep_time, cook_time, servings, difficulty, cuisine, tags, notes, is_favorite, created_at, updated_at, cooked_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      newRecipe.title,
      newRecipe.description ?? null,
      newRecipe.sourceUrl ?? null,
      newRecipe.sourceType ?? null,
      newRecipe.thumbnailUrl ?? null,
      newRecipe.prepTime ?? null,
      newRecipe.cookTime ?? null,
      newRecipe.servings ?? null,
      newRecipe.difficulty ?? null,
      newRecipe.cuisine ?? null,
      newRecipe.tags ? JSON.stringify(newRecipe.tags) : null,
      newRecipe.notes ?? null,
      newRecipe.isFavorite ? 1 : 0,
      now,
      now,
      0,
    ]
  );

  // Insert ingredients
  for (let i = 0; i < newRecipe.ingredients.length; i++) {
    const ing = newRecipe.ingredients[i];
    const ingId = generateId();
    await database.runAsync(
      `INSERT INTO ingredients (id, recipe_id, name, amount, unit, notes, is_optional, category, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ingId, id, ing.name, ing.amount ?? null, ing.unit ?? null, ing.notes ?? null, ing.isOptional ? 1 : 0, ing.category ?? null, i]
    );
    newRecipe.ingredients[i] = { ...ing, id: ingId };
  }

  // Insert instructions
  for (const inst of newRecipe.instructions) {
    const instId = generateId();
    await database.runAsync(
      `INSERT INTO instructions (id, recipe_id, step_number, text, duration, image_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [instId, id, inst.stepNumber, inst.text, inst.duration ?? null, inst.imageUrl ?? null]
    );
    inst.id = instId;
  }

  return newRecipe;
}

export async function getAllRecipes(): Promise<Recipe[]> {
  const database = await getDatabase();
  
  const recipeRows = await database.getAllAsync<any>('SELECT * FROM recipes ORDER BY updated_at DESC');
  
  const recipes: Recipe[] = [];
  
  for (const row of recipeRows) {
    const ingredients = await database.getAllAsync<any>(
      'SELECT * FROM ingredients WHERE recipe_id = ? ORDER BY sort_order',
      [row.id]
    );
    
    const instructions = await database.getAllAsync<any>(
      'SELECT * FROM instructions WHERE recipe_id = ? ORDER BY step_number',
      [row.id]
    );
    
    recipes.push({
      id: row.id,
      title: row.title,
      description: row.description,
      sourceUrl: row.source_url,
      sourceType: row.source_type,
      thumbnailUrl: row.thumbnail_url,
      prepTime: row.prep_time,
      cookTime: row.cook_time,
      servings: row.servings,
      difficulty: row.difficulty,
      cuisine: row.cuisine,
      tags: row.tags ? JSON.parse(row.tags) : [],
      notes: row.notes,
      isFavorite: row.is_favorite === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      cookedCount: row.cooked_count,
      lastCookedAt: row.last_cooked_at,
      ingredients: ingredients.map((ing: any) => ({
        id: ing.id,
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        notes: ing.notes,
        isOptional: ing.is_optional === 1,
        category: ing.category as IngredientCategory,
      })),
      instructions: instructions.map((inst: any) => ({
        id: inst.id,
        stepNumber: inst.step_number,
        text: inst.text,
        duration: inst.duration,
        imageUrl: inst.image_url,
      })),
    });
  }
  
  return recipes;
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  const database = await getDatabase();
  
  const row = await database.getFirstAsync<any>('SELECT * FROM recipes WHERE id = ?', [id]);
  if (!row) return null;
  
  const ingredients = await database.getAllAsync<any>(
    'SELECT * FROM ingredients WHERE recipe_id = ? ORDER BY sort_order',
    [id]
  );
  
  const instructions = await database.getAllAsync<any>(
    'SELECT * FROM instructions WHERE recipe_id = ? ORDER BY step_number',
    [id]
  );
  
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    sourceUrl: row.source_url,
    sourceType: row.source_type,
    thumbnailUrl: row.thumbnail_url,
    prepTime: row.prep_time,
    cookTime: row.cook_time,
    servings: row.servings,
    difficulty: row.difficulty,
    cuisine: row.cuisine,
    tags: row.tags ? JSON.parse(row.tags) : [],
    notes: row.notes,
    isFavorite: row.is_favorite === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    cookedCount: row.cooked_count,
    lastCookedAt: row.last_cooked_at,
    ingredients: ingredients.map((ing: any) => ({
      id: ing.id,
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      notes: ing.notes,
      isOptional: ing.is_optional === 1,
      category: ing.category as IngredientCategory,
    })),
    instructions: instructions.map((inst: any) => ({
      id: inst.id,
      stepNumber: inst.step_number,
      text: inst.text,
      duration: inst.duration,
      imageUrl: inst.image_url,
    })),
  };
}

export async function updateRecipe(id: string, updates: Partial<Recipe>): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  
  await database.runAsync(
    `UPDATE recipes SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      source_url = COALESCE(?, source_url),
      prep_time = COALESCE(?, prep_time),
      cook_time = COALESCE(?, cook_time),
      servings = COALESCE(?, servings),
      difficulty = COALESCE(?, difficulty),
      cuisine = COALESCE(?, cuisine),
      tags = COALESCE(?, tags),
      notes = COALESCE(?, notes),
      is_favorite = COALESCE(?, is_favorite),
      updated_at = ?
    WHERE id = ?`,
    [
      updates.title ?? null,
      updates.description ?? null,
      updates.sourceUrl ?? null,
      updates.prepTime ?? null,
      updates.cookTime ?? null,
      updates.servings ?? null,
      updates.difficulty ?? null,
      updates.cuisine ?? null,
      updates.tags ? JSON.stringify(updates.tags) : null,
      updates.notes ?? null,
      updates.isFavorite !== undefined ? (updates.isFavorite ? 1 : 0) : null,
      now,
      id,
    ]
  );
}

export async function deleteRecipe(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM recipes WHERE id = ?', [id]);
}

export async function toggleFavorite(id: string): Promise<boolean> {
  const database = await getDatabase();
  const recipe = await database.getFirstAsync<any>('SELECT is_favorite FROM recipes WHERE id = ?', [id]);
  if (!recipe) return false;
  
  const newValue = recipe.is_favorite === 1 ? 0 : 1;
  await database.runAsync('UPDATE recipes SET is_favorite = ?, updated_at = ? WHERE id = ?', [newValue, new Date().toISOString(), id]);
  return newValue === 1;
}

export async function incrementCookedCount(id: string): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    'UPDATE recipes SET cooked_count = cooked_count + 1, last_cooked_at = ?, updated_at = ? WHERE id = ?',
    [now, now, id]
  );
}

// Pantry CRUD Operations
export async function createPantryItem(item: Omit<PantryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<PantryItem> {
  const database = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  
  await database.runAsync(
    `INSERT INTO pantry_items (id, name, category, quantity, unit, expires_at, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, item.name, item.category, item.quantity ?? null, item.unit ?? null, item.expiresAt ?? null, item.notes ?? null, now, now]
  );
  
  return { ...item, id, createdAt: now, updatedAt: now };
}

export async function getAllPantryItems(): Promise<PantryItem[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>('SELECT * FROM pantry_items ORDER BY category, name');
  
  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    category: row.category as IngredientCategory,
    quantity: row.quantity,
    unit: row.unit,
    expiresAt: row.expires_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function updatePantryItem(id: string, updates: Partial<PantryItem>): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  
  await database.runAsync(
    `UPDATE pantry_items SET
      name = COALESCE(?, name),
      category = COALESCE(?, category),
      quantity = COALESCE(?, quantity),
      unit = COALESCE(?, unit),
      expires_at = COALESCE(?, expires_at),
      notes = COALESCE(?, notes),
      updated_at = ?
    WHERE id = ?`,
    [updates.name ?? null, updates.category ?? null, updates.quantity ?? null, updates.unit ?? null, updates.expiresAt ?? null, updates.notes ?? null, now, id]
  );
}

export async function deletePantryItem(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM pantry_items WHERE id = ?', [id]);
}

// Shopping CRUD Operations
export async function createShoppingItem(item: Omit<ShoppingItem, 'id' | 'createdAt'>): Promise<ShoppingItem> {
  const database = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  
  await database.runAsync(
    `INSERT INTO shopping_items (id, name, category, quantity, unit, is_checked, recipe_id, recipe_name, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, item.name, item.category, item.quantity ?? null, item.unit ?? null, item.isChecked ? 1 : 0, item.recipeId ?? null, item.recipeName ?? null, item.notes ?? null, now]
  );
  
  return { ...item, id, createdAt: now };
}

export async function getAllShoppingItems(): Promise<ShoppingItem[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>('SELECT * FROM shopping_items ORDER BY is_checked, category, name');
  
  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    category: row.category as IngredientCategory,
    quantity: row.quantity,
    unit: row.unit,
    isChecked: row.is_checked === 1,
    recipeId: row.recipe_id,
    recipeName: row.recipe_name,
    notes: row.notes,
    createdAt: row.created_at,
  }));
}

export async function toggleShoppingItem(id: string): Promise<boolean> {
  const database = await getDatabase();
  const item = await database.getFirstAsync<any>('SELECT is_checked FROM shopping_items WHERE id = ?', [id]);
  if (!item) return false;
  
  const newValue = item.is_checked === 1 ? 0 : 1;
  await database.runAsync('UPDATE shopping_items SET is_checked = ? WHERE id = ?', [newValue, id]);
  return newValue === 1;
}

export async function deleteShoppingItem(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM shopping_items WHERE id = ?', [id]);
}

export async function clearCheckedShoppingItems(): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM shopping_items WHERE is_checked = 1');
}

export async function addRecipeToShoppingList(recipe: Recipe): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  
  for (const ing of recipe.ingredients) {
    if (ing.isOptional) continue;
    
    const id = generateId();
    await database.runAsync(
      `INSERT INTO shopping_items (id, name, category, quantity, unit, is_checked, recipe_id, recipe_name, notes, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      [id, ing.name, ing.category ?? 'other', ing.amount ?? null, ing.unit ?? null, recipe.id, recipe.title, ing.notes ?? null, now]
    );
  }
}

// Stats
export async function getStats(): Promise<{ recipes: number; pantryItems: number; cookedCount: number }> {
  const database = await getDatabase();
  
  const recipeCount = await database.getFirstAsync<any>('SELECT COUNT(*) as count FROM recipes');
  const pantryCount = await database.getFirstAsync<any>('SELECT COUNT(*) as count FROM pantry_items');
  const cookedSum = await database.getFirstAsync<any>('SELECT SUM(cooked_count) as total FROM recipes');
  
  return {
    recipes: recipeCount?.count ?? 0,
    pantryItems: pantryCount?.count ?? 0,
    cookedCount: cookedSum?.total ?? 0,
  };
}
