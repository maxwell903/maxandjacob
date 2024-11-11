from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS  # Add this import
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS

app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql://root:RecipePassword123!@localhost/recipe_finder'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Your existing models...
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

# Updated routes
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

@app.route('/api/search')
def search():
    ingredients = request.args.getlist('ingredient')
    try:
        if ingredients:
            # Find recipes that contain ALL specified ingredients
            query = Recipe.query
            for ingredient in ingredients:
                query = query.join(Ingredient).filter(Ingredient.name.ilike(f"%{ingredient}%"))
            recipes = query.distinct().all()
        else:
            recipes = []
        
        recipes_data = [{
            'id': recipe.id,
            'name': recipe.name,
            'description': recipe.description,
            'prep_time': recipe.prep_time,
            'ingredients': [ingredient.name for ingredient in recipe.ingredients]
        } for recipe in recipes]
        
        return jsonify({
            'results': recipes_data,
            'count': len(recipes_data)
        })
    except Exception as e:
        print(f"Search error: {str(e)}")
        return jsonify({
            'error': str(e),
            'results': [],
            'count': 0
        }), 500

# Keep your other existing routes...

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)