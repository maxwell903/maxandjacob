// pages/index.js
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  const [homeData, setHomeData] = useState({
    total_recipes: 0,
    latest_recipes: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/home-data');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const data = await response.json();
        console.log('Fetched data:', data);
        setHomeData(data);
      } catch (error) {
        console.error('Error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
      <div className="relative bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100" />
        <div className="relative mx-auto max-w-6xl px-4 py-20">
          <div className="text-center">
            <h1 className="mb-6 text-4xl font-bold text-gray-900">
              Recipe Finder
            </h1>
            <p className="mb-8 text-gray-600">
              Total Recipes: {homeData.total_recipes}
            </p>
            
            
              <Link 
                href="/search"
                className="inline-block rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700 transition-colors duration-200"
              >
                Search Recipes by Ingredients →
              </Link>

              <Link 
                href="/add-recipe"
                className="inline-block rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700 transition-colors duration-200"
                onClick={() => localStorage.setItem('previousPath', '/')}
              >
                Add New Recipe
              </Link>

              <Link 
                href="/all-recipes"
                className="inline-block rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700 transition-colors duration-200"
              >
                View All Recipes
              </Link>

              <Link 
                href="/my-fridge"
                className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 transition-colors duration-200"
                onClick={() => localStorage.setItem('previousPath', '/')}
              >
                My Fridge
              </Link>

              <Link
                href="/grocerylistId"
                className="inline-block rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700 transition-colors duration-200"
                onClick={() => localStorage.setItem('previousPath', '/')}
              >
                Grocery Lists
              </Link>

              <Link 
                href="/menus"
                className="inline-block rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700 transition-colors duration-200"
              >
                My Menus
              </Link>

               <Link 
   href="/meal-prep"
   className="inline-block rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700 transition-colors duration-200"
   onClick={() => localStorage.setItem('previousPath', '/')}
 >
  My Fitness
 </Link>

              <Link 
                href="/grocery-bill"
                className="inline-block rounded-lg bg-yellow-600 px-6 py-3 text-white hover:bg-yellow-700 transition-colors duration-200"
                onClick={() => localStorage.setItem('previousPath', '/')}
              >
                Grocery Bill
              </Link>
              <Link 
  href="/gym"
  className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-red-700 transition-colors duration-200"
>
  Gym
</Link>
           

            {error && (
              <div className="mb-8 rounded-lg bg-green-100 p-4 text-red-700">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-8 text-2xl font-bold text-gray-900">Latest Recipes</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {homeData.latest_recipes.map((recipe) => (
  <Link 
    href={`/recipe/${recipe.id}`}
    key={recipe.id}
    className="block no-underline"
    onClick={() => {
      localStorage.setItem('actualPreviousPath', '/');
      localStorage.setItem('lastPath', '/');
    }}
  >
    <div className="rounded-lg bg-white p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl cursor-pointer">
      <h3 className="mb-2 text-lg font-semibold text-gray-900">{recipe.name}</h3>
      <p className="mb-4 text-gray-600">{recipe.description}</p>
      {/* Add Total Nutrition Information */}
      <p className="text-sm text-gray-500 mb-1">
        Protein: {recipe.total_nutrition?.protein_grams || 0}g • 
        Fat: {recipe.total_nutrition?.fat_grams || 0}g • 
        Carbs: {recipe.total_nutrition?.carbs_grams || 0}g
      </p>
      <p className="text-sm text-gray-500">
        Prep time: {recipe.prep_time} mins
      </p>
      <div className="mt-4 text-green-600 hover:text-green-700">
        View Recipe →
      </div>
    </div>
  </Link>
))}
          </div>
        </div>
      </div>
    </div>
  );
}