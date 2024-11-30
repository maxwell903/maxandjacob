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
from receipt_parser import parse_receipt  # Add at top with other imports


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
   ingredients = db.relationship(
        'Ingredient',
        secondary='recipe_ingredient_quantities',
        backref=db.backref('recipes', lazy=True)
    )

class RecipeIngredientQuantity(db.Model):
    __tablename__ = 'recipe_ingredient_quantities'
    id = db.Column(db.Integer, primary_key=True)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id', ondelete='CASCADE'), nullable=False)
    ingredient_id = db.Column(db.Integer, db.ForeignKey('ingredients.id', ondelete='CASCADE'), nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(20))
    
    recipe = db.relationship('Recipe', backref=db.backref('ingredient_quantities', lazy=True))
    ingredient = db.relationship('Ingredient', backref=db.backref('recipe_quantities', lazy=True))


# Add this near the top with other model definitions
class RecipeIngredient3(db.Model):
    __tablename__ = 'recipe_ingredients3'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    recipe_ids = db.Column(db.JSON)

class RecipeIngredientNutrition(db.Model):
    __tablename__ = 'recipe_ingredient_nutrition'
    
    id = db.Column(db.Integer, primary_key=True)
    recipe_ingredient_quantities_id = db.Column(db.Integer, db.ForeignKey('recipe_ingredient_quantities.id', ondelete='CASCADE'), nullable=False)
    protein_grams = db.Column(db.Float, nullable=True)
    fat_grams = db.Column(db.Float, nullable=True)
    carbs_grams = db.Column(db.Float, nullable=True)
    serving_size = db.Column(db.Float, nullable=True)
    serving_unit = db.Column(db.String(20), nullable=True)
    
    # Add relationship to RecipeIngredientQuantity
    recipe_ingredient = db.relationship('RecipeIngredientQuantity', backref=db.backref('nutrition', uselist=False, cascade='all, delete-orphan'))


class Ingredient(db.Model):
    __tablename__ = 'ingredients'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)

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

class RecipeIngredientDetails(db.Model):
    __tablename__ = 'recipe_ingredient_details'
    id = db.Column(db.Integer, primary_key=True)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id', ondelete='CASCADE'), nullable=False)
    ingredient_name = db.Column(db.String(100), db.ForeignKey('recipe_ingredients3.name'), nullable=False)
    quantity = db.Column(db.Float, nullable=False, default=0)
    unit = db.Column(db.String(20))
    
    recipe = db.relationship('Recipe', backref=db.backref('ingredient_details', lazy=True, cascade='all, delete-orphan'))
    ingredient = db.relationship('RecipeIngredient3', backref=db.backref('recipe_details', lazy=True))

class ReceiptParser:
    # Expanded common unit variations
    UNITS = {
        'weight': {
            'oz': ['oz', 'oz.', 'ounce', 'ounces'],
            'lb': ['lb', 'lb.', 'lbs', 'lbs.', 'pound', 'pounds'],
            'g': ['g', 'g.', 'gram', 'grams'],
            'kg': ['kg', 'kg.', 'kilo', 'kilos', 'kilogram', 'kilograms']
        },
        'volume': {
            'ml': ['ml', 'ml.', 'milliliter', 'milliliters'],
            'l': ['l', 'l.', 'liter', 'liters'],
            'gal': ['gal', 'gal.', 'gallon', 'gallons'],
            'qt': ['qt', 'qt.', 'quart', 'quarts'],
            'pt': ['pt', 'pt.', 'pint', 'pints'],
            'fl oz': ['fl oz', 'fl.oz', 'fluid ounce', 'fluid ounces']
        },
        'packaging': {
            'pack': ['pack', 'pk', 'package'],
            'box': ['box', 'bx', 'boxes'],
            'bag': ['bag', 'bg', 'bags'],
            'case': ['case', 'cs', 'cases'],
            'bunch': ['bunch', 'bn', 'bunches'],
            'container': ['container', 'cont', 'containers'],
            'jar': ['jar', 'jr', 'jars'],
            'can': ['can', 'cn', 'cans']
        }
    }

    @classmethod
    def normalize_unit(cls, unit_text):
        """Convert various unit formats to standard form"""
        unit_text = unit_text.lower().strip()
        for category in cls.UNITS.values():
            for standard, variations in category.items():
                if unit_text in variations:
                    return standard
        return unit_text

    @classmethod
    def extract_price(cls, text):
        """Extract price from text using regex"""
        import re
        # Match common price patterns
        price_patterns = [
            r'\$\s*(\d+\.?\d*)',  # $12.99
            r'(\d+\.?\d*)\s*\$',  # 12.99$
            r'(\d+\.\d{2})',      # Just numbers with cents
            r'(\d+)'             # Just numbers (assume dollars)
        ]
        
        for pattern in price_patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    continue
        return None

    @classmethod
    def extract_quantity(cls, text):
        """Extract quantity from text"""
        import re
        # Match quantity patterns
        qty_patterns = [
            r'(\d+\.?\d*)\s*x',   # 2x or 2.5x
            r'x\s*(\d+\.?\d*)',   # x2 or x2.5
            r'^(\d+\.?\d*)\s',    # Starting with number
            r'(\d+\.?\d*)\s*(?:' + '|'.join(sum([var for var in cls.UNITS.values()], [])) + ')'  # Number before unit
        ]
        
        for pattern in qty_patterns:
            match = re.search(pattern, text.lower())
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    continue
        return 1.0  # Default quantity if none found

    @classmethod
    def parse_receipt_line(cls, line, known_items):
        """Parse a single line of receipt text"""
        # Remove special characters except $, ., and basic punctuation
        clean_line = re.sub(r'[^a-zA-Z0-9\s$.,]', '', line)
        
        # Extract item name, quantity, and price
        item_name_match = re.search(r'(.*?)\s+(\d+\.?\d*)\s*(\$\s*\d+\.?\d*)', clean_line)
        if item_name_match:
            item_name = item_name_match.group(1).strip()
            quantity = float(item_name_match.group(2))
            price = float(item_name_match.group(3).replace('$', '').strip())
            total = quantity * price
        else:
            return None
        
        # Try to match with known items
        best_match = None
        best_score = 0
        
        for known_item in known_items:
            score = fuzz.ratio(item_name.lower(), known_item.lower())
            if score > best_score and score > 80:  # 80% threshold for matching
                best_score = score
                best_match = known_item
        
        # Extract unit
        found_unit = None
        for category in cls.UNITS.values():
            for standard, variations in category.items():
                if any(var in item_name.lower() for var in variations):
                    found_unit = standard
                    break
            if found_unit:
                break
        
        return {
            'item_name': best_match if best_match else item_name,
            'quantity': quantity,
            'unit': found_unit,
            'price': price,
            'total': total,
            'matched': bool(best_match),
            'match_score': best_score if best_match else 0
        }

    @classmethod
    def parse_receipt(cls, receipt_text, known_items):
        """Parse full receipt text and return structured data"""
        lines = receipt_text.strip().split('\n')
        parsed_items = []
        unmatched_items = []
        subtotal = 0
        
        for line in lines:
            if not line.strip():
                continue
                
            result = cls.parse_receipt_line(line, known_items)
            if result:
                if result['matched']:
                    parsed_items.append(result)
                    subtotal += result['total']
                else:
                    unmatched_items.append(result)
        
        return {
            'matched_items': parsed_items,
            'unmatched_items': unmatched_items,
            'subtotal': subtotal
        }
    
@app.route('/api/grocery-bill/parse-receipt', methods=['POST'])
def parse_grocery_receipt():
   try:
       data = request.json
       receipt_text = data.get('receipt_text')
        
       if not receipt_text:
           return jsonify({'error': 'Receipt text is required'}), 400
        
       # Get all grocery lists and their items
       grocery_lists = GroceryList.query.all()
       lists_items = {}
       for grocery_list in grocery_lists:
           # Remove special characters from item names
           clean_items = [re.sub(r'[^a-zA-Z0-9\s]', '', item.name.lower())
                         for item in grocery_list.items]
           lists_items[grocery_list.name] = clean_items
        
       # Parse receipt lines
       lines = receipt_text.strip().split('\n')
       grouped_items = {list_name: [] for list_name in lists_items.keys()}
       unmatched_items = []
        
       for line in lines:
           parsed_item = ReceiptParser.parse_receipt_line(line, [])
           if not parsed_item:
               continue

           # Clean the parsed item name
           clean_name = re.sub(r'[^a-zA-Z0-9\s]', '', parsed_item['item_name'].lower())
           
           # Try to match with items in grocery lists
           best_match = None
           best_score = 0
           matched_list = None

           for list_name, items in lists_items.items():
               for item in items:
                   score = fuzz.token_set_ratio(clean_name, item)
                   if score > best_score and score > 85:  # Increased threshold for better accuracy
                       best_score = score
                       best_match = item
                       matched_list = list_name

           if matched_list:
               parsed_item['original_name'] = best_match
               grouped_items[matched_list].append(parsed_item)
           else:
               unmatched_items.append(parsed_item)
        
       return jsonify({
           'grouped_items': grouped_items,
           'unmatched_items': unmatched_items
       })
        
   except Exception as e:
       print(f"Error parsing receipt: {str(e)}")
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


@app.route('/api/recipe/<int:recipe_id>')
def get_recipe(recipe_id):
    try:
        recipe = Recipe.query.get_or_404(recipe_id)
        
        # Get ingredients with quantities and nutrition info
        ingredient_quantities = RecipeIngredientQuantity.query\
            .filter_by(recipe_id=recipe_id)\
            .outerjoin(RecipeIngredientNutrition)\
            .all()
        
        ingredient_data = []
        for qty in ingredient_quantities:
            ingredient_info = {
                'name': qty.ingredient.name,
                'quantity': qty.quantity,
                'unit': qty.unit,
                'nutrition': None
            }
            
            # Add nutrition info if available
            if hasattr(qty, 'nutrition') and qty.nutrition:
                ingredient_info['nutrition'] = {
                    'protein_grams': qty.nutrition.protein_grams,
                    'fat_grams': qty.nutrition.fat_grams,
                    'carbs_grams': qty.nutrition.carbs_grams,
                    'serving_size': qty.nutrition.serving_size,
                    'serving_unit': qty.nutrition.serving_unit
                }
            
            ingredient_data.append(ingredient_info)
        
        recipe_data = {
            'id': recipe.id,
            'name': recipe.name,
            'description': recipe.description,
            'instructions': recipe.instructions,
            'prep_time': recipe.prep_time,
            'ingredients': ingredient_data
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


# In app.py

@app.route('/api/recipe', methods=['POST'])
def add_recipe():
    try:
        data = request.json
        
        # Create the recipe
        new_recipe = Recipe(
            name=data['name'],
            description=data['description'],
            instructions=data['instructions'],
            prep_time=int(data['prep_time'])
        )
        db.session.add(new_recipe)
        db.session.flush()  # Get the recipe ID while keeping transaction open
        
        # Process each ingredient and its nutrition data
        for ingredient_data in data['ingredients']:
            # Get or create ingredient
            ingredient = Ingredient.query.filter_by(name=ingredient_data['name']).first()
            if not ingredient:
                ingredient = Ingredient(name=ingredient_data['name'])
                db.session.add(ingredient)
                db.session.flush()
            
            # Create quantity association
            quantity = RecipeIngredientQuantity(
                recipe_id=new_recipe.id,
                ingredient_id=ingredient.id,
                quantity=float(ingredient_data['quantity']),
                unit=ingredient_data['unit']
            )
            db.session.add(quantity)
            db.session.flush()
            
            # Add nutrition data if provided
            if ingredient_data.get('nutritionData'):
                nutrition = RecipeIngredientNutrition(
                    recipe_ingredient_quantities_id=quantity.id,
                    protein_grams=ingredient_data['nutritionData'].get('protein_grams'),
                    fat_grams=ingredient_data['nutritionData'].get('fat_grams'),
                    carbs_grams=ingredient_data['nutritionData'].get('carbs_grams'),
                    serving_size=ingredient_data['nutritionData'].get('serving_size'),
                    serving_unit=ingredient_data['nutritionData'].get('serving_unit')
                )
                db.session.add(nutrition)
        
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
        
        recipes_data = []
        for recipe in recipes:
            # Get ingredient details from recipe_ingredient_details table
            ingredient_details = RecipeIngredientDetails.query.filter_by(recipe_id=recipe.id).all()
            
            recipes_data.append({
                'id': recipe.id,
                'name': recipe.name,
                'description': recipe.description,
                'prep_time': recipe.prep_time,
                'ingredients': [
                    {
                        'name': detail.ingredient_name,
                        'quantity': detail.quantity,
                        'unit': detail.unit
                    }
                    for detail in ingredient_details
                ]
            })
        
        return jsonify({
            'menu_name': menu.name,
            'recipes': recipes_data
        })
    except Exception as e:
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
        
        matched_items, unmatched_items = parse_receipt(receipt_text)
        
        # Update database with matched items
        for ingredient in matched_items:
            fridge_item = FridgeItem.query.filter_by(name=ingredient).first()
            
            if fridge_item:
                fridge_item.quantity += 1  # Increment quantity by 1
            else:
                fridge_item = FridgeItem(
                    name=ingredient,
                    quantity=1
                )
                db.session.add(fridge_item)

        db.session.commit()
        
        return jsonify({
            'matched_items': list(matched_items),
            'unmatched_items': unmatched_items,
            'total_matches': len(matched_items)
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
    



@app.route('/api/fridge/clear', methods=['POST'])
def clear_fridge():
    try:
        # Set all quantities to 0
        FridgeItem.query.update({FridgeItem.quantity: 0})
        db.session.commit()
        return jsonify({'message': 'All fridge items cleared'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/fridge/delete-all', methods=['DELETE'])
def delete_all_fridge_items():
    try:
        FridgeItem.query.delete()
        db.session.commit()
        return jsonify({'message': 'All fridge items deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/fridge/clear', methods=['POST'])
def clear_fridge_items():
    try:
        # Update all items to have quantity 0
        FridgeItem.query.update({FridgeItem.quantity: 0})
        db.session.commit()
        return jsonify({'message': 'All fridge quantities cleared'}), 200
    except Exception as e:
        db.session.rollback()
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
    
@app.route('/api/recipe/<int:recipe_id>', methods=['DELETE'])
def delete_recipe(recipe_id):
    try:
        recipe = Recipe.query.get_or_404(recipe_id)
        
        # Delete associated ingredients in RecipeIngredient3 table
        RecipeIngredient3.query.filter(
            text('JSON_CONTAINS(recipe_ids, CAST(:recipe_id AS JSON))')
        ).params(recipe_id=recipe_id).update(
            {"recipe_ids": text("JSON_REMOVE(recipe_ids, JSON_UNQUOTE(JSON_SEARCH(recipe_ids, 'one', :recipe_id)))")},
            synchronize_session=False
        )
        
        # Delete associated records in RecipeIngredientDetails table
        RecipeIngredientDetails.query.filter_by(recipe_id=recipe_id).delete()
        
        # Delete associated records in RecipeIngredientQuantity table
        RecipeIngredientQuantity.query.filter_by(recipe_id=recipe_id).delete()
        
        # Delete associated records in RecipeIngredientNutrition table
        nutrition_subquery = db.session.query(RecipeIngredientNutrition.id).join(RecipeIngredientQuantity).filter(
            RecipeIngredientQuantity.recipe_id == recipe_id
        ).subquery()

        RecipeIngredientNutrition.query.filter(RecipeIngredientNutrition.id.in_(nutrition_subquery)).delete(synchronize_session=False)
        
        # Delete the recipe from menus
        MenuRecipe.query.filter_by(recipe_id=recipe_id).delete()
        
        # Delete the recipe itself
        db.session.delete(recipe)
        db.session.commit()
        
        return jsonify({'message': 'Recipe deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting recipe: {str(e)}")  # Add this line for logging
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
        recipe = Recipe.query.get_or_404(recipe_id)
        
        # Get recipe ingredients from recipe_ingredient_details table
        ingredient_details = RecipeIngredientDetails.query.filter_by(recipe_id=recipe_id).all()
        
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
        for detail in ingredient_details:
            # Check if ingredient exists in fridge with quantity > 0
            fridge_item = next(
                (item for item in fridge_items 
                 if item.name.lower() == detail.ingredient_name.lower() and item.quantity > 0),
                None
            )
            
            grocery_item = GroceryItem(
                name=f"• {detail.ingredient_name}" if not fridge_item else f"✓ {detail.ingredient_name}",
                list_id=list_id,
                quantity=detail.quantity,
                unit=detail.unit,
                price_per=0,
                total=0
            )
            db.session.add(grocery_item)

            # Ensure ingredient exists in fridge system
            if not any(item.name.lower() == detail.ingredient_name.lower() for item in fridge_items):
                new_fridge_item = FridgeItem(
                    name=detail.ingredient_name,
                    quantity=0,
                    unit=detail.unit
                )
                db.session.add(new_fridge_item)
        
        db.session.commit()
        return jsonify({'message': 'Recipe added to grocery list'}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/grocery-lists/<int:list_id>/add-menu/<int:menu_id>', methods=['POST'])
def add_menu_to_grocery_list(list_id, menu_id):
    try:
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
            
            # Get recipe ingredients from recipe_ingredient_details table
            ingredient_details = RecipeIngredientDetails.query.filter_by(recipe_id=recipe.id).all()
            
            # Add each ingredient
            for detail in ingredient_details:
                # Check if ingredient exists in fridge with quantity > 0
                fridge_item = next(
                    (item for item in fridge_items 
                     if item.name.lower() == detail.ingredient_name.lower() and item.quantity > 0),
                    None
                )
                
                grocery_item = GroceryItem(
                    name=f"• {detail.ingredient_name}" if not fridge_item else f"✓ {detail.ingredient_name}",
                    list_id=list_id,
                    quantity=detail.quantity,
                    unit=detail.unit,
                    price_per=0,
                    total=0
                )
                db.session.add(grocery_item)

                # Ensure ingredient exists in fridge system
                if not any(item.name.lower() == detail.ingredient_name.lower() for item in fridge_items):
                    new_fridge_item = FridgeItem(
                        name=detail.ingredient_name,
                        quantity=0,
                        unit=detail.unit  
                    )
                    db.session.add(new_fridge_item)
        
        db.session.commit()
        return jsonify({'message': 'Menu added to grocery list successfully'}), 201
        
    except Exception as e:
        db.session.rollback()
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
    
@app.route('/api/import-to-fridge', methods=['POST'])
def import_to_fridge():
    try:
        data = request.json
        items = data.get('items', [])
         
        for item in items:
             # Check if item already exists
            existing_item = FridgeItem.query.filter(
                func.lower(FridgeItem.name) == func.lower(item['item_name'])
            ).first()
             
            if existing_item:
                existing_item.quantity = existing_item.quantity + float(item['quantity'])
                existing_item.unit = item.get('unit', '')
                existing_item.price_per = float(item['price']) if 'price' in item else 0
            else:
                new_item = FridgeItem(
                    name=item['item_name'],
                    quantity=float(item['quantity']),
                    unit=item.get('unit', ''),
                    price_per=float(item['price']) if 'price' in item else 0
                )
                db.session.add(new_item)
         
        db.session.commit()
        return jsonify({'message': 'Items imported successfully'}), 200
         
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
 
@app.route('/api/import-to-grocery-list', methods=['POST'])
def import_to_grocery_list():
    try:
        data = request.json
        name = data.get('name')
        items = data.get('items', [])
         
        if not name:
            return jsonify({'error': 'List name is required'}), 400
             
        new_list = GroceryList(name=name)
        db.session.add(new_list)
        db.session.flush()
         
        for item in items:
            grocery_item = GroceryItem(
                name=item['item_name'],
                list_id=new_list.id,
                quantity=float(item['quantity']),
                unit=item.get('unit', ''),
                price_per=float(item['price']) if 'price' in item else 0,
                total=float(item['quantity']) * float(item['price']) if 'price' in item else 0
            )
            db.session.add(grocery_item)
             
        db.session.commit()
        return jsonify({'message': 'Grocery list created successfully', 'id': new_list.id}), 201
         
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    

@app.route('/api/recipe-ingredient-details', methods=['POST'])
def add_recipe_ingredient_details():
    try:
        data = request.json
        # Validate required fields
        required_fields = ['recipe_id', 'ingredient_name', 'quantity']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        # Create the recipe ingredient details
        cursor = db.cursor()
        cursor.execute(
            """
            INSERT INTO recipe_ingredient_details 
            (recipe_id, ingredient_name, quantity, unit)
            VALUES (%s, %s, %s, %s)
            """,
            (data['recipe_id'], data['ingredient_name'], 
             data['quantity'], data.get('unit', ''))
        )
        db.commit()
        return jsonify({'message': 'Recipe ingredient details added successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/recipe/<int:recipe_id>/ingredients', methods=['GET'])
def get_recipe_ingredients(recipe_id):
    try:
        cursor = db.cursor()
        cursor.execute(
            """
            SELECT ri.ingredient_name, ri.quantity, ri.unit
            FROM recipe_ingredient_details ri
            WHERE ri.recipe_id = %s
            """,
            (recipe_id,)
        )
        ingredients = [
            {
                'name': row[0],
                'quantity': float(row[1]),
                'unit': row[2]
            }
            for row in cursor.fetchall()
        ]
        return jsonify({'ingredients': ingredients})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/recipe/<int:recipe_id>/ingredients/<int:ingredient_index>/nutrition', methods=['POST'])
def add_ingredient_nutrition(recipe_id, ingredient_index):
    try:
        data = request.json
        print(f"Received nutrition data: {data}")  # Debug log
        
        # Get the recipe ingredient quantity record by index
        quantity_records = RecipeIngredientQuantity.query.filter_by(recipe_id=recipe_id).all()
        
        if ingredient_index >= len(quantity_records):
            print(f"Invalid index: {ingredient_index}, total records: {len(quantity_records)}")
            return jsonify({'error': 'Invalid ingredient index'}), 400
            
        quantity_record = quantity_records[ingredient_index]
        print(f"Found quantity record: {quantity_record.id}")

        # First delete any existing nutrition record
        RecipeIngredientNutrition.query.filter_by(
            recipe_ingredient_quantities_id=quantity_record.id
        ).delete()
        
        # Create new nutrition record
        nutrition = RecipeIngredientNutrition(
            recipe_ingredient_quantities_id=quantity_record.id,
            protein_grams=data.get('protein_grams', 0),
            fat_grams=data.get('fat_grams', 0),
            carbs_grams=data.get('carbs_grams', 0),
            serving_size=data.get('serving_size', 0),
            serving_unit=data.get('serving_unit', '')
        )
        
        db.session.add(nutrition)
        db.session.commit()
        
        print("Successfully saved nutrition data")
        return jsonify({'message': 'Nutrition info added successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error adding nutrition info: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/recipe/<int:recipe_id>/nutrition', methods=['GET'])
def get_recipe_nutrition(recipe_id):
    try:
        with db.engine.connect() as connection:
            result = connection.execute(text("""
                SELECT * FROM recipe_nutrition_view 
                WHERE recipe_id = :recipe_id
            """), {"recipe_id": recipe_id})
            
            nutrition_data = []
            for row in result:
                nutrition_data.append({
                    'ingredient_name': row.ingredient_name,
                    'quantity': float(row.quantity),
                    'unit': row.unit,
                    'nutrition': {
                        'protein_grams': float(row.protein_grams) if row.protein_grams else 0,
                        'fat_grams': float(row.fat_grams) if row.fat_grams else 0,
                        'carbs_grams': float(row.carbs_grams) if row.carbs_grams else 0,
                        'serving_size': float(row.serving_size) if row.serving_size else 0,
                        'serving_unit': row.serving_unit
                    }
                })
            
            return jsonify({'nutrition_data': nutrition_data})
    except Exception as e:
        print(f"Error getting nutrition info: {str(e)}")
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