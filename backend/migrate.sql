BEGIN;

-- Step 1: Create temporary table to store existing relationships
CREATE TABLE IF NOT EXISTS temp_recipe_ingredients AS
SELECT r.id as recipe_id, ri.name as ingredient_name
FROM recipe r
JOIN recipe_ingredient ri ON r.id = ri.recipe_id;

-- Step 2: Drop existing table
DROP TABLE IF EXISTS recipe_ingredient;

-- Step 3: Create new recipe_ingredient table
CREATE TABLE recipe_ingredient (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipe(id) ON DELETE CASCADE,
    INDEX recipe_ingredient_idx (recipe_id, name)
);

-- Step 4: Restore data
INSERT INTO recipe_ingredient (recipe_id, name)
SELECT recipe_id, ingredient_name 
FROM temp_recipe_ingredients;

-- Step 5: Clean up
DROP TABLE temp_recipe_ingredients;

COMMIT;