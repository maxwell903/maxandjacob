# app.py
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from datetime import datetime
from sqlalchemy import text
from fuzzywuzzy import fuzz

app = Flask(__name__)
CORS(app)

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

@app.route('/api/recipe/<int:recipe_id>')
def get_recipe(recipe_id):
   try:
       recipe = Recipe.query.get_or_404(recipe_id)
       
       recipe_data = {
           'id': recipe.id,
           'name': recipe.name,
           'description': recipe.description,
           'instructions': recipe.instructions,
           'prep_time': recipe.prep_time,
           'ingredients': [ingredient.name for ingredient in recipe.ingredients]
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
        recipes_data = [{
            'id': recipe.id,
            'name': recipe.name,
            'description': recipe.description,
            'prep_time': recipe.prep_time,
            'ingredients': [ingredient.name for ingredient in recipe.ingredients]
        } for recipe in recipes]
        
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

@app.route('/api/search')
def search():
    ingredients = request.args.getlist('ingredient')
    try:
        if ingredients:
            subquery = """
                SELECT r.id, r.name, r.description, r.instructions, r.prep_time,
                       COUNT(DISTINCT i.id) as matched_count
                FROM recipe r
                JOIN ingredient i ON r.id = i.recipe_id
                WHERE i.name REGEXP :ingredient_pattern
                GROUP BY r.id
                HAVING matched_count = :ingredient_count
            """
            
            ingredient_pattern = '|'.join(ingredients)
            
            recipes = db.session.execute(text(subquery), {
                'ingredient_pattern': ingredient_pattern,
                'ingredient_count': len(ingredients)
            }).all()
            
            recipes_data = [{
                'id': recipe.id,
                'name': recipe.name,
                'description': recipe.description,
                'prep_time': recipe.prep_time,
                'ingredients': [ing.name for ing in 
                    Ingredient.query.filter_by(recipe_id=recipe.id).all()]
            } for recipe in recipes]
            
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
        db.session.flush()
        
        for ingredient_name in data['ingredients']:
            ingredient = Ingredient(
                name=ingredient_name,
                recipe_id=new_recipe.id
            )
            db.session.add(ingredient)
        
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
        recipes_data = [{
            'id': recipe.id,
            'name': recipe.name,
            'description': recipe.description,
            'prep_time': recipe.prep_time,
            'ingredients': [ingredient.name for ingredient in recipe.ingredients]
        } for recipe in recipes]
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
        new_item = FridgeItem(
            name=data['name'],
            quantity=data['quantity'], 
            unit=data['unit'] if 'unit' in data else None
        )
        db.session.add(new_item)
        db.session.commit()
        return jsonify({'message': 'Item added to fridge'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/fridge/parse-receipt', methods=['POST'])
def parse_receipt():
    try:
        data = request.json
        receipt_text = data['receipt_text'].lower()
        # Split on common delimiters
        words = ' '.join(receipt_text.split('\n')).split()  
        matched_items = {}
        unmatched_items = set()  # Track unmatched items for feedback

        # Get all unique ingredients from database for matching
        ingredients = db.session.query(Ingredient.name).distinct().all()
        ingredient_names = {i[0].lower() for i in ingredients}
        
        # Get existing fridge items
        existing_items = {item.name.lower(): item for item in FridgeItem.query.all()}

        # First pass: find exact matches
        for word in words:
            if word in ingredient_names:
                matched_items[word] = matched_items.get(word, 0) + 1
            else:
                unmatched_items.add(word)

        # Second pass: check for partial matches in remaining unmatched items
        for word in list(unmatched_items):  # Convert to list as we'll modify the set
            for ing_name in ingredient_names:
                # If ingredient name is found within the unmatched word
                if ing_name in word:
                    matched_items[ing_name] = matched_items.get(ing_name, 0) + 1
                    unmatched_items.remove(word)
                    break

        # Update database with matches
        results = []
        for ingredient, quantity in matched_items.items():
            if ingredient in existing_items:
                # Update existing item
                existing_items[ingredient].quantity += quantity
                results.append({
                    'matched_ingredient': ingredient,
                    'quantity': quantity,
                    'action': 'updated',
                    'current_total': existing_items[ingredient].quantity
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
            'unmatched_items': list(unmatched_items),  # Return unmatched for feedback
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


if __name__ == '__main__':
   with app.app_context():
       db.create_all()
   app.run(debug=True, port=5000)