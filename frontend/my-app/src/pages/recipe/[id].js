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
  const [groceryLists, setGroceryLists] = useState([]);
  const [showGroceryListModal, setShowGroceryListModal] = useState(false);
  const [fridgeItems, setFridgeItems] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRecipe = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/recipe/${id}`);
      
      if (!response.ok) 
        throw new Error('Failed to fetch recipe data');
      
      const recipeData = await response.json();
      setRecipe(recipeData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenus = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/menus');
      if (!response.ok) {
        throw new Error('Failed to fetch menus');
      }
      const data = await response.json();
      setMenus(data.menus || []);
    } catch (error) {
      console.error('Error fetching menus:', error);
      setError('Failed to fetch menus');
    }
  };

  const fetchGroceryLists = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/grocery-lists');
      const data = await response.json();
      setGroceryLists(data.lists);
    } catch (error) {
      console.error('Error fetching grocery lists:', error);
    }
  };

  const fetchFridgeItems = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/fridge');
      const data = await response.json();
      setFridgeItems(data.ingredients || []);
    } catch (error) {
      console.error('Error fetching fridge items:', error);
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

  const handleAddToGroceryList = async (listId) => {
    if (!recipe) return;
    
    try {
      await fetch(`http://localhost:5000/api/grocery-lists/${listId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: `**${recipe.name}**` }),
      });

      for (const ingredient of recipe.ingredients) {
        const inFridge = fridgeItems.some(item => 
          item.name.toLowerCase() === ingredient.name.toLowerCase() && 
          item.quantity > 0
        );

        const colorPrefix = inFridge ? '[green]' : '[red]';
        
        await fetch(`http://localhost:5000/api/grocery-lists/${listId}/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: `${colorPrefix}• ${ingredient.quantity} ${ingredient.unit} ${ingredient.name}` }),
        });

        await fetch('http://localhost:5000/api/fridge/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: ingredient.name,
            quantity: 0,
            unit: ingredient.unit
          }),
        });
      }

      setShowGroceryListModal(false);
      router.push('/grocerylistId');
    } catch (error) {
      console.error('Error adding recipe to grocery list:', error);
      setError('Failed to add recipe to grocery list');
    }
  };

  const handleDeleteRecipe = async () => {
    if (!confirm('Are you sure you want to delete this recipe?')) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch(`http://localhost:5000/api/recipe/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete recipe');
      }

      router.push('/');
    } catch (error) {
      setError(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (id) {
      const fetchData = async () => {
        try {
          setLoading(true);
          await Promise.all([
            fetchRecipe(),
            fetchMenus(),
            fetchGroceryLists(),
            fetchFridgeItems()
          ]);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [id]);

  useEffect(() => {
    const actualPrevPath = localStorage.getItem('actualPreviousPath');
    const lastPath = localStorage.getItem('lastPath');
    
    if (actualPrevPath && actualPrevPath.startsWith('/menu/')) {
      setBackPath('/menus');
    } else if (lastPath) {
      setBackPath(lastPath);
    } else {
      setBackPath('/');
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenuDropdown && !event.target.closest('.relative')) {
        setShowMenuDropdown(false);
      }
    };
  
    if (showMenuDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [showMenuDropdown]);
  

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <p className="text-gray-600">Loading recipe...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="rounded-lg bg-red-100 p-8 text-red-700">
          <p>{error}</p>
          <Link href="/" className="mt-4 text-blue-600 hover:text-blue-800">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <p className="text-gray-600">Recipe not found</p>
          <Link href="/" className="mt-4 text-blue-600 hover:text-blue-800">
            Return to Home
          </Link>
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
            localStorage.setItem('lastPath', backPath);
          }}
        >
          ← Back to {backPath === '/menus' ? 'Menus' : 
                     backPath === '/search' ? 'Search' : 
                     'Previous Page'}
        </Link>
        
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <div className="flex justify-between items-start mb-6">
            <h1 className="text-3xl font-bold">{recipe.name}</h1>
            <div className="flex flex-col gap-2">
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenuDropdown(!showMenuDropdown);
                  }}
                  disabled={addingToMenu}
                  className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:bg-green-300"
                >
                  Add to Menu
                </button>
  
                {showMenuDropdown && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                      <h3 className="text-lg font-semibold mb-4">Select Menu</h3>
                      <div className="space-y-2">
                        {menus.map((menu) => (
                          <button
                            key={menu.id}
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                setAddingToMenu(true);
                                const response = await fetch(`http://localhost:5000/api/menus/${menu.id}/recipes`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ recipe_id: id }),
                                });

                                if (!response.ok) {
                                  throw new Error('Failed to add recipe to menu');
                                }

                                alert(`Added to ${menu.name}`);
                                setShowMenuDropdown(false);
                              } catch (error) {
                                console.error('Error adding to menu:', error);
                                alert('Failed to add to menu');
                              } finally {
                                setAddingToMenu(false);
                              }
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-md"
                          >
                            {menu.name}
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => setShowMenuDropdown(false)}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
        
              <button
                onClick={() => recipe ? setShowGroceryListModal(true) : null}
                disabled={!recipe}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Add to Grocery List
              </button>

              <button
                onClick={handleDeleteRecipe}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:bg-red-300"
              >
                {isDeleting ? 'Deleting...' : 'Delete Recipe'}
              </button>
            </div>
          </div>
          <p className="mb-6 text-gray-600">{recipe.description}</p>
          <div className="mb-6">
            <h2 className="mb-2 text-xl font-semibold">Ingredients</h2>
            <ul className="list-inside list-disc">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index} className="text-gray-600">
                  {ingredient.quantity} {ingredient.unit} {ingredient.name}
                </li>
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
      {showGroceryListModal && recipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-semibold mb-4">Select Grocery List</h3>
            <div className="space-y-2">
              {groceryLists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => handleAddToGroceryList(list.id)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-md"
                >
                  {list.name}
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowGroceryListModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}