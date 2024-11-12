import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function MenuPage() {
  const router = useRouter();
  const [backPath, setBackPath] = useState('/menus')
  const { menuId } = router.query;
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (menuId) {
      fetchMenuRecipes();
    }
  }, [menuId]);

  useEffect(() => {
    if (document.referrer) {
      // Get the last part of the referrer URL
      const referrerPath = new URL(document.referrer).pathname;
      setPreviousPath(referrerPath);
    }
  }, []);

  const fetchMenuRecipes = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/menus/${menuId}/recipes`);
      if (!response.ok) throw new Error('Failed to fetch menu recipes');
      const data = await response.json();
      setMenu(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRecipe = async (recipeId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/menus/${menuId}/recipes/${recipeId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) throw new Error('Failed to remove recipe');
      fetchMenuRecipes();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <p className="text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-lg bg-red-100 p-8 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <p className="text-gray-600">Menu not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
        <Link href={backPath} className="text-blue-600 hover:text-blue-800">
        ← Back to {backPath === "/menus" ? "Menus" : 
                  backPath === "/search" ? "Search" : 
                  backPath === '/' ? "Home" : "Previous Page"}
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">{menu.menu_name}</h1>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {menu.recipes.map((recipe) => (
            <div key={recipe.id} className="relative">
              <Link
                href={`/recipe/${recipe.id}`}
                className="block no-underline"
              >
                <div className="rounded-lg bg-white p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl">
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
              <button
                onClick={() => handleRemoveRecipe(recipe.id)}
                className="absolute -top-2 -right-2 rounded-full bg-red-500 p-2 text-white shadow-md hover:bg-red-600 focus:outline-none"
                title="Remove from menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {menu.recipes.length === 0 && (
          <div className="rounded-lg bg-white p-8 text-center text-gray-600 shadow-lg">
            No recipes in this menu yet.
          </div>
        )}
      </div>
    </div>
  );
}