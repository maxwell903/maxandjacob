// pages/menu/[menuId].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function MenuDetail() {
  const router = useRouter();
  const { menuId } = router.query;
  const [menu, setMenu] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showGroceryListModal, setShowGroceryListModal] = useState(false);
  const [groceryLists, setGroceryLists] = useState([]);
  const [fridgeItems, setFridgeItems] = useState([]);

  useEffect(() => {
    if (menuId) {
      fetchMenuRecipes();
      fetchFridgeItems();
    }
  }, [menuId]);

  const fetchFridgeItems = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/fridge');
      const data = await response.json();
      setFridgeItems(data.ingredients || []);
    } catch (error) {
      console.error('Error fetching fridge items:', error);
    }
  };

  const fetchMenuRecipes = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/menus/${menuId}/recipes`);
      if (!response.ok) throw new Error('Failed to fetch menu recipes');
      const data = await response.json();
      setMenu({ name: data.menu_name });
      setRecipes(data.recipes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShowModal = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/grocery-lists');
      const data = await response.json();
      setGroceryLists(data.lists);
      setShowGroceryListModal(true);
    } catch (error) {
      console.error('Error fetching grocery lists:', error);
    }
  };

  const addToGroceryList = async (listId) => {
    try {
      // Add recipes and their ingredients to the grocery list
      for (const recipe of recipes) {
        // Add recipe name as a header
        await fetch(`http://localhost:5000/api/grocery-lists/${listId}/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: recipe.name }),
        });
        
        // Add ingredients with color-coding
        for (const ingredient of recipe.ingredients) {
          // Check if ingredient exists in fridge with quantity > 0
          const fridgeItem = fridgeItems.find(item => 
            item.name.toLowerCase() === ingredient.toLowerCase() && item.quantity > 0
          );
          
          // Format ingredient name with bullet point and color code
          const formattedName = `• ${ingredient}`;
          const colorPrefix = fridgeItem ? '[green]' : '[red]';
          
          await fetch(`http://localhost:5000/api/grocery-lists/${listId}/items`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: `${colorPrefix}${formattedName}` }),
          });
        }
      }
  
      setShowGroceryListModal(false);
      router.push('/grocerylistId');
    } catch (error) {
      console.error('Error adding menu to grocery list:', error);
    }
  };

  const getIngredientColor = (ingredient) => {
    const inFridge = fridgeItems.some(item => 
      item.name.toLowerCase() === ingredient.toLowerCase() && item.quantity > 0
    );
    return inFridge ? 'text-green-600' : 'text-red-600';
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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/menus" className="text-blue-600 hover:text-blue-800">
            ← Back to Menus
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{menu?.name}</h1>
          <button
            onClick={handleShowModal}
            className="rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700"
          >
            Add to Grocery List
          </button>
        </div>

        {/* Color Index */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Color Index:</h2>
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="text-green-600 font-medium">•</span>
              <span className="ml-2">Item is in your fridge</span>
            </div>
            <div className="flex items-center">
              <span className="text-red-600 font-medium">•</span>
              <span className="ml-2">Item needed (not in fridge)</span>
            </div>
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="rounded-lg bg-white p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl">
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                {recipe.name}
              </h3>
              <p className="mb-4 text-gray-600">{recipe.description}</p>
              <div className="mb-4">
                <h4 className="font-medium mb-2">Ingredients:</h4>
                <ul className="space-y-1">
                  {recipe.ingredients.map((ingredient, idx) => (
                    <li 
                      key={idx} 
                      className={getIngredientColor(ingredient)}
                    >
                      {ingredient}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-sm text-gray-500">
                Prep time: {recipe.prep_time} mins
              </p>
              <Link 
                href={`/recipe/${recipe.id}`}
                className="mt-4 inline-block text-blue-600 hover:text-blue-700"
              >
                View Recipe →
              </Link>
            </div>
          ))}
        </div>

        {showGroceryListModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-96">
              <h3 className="text-lg font-semibold mb-4">Select Grocery List</h3>
              <div className="space-y-2">
                {groceryLists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => addToGroceryList(list.id)}
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
    </div>
  );
}