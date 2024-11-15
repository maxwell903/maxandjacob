# app.py
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

app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql://root:RecipePassword123!@localhost/recipe_finder'
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
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit = db.Column(db.String(20))

# Add to your existing models in app.py

class GroceryList(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_date = db.Column(db.DateTime, default=db.func.current_timestamp())

class GroceryItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    list_id = db.Column(db.Integer, db.ForeignKey('grocery_list.id'), nullable=False)
    grocery_list = db.relationship('GroceryList', backref=db.backref('items', lazy=True))

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
        
        # Check if item already exists
        existing_item = FridgeItem.query.filter(
            func.lower(FridgeItem.name) == func.lower(data['name'])
        ).first()
        
        if existing_item:
            # Update existing item's quantity
            existing_item.quantity += int(data['quantity'])
            if 'unit' in data and data['unit']:
                existing_item.unit = data['unit']
            db.session.commit()
            return jsonify({
                'message': 'Item quantity updated',
                'id': existing_item.id,
                'name': existing_item.name,
                'quantity': existing_item.quantity,
                'unit': existing_item.unit
            }), 200
        else:
            # Create new item
            new_item = FridgeItem(
                name=data['name'],
                quantity=data['quantity'], 
                unit=data['unit'] if 'unit' in data else None
            )
            db.session.add(new_item)
            db.session.commit()
            return jsonify({
                'message': 'Item added to fridge',
                'id': new_item.id,
                'name': new_item.name,
                'quantity': new_item.quantity,
                'unit': new_item.unit
            }), 201
            
    except Exception as e:
        db.session.rollback()
        print(f"Error in add_fridge_item: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/fridge/parse-receipt', methods=['POST'])
def parse_receipt():
    try:
        data = request.json
        receipt_text = data['receipt_text'].lower()
        words = ' '.join(receipt_text.split('\n')).split()
        matched_items = {}
        unmatched_items = set()

        # Get all unique ingredients from database for matching
        ingredients = db.session.query(Ingredient.name).distinct().all()
        ingredient_names = {i[0].lower() for i in ingredients}
        
        # First pass: find exact matches
        for word in words:
            if word in ingredient_names:
                matched_items[word] = matched_items.get(word, 0) + 1
            else:
                unmatched_items.add(word)

        # Second pass: check for partial matches in remaining unmatched items
        for word in list(unmatched_items):
            for ing_name in ingredient_names:
                if ing_name in word:
                    matched_items[ing_name] = matched_items.get(ing_name, 0) + 1
                    unmatched_items.remove(word)
                    break

        # Update database with matches
        results = []
        for ingredient, quantity in matched_items.items():
            # Check for existing item (case-insensitive)
            existing_item = FridgeItem.query.filter(
                func.lower(FridgeItem.name) == func.lower(ingredient)
            ).first()
            
            if existing_item:
                # Update existing item
                existing_item.quantity += quantity
                results.append({
                    'matched_ingredient': ingredient,
                    'quantity': quantity,
                    'action': 'updated',
                    'current_total': existing_item.quantity
                })
            else:
                # Add new item
                fridge_item = FridgeItem(
                    name=ingredient,
                    quantity=quantity
                )
                db.session.add(fridge_item)
                results.append({
                    'matched_ingredient': ingredient,
                    'quantity': quantity,
                    'action': 'added',
                    'current_total': quantity
                })

        db.session.commit()
        return jsonify({
            'matched_items': results,
            'unmatched_items': list(unmatched_items),
            'total_matches': len(results)
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error in parse_receipt: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/fridge')
def get_fridge_items():
    try:
        items = FridgeItem.query.all()
        return jsonify({
            'ingredients': [{
                'id': item.id,
                'name': item.name,
                'quantity': item.quantity,
                'unit': item.unit
            } for item in items]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
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
                    'name': item.name
                } for item in list.items]
            } for list in lists]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
        item = FridgeItem.query.get_or_404(item_id)
        data = request.json
        if 'quantity' in data:
            item.quantity = data['quantity']
        if 'unit' in data:
            item.unit = data['unit']
        db.session.commit()
        return jsonify({
            'id': item.id,
            'name': item.name,
            'quantity': item.quantity,
            'unit': item.unit
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/grocery-lists/<int:list_id>', methods=['PUT'])
def update_grocery_list(list_id):
    try:
        data = request.json
        grocery_list = GroceryList.query.get_or_404(list_id)
        grocery_list.name = data['name']
        db.session.commit()
        return jsonify({'message': 'Grocery list updated'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/grocery-lists/<int:list_id>', methods=['DELETE'])
def delete_grocery_list(list_id):
    try:
        # First delete all items associated with the list
        GroceryItem.query.filter_by(list_id=list_id).delete()
        
        # Then delete the list itself
        grocery_list = GroceryList.query.get_or_404(list_id)
        db.session.delete(grocery_list)
        db.session.commit()
        
        return jsonify({'message': 'Grocery list deleted'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting grocery list: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/grocery-lists/<int:list_id>/items', methods=['POST'])
def add_grocery_item(list_id):
    try:
        data = request.json
        new_item = GroceryItem(name=data['name'], list_id=list_id)
        db.session.add(new_item)
        db.session.commit()
        return jsonify({'message': 'Grocery item added'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/grocery-lists/<int:list_id>/items/<int:item_id>', methods=['PUT'])
def update_grocery_item(list_id, item_id):
    try:
        data = request.json
        item = GroceryItem.query.get_or_404(item_id)
        if item.list_id != list_id:
            return jsonify({'error': 'Item not found in the specified list'}), 404
        item.name = data['name']
        db.session.commit()
        return jsonify({'message': 'Grocery item updated'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


    
    # In app.py - make sure this route exists
@app.route('/api/fridge/<int:item_id>/zero', methods=['PUT'])
def zero_fridge_item(item_id):
    print(f"Received request to zero item {item_id}")  # Debug log
    try:
        item = FridgeItem.query.get_or_404(item_id)
        item.quantity = 0
        db.session.commit()
        print(f"Successfully zeroed item {item_id}")  # Debug log
        return jsonify({
            'id': item.id,
            'name': item.name,
            'quantity': item.quantity,
            'unit': item.unit
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error zeroing item {item_id}: {str(e)}")  # Debug log
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/grocery-lists/<int:list_id>/items', methods=['POST'])
def add_item_to_list(list_id):
    try:
        data = request.json
        new_item = GroceryItem(
            name=data['name'],
            list_id=list_id
        )
        db.session.add(new_item)
        db.session.commit()
        return jsonify({'message': 'Item added successfully', 'id': new_item.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/grocery-lists/<int:list_id>/items/<int:item_id>', methods=['DELETE'])
def delete_grocery_item(list_id, item_id):
    try:
        item = GroceryItem.query.get_or_404(item_id)
        if item.list_id != list_id:
            return jsonify({'error': 'Item not found in the specified list'}), 404
            
        db.session.delete(item)
        db.session.commit()
        return jsonify({'message': 'Grocery item deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/grocery-lists/<int:list_id>/items/batch-delete', methods=['POST'])
def batch_delete_grocery_items(list_id):
    try:
        data = request.json
        item_ids = data.get('item_ids', [])
        
        # Delete all specified items
        deleted_count = 0
        for item_id in item_ids:
            item = GroceryItem.query.get(item_id)
            if item and item.list_id == list_id:
                db.session.delete(item)
                deleted_count += 1
        
        db.session.commit()
        return jsonify({
            'message': f'Successfully deleted {deleted_count} items',
            'deleted_count': deleted_count
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error in batch delete: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
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
    

if __name__ == '__main__':
   with app.app_context():
       db.create_all()
   app.run(debug=True, port=5000)