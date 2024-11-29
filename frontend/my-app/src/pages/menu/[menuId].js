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
  const [isDeleting, setIsDeleting] = useState(false);
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

  // Add this new function for handling menu deletion
  const handleDeleteMenu = async () => {
    if (!menuId) {
      console.error('No menu ID available');
      return;
    }

    try {
      setIsDeleting(true);
      
      const response = await fetch(`http://localhost:5000/api/menus/${menuId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete menu');
      }

      // Successfully deleted
      router.push('/menus');
    } catch (err) {
      console.error('Error deleting menu:', err);
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Add this new function for confirmation dialog
  const confirmDelete = () => {
    if (window.confirm('Are you sure you want to delete this Menu?')) {
      handleDeleteMenu();
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

  const fetchMenuRecipes = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/menus/${menuId}/recipes`);
      if (!response.ok) throw new Error('Failed to fetch menu recipes');
      const data = await response.json();
      
      // Handle both possible data structures
      const recipesArray = Array.isArray(data) ? data : (data.recipes || []);
      const menuName = data.menu_name || 'Menu Details';
      
      setMenu({ name: menuName });
      setRecipes(recipesArray);
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
      // Add menu name as header
      await fetch(`http://localhost:5000/api/grocery-lists/${listId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: `### ${menu.name} ###` }),
      });

      // Add each recipe and its ingredients
      for (const recipe of recipes) {
        // Add recipe name as a subheader
        await fetch(`http://localhost:5000/api/grocery-lists/${listId}/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: `**${recipe.name}**` }),
        });
        
        // Add ingredients with color-coding
        if (Array.isArray(recipe.ingredients)) {
          for (const ingredient of recipe.ingredients) {
            // Check if ingredient exists in fridge with quantity > 0
            const fridgeItem = fridgeItems.find(item => 
              item.name.toLowerCase() === ingredient.toLowerCase() && item.quantity > 0
            );
            
            // Format ingredient name with color code
            const colorPrefix = fridgeItem ? '[green]' : '[red]';
            
            await fetch(`http://localhost:5000/api/grocery-lists/${listId}/items`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ name: `${colorPrefix}• ${ingredient}` }),
            });
          }
        }
      }
  
      setShowGroceryListModal(false);
      router.push('/grocerylistId');
    } catch (error) {
      console.error('Error adding menu to grocery list:', error);
    }
  };

  const getIngredientColor = (ingredientName) => {
       const inFridge = fridgeItems.some(item => 
         item.name.toLowerCase() === ingredientName.toLowerCase() && 
         item.quantity > 0
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
          <div className="flex gap-4">
            <button
              onClick={confirmDelete}
              disabled={isDeleting}
              className={`rounded-lg ${
                isDeleting ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'
              } px-6 py-3 text-white text-lg font-semibold transition-colors duration-200`}
            >
              {isDeleting ? 'Deleting...' : 'Delete Menu'}
            </button>
            <button
              onClick={handleShowModal}
              className="rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700"
            >
              Add to Grocery List
            </button>
          </div>
        </div>
  
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}
  
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
    <div key={recipe.id} className="relative rounded-lg bg-white p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl">
      {/* Add delete button */}
      <button
        onClick={async (e) => {
          e.preventDefault(); // Prevent card click event
          if (window.confirm(`Remove ${recipe.name} from menu?`)) {
            try {
              const response = await fetch(`http://localhost:5000/api/menus/${menuId}/recipes/${recipe.id}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json'
                }
              });

              if (!response.ok) throw new Error('Failed to remove recipe from menu');

              // Refresh menu recipes
              fetchMenuRecipes();
            } catch (error) {
              console.error('Error removing recipe:', error);
              setError('Failed to remove recipe from menu');
            }
          }
        }}
        className="absolute top-2 right-2 p-1 rounded-full bg-red-100 hover:bg-red-200 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-red-600"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <h3 className="mb-2 text-lg font-semibold text-gray-900">
        {recipe.name}
      </h3>
      <p className="mb-4 text-gray-600">{recipe.description}</p>
      <div className="mb-4">
        <h4 className="font-medium mb-2">Ingredients:</h4>
        <ul className="space-y-1">
        {Array.isArray(recipe.ingredients) && recipe.ingredients.map((ingredient, idx) => (
   <li 
     key={idx} 
     className={getIngredientColor(ingredient.name)}
   >
     {ingredient.quantity} {ingredient.unit} {ingredient.name}
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