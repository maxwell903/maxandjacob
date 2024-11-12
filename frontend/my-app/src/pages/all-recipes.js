import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AllRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        console.log("Fetching recipes...")  // Add this
        const response = await fetch('http://localhost:5000/api/all-recipes');
        console.log("Response:", response)  // Add this
        if (!response.ok) throw new Error('Failed to fetch recipes');
        const data = await response.json();
        setRecipes(data.recipes);
      } catch (err) {
        console.error("Fetch error:", err);  // Add this for debugging
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <p className="text-gray-600">Loading recipes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            ← Back to Home
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">All Recipes</h1>
        
        {error && (
          <div className="mb-8 rounded-lg bg-red-100 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <Link 
              href={`/recipe/${recipe.id}`}
              key={recipe.id}
              className="block no-underline"
              onClick={() => localStorage.setItem('previousPath', '/all-recipes')}  // Add this line
            >
              <div className="rounded-lg bg-white p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl cursor-pointer">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {recipe.name}
                </h3>
                <p className="mb-4 text-gray-600">{recipe.description}</p>
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
    </div>
  );
}