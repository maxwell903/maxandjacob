# app.py
import re
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from datetime import datetime
from sqlalchemy import text
from fuzzywuzzy import fuzz
from sqlalchemy import func


app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Access-Control-Allow-Origin"]
    }
})

app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:RecipePassword123!@localhost/recipe_finder'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)

class Recipe(db.Model):
   id = db.Column(db.Integer, primary_key=True)
   name = db.Column(db.String(100), nullable=False)
   description = db.Column(db.Text)
   instructions = db.Column(db.Text)
   prep_time = db.Column(db.Integer)
   created_date = db.Column(db.DateTime, default=db.func.current_timestamp())


# Add this near the top with other model definitions
class RecipeIngredient3(db.Model):
    __tablename__ = 'recipe_ingredients3'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    recipe_ids = db.Column(db.JSON)


class Ingredient(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id'), nullable=False)
    recipe = db.relationship('Recipe', backref=db.backref('ingredients', lazy=True))

class Menu(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_date = db.Column(db.DateTime, default=db.func.current_timestamp())

class MenuRecipe(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    menu_id = db.Column(db.Integer, db.ForeignKey('menu.id'), nullable=False)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id'), nullable=False)
    menu = db.relationship('Menu', backref=db.backref('menu_recipes', lazy=True))
    recipe = db.relationship('Recipe', backref=db.backref('menu_recipes', lazy=True))

class FridgeItem(db.Model):
    __tablename__ = 'fridge_item'
    __table_args__ = {'extend_existing': True}  # Add this line
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(20))
    price_per = db.Column(db.Float, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'quantity': float(self.quantity) if self.quantity is not None else 0,
            'unit': self.unit,
            'price_per': float(self.price_per) if self.price_per is not None else 0,
            'total': float(self.quantity * self.price_per) if self.quantity is not None and self.price_per is not None else 0
        }


# Add this function to upgrade the database
def upgrade_database():
    upgrade_commands = [
        """
        ALTER TABLE fridge_item
        ADD COLUMN IF NOT EXISTS price_per DECIMAL(10, 2) DEFAULT 0.0;
        """
    ]
    
    conn = db.engine.connect()
    for command in upgrade_commands:
        conn.execute(text(command))
    conn.close()

# Add to your existing models in app.py

class GroceryList(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_date = db.Column(db.DateTime, default=db.func.current_timestamp())

@app.route('/api/grocery-lists/<int:list_id>/add-menu/<int:menu_id>', methods=['POST'])
def add_menu_to_grocery_list(list_id, menu_id):
    try:
        # Get the menu and its recipes
        menu = Menu.query.get_or_404(menu_id)
        menu_recipes = MenuRecipe.query.filter_by(menu_id=menu_id).all()
        
        # Add menu name as header
        grocery_item = GroceryItem(
            name=f"### {menu.name} ###",
            list_id=list_id,
            quantity=0,
            unit='',
            price_per=0,
            total=0
        )
        db.session.add(grocery_item)
        
        # Get current fridge items for comparison
        fridge_items = FridgeItem.query.all()
        
        # Process each recipe in the menu
        for menu_recipe in menu_recipes:
            recipe = Recipe.query.get(menu_recipe.recipe_id)
            if not recipe:
                continue
                
            # Add recipe name as subheader
            recipe_header = GroceryItem(
                name=f"**{recipe.name}**",
                list_id=list_id,
                quantity=0,
                unit='',
                price_per=0,
                total=0
            )
            db.session.add(recipe_header)
            
            # Get recipe ingredients
            ingredients = db.session.query(RecipeIngredient3.name)\
                .filter(text('JSON_CONTAINS(recipe_ids, CAST(:recipe_id AS JSON))'))\
                .params(recipe_id=recipe.id)\
                .all()
            
            # Add each ingredient
            for ingredient in ingredients:
                # Check if ingredient exists in fridge with quantity > 0
                fridge_item = next(
                    (item for item in fridge_items 
                     if item.name.lower() == ingredient[0].lower() and item.quantity > 0),
                    None
                )
                
                grocery_item = GroceryItem(
                    name=f"• {ingredient[0]}" if not fridge_item else f"✓ {ingredient[0]}",
                    list_id=list_id,
                    quantity=0,
                    unit='',
                    price_per=0,
                    total=0
                )
                db.session.add(grocery_item)

                # Ensure ingredient exists in fridge system
                if not any(item.name.lower() == ingredient[0].lower() for item in fridge_items):
                    new_fridge_item = FridgeItem(
                        name=ingredient[0],
                        quantity=0,
                        unit=''
                    )
                    db.session.add(new_fridge_item)
        
        db.session.commit()
        return jsonify({'message': 'Menu added to grocery list successfully'}), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error adding menu to grocery list: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
# Add these new routes above the existing grocery list routes

@app.route('/api/grocery-lists/<int:list_id>', methods=['DELETE'])
def delete_grocery_list(list_id):
    try:
        # Get the list
        grocery_list = GroceryList.query.get_or_404(list_id)
        
        # Delete will cascade to items due to relationship configuration
        db.session.delete(grocery_list)
        db.session.commit()
        
        return jsonify({'message': 'Grocery list deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting grocery list: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/grocery-lists/<int:list_id>/items/<int:item_id>', methods=['DELETE'])
def delete_grocery_item(list_id, item_id):
    try:
        item = GroceryItem.query.get_or_404(item_id)
        
        # Verify the item belongs to the specified list
        if item.list_id != list_id:
            return jsonify({'error': 'Item not found in the specified list'}), 404
            
        db.session.delete(item)
        db.session.commit()
        
        return jsonify({'message': 'Item deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting grocery item: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Update the get_recipe function
@app.route('/api/recipe/<int:recipe_id>')
def get_recipe(recipe_id):
    try:
        recipe = Recipe.query.get_or_404(recipe_id)
        
        # Modified query to get ingredients from new table
        ingredients = db.session.query(RecipeIngredient3.name)\
            .filter(db.text(f'JSON_CONTAINS(recipe_ids, CAST(:recipe_id AS JSON))'))\
            .params(recipe_id=recipe_id)\
            .all()
        
        recipe_data = {
            'id': recipe.id,
            'name': recipe.name,
            'description': recipe.description,
            'instructions': recipe.instructions,
            'prep_time': recipe.prep_time,
            'ingredients': [ingredient[0] for ingredient in ingredients]
        }
        
        return jsonify(recipe_data)
    except Exception as e:
        print(f"Recipe detail error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/home-data')
def home_data():
   try:
       total_recipes = Recipe.query.count()
       latest_recipes = Recipe.query.order_by(Recipe.created_date.desc()).limit(6).all()
       
       latest_recipes_data = [{
           'id': recipe.id,
           'name': recipe.name,
           'description': recipe.description,
           'prep_time': recipe.prep_time,
           'ingredients': [ingredient.name for ingredient in recipe.ingredients]
       } for recipe in latest_recipes]
       
       return jsonify({
           'total_recipes': total_recipes,
           'latest_recipes': latest_recipes_data
       })
   except Exception as e:
       print(f"Error: {str(e)}")
       return jsonify({
           'total_recipes': 0,
           'latest_recipes': []
       })
   
@app.route('/api/all-recipes')
def get_all_recipes():
    print("Hitting all-recipes endpoint") 
    try:
        recipes = Recipe.query.order_by(Recipe.id.asc()).all()
        print(f"Found {len(recipes)} recipes")
        
        recipes_data = []
        for recipe in recipes:
            # Get ingredients using the new recipe_ingredients3 table
            ingredients = db.session.query(RecipeIngredient3.name)\
                .filter(db.text('JSON_CONTAINS(recipe_ids, CAST(:recipe_id AS JSON))'))\
                .params(recipe_id=recipe.id)\
                .all()
            
            recipes_data.append({
                'id': recipe.id,
                'name': recipe.name,
                'description': recipe.description,
                'prep_time': recipe.prep_time,
                'ingredients': [ingredient[0] for ingredient in ingredients]
            })
        
        return jsonify({
            'recipes': recipes_data,
            'count': len(recipes_data)
        })
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            'recipes': [],
            'count': 0
        }), 500


    
@app.route('/api/recipe', methods=['POST'])
def add_recipe():
    try:
        data = request.json
        
        new_recipe = Recipe(
            name=data['name'],
            description=data['description'],
            instructions=data['instructions'],
            prep_time=int(data['prep_time'])
        )
        db.session.add(new_recipe)
        db.session.flush()  # Get the new recipe ID
        
        # Handle ingredients with the new table structure
        for ingredient_name in data['ingredients']:
            # Try to find existing ingredient
            ingredient = RecipeIngredient3.query.filter_by(name=ingredient_name).first()
            
            if ingredient:
                # Update existing ingredient's recipe_ids
                current_ids = ingredient.recipe_ids if ingredient.recipe_ids else []
                if new_recipe.id not in current_ids:
                    current_ids.append(new_recipe.id)
                ingredient.recipe_ids = current_ids
            else:
                # Create new ingredient
                new_ingredient = RecipeIngredient3(
                    name=ingredient_name,
                    recipe_ids=[new_recipe.id]
                )
                db.session.add(new_ingredient)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Recipe added successfully',
            'recipe_id': new_recipe.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error adding recipe: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/menus', methods=['GET'])
def get_menus():
    try:
        menus = Menu.query.all()
        menus_data = [{
            'id': menu.id,
            'name': menu.name,
            'recipe_count': len(menu.menu_recipes)
        } for menu in menus]
        return jsonify({'menus': menus_data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/menus', methods=['POST'])
def create_menu():
    try:
        data = request.json
        new_menu = Menu(name=data['name'])
        db.session.add(new_menu)
        db.session.commit()
        return jsonify({
            'id': new_menu.id,
            'name': new_menu.name
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/menus/<int:menu_id>/recipes', methods=['GET'])
def get_menu_recipes(menu_id):
    try:
        menu = Menu.query.get_or_404(menu_id)
        recipes = [mr.recipe for mr in menu.menu_recipes]
        
        # Modified query to get ingredients from new table
        recipes_data = []
        for recipe in recipes:
            ingredients = db.session.query(RecipeIngredient3.name)\
                .filter(db.text('JSON_CONTAINS(recipe_ids, CAST(:recipe_id AS JSON))'))\
                .params(recipe_id=recipe.id)\
                .all()
            
            recipes_data.append({
                'id': recipe.id,
                'name': recipe.name,
                'description': recipe.description,
                'prep_time': recipe.prep_time,
                'ingredients': [ingredient[0] for ingredient in ingredients]
            })
        
        return jsonify({
            'menu_name': menu.name,
            'recipes': recipes_data
        })
    except Exception as e:
        print(f"Error fetching menu recipes: {str(e)}")  # Add this for debugging
        return jsonify({'error': str(e)}), 500

@app.route('/api/menus/<int:menu_id>/recipes', methods=['POST'])
def add_recipe_to_menu(menu_id):
    try:
        data = request.json
        recipe_id = data['recipe_id']
        
        existing = MenuRecipe.query.filter_by(
            menu_id=menu_id, 
            recipe_id=recipe_id
        ).first()
        
        if existing:
            return jsonify({'message': 'Recipe already in menu'}), 400
            
        menu_recipe = MenuRecipe(menu_id=menu_id, recipe_id=recipe_id)
        db.session.add(menu_recipe)
        db.session.commit()
        return jsonify({'message': 'Recipe added to menu'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/menus/<int:menu_id>', methods=['DELETE', 'OPTIONS'])
def delete_menu(menu_id):
    # Handle preflight request
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    print(f"Attempting to delete menu {menu_id}")  # Debug log
    try:
        # First delete all menu-recipe associations
        MenuRecipe.query.filter_by(menu_id=menu_id).delete()
        
        # Then delete the menu itself
        menu = Menu.query.get_or_404(menu_id)
        db.session.delete(menu)
        db.session.commit()
        
        print(f"Successfully deleted menu {menu_id}")  # Debug log
        return jsonify({'message': 'Menu deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting menu {menu_id}: {str(e)}")  # Debug log
        return jsonify({'error': str(e)}), 500
    



@app.route('/api/menus/<int:menu_id>/recipes/<int:recipe_id>', methods=['DELETE'])
def remove_recipe_from_menu(menu_id, recipe_id):
    try:
        menu_recipe = MenuRecipe.query.filter_by(
            menu_id=menu_id,
            recipe_id=recipe_id
        ).first_or_404()
        
        db.session.delete(menu_recipe)
        db.session.commit()
        return jsonify({'message': 'Recipe removed from menu'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/fridge/add', methods=['POST'])
def add_fridge_item():
    try:
        data = request.json
        
        # Clean the name
        name = data.get('name', '').strip()
        if not name:
            return jsonify({'success': False, 'error': 'Name is required'}), 400
            
        # Remove any formatting markers
        name = re.sub(r'\[(red|green)\]•\s*', '', name)
        
        # Check if item already exists
        existing_item = FridgeItem.query.filter(
            db.func.lower(FridgeItem.name) == db.func.lower(name)
        ).first()
        
        if existing_item:
            # Update existing item
            existing_item.quantity = float(data.get('quantity', existing_item.quantity or 0))
            existing_item.unit = data.get('unit', existing_item.unit)
            existing_item.price_per = float(data.get('price_per', existing_item.price_per or 0))
            db.session.commit()
            return jsonify({
                'success': True,
                'item': existing_item.to_dict()
            })
        
        # Create new item
        new_item = FridgeItem(
            name=name,
            quantity=float(data.get('quantity', 0)),
            unit=data.get('unit', ''),
            price_per=float(data.get('price_per', 0))
        )
        
        db.session.add(new_item)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'item': new_item.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/fridge/parse-receipt', methods=['POST'])
def parse_receipt():
    try:
        data = request.json
        receipt_text = data['receipt_text']
        
        # Split text into lines and process each line
        lines = receipt_text.strip().split('\n')
        
        # Clean and normalize each line
        def clean_line(line):
            # Remove special characters and numbers, convert to lowercase
            cleaned = ''.join(char for char in line if char.isalpha() or char.isspace())
            return ' '.join(cleaned.lower().split())  # Normalize whitespace
            
        cleaned_lines = [clean_line(line) for line in lines if clean_line(line)]  # Remove empty lines
        
        # Get all unique ingredients from both Ingredient and FridgeItem tables
        ingredient_query = db.session.query(Ingredient.name).distinct()
        fridge_query = db.session.query(FridgeItem.name).distinct()
        all_ingredients = ingredient_query.union(fridge_query).all()
        ingredient_names = {i[0].lower() for i in all_ingredients}
        
        matched_items = set()  # Changed to set since we're only tracking existence
        unmatched_items = []  # Track unmatched items
        unmatched_results = []  # Track results of adding unmatched items
        matched_results = []  # Track results of matched items
        
        # Process each line
        for line in cleaned_lines:
            if not line:  # Skip empty lines
                continue
                
            matched = False
            
            # First try exact match
            if line in ingredient_names:
                matched_items.add(line)
                matched = True
                continue
            
            # Try partial matches for multi-word items
            best_match = None
            best_score = 0
            
            for db_ingredient in ingredient_names:
                # Check if ingredient words are contained in the line
                db_words = set(db_ingredient.split())
                line_words = set(line.split())
                
                # Calculate word overlap ratio
                common_words = db_words.intersection(line_words)
                if common_words:
                    overlap_ratio = len(common_words) / max(len(db_words), len(line_words))
                    
                    # Use fuzzy string matching for additional accuracy
                    fuzzy_ratio = fuzz.ratio(db_ingredient, line) / 100
                    
                    # Combined score weighing both word overlap and fuzzy matching
                    score = (overlap_ratio * 0.7) + (fuzzy_ratio * 0.3)
                    
                    if score > best_score and score > 0.6:  # Threshold for matching
                        best_score = score
                        best_match = db_ingredient
            
            if best_match:
                matched_items.add(best_match)
                matched = True
            
            # If no match found and reasonable length (prevent junk entries)
            if not matched and len(line.split()) <= 3:
                # Format the item name properly (capitalize first letter of each word)
                formatted_name = ' '.join(word.capitalize() for word in line.split())
                unmatched_items.append(formatted_name)
                
                # Add or update item in FridgeItem
                existing_item = FridgeItem.query.filter(
                    func.lower(FridgeItem.name) == func.lower(line)
                ).first()
                
                if existing_item:
                    existing_item.quantity += 1  # Increment quantity by 1
                    unmatched_results.append({
                        'ingredient': formatted_name,
                        'action': 'updated',
                        'current_total': existing_item.quantity
                    })
                else:
                    new_item = FridgeItem(
                        name=formatted_name,
                        quantity=1,
                        unit=''
                    )
                    db.session.add(new_item)
                    unmatched_results.append({
                        'ingredient': formatted_name,
                        'action': 'added',
                        'current_total': 1
                    })
        
        # Update database with matched items
        for ingredient in matched_items:
            # Check for existing item (case-insensitive)
            existing_item = FridgeItem.query.filter(
                func.lower(FridgeItem.name) == func.lower(ingredient)
            ).first()
            
            if existing_item:
                existing_item.quantity += 1  # Increment quantity by 1
                matched_results.append({
                    'matched_ingredient': ingredient,
                    'action': 'updated',
                    'current_total': existing_item.quantity
                })
            else:
                fridge_item = FridgeItem(
                    name=ingredient,
                    quantity=1
                )
                db.session.add(fridge_item)
                matched_results.append({
                    'matched_ingredient': ingredient,
                    'action': 'added',
                    'current_total': 1
                })

        db.session.commit()
        
        return jsonify({
            'matched_items': matched_results,
            'unmatched_items': unmatched_items,
            'unmatched_results': unmatched_results,
            'total_matches': len(matched_results)
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error in parse_receipt: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/fridge', methods=['GET'])
def get_fridge_items():
    try:
        items = FridgeItem.query.all()
        return jsonify({
            'success': True,
            'ingredients': [item.to_dict() for item in items]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    


@app.route('/api/grocery-lists', methods=['POST'])
def create_grocery_list():
    try:
        data = request.json
        new_list = GroceryList(name=data['name'])
        db.session.add(new_list)
        db.session.commit()
        
        for item_name in data['items']:
            item = GroceryItem(name=item_name, list_id=new_list.id)
            db.session.add(item)
        
        db.session.commit()
        return jsonify({'message': 'Grocery list created', 'id': new_list.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/fridge/<int:item_id>', methods=['DELETE'])
def delete_fridge_item(item_id):
    try:
        item = FridgeItem.query.get_or_404(item_id)
        db.session.delete(item)
        db.session.commit()
        return jsonify({'message': 'Item deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/fridge/<int:item_id>', methods=['PUT'])
def update_fridge_item(item_id):
    try:
        item = FridgeItem.query.get(item_id)
        if not item:
            return jsonify({
                'success': False,
                'error': 'Item not found'
            }), 404

        data = request.json
        
        # Update fields if provided
        if 'quantity' in data:
            item.quantity = float(data['quantity'])
        if 'unit' in data:
            item.unit = data['unit']
        if 'price_per' in data:
            item.price_per = float(data['price_per'])
            
        db.session.commit()
        
        return jsonify({
            'success': True,
            'item': item.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    


    






    




    

    

    

    
@app.route('/api/search')
def search():
    ingredients = request.args.getlist('ingredient')
    try:
        if ingredients:
            # Create a query that properly handles JSON array of recipe_ids
            subquery = """
                WITH RECURSIVE numbered_ingredients AS (
                    SELECT name, recipe_ids
                    FROM recipe_ingredients3
                    WHERE LOWER(name) REGEXP LOWER(:ingredient_pattern)
                ),
                recipe_matches AS (
                    SELECT DISTINCT 
                        JSON_UNQUOTE(JSON_EXTRACT(r.recipe_ids, CONCAT('$[', numbers.n, ']'))) as recipe_id
                    FROM numbered_ingredients r
                    CROSS JOIN (
                        SELECT a.N + b.N * 10 + c.N * 100 as n
                        FROM (SELECT 0 as N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a
                        CROSS JOIN (SELECT 0 as N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b
                        CROSS JOIN (SELECT 0 as N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) c
                    ) numbers
                    WHERE JSON_UNQUOTE(JSON_EXTRACT(r.recipe_ids, CONCAT('$[', numbers.n, ']'))) IS NOT NULL
                    GROUP BY JSON_UNQUOTE(JSON_EXTRACT(r.recipe_ids, CONCAT('$[', numbers.n, ']')))
                    HAVING COUNT(DISTINCT r.name) >= :ingredient_count
                )
                SELECT r.id, r.name, r.description, r.instructions, r.prep_time
                FROM recipe r
                INNER JOIN recipe_matches rm ON r.id = CAST(rm.recipe_id AS SIGNED)
            """
            
            ingredient_pattern = '|'.join(ingredients)
            
            recipes = db.session.execute(text(subquery), {
                'ingredient_pattern': ingredient_pattern,
                'ingredient_count': len(ingredients)
            }).all()
            
            # Get ingredients for each recipe
            recipes_data = []
            for recipe in recipes:
                # Fetch ingredients using the recipe_ingredients3 table
                ingredients = db.session.query(RecipeIngredient3.name)\
                    .filter(db.text('JSON_CONTAINS(recipe_ids, CAST(:recipe_id AS JSON))'))\
                    .params(recipe_id=recipe.id)\
                    .all()
                
                recipes_data.append({
                    'id': recipe.id,
                    'name': recipe.name,
                    'description': recipe.description,
                    'prep_time': recipe.prep_time,
                    'ingredients': [ingredient[0] for ingredient in ingredients]
                })
            
            return jsonify({
                'results': recipes_data,
                'count': len(recipes_data)
            })
        else:
            return jsonify({
                'results': [],
                'count': 0
            })
    except Exception as e:
        print(f"Search error: {str(e)}")
        return jsonify({
            'error': str(e),
            'results': [],
            'count': 0
        }), 500
    
@app.route('/api/recipe/<int:recipe_id>', methods=['DELETE'])
def delete_recipe(recipe_id):
    try:
        recipe = Recipe.query.get_or_404(recipe_id)
        
        # Delete associated ingredients first
        RecipeIngredient3.query.filter(
            text('JSON_CONTAINS(recipe_ids, CAST(:recipe_id AS JSON))')
        ).params(recipe_id=recipe_id).update(
            {"recipe_ids": text("JSON_REMOVE(recipe_ids, JSON_UNQUOTE(JSON_SEARCH(recipe_ids, 'one', :recipe_id)))")},
            synchronize_session=False
        )
        
        # Delete the recipe from menus
        MenuRecipe.query.filter_by(recipe_id=recipe_id).delete()
        
        # Delete the recipe itself
        db.session.delete(recipe)
        db.session.commit()
        
        return jsonify({'message': 'Recipe deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    
# This should be the ONLY get_grocery_list route in your file
@app.route('/api/grocery-lists/<int:list_id>', methods=['GET'])
def get_grocery_list(list_id):
    try:
        grocery_list = GroceryList.query.get_or_404(list_id)
        items_data = [{
            'id': item.id,
            'name': item.name,
            'list_id': item.list_id,
            'quantity': float(item.quantity) if item.quantity is not None else 0,
            'unit': item.unit or '',
            'price_per': float(item.price_per) if item.price_per is not None else 0,
            'total': float(item.quantity * item.price_per) if item.quantity is not None and item.price_per is not None else 0
        } for item in grocery_list.items]
        
        return jsonify({
            'id': grocery_list.id,
            'name': grocery_list.name,
            'items': items_data
        })
    except Exception as e:
        print(f"Error fetching grocery list: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Other routes that should remain (make sure there's only one of each)
@app.route('/api/grocery-lists', methods=['GET'])
def get_grocery_lists():
    try:
        lists = GroceryList.query.all()
        return jsonify({
            'lists': [{
                'id': list.id,
                'name': list.name,
                'items': [{
                    'id': item.id,
                    'name': item.name,
                    'quantity': float(item.quantity) if item.quantity is not None else 0,
                    'unit': item.unit or '',
                    'price_per': float(item.price_per) if item.price_per is not None else 0,
                    'total': float(item.quantity * item.price_per) if item.quantity is not None and item.price_per is not None else 0
                } for item in list.items]
            } for list in lists]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/grocery-lists/<int:list_id>/items/<int:item_id>', methods=['PUT'])
def update_grocery_item(list_id, item_id):
    try:
        data = request.json
        item = GroceryItem.query.get_or_404(item_id)
        
        if item.list_id != list_id:
            return jsonify({'error': 'Item not found in the specified list'}), 404
        
        if 'quantity' in data:
            item.quantity = float(data['quantity'])
        if 'unit' in data:
            item.unit = data['unit']
        if 'price_per' in data:
            item.price_per = float(data['price_per'])
            
        # Calculate total
        item.total = float(item.quantity or 0) * float(item.price_per or 0)
        
        db.session.commit()
        return jsonify({
            'message': 'Item updated successfully',
            'item': {
                'id': item.id,
                'name': item.name,
                'list_id': item.list_id,
                'quantity': float(item.quantity) if item.quantity is not None else 0,
                'unit': item.unit or '',
                'price_per': float(item.price_per) if item.price_per is not None else 0,
                'total': float(item.total) if item.total is not None else 0
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    


# Find and replace the existing GroceryItem model with this:
class GroceryItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    list_id = db.Column(db.Integer, db.ForeignKey('grocery_list.id'), nullable=False)
    grocery_list = db.relationship('GroceryList', backref=db.backref('items', lazy=True, cascade='all, delete-orphan'))
    quantity = db.Column(db.Float, default=0)
    unit = db.Column(db.String(20))
    price_per = db.Column(db.Float, default=0)
    total = db.Column(db.Float, default=0)

    def calculate_total(self):
        return float(self.quantity or 0) * float(self.price_per or 0)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'list_id': self.list_id,
            'quantity': float(self.quantity) if self.quantity is not None else 0,
            'unit': self.unit or '',
            'price_per': float(self.price_per) if self.price_per is not None else 0,
            'total': float(self.total) if self.total is not None else 0
        }

# Update the add_recipe_to_grocery_list function:
@app.route('/api/grocery-lists/<int:list_id>/add-recipe/<int:recipe_id>', methods=['POST'])
def add_recipe_to_grocery_list(list_id, recipe_id):
    try:
        # Get the recipe
        recipe = Recipe.query.get_or_404(recipe_id)
        
        # Get recipe ingredients
        ingredients = db.session.query(RecipeIngredient3.name)\
            .filter(text('JSON_CONTAINS(recipe_ids, CAST(:recipe_id AS JSON))'))\
            .params(recipe_id=recipe_id)\
            .all()
        
        # First add recipe name as header
        grocery_item = GroceryItem(
            name=f"**{recipe.name}**",
            list_id=list_id,
            quantity=0,
            unit='',
            price_per=0,
            total=0
        )
        db.session.add(grocery_item)
        
        # Get current fridge items for comparison
        fridge_items = FridgeItem.query.all()
        
        # Add each ingredient
        for ingredient in ingredients:
            # Check if ingredient exists in fridge with quantity > 0
            fridge_item = next(
                (item for item in fridge_items 
                 if item.name.lower() == ingredient[0].lower() and item.quantity > 0),
                None
            )
            
            grocery_item = GroceryItem(
                name=f"• {ingredient[0]}" if not fridge_item else f"✓ {ingredient[0]}",
                list_id=list_id,
                quantity=0,
                unit='',
                price_per=0,
                total=0
            )
            db.session.add(grocery_item)

            # Ensure ingredient exists in fridge system
            if not any(item.name.lower() == ingredient[0].lower() for item in fridge_items):
                new_fridge_item = FridgeItem(
                    name=ingredient[0],
                    quantity=0,
                    unit=''
                )
                db.session.add(new_fridge_item)
        
        db.session.commit()
        return jsonify({'message': 'Recipe added to grocery list'}), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error adding recipe to grocery list: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Also update the add_item_to_list function:
@app.route('/api/grocery-lists/<int:list_id>/items', methods=['POST'])
def add_item_to_list(list_id):
    try:
        data = request.json
        if not data or 'name' not in data:
            return jsonify({'error': 'Name is required'}), 400
            
        new_item = GroceryItem(
            name=data['name'],
            list_id=list_id,
            quantity=float(data.get('quantity', 0)),
            unit=data.get('unit', ''),
            price_per=float(data.get('price_per', 0))
        )
        new_item.total = new_item.calculate_total()
        
        db.session.add(new_item)
        db.session.commit()
        
        return jsonify({
            'message': 'Item added successfully',
            'item': new_item.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error adding item to list: {str(e)}")
        return jsonify({'error': str(e)}), 500

     
def upgrade_database():
    # SQL for PostgreSQL
    upgrade_commands = [
        """
        ALTER TABLE fridge
        ADD COLUMN IF NOT EXISTS price_per DECIMAL(10, 2) DEFAULT 0.0;
        """,
        """
        -- Optional: Add a computed total column
        ALTER TABLE fridge
        ADD COLUMN IF NOT EXISTS total DECIMAL(10, 2) 
        GENERATED ALWAYS AS (quantity * price_per) STORED;
        """
    ]
    
    conn = db.engine.connect()
    for command in upgrade_commands:
        conn.execute(text(command))
    conn.close()
     
if __name__ == '__main__':
   with app.app_context():
       db.create_all()
   app.run(debug=True, port=5000)