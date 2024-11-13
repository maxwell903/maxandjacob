// Location: C:\Users\maxwa\maxandjacob\frontend\my-app\src\pages\add-recipe.js

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const AddRecipe = () => {  // Changed to arrow function
  const router = useRouter();
  const [backPath, setBackPath] = useState('/');
  const [recipe, setRecipe] = useState({
  
    name: '',
    description: '',
    instructions: '',
    prep_time: '',
    ingredients: ['']
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleIngredientChange = (index, value) => {
    const newIngredients = [...recipe.ingredients];
    newIngredients[index] = value;
    setRecipe({ ...recipe, ingredients: newIngredients });
  };

  const addIngredientField = () => {
    setRecipe({ 
      ...recipe, 
      ingredients: [...recipe.ingredients, ''] 
    });
  };

  const removeIngredientField = (index) => {
    const newIngredients = recipe.ingredients.filter((_, i) => i !== index);
    setRecipe({ ...recipe, ingredients: newIngredients });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipe),
      });

      if (!response.ok) {
        throw new Error('Failed to add recipe');
      }

      router.push('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const prevPath = localStorage.getItem('previousPath') || '/';
    setBackPath(prevPath);
  }, []);
  

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
  <div className="max-w-6xl mx-auto px-4 py-4">
    <Link 
      href={backPath}
      className="text-blue-600 hover:text-blue-800"
    >
      ← Back to {backPath === "/" ? "Home" : 
                 backPath === "/search" ? "Search" : 
                 backPath === "/menus" ? "Menus" : "Previous Page"}
    </Link>
  </div>
</nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Add New Recipe</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Recipe Name
            </label>
            <input
              type="text"
              id="name"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
              value={recipe.name}
              onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              required
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
              value={recipe.description}
              onChange={(e) => setRecipe({ ...recipe, description: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="instructions" className="block text-sm font-medium text-gray-700">
              Instructions
            </label>
            <textarea
              id="instructions"
              required
              rows={5}
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
              value={recipe.instructions}
              onChange={(e) => setRecipe({ ...recipe, instructions: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="prep_time" className="block text-sm font-medium text-gray-700">
              Preparation Time (minutes)
            </label>
            <input
              type="number"
              id="prep_time"
              required
              min="1"
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
              value={recipe.prep_time}
              onChange={(e) => setRecipe({ ...recipe, prep_time: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Ingredients</label>
            <div className="space-y-2">
              {recipe.ingredients.map((ingredient, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    required
                    className="flex-1 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                    value={ingredient}
                    onChange={(e) => handleIngredientChange(index, e.target.value)}
                    placeholder="Enter ingredient"
                  />
                  {recipe.ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIngredientField(index)}
                      className="rounded-md bg-red-100 px-3 py-2 text-red-700 hover:bg-red-200"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addIngredientField}
              className="mt-2 rounded-md bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
            >
              Add Ingredient
            </button>
          </div>

          {error && (
            <div className="rounded-md bg-red-100 p-4 text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? 'Adding Recipe...' : 'Add Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRecipe;  // Changed export style