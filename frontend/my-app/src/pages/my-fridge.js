import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link'; // Add this import
import { ChevronDown, ChevronUp, Edit, Trash } from 'lucide-react';

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
  const [newItem, setNewItem] = useState({ name: '', quantity: '', unit: '' });
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
    .then(([recipesData, menusData, fridgeData, groceryListsData]) => {
      setRecipes(recipesData.recipes);
      setMenus(menusData.menus);
      setFridgeItems(fridgeData.ingredients);
      setGroceryLists(groceryListsData.lists || []);
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
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const filteredItems = getFilteredInventory();
  const midPoint = Math.ceil(filteredItems.length / 2);
  const leftColumnItems = filteredItems.slice(0, midPoint);
  const rightColumnItems = filteredItems.slice(midPoint);

  return (
    <div className="mb-8">
      {/* Collapsible Add to Inventory Section */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-white rounded-lg shadow p-4 mb-4 flex justify-between items-center hover:bg-gray-50"
      >
        <h2 className="text-xl font-semibold">Add to Inventory</h2>
        {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
      </button>

      {isExpanded && (
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
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantity</label>
                <input
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Unit</label>
                <input
                  type="text"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
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
          In Stock
        </button>
        <button
          onClick={() => setInventoryFilter('needed')}
          className={`px-4 py-2 rounded ${
            inventoryFilter === 'needed' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
        >
          Need to Get
        </button>
        <button
          onClick={() => setInventoryFilter('all')}
          className={`px-4 py-2 rounded ${
            inventoryFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
        >
          View All
        </button>
      </div>

       {/* Three-Column Layout */}
      <div className="flex gap-4 w-full">
   {/* First Inventory Column */}
   <div className="w-1/3">
     <div className="bg-white rounded-lg shadow">
       <div className="grid grid-cols-5 gap-4 p-4 font-medium text-gray-700 border-b">
         <div>Item Name</div>
         <div>Quantity</div>
         <div>Unit</div>
         <div>Status</div>
         <div>Actions</div>
       </div>
       {leftColumnItems.map((item, index) => (
         <InventoryRow key={item.id || index} item={item} isEven={index % 2 === 0} />
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
     <div className="bg-white rounded-lg shadow p-4">
       <h2 className="text-xl font-semibold mb-4">Grocery Lists</h2>
       {Array.isArray(groceryLists) && groceryLists.map((list) => (
         <div key={list.id} className="mb-4">
           <button
             onClick={() => {
               const elem = document.getElementById(`list-${list.id}`);
               if (elem) {
                 elem.classList.toggle('hidden');
               }
             }}
             className="flex items-center justify-between w-full p-2 bg-gray-50 hover:bg-gray-100 rounded"
           >
             <span>{list.name}</span>
             <ChevronDown size={20} />
           </button>
           <div id={`list-${list.id}`} className="hidden mt-2 pl-4">
             {Array.isArray(list.items) && list.items.map((item) => {
               const isInStock = fridgeItems.some(
                 (fridgeItem) => 
                   fridgeItem.name.toLowerCase() === item.name.toLowerCase().replace(/[*•\[\]]/g, '').trim() && 
                   fridgeItem.quantity > 0
               );
               return (
                 <div key={item.id} className={`p-2 ${isInStock ? 'text-green-600' : 'text-red-600'}`}>
                   {item.name.replace(/[*•\[\]]/g, '').trim()}
                 </div>
               );
             })}
           </div>
         </div>
       ))}
     </div>
   </div>
 </div>
        {/* Left Column */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow">
            <div className="grid grid-cols-5 gap-4 p-4 font-medium text-gray-700 border-b">
              <div>Item Name</div>
              <div>Quantity</div>
              <div>Unit</div>
              <div>Status</div>
              <div>Actions</div>
            </div>
            {leftColumnItems.map((item, index) => (
              <InventoryRow key={item.id || index} item={item} isEven={index % 2 === 0} />
            ))}
          </div>
        </div>
      

        {/* New Grocery Lists Column */}
        <div className="w-1/3">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Grocery Lists</h2>
            
              {Array.isArray(groceryLists) && groceryLists.map((list) => (
              <div key={list.id} className="mb-4">
                <button
                  onClick={() => {
                    const elem = document.getElementById(`list-${list.id}`);
                    if (elem) {
                      elem.classList.toggle('hidden');
                    }
                  }}
                  className="flex items-center justify-between w-full p-2 bg-gray-50 hover:bg-gray-100 rounded"
                >
                  <span>{list.name}</span>
                  <ChevronDown size={20} />
                </button>
                <div id={`list-${list.id}`} className="hidden mt-2 pl-4">
                {Array.isArray(list.items) && list.items.map((item) => {
                    const isInStock = fridgeItems.some(
                      (fridgeItem) => 
                        fridgeItem.name.toLowerCase() === item.name.toLowerCase().replace(/[*•\[\]]/g, '').trim() && 
                        fridgeItem.quantity > 0
                    );
                    return (
                      <div key={item.id} className={`p-2 ${isInStock ? 'text-green-600' : 'text-red-600'}`}>
                        {item.name.replace(/[*•\[\]]/g, '').trim()}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="flex-1">
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
      </div>
    
  );
};

// Helper component for inventory rows
const InventoryRow = ({ item, isEven }) => {
  const handleQuantityUpdate = async (e) => {
    try {
      const response = await fetch(`http://localhost:5000/api/fridge/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, quantity: e.target.value })
      });
      if (!response.ok) throw new Error('Failed to update quantity');
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const handleUnitUpdate = async (e) => {
    try {
      const response = await fetch(`http://localhost:5000/api/fridge/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, unit: e.target.value })
      });
      if (!response.ok) throw new Error('Failed to update unit');
    } catch (error) {
      console.error('Error updating unit:', error);
    }
  };

  return (
    <div className={`grid grid-cols-5 gap-4 p-4 border-b ${isEven ? 'bg-gray-50' : 'bg-white'}`}>
      <div>{item.name}</div>
      <div>
        <input
          type="number"
          value={item.quantity}
          onChange={handleQuantityUpdate}
          className="w-20 rounded border px-2 py-1"
        />
      </div>
      <div>
        <input
          type="text"
          value={item.unit || ''}
          onChange={handleUnitUpdate}
          className="w-20 rounded border px-2 py-1"
        />
      </div>
      <div>
        <span className={`px-2 py-1 rounded-full text-sm ${
          item.quantity > 0 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {item.quantity > 0 ? 'In Stock' : 'Out of Stock'}
        </span>
      </div>
      <div>
        <button
          onClick={async () => {
            if (confirm('Are you sure you want to mark this item as out of stock?')) {
              try {
                const response = await fetch(`http://localhost:5000/api/fridge/${item.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...item, quantity: 0 })
                });
                if (!response.ok) throw new Error('Failed to update item');
              } catch (error) {
                console.error('Error updating item:', error);
              }
            }
          }}
          className="text-red-600 hover:text-red-800 font-medium"
        >
          Mark Out of Stock
        </button>
      </div>
    </div>
  );
};

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
        setNewItem({ name: '', quantity: '', unit: '' });
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Inventory Management</h1>

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
            <form onSubmit={handleManualAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Item Name</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantity</label>
                <input
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Unit</label>
                <input
                  type="text"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <button 
                type="submit" 
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Add Item
              </button>
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

        {viewMode === 'inventory' ? (
          <div className="mb-8">
            <div className="mb-4 flex gap-4">
              <button
                onClick={() => setInventoryFilter('inStock')}
                className={`px-4 py-2 rounded ${
                  inventoryFilter === 'inStock' ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
              >
                In Stock
              </button>
              <button
                onClick={() => setInventoryFilter('needed')}
                className={`px-4 py-2 rounded ${
                  inventoryFilter === 'needed' ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
              >
                Need to Get
              </button>
              <button
                onClick={() => setInventoryFilter('all')}
                className={`px-4 py-2 rounded ${
                  inventoryFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
              >
                View All
              </button>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="grid grid-cols-5 gap-4 p-4 font-medium text-gray-700 border-b">
                <div>Item Name</div>
                <div>Quantity</div>
                <div>Unit</div>
                <div>Status</div>
                <div>Actions</div>
              </div>
              {getFilteredInventory().map((item, index) => (
                <div 
                  key={item.id || index} 
                  className={`grid grid-cols-5 gap-4 p-4 border-b ${
                    index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                  }`}
                >
                  <div>{item.name}</div>
                  <div>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={async (e) => {
                        const newQuantity = e.target.value;
                        try {
                          const response = await fetch(`http://localhost:5000/api/fridge/${item.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ...item, quantity: newQuantity })
                          });
                          if (response.ok) {
                            const fridgeResponse = await fetch('http://localhost:5000/api/fridge');
                            const fridgeData = await fridgeResponse.json();
                            setFridgeItems(fridgeData.ingredients);
                          }
                        } catch (error) {
                          console.error('Error updating quantity:', error);
                        }
                      }}
                      className="w-20 rounded border px-2 py-1"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={item.unit || ''}
                      onChange={async (e) => {
                        const newUnit = e.target.value;
                        try {
                          const response = await fetch(`http://localhost:5000/api/fridge/${item.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ...item, unit: newUnit })
                          });
                          if (response.ok) {
                            const fridgeResponse = await fetch('http://localhost:5000/api/fridge');
                            const fridgeData = await fridgeResponse.json();
                            setFridgeItems(fridgeData.ingredients);
                          }
                        } catch (error) {
                          console.error('Error updating unit:', error);
                        }
                      }}
                      className="w-20 rounded border px-2 py-1"
                    />
                  </div>
                  <div>
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      item.quantity > 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                  <div>
                  
                  <button
  onClick={async () => {
    if (confirm('Are you sure you want to mark this item as out of stock?')) {
      try {
        // First try updating quantity directly using existing endpoint
        const response = await fetch(`http://localhost:5000/api/fridge/${item.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...item,
            quantity: 0
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Refresh the fridge items
        const fridgeResponse = await fetch('http://localhost:5000/api/fridge');
        const fridgeData = await fridgeResponse.json();
        setFridgeItems(fridgeData.ingredients);
      } catch (error) {
        console.error('Error updating item:', error);
        alert('Failed to mark item as out of stock. Please try again.');
      }
    }
  }}
  className="text-red-600 hover:text-red-800 font-medium"
>
  Mark Out of Stock
</button>

                    
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              {viewMode === 'recipe' ? (
                <input
                  type="text"
                  placeholder="Search recipes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              ) : (
                <select
                  onChange={(e) => handleMenuSelect(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Select a menu...</option>
                  {menus.map(menu => (
                    <option key={menu.id} value={menu.id}>
                      {menu.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredRecipes.map(recipe => (
                <div key={recipe.id} className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-xl font-semibold mb-4">{recipe.name}</h3>
                  <p className="text-gray-600 mb-4">{recipe.description}</p>
                  <div className="space-y-2">
                    <h4 className="font-medium">Required Ingredients:</h4>
                    {recipe.ingredients.map((ingredient, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded ${
                          checkIngredientStatus(ingredient)
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {ingredient}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {loading && (
          <div className="text-center py-8">
            <p>Loading...</p>
          </div>
        )}
      </div>
    </div>
  );
}