import { useState } from 'react';
import Link from 'next/link';

export default function Search() {
  const [ingredientInput, setIngredientInput] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addIngredient = (e) => {
    e.preventDefault();
    if (ingredientInput.trim() && !selectedIngredients.includes(ingredientInput.trim())) {
      setSelectedIngredients([...selectedIngredients, ingredientInput.trim()]);
      setIngredientInput('');
    }
  };

  const removeIngredient = (ingredientToRemove) => {
    setSelectedIngredients(selectedIngredients.filter(ing => ing !== ingredientToRemove));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (selectedIngredients.length === 0) return;

    try {
      setLoading(true);
      const queryString = selectedIngredients
        .map(ingredient => `ingredient=${encodeURIComponent(ingredient)}`)
        .join('&');
      const response = await fetch(`http://localhost:5000/api/search?${queryString}`);
      const data = await response.json();
      setSearchResults(data);
      setError(null);
    } catch (error) {
      console.error('Search error:', error);
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            ← Back to Home
          </Link>
        </div>
      </nav>

      {/* Search Section */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Search Recipes by Ingredients</h1>
        
        {/* Ingredient Search Form */}
        <div className="mb-8">
          <form onSubmit={addIngredient} className="flex gap-2 mb-4">
            <input
              type="text"
              value={ingredientInput}
              onChange={(e) => setIngredientInput(e.target.value)}
              placeholder="Add an ingredient..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button
              type="submit"
              className="rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Add
            </button>
          </form>

          {/* Selected Ingredients */}
          {selectedIngredients.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {selectedIngredients.map((ingredient, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700"
                  >
                    {ingredient}
                    <button
                      onClick={() => removeIngredient(ingredient)}
                      className="ml-2 text-blue-600 hover:text-blue-800 focus:outline-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <button
                onClick={handleSearch}
                className="mt-4 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Search Recipes
              </button>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <p className="text-gray-600">Searching for recipes...</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-8 rounded-lg bg-red-100 p-4 text-red-700">
            {error}
          </div>
        )}
        
{searchResults && (
  <div>
    <h2 className="text-2xl font-bold text-gray-900 mb-6">
      Found Recipes ({searchResults.count})
    </h2>
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {searchResults.results.map((recipe) => (
        <Link 
        href={`/recipe/${recipe.id}`}
        key={recipe.id}
        className="block no-underline"
        onClick={() => {
          localStorage.setItem('actualPreviousPath', '/search');
          localStorage.setItem('lastPath', '/search');
        }}
      
        >
          <div className="rounded-lg bg-white p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl cursor-pointer">
            <h3 className="mb-2 text-lg font-semibold">{recipe.name}</h3>
            <p className="mb-4 text-gray-600">{recipe.description}</p>
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Ingredients:</h4>
              <div className="flex flex-wrap gap-1">
                {recipe.ingredients.map((ingredient, index) => (
                  <span
                    key={index}
                    className={`text-sm px-2 py-1 rounded-full ${
                      selectedIngredients.includes(ingredient)
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {ingredient}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Prep time: {recipe.prep_time} mins
            </p>
            <div className="mt-4 text-blue-600 hover:text-blue-700">
              View Recipe →
            </div>
          </div>
        </Link>
      ))}
    </div>
  </div>
)}
      </div>
    </div>
  );
}