CREATE TABLE meal_plans (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start  DATE NOT NULL,
    title       VARCHAR(100),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, week_start)
);

CREATE TABLE meal_plan_entries (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id     UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
    recipe_id   UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    day_index   SMALLINT NOT NULL CHECK (day_index BETWEEN 0 AND 6),
    meal_type   VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
    sort_order  SMALLINT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (plan_id, day_index, meal_type, recipe_id)
);

CREATE INDEX idx_meal_plans_user ON meal_plans(user_id);
CREATE INDEX idx_meal_plan_entries_plan ON meal_plan_entries(plan_id);
