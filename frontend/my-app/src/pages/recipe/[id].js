// src/pages/recipe/[id].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function RecipePage() {
  const router = useRouter();
  const { id } = router.query;
  const [backPath, setBackPath] = useState('/');
  const [recipe, setRecipe] = useState(null);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [addingToMenu, setAddingToMenu] = useState(false);

  useEffect(() => {
    const actualPrevPath = localStorage.getItem('actualPreviousPath');
    const lastPath = localStorage.getItem('lastPath');
    
    if (actualPrevPath && actualPrevPath.startsWith('/menu/')) {
      setBackPath('/menus');  // Always go back to menus if coming from a menu
    } else if (lastPath) {
      setBackPath(lastPath);
    } else {
      setBackPath('/');
    }
  }, []);

  useEffect(() => {
    if (id) {
      Promise.all([fetchRecipe(), fetchMenus()]);
    }
  }, [id]);

  useEffect(() => {
    // Check for actual previous path first
    const actualPrevPath = localStorage.getItem('actualPreviousPath');
    const lastPath = localStorage.getItem('lastPath');
    
    if (actualPrevPath && actualPrevPath.startsWith('/menu/')) {
      setBackPath(actualPrevPath);
    } else if (lastPath) {
      setBackPath(lastPath);
    } else {
      setBackPath('/');
    }
  }, []);

  const fetchRecipe = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/recipe/${id}`);
      if (!response.ok) throw new Error('Failed to fetch recipe');
      const data = await response.json();
      setRecipe(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenus = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/menus');
      if (!response.ok) throw new Error('Failed to fetch menus');
      const data = await response.json();
      setMenus(data.menus);
    } catch (error) {
      console.error('Error fetching menus:', error);
    }
  };

  const handleAddToMenu = async (menuId) => {
    setAddingToMenu(true);
    try {
      const response = await fetch(`http://localhost:5000/api/menus/${menuId}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_id: id }),
      });

      if (!response.ok) throw new Error('Failed to add recipe to menu');
      setShowMenuDropdown(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setAddingToMenu(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <p className="text-gray-600">Loading recipe...</p>
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

  if (!recipe) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <p className="text-gray-600">Recipe not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-4">
      <Link 
  href={backPath}
  className="mb-8 inline-block text-blue-600 hover:text-blue-700"
          onClick={() => {
            // Store the path we're going back to
            localStorage.setItem('lastPath', backPath);
          }}
          
>
  ← Back to {backPath === '/menus' ? 'Menus' : 
             backPath === '/search' ? 'Search' : 
             'Previous Page'}
</Link>
        
        <div className="rounded-lg bg-white p-8 shadow-lg">
          {/* Rest of your JSX remains the same */}
          <div className="flex justify-between items-start mb-6">
            <h1 className="text-3xl font-bold">{recipe.name}</h1>
            
            <div className="relative">
              <button
                onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                disabled={addingToMenu}
                className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:bg-green-300"
              >
                Add to Menu
              </button>
              
              {showMenuDropdown && (
                <div className="absolute right-0 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1">
                    {menus.map((menu) => (
                      <button
                        key={menu.id}
                        onClick={() => handleAddToMenu(menu.id)}
                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {menu.name}
                      </button>
                    ))}
                    {menus.length === 0 && (
                      <div className="px-4 py-2 text-sm text-gray-500">
                        No menus available
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="mb-6 text-gray-600">{recipe.description}</p>
          
          <div className="mb-6">
            <h2 className="mb-2 text-xl font-semibold">Ingredients</h2>
            <ul className="list-inside list-disc">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index} className="text-gray-600">{ingredient}</li>
              ))}
            </ul>
          </div>

          <div className="mb-6">
            <h2 className="mb-2 text-xl font-semibold">Instructions</h2>
            <p className="whitespace-pre-line text-gray-600">{recipe.instructions}</p>
          </div>

          <div className="text-sm text-gray-500">
            Prep time: {recipe.prep_time} mins
          </div>
        </div>
      </div>
    </div>
  );
}