import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Plus, Edit, Trash, X, Check } from 'lucide-react';
import { useRouter } from 'next/router';
import Link from 'next/link';

// Modal Components
const RecipeSelectionModal = ({ listId, onClose, onSelect }) => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/all-recipes')
      .then(res => res.json())
      .then(data => {
        setRecipes(data.recipes || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading recipes:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-96 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Select Recipe</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        {loading ? (
          <div className="text-center py-4">Loading recipes...</div>
        ) : (
          <div className="space-y-2">
            {recipes.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => {
                  onSelect(recipe);
                  onClose();
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-md"
              >
                {recipe.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const MenuSelectionModal = ({ listId, onClose, onSelect }) => {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/menus')
      .then(res => res.json())
      .then(data => {
        setMenus(data.menus || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading menus:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-96 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Select Menu</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        {loading ? (
          <div className="text-center py-4">Loading menus...</div>
        ) : (
          <div className="space-y-2">
            {menus.map((menu) => (
              <button
                key={menu.id}
                onClick={() => {
                  onSelect(menu.id);
                  onClose();
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-md"
              >
                {menu.name} ({menu.recipe_count} recipes)
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};



// GroceryItem component for displaying and editing individual items
const GroceryItem = ({ item, listId, onUpdate, onDelete }) => {
  const [localData, setLocalData] = useState({
    quantity: parseFloat(item.quantity) || 0,
    unit: item.unit || '',
    price_per: parseFloat(item.price_per) || 0,
    total: parseFloat(item.total) || 0
  });

  const handleDelete = async () => {
    const isChecked = item.name.startsWith('✓');
    const toggledName = isChecked ? 
    item.name.substring(2) : // Remove the checkmark
    'X';       // Add the checkmark
    
    try {
      const response = await fetch(`http://localhost:5000/api/grocery-lists/${listId}/items/${item.id}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete item');
      }

      // Only call onDelete if the deletion was successful
      if (typeof onDelete === 'function') {
        onDelete(item.id);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  const handleUpdate = async (field, value) => {
    try {
      const updatedData = { ...localData };
      updatedData[field] = value;
      
      // Calculate total
      if (field === 'quantity' || field === 'price_per') {
        updatedData.total = updatedData.quantity * updatedData.price_per;
      }

      const response = await fetch(`http://localhost:5000/api/grocery-lists/${listId}/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update item');
      }

      const responseData = await response.json();
      setLocalData(responseData.item);
      onUpdate();
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  useEffect(() => {
    setLocalData({
      quantity: parseFloat(item.quantity) || 0,
      unit: item.unit || '',
      price_per: parseFloat(item.price_per) || 0,
      total: parseFloat(item.total) || 0
    });
  }, [item]);

  

  return (
    <tr className="border-b">
      <td className="py-2 px-4">{item.name}</td>
      <td className="py-2 px-4">
        <input
          type="number"
          value={localData.quantity}
          onChange={(e) => {
            const value = parseFloat(e.target.value) || 0;
            setLocalData(prev => ({
              ...prev,
              quantity: value,
              total: value * prev.price_per
            }));
          }}
          onBlur={(e) => handleUpdate('quantity', parseFloat(e.target.value) || 0)}
          className="w-20 p-1 border rounded text-right"
          min="0"
          step="1"
        />
      </td>
      <td className="py-2 px-4">
        <input
          type="text"
          value={localData.unit}
          onChange={(e) => setLocalData(prev => ({ ...prev, unit: e.target.value }))}
          onBlur={(e) => handleUpdate('unit', e.target.value)}
          className="w-20 p-1 border rounded"
        />
      </td>
      <td className="py-2 px-4">
        <input
          type="number"
          value={localData.price_per}
          onChange={(e) => {
            const value = parseFloat(e.target.value) || 0;
            setLocalData(prev => ({
              ...prev,
              price_per: value,
              total: prev.quantity * value
            }));
          }}
          onBlur={(e) => handleUpdate('price_per', parseFloat(e.target.value) || 0)}
          className="w-24 p-1 border rounded text-right"
          min="0"
          step="1"
        />
      </td>
      <td className="py-2 px-4 text-right">
        ${localData.total.toFixed(2)}
      </td>
      <td className="py-2 px-4">
        <button
          onClick={handleDelete}
          className="text-red-500 hover:text-red-700"
        >
         {item.name.startsWith('✓') ? <X size={20} /> : <Check size={20} />}
        </button>
      </td>
    </tr>
  );
};

export default function GroceryListsPage() {
  const [lists, setLists] = useState([]);
  const [expandedList, setExpandedList] = useState(null);
  const [newList, setNewList] = useState({ name: '', items: [] });
  const [showForm, setShowForm] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const router = useRouter();
  const [fridgeItems, setFridgeItems] = useState([]);

  const fetchFridgeItems = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/fridge');
      if (!response.ok) {
        throw new Error('Failed to fetch fridge items');
      }
      const data = await response.json();
      setFridgeItems(data.ingredients || []);
    } catch (error) {
      console.error('Error fetching fridge items:', error);
      setError('Failed to fetch fridge items');
    }
  };

  // Fetch all lists and their items
  const fetchData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/grocery-lists');
      const data = await response.json();
      setLists(data.lists || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching lists:', err);
      setError('Failed to load grocery lists');
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          fetchData(),
          fetchFridgeItems()
        ]);
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
  
    fetchInitialData();
  }, []);

  // Handlers for various actions
  const handleCreateList = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/grocery-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newList.name,
          items: []
        })
      });

      if (!response.ok) throw new Error('Failed to create list');
      
      await fetchData();
      setNewList({ name: '', items: [] });
      setShowForm(false);
    } catch (err) {
      setError('Failed to create list');
    }
  };

  const handleDeleteList = async (listId) => {
    if (!listId) {
      console.error('No list ID provided');
      return;
    }
  
    if (confirm('Delete this list?')) {
      try {
        const response = await fetch(`http://localhost:5000/api/grocery-lists/${listId}`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
  
        // Check if response is JSON
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Failed to delete list');
          }
        } else if (!response.ok) {
          throw new Error('Failed to delete list');
        }
  
        // Refresh the lists after successful deletion
        await fetchData();
      } catch (err) {
        console.error('Error deleting list:', err);
        setError(err.message || 'Failed to delete list');
      }
    }
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/grocery-lists/${expandedList}/items`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          name: newItemName,
          quantity: 0,
          unit: '',
          price_per: 0
        })
      });
  
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add item');
      }
      
      setNewItemName('');
      setShowAddItem(false);
      await fetchData();
    } catch (err) {
      setError(err.message);
      console.error('Error adding item:', err);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!expandedList || !itemId) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/grocery-lists/${expandedList}/items/${itemId}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
  
      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to delete item');
        }
      } else if (!response.ok) {
        throw new Error('Failed to delete item');
      }
  
      // Refresh data after successful deletion
      await fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
      setError(error.message || 'Failed to delete item');
    }
  };

  const fetchRecipeIngredientDetails = async (recipeId) => {
    const response = await fetch(`http://localhost:5000/api/recipe/${recipeId}/ingredients`);
    if (!response.ok) {
      throw new Error('Failed to fetch recipe ingredient details');
    }
    return await response.json();
  };
  

  const handleAddFromRecipe = async (recipe) => {
    try {
      // First add the recipe name as header
      await fetch(`http://localhost:5000/api/grocery-lists/${expandedList}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: `**${recipe.name}**` }),
      });
  
      // Fetch detailed recipe ingredients including quantities
      const ingredients = await fetchRecipeIngredientDetails(recipe.id);
      
      // Add each ingredient with its quantity and unit
      for (const ingredient of ingredients.ingredients) {
        const inFridge = fridgeItems.some(item => 
          item.name.toLowerCase() === ingredient.name.toLowerCase() && 
          item.quantity > 0
        );
        
        await fetch(`http://localhost:5000/api/grocery-lists/${expandedList}/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json', 
          },
          body: JSON.stringify({
            name: `${inFridge ? '✓' : '•'} ${ingredient.name}`,
            quantity: ingredient.quantity,
            unit: ingredient.unit
          }),
        });
      }
  
      setSelectedRecipe(false);
      await fetchData();
    } catch (err) {
      setError(err.message);
      console.error('Error adding recipe:', err);
    }
  };
 
  const handleAddFromMenu = async (menuId) => {
    try {
      // Fetch all menu recipes with ingredient details
      const response = await fetch(`http://localhost:5000/api/menus/${menuId}/recipes`);
      if (!response.ok) {
        throw new Error('Failed to fetch menu recipes');
      }
      
      const menuData = await response.json();
      
      // Add menu name as header
      await fetch(`http://localhost:5000/api/grocery-lists/${expandedList}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: `### ${menuData.menu_name} ###` }),
      });
  
      // Process each recipe
      for (const recipe of menuData.recipes) {
        // Add recipe name
        await fetch(`http://localhost:5000/api/grocery-lists/${expandedList}/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: `**${recipe.name}**` }),
        });
  
        // Fetch and add recipe ingredients
        const ingredients = await fetchRecipeIngredientDetails(recipe.id);
        
        for (const ingredient of ingredients.ingredients) {
          const inFridge = fridgeItems.some(item => 
            item.name.toLowerCase() === ingredient.name.toLowerCase() && 
            item.quantity > 0
          );
  
          await fetch(`http://localhost:5000/api/grocery-lists/${expandedList}/items`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: `${inFridge ? '✓' : '•'} ${ingredient.name}`,
              quantity: ingredient.quantity,
              unit: ingredient.unit
            }),
          });
        }
      }
  
      setSelectedMenu(false);
      await fetchData();
    } catch (err) {
      setError(err.message);
      console.error('Error adding menu:', err);
    }
  };


  // Calculate totals for a list
  const calculateListTotal = (items) => {
    return items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.price_per) || 0;
      return sum + (quantity * price);
    }, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            ← Back
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Grocery Lists</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            <Plus size={20} />
            New List
          </button>
        </div>

        {showForm && (
          <div className="mb-8 bg-white rounded-lg shadow-lg p-6">
            <form onSubmit={handleCreateList} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  List Name
                </label>
                <input
                  type="text"
                  value={newList.name}
                  onChange={(e) => setNewList({ ...newList, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Create List
                </button>
              </div>
            </form>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-100 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {lists.map((list) => (
            <div key={list.id} className="bg-white rounded-lg shadow-lg">
              <div className="flex items-center justify-between p-4">
                <button
                  onClick={() => setExpandedList(expandedList === list.id ? null : list.id)}
                  className="flex-1 text-left flex items-center justify-between"
                >
                  <span className="text-lg font-medium">{list.name}</span>
                  {expandedList === list.id ? 
                    <ChevronUp className="h-5 w-5" /> : 
                    <ChevronDown className="h-5 w-5" />
                  }
                </button>
                <div className="flex items-center space-x-2 mr-2">
                <button
        onClick={(e) => {
          e.stopPropagation();
          fetchData();
        }}
        className="p-2 rounded-full hover:bg-gray-200 text-blue-600"
        title="Refresh list"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" 
             stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
        </svg>
      </button>
      </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDeleteList(list.id)}
                    className="p-1 rounded-full hover:bg-gray-200"
                  >
                    <Trash size={18} />
                  </button>
                </div>
              </div>

              {expandedList === list.id && (
                <div className="p-4 border-t border-gray-200">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Item</th>
                        <th className="text-center py-2 px-4 w-24">Quantity</th>
                        <th className="text-center py-2 px-4 w-24">Unit</th>
                        <th className="text-center py-2 px-4 w-24">Price</th>
                        <th className="text-right py-2 px-4 w-24">Total</th>
                        <th className="w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.items?.map((item) => (
                        <GroceryItem
                          key={item.id}
                          item={item}
                          listId={list.id}
                          onUpdate={fetchData}
                          onDelete={(itemId) => handleDeleteItem}
                        />
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold">
                        <td colSpan="4" className="py-2 text-right">Total:</td>
                        <td className="py-2 px-4 text-right">
                          ${calculateListTotal(list.items || []).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>

                  <div className="mt-4 flex space-x-4">
                    <button
                      onClick={() => setShowAddItem(true)}
                      className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                    >
                      <Plus size={20} />
                      Add Item
                    </button>

                    <button
                      onClick={() => setSelectedRecipe(true)}
                      className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                    >
                      <Plus size={20} />
                      Add Recipe
                    </button>

                    <button
                      onClick={() => setSelectedMenu(true)}
                      className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
                    >
                      <Plus size={20} />
                      Add Menu
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Item Modal */}
        {showAddItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-96">
              <h3 className="text-lg font-semibold mb-4">Add Item</h3>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full p-2 border rounded mb-4"
                placeholder="Enter item name"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setNewItemName('');
                    setShowAddItem(false);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddItem}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recipe Selection Modal */}
        {selectedRecipe && (
          <RecipeSelectionModal
            listId={expandedList}
            onClose={() => setSelectedRecipe(false)}
            onSelect={handleAddFromRecipe}
          />
        )}

        {/* Menu Selection Modal */}
        {selectedMenu && (
          <MenuSelectionModal
            listId={expandedList}
            onClose={() => setSelectedMenu(false)}
            onSelect={handleAddFromMenu}
          />
        )}
      </div>
    </div>
  );
}