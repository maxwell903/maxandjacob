import React, { useCallback } from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link'; // Add this import
import { ChevronDown, ChevronUp, Edit, Plus, Trash, X, Check, Delete} from 'lucide-react';


export const GroceryListColumn = ({ fridgeItems, setFridgeItems }) => {
  const [groceryLists, setGroceryLists] = useState([]);
  const [selectedList, setSelectedList] = useState(true);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [expandedLists, setExpandedLists] = useState(new Set());
  const [editingItem, setEditingItem] = useState(null);
  const [showListDropdown, setShowListDropdown] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(0);
  const [selectMode, setSelectMode] = useState({});
  const [selectedItems, setSelectedItems] = useState({});

  const cleanText = useCallback((text) => {
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
        default:
          color = 'text-gray-900';
      }
    }
    return {
      text: text.replace(/\[(.*?)\]/, '').replace(/[*•]/, '').trim(),
      color
    };
  }, []);

  // Update the getItemColor function to handle null/undefined cases
const getItemColor = useCallback((itemName) => {
  if (!itemName) return 'black';
  const cleanName = itemName.replace(/[*•]/, '').trim();
  const matchingFridgeItem = fridgeItems.find(item => 
    item.name.toLowerCase() === cleanName.toLowerCase()
  );
  if (!matchingFridgeItem) return 'black';
  return matchingFridgeItem.quantity > 0 ? 'green' : 'red';
}, [fridgeItems]);

const shouldUpdateItemColor = useCallback((itemName, currentColor) => {
     const newColor = getItemColor(itemName);
     return currentColor !== newColor;
   }, [getItemColor]);
 
// Update the fetch and color sync logic
const fetchGroceryLists = useCallback(async () => {
  try {
    const response = await fetch('http://localhost:5000/api/grocery-lists');
    const data = await response.json();
    
    // Process each item in each list to update colors
    const updatedLists = data.lists.map(list => ({
      ...list,
      items: list.items.map(item => {
        const cleanName = item.name.replace(/\[.*?\]/, '').replace(/[*•]/, '').trim();
        if (cleanName.startsWith('**') || cleanName.startsWith('###')) {
          return item; // Skip recipe and menu headers
        }
        const color = getItemColor(cleanName);
        return {
          ...item,
          name: `[${color}]• ${cleanName}`
        };
      })
    }));
    
    setGroceryLists(updatedLists);
  } catch (error) {
    console.error('Error fetching grocery lists:', error);
  }
}, [getItemColor]);

  useEffect(() => {
        fetchGroceryLists();
      }, [fridgeItems, fetchGroceryLists]);

  // Initial fetch
  useEffect(() => {
    fetchGroceryLists();
  }, [fetchGroceryLists]);

  // Color synchronization effect
  

   
  const handleAddItem = async (listId) => {
    if (!newItemName.trim()) return;
    
    try {
      const colorPrefix = getItemColor(newItemName);
      
      const response = await fetch(`http://localhost:5000/api/grocery-lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `[${colorPrefix}]• ${newItemName}` }),
      });

      if (response.ok) {
        setNewItemName('');
        setShowAddItemModal(false);
        fetchGroceryLists();
      }
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleDeleteList = async (listId) => {
    if (window.confirm('Are you sure you want to delete this list?')) {
      try {
        await fetch(`http://localhost:5000/api/grocery-lists/${listId}`, {
          method: 'DELETE'
        });
        fetchGroceryLists();
      } catch (error) {
        console.error('Error deleting list:', error);
      }
    }
  };

  const handleDeleteItem = async (listId, itemId) => {
    try {
      await fetch(`http://localhost:5000/api/grocery-lists/${listId}/items/${itemId}`, {
        method: 'DELETE'
      });
      fetchGroceryLists();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleEditItem = async (listId, itemId, newName) => {
    try {
      const colorPrefix = getItemColor(newName);
      await fetch(`http://localhost:5000/api/grocery-lists/${listId}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `[${colorPrefix}]• ${newName}` }),
      });
      setEditingItem(null);
      fetchGroceryLists();
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const toggleListExpansion = (listId) => {
    const newExpanded = new Set(expandedLists);
    if (newExpanded.has(listId)) {
      newExpanded.delete(listId);
    } else {
      newExpanded.add(listId);
    }
    setExpandedLists(newExpanded);
  };
  const handleAddToFridge = async (itemName, quantity = 1) => {
    try {
      await fetch('http://localhost:5000/api/fridge/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: itemName,
          quantity: quantity,
          unit: ''
        }),
      });
 
         
         // Immediately fetch updated lists to reflect new colors
         await fetchGroceryLists();
       } catch (error) {
         console.error('Error adding to fridge:', error);
       }
     };
    
     

  const toggleSelectMode = (listId) => {
    setSelectMode(prev => ({
      ...prev,
      [listId]: !prev[listId]
    }));
    if (!selectedItems[listId]) {
      setSelectedItems(prev => ({
        ...prev,
        [listId]: []
      }));
    }
  };

  const handleAddSelectedToFridge = async (listId) => {
    const items = selectedItems[listId] || [];
    const list = groceryLists.find(l => l.id === listId);
    
    if (list) {
      for (const itemId of items) {
        const item = list.items.find(i => i.id === itemId);
        if (item) {
          const cleanName = item.name.replace(/\[.*?\]/, '').replace(/[*•]/, '').trim();
          await handleAddToFridge(cleanName);
        }
      }
      
      // Clear selections and update lists
      setSelectedItems(prev => ({...prev, [listId]: []}));
      setSelectMode(prev => ({...prev, [listId]: false}));
      
      // Force refresh both fridge items and grocery lists
      const fridgeResponse = await fetch('http://localhost:5000/api/fridge');
      const fridgeData = await fridgeResponse.json();
      setFridgeItems(fridgeData.ingredients || []);
      await fetchGroceryLists();
    }
  };

  const toggleItemSelection = (listId, itemId) => {
    setSelectedItems(prev => {
      const currentSelected = prev[listId] || [];
      const newSelected = currentSelected.includes(itemId)
        ? currentSelected.filter(id => id !== itemId)
        : [...currentSelected, itemId];
      return {
        ...prev,
        [listId]: newSelected
      };
    });
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Grocery Lists</h2>
        <div className="relative">
          <button
            onClick={() => setShowListDropdown(!showListDropdown)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Select List {showListDropdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {showListDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl z-50">
              {groceryLists.map(list => (
                <button
                  key={list.id}
                  onClick={() => {
                    setSelectedList(list.id);
                    setShowListDropdown(true);
                    setExpandedLists(new Set([...expandedLists, list.id]));
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
                >
                  {list.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      
      
      <div className="space-y-4">
        {groceryLists.map(list => (
          <div
            key={list.id}
            className={`border rounded-lg p-4 ${selectedList === list.id ? 'border-blue-500' : 'border-gray-200'}`}
          >
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">{list.name}</h3>
              <div className="flex gap-2">
              <button
                onClick={() => toggleSelectMode(list.id)}
                className={`p-1 hover:bg-gray-100 rounded-full ${
                  selectMode[list.id] ? 'text-blue-600' : 'text-gray-600'
                }`}
              >
                <Check size={16} />
              </button>
                <button
                  onClick={() => setShowAddItemModal(list.id)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                  
                >
                  <Plus size={16} />
                </button>
                <button
                  onClick={() => handleDeleteList(list.id)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X size={16} />
                </button>
                <button
                  onClick={() => toggleListExpansion(list.id)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  {expandedLists.has(list.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>

            {expandedLists.has(list.id) && (
             <div className="mt-4 space-y-2">
               {list.items.map(item => {
                  const { text, color } = cleanText(item.name);
                  const isRecipeName = !text.includes('•');
                  return (
                    <div key={item.id} className="flex justify-between items-center group">
                     <div className="flex items-center gap-2">
                        {selectMode[list.id] && (
                          <input
                            type="checkbox"
                            checked={(selectedItems[list.id] || []).includes(item.id)}
                            onChange={() => toggleItemSelection(list.id, item.id)}
                            className="w-4 h-4"
                          />
                        )}
                        {isRecipeName ? (
                          <span className="font-medium text-gray-900">{text}</span>
                        ) : (
                          <span className={`${
                               color === 'red' ? 'text-red-600' : 
                               color === 'green' ? 'text-green-600' : 
                               'text-gray-900'
                             }`}>
                               {text}
                             </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isRecipeName && (
                          <button
                            onClick={() => handleAddToFridge(text)}
                            className="p-1 rounded-full hover:bg-gray-100 text-green-600"
                          >
                            <PlusCircle size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => setEditingItem(item.id)}
                          className="p-1 hover:bg-gray-100 rounded-full"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleItemDelete(list.id, item.id)}
                          className="p-1 hover:bg-gray-100 rounded-full text-red-600"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {selectMode[list.id] && selectedItems[list.id]?.length > 0 && (
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={() => handleAddSelectedToFridge(list.id)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Add Selected to Fridge ({selectedItems[list.id]?.length})
                    </button>
                  </div>
                )}
                
              </div>
            )}
          </div>
        ))}
      </div>

      {showAddItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-semibold mb-4">Add Item</h3>
            <input
              type="text"
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              placeholder="Enter item name..."
              className="w-full px-3 py-2 border rounded-lg mb-4"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleAddItem(showAddItemModal);
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddItemModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddItem(showAddItemModal)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



const ImprovedInput = ({ 
  value, 
  onChange, 
  onEnter, 
  placeholder = '', 
  className = '',
  required = false,
  type = 'text'
}) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnter?.(e);
    }
  };

  const handleChange = (e) => {
    onChange?.(e.target.value);
  };

  return (
    <input
      type={type}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={`mt-1 block rounded-md border border-gray-300 px-3 py-2 ${className}`}
      required={required}
    />
  );
};

export default function InventoryView() {
  const [recipes, setRecipes] = useState([]);
  const [menus, setMenus] = useState([]);
  const [fridgeItems, setFridgeItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [viewMode, setViewMode] = useState('inventory');
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState('manual');
  const [pastedText, setPastedText] = useState('');
  const [newItem, setNewItem] = useState({ name: '', quantity: 0, unit: '' });
  const [processingResults, setProcessingResults] = useState(null);
  const [inventoryFilter, setInventoryFilter] = useState('inStock');
  const router = useRouter();
  const [groceryLists, setGroceryLists] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:5000/api/all-recipes').then(res => res.json()),
      fetch('http://localhost:5000/api/menus').then(res => res.json()),
      fetch('http://localhost:5000/api/fridge').then(res => res.json()),
      fetch('http://localhost:5000/api/grocery-lists').then(res => res.json())
    ])
    .then(async ([recipesData, menusData, groceryListsData]) => {
      setRecipes(recipesData.recipes);
      setMenus(menusData.menus);
      
      setGroceryLists(groceryListsData.lists || []);
      await handleInventoryUpdate(); // Use the new function to fetch fridge items
      setLoading(false);
    })
    .catch(error => {
           console.error('Error fetching data:', error);
           setLoading(false);
         });
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = recipes.filter(recipe => 
        recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRecipes(filtered);
    } else {
      setFilteredRecipes([]);
    }
  }, [searchTerm, recipes]);


  const handleInventoryUpdate = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/fridge');
     if (!response.ok) {
        throw new Error('Failed to fetch updated inventory');
      }
      const data = await response.json();
      setFridgeItems(data.ingredients || []);
    } catch (error) {
      console.error('Error refreshing inventory:', error);
    }
  };

  const ImprovedFridgeInventory = ({
  addMode,
  setAddMode,
  handleManualAdd,
  handleTextParse,
  handleFileUpload,
  pastedText,
  setPastedText,
  processingResults,
  newItem,
  setNewItem,
  getFilteredInventory,
  inventoryFilter,
  setInventoryFilter,
  groceryLists = [],
  fridgeItems = [],
  onInventoryUpdate,
  setFrideItems,
  
}) => {
  
  const [isFormOpen, setIsFormOpen] = useState(true);  // Add this line
  const [filteredItems, setFilteredItems] = useState([]);
  useEffect(() => {
    setFilteredItems(getFilteredInventory());
   }, [fridgeItems, inventoryFilter]);


  const midPoint = Math.ceil(filteredItems.length / 2);
  const leftColumnItems = filteredItems.slice(0, midPoint);
  const rightColumnItems = filteredItems.slice(midPoint);
  //const [expandedList, setExpandedList] = useState(null);
  const ImprovedInput = ({ 
  value, 
  onChange, 
  onEnter, 
  placeholder = '', 
  className = '',
  required = false,
  type = 'text'
}) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnter?.(e);
    }
  };

  const handleChange = (e) => {
    onChange?.(e.target.value);
  };

  return (
    <input
      type={type}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={`mt-1 block rounded-md border border-gray-300 px-3 py-2 ${className}`}
      required={required}
    />
  );
};

  return (
    <div className="mb-8">
      {/* Collapsible Add to Inventory Section */}
      <button
        
        onClick={() => setIsFormOpen(!isFormOpen)}
        className="w-full bg-white rounded-lg shadow p-4 mb-4 flex justify-between items-center hover:bg-gray-50"
      >
        <h2 className="text-xl font-semibold">Add to Inventory</h2>
        {isFormOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
      </button>

      {isFormOpen && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-4 flex gap-4">
            <button
              onClick={() => setAddMode('manual')}
              className={`px-4 py-2 rounded ${
                addMode === 'manual' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setAddMode('paste')}
              className={`px-4 py-2 rounded ${
                addMode === 'paste' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              Paste Receipt
            </button>
            <button
              onClick={() => setAddMode('file')}
              className={`px-4 py-2 rounded ${
                addMode === 'file' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              Upload File
            </button>
          </div>

          {addMode === 'manual' && (
            <form onSubmit={handleManualAdd} className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Item Name</label>
                <ImprovedInput
  value={newItem.name}
  onChange={(value) => setNewItem(prev => ({...prev, name: value}))}
  onEnter={handleManualAdd}
  placeholder="Enter item name"
  required
  className="w-full"
/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantity</label>
                <input
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value)})}
                  onKeyDown={(e)=> {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleManualAdd(e);
                    }
                  }}
                  className="mt-1 block w-10 rounded-md border border-gray-300 px-3 py-2"
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Unit</label>
                <input
                  type="text"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                  onKeyDown={(e)=> {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleManualAdd(e)
                    }
                    
                  }}

                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="Optional unit"
                />
              </div>
              <div className="col-span-3">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
                  Add Item
                </button>
              </div>
            </form>
          )}

          {addMode === 'paste' && (
            <div>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="w-full h-32 border rounded-md p-2 mb-4"
                placeholder="Paste your receipt or grocery list here..."
              />
              <button
                onClick={() => handleTextParse(pastedText)}
                className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
              >
                Process Text
              </button>
              
              {processingResults && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Processing Results:</h3>
                  <div className="space-y-4">
                    <div className="bg-green-50 p-3 rounded">
                      <h4 className="text-green-800 font-medium mb-2">Matched Items:</h4>
                      {processingResults.matched_items.map((item, idx) => (
                        <div key={idx} className="text-green-700">
                          {item.matched_ingredient}: {item.quantity} 
                          ({item.action === 'updated' ? 'Updated' : 'Added'}, 
                          Total: {item.current_total})
                        </div>
                      ))}
                    </div>
                    
                    {processingResults.unmatched_items.length > 0 && (
                      <div className="bg-yellow-50 p-3 rounded">
                        <h4 className="text-yellow-800 font-medium mb-2">Unmatched Items:</h4>
                        {processingResults.unmatched_items.map((item, idx) => (
                          <div key={idx} className="text-yellow-700">{item}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {addMode === 'file' && (
            <div>
              <input
                type="file"
                accept=".txt,.csv"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          )}
        </div>
      )}

      {/* Filter Buttons */}
      <div className="mb-4 flex gap-4">
        <button
          onClick={() => setInventoryFilter('inStock')}
          className={`px-4 py-2 rounded ${
            inventoryFilter === 'inStock' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
        >
          In My Fridge ({fridgeItems.filter(item => item.quantity > 0).length})
        </button>
        <button
          onClick={() => setInventoryFilter('needed')}
          className={`px-4 py-2 rounded ${
            inventoryFilter === 'needed' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
        >
          Need to Get ({fridgeItems.filter(item => item.quantity === 0).length})
        </button>
        <button
          onClick={() => setInventoryFilter('all')}
          className={`px-4 py-2 rounded ${
            inventoryFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
        >
          View All ({fridgeItems.length})
        </button>
      </div>

       {/* Three-Column Layout */}
      <div className="flex gap-1 w-full">
   {/* First Inventory Column */}
   <div className="w-1/3">
     <div className="bg-white rounded-lg shadow">
       <div className="grid grid-cols-5 gap-5 p-4 font-medium text-gray-700 border-b">
         <div>Item Name</div>
         <div>Quantity</div>
         <div>Unit</div>
         <div>Status</div>
         <div>Actions</div>
       </div>
       {leftColumnItems.map((item, index) => (
         <InventoryRow 
                key={item.id || index} 
                item={item} 
                isEven={index % 2 === 0}
                onUpdate={onInventoryUpdate}
             />
       ))}
     </div>
   </div>

  {/* Second Inventory Column */}
   <div className="w-1/3">
     <div className="bg-white rounded-lg shadow">
       <div className="grid grid-cols-5 gap-4 p-4 font-medium text-gray-700 border-b">
         <div>Item Name</div>
         <div>Quantity</div>
         <div>Unit</div>
         <div>Status</div>
         <div>Actions</div>
       </div>
       {rightColumnItems.map((item, index) => (
         <InventoryRow key={item.id || index} item={item} isEven={index % 2 === 0} />
       ))}
     </div>
   </div>
   {/* Grocery Lists Column */}
   <div className="w-1/3">
    <GroceryListColumn 
      fridgeItems={fridgeItems}
      setFridgeItems={setFridgeItems}
    />
   </div>
 </div>
</div>
    
  );
};

// Helper component for inventory rows


  

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const text = await file.text();
      handleTextParse(text);
    }
  };

  const handleTextParse = async (text) => {
    try {
      const response = await fetch('http://localhost:5000/api/fridge/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipt_text: text })
      });
      const data = await response.json();
      if (response.ok) {
        setProcessingResults(data);
        const fridgeResponse = await fetch('http://localhost:5000/api/fridge');
        const fridgeData = await fridgeResponse.json();
        setFridgeItems(fridgeData.ingredients);
        setPastedText('');
      }
    } catch (error) {
      console.error('Error parsing text:', error);
    }
  };

  const handleManualAdd = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/fridge/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (response.ok) {
        const fridgeResponse = await fetch('http://localhost:5000/api/fridge');
        const fridgeData = await fridgeResponse.json();
        setFridgeItems(fridgeData.ingredients);
        setNewItem({ name: '', quantity: 0, unit: '' });
      }
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleMenuSelect = async (menuId) => {
    if (!menuId) {
      setFilteredRecipes([]);
      return;
    }
    const response = await fetch(`http://localhost:5000/api/menus/${menuId}/recipes`);
    const data = await response.json();
    setFilteredRecipes(data.recipes);
    setSelectedMenu(menuId);
  };

  const checkIngredientStatus = (ingredient) => {
    const fridgeItem = fridgeItems.find(item => 
      item.name.toLowerCase() === ingredient.toLowerCase()
    );
    return fridgeItem?.quantity > 0;
  };

  const getFilteredInventory = () => {
    switch (inventoryFilter) {
      case 'inStock':
        return fridgeItems.filter(item => item.quantity > 0);
      case 'needed':
        return fridgeItems.filter(item => item.quantity === 0);
      case 'all':
        return fridgeItems;
      default:
        return fridgeItems;
    }
  };

  const InventoryRow = ({ item, isEven, onUpdate }) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [localQuantity, setLocalQuantity] = useState(item.quantity);
    const [localUnit, setLocalUnit] = useState(item.unit || '');
  
    const handleUpdate = async (updateData) => {
      try {
        setIsUpdating(true);
        const response = await fetch(`http://localhost:5000/api/fridge/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ...item, 
            ...updateData,
            unit: localUnit 
          })
        });
  
        if (!response.ok) throw new Error('Failed to update item');
        const result = await response.json();
             // Immediately update the local fridgeItems state
             setFridgeItems(prev => prev.map(i => 
               i.id === item.id ? { ...i, ...updateData } : i
             ));

             // Update grocery list colors
   const groceryListsResponse = await fetch('http://localhost:5000/api/grocery-lists');
   const groceryListsData = await groceryListsResponse.json();
   const lists = groceryListsData.lists || [];
   
   // Update each grocery list item that matches the updated fridge item
   await Promise.all(lists.flatMap(list => 
     list.items
       .filter(groceryItem => {
         const cleanText = groceryItem.name
           .replace(/\[.*?\]/, '')
           .replace(/[*•]/, '')
           .trim();
         return cleanText.toLowerCase() === item.name.toLowerCase();
       })
       .map(async groceryItem => {
         const colorPrefix = updateData.quantity > 0 ? '[green]' : '[red]';
         await fetch(`http://localhost:5000/api/grocery-lists/${list.id}/items/${groceryItem.id}`, {
           method: 'PUT',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ 
             name: `${colorPrefix}• ${item.name}`
           }),
         });
       })
   ));

             await onUpdate?.();
        
      } catch (error) {
        console.error('Error updating item: ', error);
      } finally {
        setIsUpdating(false);
      }
    };

    const handleQuantityUpdate = () => handleUpdate({ quantity: localQuantity });
    const handleUnitUpdate = () => handleUpdate({ unit: localUnit });
  
    const handleMarkOutOfStock = async () => {
      if (confirm('Are you sure you want to mark this item as out of stock?')) {
        await handleUpdate({ quantity: 0 });
        setLocalQuantity(0);
      }
    };
  
    return (
      <div className={`grid grid-cols-5 gap-4 p-4 border-b ${isEven ? 'bg-gray-50' : 'bg-white'}`}>
        <div>{item.name}</div>
        <div>
          <input
            type="number"
            value={localQuantity}
            onChange={(e) => setLocalQuantity(parseInt(e.target.value) || 0)}
            onBlur={handleQuantityUpdate}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.target.blur();
              }
            }}
            className={`w-11 rounded border px-2 py-1 ${isUpdating ? 'bg-gray-100' : ''}`}
            disabled={isUpdating}
            min="0"
          />
        </div>
        <div>
          <input
            type="text"
            value={localUnit}
            onChange={(e) => setLocalUnit(e.target.value)}
            onBlur={handleQuantityUpdate}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.target.blur();
              }
            }}
            className={`w-10 rounded border px-2 py-1 ${isUpdating ? 'bg-gray-100' : ''}`}
            disabled={isUpdating}
          />
        </div>
        <div>
          <span className={`px-2 py-1 rounded-full text-sm ${
            localQuantity > 0 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {localQuantity > 0 ? 'Got It' : 'Out'}
          </span>
        </div>
        <div>
          <button
            onClick={handleMarkOutOfStock}
            disabled={isUpdating}
            className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
          >
            Out
          </button>
        </div>
      </div>
    );
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Fridge</h1>

        <ImprovedFridgeInventory
          addMode={addMode}
          setAddMode={setAddMode}
         handleManualAdd={handleManualAdd}
         handleTextParse={handleTextParse}
         handleFileUpload={handleFileUpload}
         pastedText={pastedText}
         setPastedText={setPastedText}
         processingResults={processingResults}
         newItem={newItem}
         setNewItem={setNewItem}
         getFilteredInventory={getFilteredInventory}
         inventoryFilter={inventoryFilter}
         setInventoryFilter={setInventoryFilter}
         groceryLists={groceryLists || []}
        fridgeItems={fridgeItems || []}
        onInventoryUpdate={handleInventoryUpdate}
        setFridgeItems={setFridgeItems}
       />
        {loading && (
          <div className="text-center py-8">
            <p>Loading...</p>
          </div>
        )}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Add to Inventory</h2>
          <div className="mb-4 flex gap-4">
            <button
              onClick={() => setAddMode('manual')}
              className={`px-4 py-2 rounded ${
                addMode === 'manual' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setAddMode('paste')}
              className={`px-4 py-2 rounded ${
                addMode === 'paste' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              Paste Receipt
            </button>
            <button
              onClick={() => setAddMode('file')}
              className={`px-4 py-2 rounded ${
                addMode === 'file' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              Upload File
            </button>
          </div>

          {addMode === 'manual' && (
  <form onSubmit={handleManualAdd} className="grid grid-cols-3 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-700">Item Name</label>
      <input
        type="text"
        value={newItem.name}
        onChange={(e) => setNewItem(prev => ({...prev, name: e.target.value}))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleManualAdd(e);
          }
        }}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        placeholder="Enter item name"
        required
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700">Quantity</label>
      <input
        type="number"
        value={newItem.quantity}
        onChange={(e) => setNewItem(prev => ({...prev, quantity: parseInt(e.target.value) || 0}))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleManualAdd(e);
          }
        }}
        className="mt-1 block w-10 rounded-md border border-gray-300 px-3 py-2"
        placeholder="0"
        required
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700">Unit</label>
      <input
        type="text"
        value={newItem.unit}
        onChange={(e) => setNewItem(prev => ({...prev, unit: e.target.value}))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleManualAdd(e);
          }
        }}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        placeholder="Optional unit"
      />
    </div>
    <div className="col-span-3">
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        Add Item
      </button>
    </div>
  </form>
)}

          {addMode === 'paste' && (
            <div>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="w-full h-48 border rounded-md p-2 mb-4"
                placeholder="Paste your receipt or grocery list here..."
              />
              <button
                onClick={() => handleTextParse(pastedText)}
                className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
              >
                Process Text
              </button>
              
              {processingResults && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Processing Results:</h3>
                  <div className="space-y-4">
                    <div className="bg-green-50 p-3 rounded">
                      <h4 className="text-green-800 font-medium mb-2">Matched Items:</h4>
                      {processingResults.matched_items.map((item, idx) => (
                        <div key={idx} className="text-green-700">
                          {item.matched_ingredient}: {item.quantity} 
                          ({item.action === 'updated' ? 'Updated' : 'Added'}, 
                          Total: {item.current_total})
                        </div>
                      ))}
                    </div>
                    
                    {processingResults.unmatched_items.length > 0 && (
                      <div className="bg-yellow-50 p-3 rounded">
                        <h4 className="text-yellow-800 font-medium mb-2">Unmatched Items:</h4>
                        {processingResults.unmatched_items.map((item, idx) => (
                          <div key={idx} className="text-yellow-700">{item}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {addMode === 'file' && (
            <div>
              <input
                type="file"
                accept=".txt,.csv"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          )}
        </div>

        

        {loading && (
          <div className="text-center py-8">
            <p>Loading...</p>
          </div>
        )}
      </div>
    </div>
  );
}