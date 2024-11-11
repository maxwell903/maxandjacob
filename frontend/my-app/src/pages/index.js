import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
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
        console.log('Fetched data:', data); // Debug log
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
            
            <div className="mb-8">
              <Link 
                href="/search"
                className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 transition-colors duration-200"
              >
                Search Recipes by Ingredients →
              </Link>
            </div>

            {error && (
              <div className="mb-8 rounded-lg bg-red-100 p-4 text-red-700">
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
              <div 
                key={recipe.id}
                className="rounded-lg bg-white p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <h3 className="mb-2 text-lg font-semibold">{recipe.name}</h3>
                <p className="mb-4 text-gray-600">{recipe.description}</p>
                <p className="text-sm text-gray-500">
                  Prep time: {recipe.prep_time} mins
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}