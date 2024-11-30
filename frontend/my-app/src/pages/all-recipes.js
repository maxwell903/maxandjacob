// src/pages/all-recipes.js
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { debounce } from 'lodash';

const SearchInput = ({ value, onChange }) => {
  return (
    <div className="mb-8">
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder="Search recipes..."
        className="w-full p-2 border border-gray-300 rounded-md"
      />
    </div>
  );
};

export default function AllRecipes() {
  const router = useRouter();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRecipes, setFilteredRecipes] = useState([]);

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5000/api/all-recipes');
        if (!response.ok) {
          throw new Error('Failed to fetch recipes');
        }
        const data = await response.json();
        setRecipes(data.recipes || []);
        setFilteredRecipes(data.recipes || []);
        setError(null);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, []);

  useEffect(() => {
    const debouncedSearch = debounce((value) => {
      const filtered = recipes.filter(recipe =>
        recipe.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredRecipes(filtered);
    }, 300);

    debouncedSearch(searchTerm);

    return () => {
      debouncedSearch.cancel();
    };
  }, [searchTerm, recipes]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <p className="text-gray-600">Loading recipes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-lg bg-red-100 p-8 text-red-700">
          {error}
          <button
            onClick={() => router.push('/')}
            className="mt-4 block text-blue-600 hover:text-blue-800"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800"
            onClick={() => {
              localStorage.setItem('actualPreviousPath', '/');
              localStorage.setItem('lastPath', '/');
            }}
          >
            ← Back to Home
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">All Recipes</h1>

        <SearchInput
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {filteredRecipes.map((recipe) => (
  <Link
    href={`/recipe/${recipe.id}`}
    key={recipe.id}
    className="block no-underline"
    onClick={() => {
      localStorage.setItem('actualPreviousPath', '/all-recipes');
      localStorage.setItem('lastPath', '/all-recipes');
    }}
  >
    <div className="rounded-lg bg-white p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl cursor-pointer">
      <h3 className="mb-2 text-lg font-semibold text-gray-900">
        {recipe.name}
      </h3>
      <p className="mb-4 text-gray-600">{recipe.description}</p>
      <p className="text-sm text-gray-500 mb-1">
        Protein: {recipe.total_nutrition?.protein_grams || 0}g • 
        Fat: {recipe.total_nutrition?.fat_grams || 0}g • 
        Carbs: {recipe.total_nutrition?.carbs_grams || 0}g
      </p>
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