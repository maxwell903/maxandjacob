from flask import Flask, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from datetime import datetime
from flask import request

app = Flask(__name__, template_folder='../templates')
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql://root:RecipePassword123!@localhost/recipe_finder'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)

@app.route('/')
def home():
    return 'Hello from Recipe Finder!'


class Recipe(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    instructions = db.Column(db.Text)
    prep_time = db.Column(db.Integer)  # in minutes
    created_date = db.Column(db.DateTime, default=db.func.current_timestamp())


@app.route('/recipes', methods=['POST'])
def create_recipe():
    data = request.json
    new_recipe = Recipe(name=data['name'], description=data['description'], instructions=data['instructions'], prep_time=data['prep_time'])
    db.session.add(new_recipe)
    db.session.commit()
    return jsonify({'message': 'Recipe created successfully!', 'recipe_id' : new_recipe.id})


@app.route('/recipes', methods=['GET'])
def get_all_recipes():
    recipes = Recipe.query.order_by(Recipe.name).all()  # Order by recipe name
    return render_template('recipes.html', recipes=recipes)


@app.route('/recipes/<int:recipe_id>')
def get_recipe(recipe_id):
    recipe = Recipe.query.get(recipe_id)
    if recipe:
        ingredients = [ingredient.name for ingredient in recipe.ingredients]
        return jsonify({'id': recipe.id, 'name': recipe.name, 'description': recipe.description, 'instructions': recipe.instructions, 'prep_time': recipe.prep_time, 'ingredients': ingredients})
    else:
        return jsonify({'message': 'Recipe not found'})



class Ingredient(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id'), nullable=False)
    recipe = db.relationship('Recipe', backref=db.backref('ingredients', lazy=True))

@app.route('/recipes/<int:recipe_id>/ingredients', methods=['POST'])
def add_ingredient(recipe_id):
    data = request.json
    new_ingredient = Ingredient(name=data['name'], recipe_id=recipe_id)
    db.session.add(new_ingredient)
    db.session.commit()
    return jsonify({'message': 'Ingredient added successfully!'})

if __name__ == '__main__':
    app.run(debug=True)