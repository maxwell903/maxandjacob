import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Plus, Edit, Trash } from 'lucide-react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { jsx } from 'react/jsx-runtime';


function GroceryListsPage() {
  const [lists, setLists] = useState([]);
  const [expandedList, setExpandedList] = useState(null);
  const [newList, setNewList] = useState({ name: '', items: [''] });
  const [showForm, setShowForm] = useState(false);
  const [fridgeItems, setFridgeItems] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [showIngredientsMenu, setShowIngredientsMenu] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [bulkItems, setBulkItems] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const router = useRouter();
  

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:5000/api/grocery-lists').then(res => res.json()),
      fetch('http://localhost:5000/api/fridge').then(res => res.json()),
      fetch('http://localhost:5000/api/all-recipes').then(res => res.json())
    ]).then(([listsData, fridgeData, recipesData]) => {
      setLists(listsData.lists || []);
      setFridgeItems(fridgeData.ingredients || []);
      const allIngredients = new Set();
      recipesData.recipes?.forEach(recipe => {
        recipe.ingredients.forEach(ing => allIngredients.add(ing.toLowerCase()));
      });
      setIngredients(Array.from(allIngredients));
    });
  }, []);




  const cleanText = (text) => {
    let color = 'text-gray-900';
    const colorMatch = text.match(/\[(.*?)\]/);
    if (colorMatch) {
      const extractedColor = colorMatch[1];
      switch (extractedColor) {
        case 'green':
          color = 'text-green-600';
          break;
        case 'red':
          color = 'text-red-600';
          break;
        case 'black':
          color = 'text-gray-900';
          break;
      }
      text = text.replace(/\[.*?\]/, '');
    }
  
    text = text
      .replace(/[*_<>]/g, '')
      .replace(/\{.*?\}/g, '')
      .replace(/span class=".*?">/g, '')
      .replace(/<\/span>/g, '')
      .trim();
  
    return { text, color };
  };

  const handleItemAddManual = async (listId, itemName) => {
    try {
      const cleanName = itemName.trim();
      let colorPrefix = '[black]';
      
      const inFridge = fridgeItems.some(item => 
        item.name.toLowerCase() === cleanName.toLowerCase() && 
        item.quantity > 0
      );
      
      const inRecipes = ingredients.includes(cleanName.toLowerCase());
      
      if (inFridge) {
        colorPrefix = '[green]';
      } else if (inRecipes) {
        colorPrefix = '[red]';
      }

      const formattedName = `${colorPrefix}• ${cleanName}`;

      const groceryResponse = await fetch(`http://localhost:5000/api/grocery-lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formattedName }),
      });

      if (!groceryResponse.ok) throw new Error('Failed to add item to grocery list');

      await fetch('http://localhost:5000/api/fridge/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          quantity: 0,
          unit: ''
        }),
      });

      const listsResponse = await fetch('http://localhost:5000/api/grocery-lists');
      const listsData = await listsResponse.json();
      setLists(listsData.lists);
      
      setNewItemName('');
      setShowAddItem(false);
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };




  const handleItemAddFromRecipe = async (listId, recipe) => {
    try {
      await fetch(`http://localhost:5000/api/grocery-lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: `**${recipe.name}**` 
        }),
      });

      for (const ingredient of recipe.ingredients) {
        const cleanName = ingredient.trim();
        let colorPrefix = '[black]';

        const inFridge = fridgeItems.some(item => 
          item.name.toLowerCase() === cleanName.toLowerCase() && 
          item.quantity > 0
        );
        
        const inRecipes = ingredients.includes(cleanName.toLowerCase());
        
        if (inFridge) {
          colorPrefix = '[green]';
        } else if (inRecipes) {
          colorPrefix = '[red]';
        }

        const formattedName = `${colorPrefix}• ${cleanName}`;

        await fetch(`http://localhost:5000/api/grocery-lists/${listId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formattedName }),
        });

        await fetch('http://localhost:5000/api/fridge/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: cleanName,
            quantity: 0,
            unit: ''
          }),
        });
      }

      const listsResponse = await fetch('http://localhost:5000/api/grocery-lists');
      const listsData = await listsResponse.json();
      setLists(listsData.lists);

    } catch (error) {
      console.error('Error adding recipe ingredients:', error);
    }
  };

  const handleItemAddFromMenu = async (listId, menuId) => {
    try {
      const menuResponse = await fetch(`http://localhost:5000/api/menus/${menuId}/recipes`);
      const menuData = await menuResponse.json();

      await fetch(`http://localhost:5000/api/grocery-lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: `### ${menuData.menu_name} ###`
        }),
      });

      for (const recipe of menuData.recipes) {
        await fetch(`http://localhost:5000/api/grocery-lists/${listId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: `**${recipe.name}**`
          }),
        });

        for (const ingredient of recipe.ingredients) {
          const cleanName = ingredient.trim();
          let colorPrefix = '[black]';

          const inFridge = fridgeItems.some(item => 
            item.name.toLowerCase() === cleanName.toLowerCase() && 
            item.quantity > 0
          );
          
          const inRecipes = ingredients.includes(cleanName.toLowerCase());
          
          if (inFridge) {
            colorPrefix = '[green]';
          } else if (inRecipes) {
            colorPrefix = '[red]';
          }

          const formattedName = `${colorPrefix}• ${cleanName}`;

          await fetch(`http://localhost:5000/api/grocery-lists/${listId}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: formattedName }),
          });

          await fetch('http://localhost:5000/api/fridge/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: cleanName,
              quantity: 0,
              unit: ''
            }),
          });
        }
      }

      const listsResponse = await fetch('http://localhost:5000/api/grocery-lists');
      const listsData = await listsResponse.json();
      setLists(listsData.lists);

    } catch (error) {
      console.error('Error adding menu items:', error);
    }
  };


  const RecipeSelectionModal = ({ listId, onClose }) => {
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      fetch('http://localhost:5000/api/all-recipes')
        .then(res => res.json())
        .then(data => {
          setRecipes(data.recipes);
          setLoading(false);
        });
    }, []);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl w-96 max-h-[80vh] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">Select Recipe</h3>
          {loading ? (
            <p>Loading recipes...</p>
          ) : (
            <div className="space-y-2">
              {recipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => {
                    handleItemAddFromRecipe(listId, recipe);
                    onClose();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-md"
                >
                  {recipe.name}
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const MenuSelectionModal = ({ listId, onClose }) => {
    const [menus, setMenus] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      fetch('http://localhost:5000/api/menus')
        .then(res => res.json())
        .then(data => {
          setMenus(data.menus);
          setLoading(false);
        });
    }, []);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl w-96 max-h-[80vh] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">Select Menu</h3>
          {loading ? (
            <p>Loading menus...</p>
          ) : (
            <div className="space-y-2">
              {menus.map((menu) => (
                <button
                  key={menu.id}
                  onClick={() => {
                    handleItemAddFromMenu(listId, menu.id);
                    onClose();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-md"
                >
                  {menu.name}
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const toggleList = (listId) => {
    setExpandedList(expandedList === listId ? null : listId);
  };

  useEffect(() => {
    if (expandedList === null) {
      setSelectedItems(new Set());
    }
  }, [expandedList]);

  const addItemField = () => {
    setNewList({
      ...newList,
      items: [...newList.items, '']
    });
  };


  const updateItem = (index, value) => {
    const newItems = [...newList.items];
    newItems[index] = value;
    setNewList({ ...newList, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const cleanedItems = newList.items.map(item => cleanText(item).text).filter(item => item.trim());
      const response = await fetch('http://localhost:5000/api/grocery-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanText(newList.name).text,
          items: cleanedItems
        })
      });
      if (response.ok) {
        const listsResponse = await fetch('http://localhost:5000/api/grocery-lists');
        const listsData = await listsResponse.json();
        setLists(listsData.lists);
        setNewList({ name: '', items: [''] });
        setShowForm(false);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };





  const handleListUpdate = async (listId, updatedName) => {
    if (!updatedName) return;
    try {
      const cleanedName = cleanText(updatedName).text;
      await fetch(`http://localhost:5000/api/grocery-lists/${listId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanedName }),
      });
      const listsResponse = await fetch('http://localhost:5000/api/grocery-lists');
      const listsData = await listsResponse.json();
      setLists(listsData.lists);
    } catch (error) {
      console.error('Error updating list:', error);
    }
  };

  const handleListDelete = async (listId) => {
    if (!confirm('Are you sure you want to delete this list?')) {
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/grocery-lists/${listId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const listsResponse = await fetch('http://localhost:5000/api/grocery-lists');
      const listsData = await listsResponse.json();
      setLists(listsData.lists || []);
    } catch (error) {
      console.error('Error deleting list:', error);
      alert('Failed to delete list. Please try again.');
    }
  };

  const handleItemUpdate = async (listId, itemId, updatedName) => {
    if (!updatedName) return;
    try {
      const cleanedName = cleanText(updatedName).text;
      
      await fetch(`http://localhost:5000/api/grocery-lists/${listId}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanedName }),
      });
      const listsResponse = await fetch('http://localhost:5000/api/grocery-lists');
      const listsData = await listsResponse.json();
      setLists(listsData.lists);
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleItemDelete = async (listId, itemIds) => {
    if (!Array.isArray(itemIds)) {
      itemIds = [itemIds];
    }
    try {
      await fetch(`http://localhost:5000/api/grocery-lists/${listId}/items/batch-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ item_ids: itemIds }),
      });
      const listsResponse = await fetch('http://localhost:5000/api/grocery-lists');
      const listsData = await listsResponse.json();
      setLists(listsData.lists);
    } catch (error) {
      console.error('Error deleting items:', error);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link 
            href="/"
            className="text-blue-600 hover:text-blue-800"
            onClick={() => {
              const prevPath = localStorage.getItem('previousPath') || '/';
              router.push(prevPath);
            }}
          >
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












        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Color Index:</h2>
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="text-green-600 font-medium">•</span>
              <span className="ml-2">Item is in your fridge</span>
            </div>
            <div className="flex items-center">
              <span className="text-red-600 font-medium">•</span>
              <span className="ml-2">Item is in recipe database but not in fridge</span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-900 font-medium">•</span>
              <span className="ml-2">Item is not recognized in database</span>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="mb-8 bg-white rounded-lg shadow-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  List Name
                </label>
                <input
                  type="text"
                  value={newList.name}
                  onChange={(e) => setNewList({ ...newList, name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 p-2"
                  required
                />
              </div>

              {newList.items.map((item, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700">
                    Item {index + 1}
                  </label>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateItem(index, e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-2"
                  />
                </div>
              ))}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={addItemField}
                  className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
                >
                  Add Item
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                >
                  Create List
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {lists.map((list) => (
            <div key={list.id} className="bg-white rounded-lg shadow-lg">
              <div className="flex items-center justify-between p-4">
                <button
                  onClick={() => toggleList(list.id)}
                  className="flex-1 text-left hover:bg-gray-50"
                >
                  <span className="text-lg font-medium">{cleanText(list.name).text}</span>
                </button>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleListUpdate(list.id, prompt('Enter new list name:', list.name))}
                    className="p-1 rounded-full hover:bg-gray-200"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleListDelete(list.id)}
                    className="p-1 rounded-full hover:bg-gray-200"
                  >
                    <Trash size={18} />
                  </button>
                  <button onClick={() => toggleList(list.id)}>
                    {expandedList === list.id ? <ChevronUp /> : <ChevronDown />}
                  </button>
                </div>
              </div>

              {expandedList === list.id && (
                <div className="p-4 border-t border-gray-200">

<ul className="space-y-2">
  {list.items.map((item) => {
    const { text, color } = cleanText(item.name);
    const isRecipeName = !text.includes('•');
    const isSelected = selectedItems.has(item.id);

    return (
      <li key={item.id} className="flex items-center justify-between group">
        <div className="flex items-center gap-2">
          {isRecipeName ? (
            <span className="font-medium text-gray-900">{text}</span>
          ) : (
            <span className={color}>{text}</span>
          )}
        </div>
        <div className="flex items-center space-x-2 opacity-50 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => handleItemUpdate(list.id, item.id, prompt('Enter new item name:', text))}
            className="p-1 rounded-full hover:bg-gray-200"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => {
              if (selectedItems.size > 0) {
                const newSelected = new Set(selectedItems);
                if (isSelected) {
                  newSelected.delete(item.id);
                } else {
                  newSelected.add(item.id);
                }
                setSelectedItems(newSelected);
              } else {
                handleItemDelete(list.id, item.id);
              }
            }}
            className="p-1 rounded-full hover:bg-gray-200"
          >
            {isSelected ? (
              <div className="text-green-500">✓</div>
            ) : (
              <Trash size={16} />
            )}
          </button>
        </div>
      </li>
    );
  })}
</ul>
{selectedItems.size > 0 && (
  <div className="flex justify-end mt-4">
    <button
  onClick={async () => {
    if (confirm(`Delete ${selectedItems.size} selected items?`)) {
      await handleItemDelete(list.id, Array.from(selectedItems));
      setSelectedItems(new Set());
    }
  }}
  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
>
  Throw Out ({selectedItems.size})
</button>
  </div>
)}

                  <div className="mt-4 flex space-x-4">
                    <button
                      onClick={() => setShowAddItem(!showAddItem)}
                      className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                    >
                      <Plus size={20} />
                      Add Item
                    </button>

                    <button
                      onClick={() => setSelectedRecipe(true)}
                      className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                    >
                      <Plus size={20} />
                      Add Item By Recipe
                    </button>

                    <button
                      onClick={() => setSelectedMenu(true)}
                      className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                    >
                      <Plus size={20} />
                      Add Item By Menu
                    </button>
                  </div>

                  {showAddItem && (
                    <div className="mt-2 fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                        <h3 className="text-lg font-semibold mb-4">Add Item</h3>
                        <input
                          type="text"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          placeholder="Enter item name..."
                          className="w-full rounded-md border p-2 mb-4"
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
                            onClick={() => handleItemAddManual(list.id, newItemName)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {selectedRecipe && (
          <RecipeSelectionModal
            listId={expandedList}
            onClose={() => setSelectedRecipe(false)}
          />
        )}

        {selectedMenu && (
          <MenuSelectionModal
            listId={expandedList}
            onClose={() => setSelectedMenu(false)}
          />
        )}
      </div>
    </div>
  );
}

export default GroceryListsPage;