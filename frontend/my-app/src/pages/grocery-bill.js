import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

// Editable Row Component
const EditableRow = ({ item, onUpdate, isEven }) => {
  const [localData, setLocalData] = useState({
    quantity: item.quantity || 0,
    unit: item.unit || '',
    price_per: item.price_per || 0,
    total: item.total || 0
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Update total when quantity or price_per changes
  useEffect(() => {
    const total = localData.quantity * localData.price_per;
    setLocalData(prev => ({ ...prev, total }));
  }, [localData.quantity, localData.price_per]);

  const handleUpdate = async (field, value) => {
    try {
     
      setIsUpdating(true);
      const updatedData = { ...localData, [field]: value };
      
      if (field === 'quantity' || field === 'price_per') {
        updatedData.total = updatedData.quantity * updatedData.price_per;
      }

      const response = await fetch(`http://localhost:5000/api/fridge/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...item,
          ...updatedData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update item');
      }

      setLocalData(updatedData);
      onUpdate(item.id, updatedData);
    } catch (error) {
      console.error('Error updating item:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={`grid grid-cols-5 gap-2 p-2 ${isEven ? 'bg-gray-50' : 'bg-white'} items-center`}>
      <div className="text-sm font-medium">{item.name}</div>
      <div>
        <input
          type="number"
          value={localData.quantity}
          onChange={(e) => {
            const value = parseFloat(e.target.value) || 0;
            setLocalData(prev => ({ ...prev, quantity: value }));
          }}
          onBlur={(e) => handleUpdate('quantity', parseFloat(e.target.value) || 0)}
          className="w-20 p-1 border rounded text-right"
          min="0"
          step="1"
          disabled={isUpdating}
        />
      </div>
      <div>
        <input
          type="text"
          value={localData.unit}
          onChange={(e) => {
            setLocalData(prev => ({ ...prev, unit: e.target.value }));
          }}
          onBlur={(e) => handleUpdate('unit', e.target.value)}
          className="w-20 p-1 border rounded"
          disabled={isUpdating}
        />
      </div>
      <div>
        <input
          type="number"
          value={localData.price_per}
          onChange={(e) => {
            const value = parseFloat(e.target.value) || 0;
            setLocalData(prev => ({ ...prev, price_per: value }));
          }}
          onBlur={(e) => handleUpdate('price_per', parseFloat(e.target.value) || 0)}
          className="w-24 p-1 border rounded text-right"
          min="0"
          step="1"
          disabled={isUpdating}
        />
      </div>
      <div className="text-right">
        ${localData.total.toFixed(2)}
      </div>
    </div>
  );
};

const GroceryBill = () => {
  const [groceryLists, setGroceryLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [matchedItems, setMatchedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGroceryLists();
  }, []);

  useEffect(() => {
    if (selectedList) {
      fetchMatchedItems(selectedList);
    }
  }, [selectedList]);

  const fetchGroceryLists = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/grocery-lists');
      const data = await response.json();
      setGroceryLists(data.lists || []);
      setLoading(false);
    } catch (error) {
      setError('Failed to fetch grocery lists');
      setLoading(false);
    }
  };

  const fetchMatchedItems = async (listId) => {
    try {
      // First get the grocery list items
      const listResponse = await fetch(`http://localhost:5000/api/grocery-lists/${listId}`);
      const listData = await listResponse.json();
      
      // Get all fridge items
      const fridgeResponse = await fetch('http://localhost:5000/api/fridge');
      const fridgeData = await fridgeResponse.json();
      
      // Match items between grocery list and fridge
      const matched = listData.items
        .filter(item => {
          const cleanName = item.name
            .replace(/\[(red|green)\]•/, '')
            .replace(/[*•]/, '')
            .trim()
            .toLowerCase();
          
          if (cleanName.startsWith('###') || cleanName.startsWith('**')) {
            return false;
          }
          
          return fridgeData.ingredients.some(
            fridgeItem => fridgeItem.name.toLowerCase() === cleanName
          );
        })
        .map(item => {
          const cleanName = item.name
            .replace(/\[(red|green)\]•/, '')
            .replace(/[*•]/, '')
            .trim();
          
          const fridgeItem = fridgeData.ingredients.find(
            fi => fi.name.toLowerCase() === cleanName.toLowerCase()
          );
          
          return {
            ...fridgeItem,
            total: (fridgeItem.quantity || 0) * (fridgeItem.price_per || 0)
          };
        });
      
      setMatchedItems(matched);
    } catch (error) {
      setError('Failed to fetch matched items');
    }
  };

  const handleItemUpdate = (itemId, updatedData) => {
    setMatchedItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...updatedData } : item
    ));
  };

  const calculateTotal = () => {
    return matchedItems.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  // Split items into two columns
  const midpoint = Math.ceil(matchedItems.length / 2);
  const leftItems = matchedItems.slice(0, midpoint);
  const rightItems = matchedItems.slice(midpoint);

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
            ← Back to Home
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Grocery Bill</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="mb-6">
          <select
            onChange={(e) => setSelectedList(e.target.value)}
            value={selectedList || ""}
            className="w-full md:w-64 p-2 border rounded-lg"
          >
            <option value="">Select a Grocery List</option>
            {groceryLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </div>

        {selectedList && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="grid grid-cols-2 gap-8">
              {/* Left Column */}
              <div>
                <div className="grid grid-cols-5 gap-2 p-2 font-medium bg-gray-100 rounded-t">
                  <div>Item</div>
                  <div>Quantity</div>
                  <div>Unit</div>
                  <div>Price Per</div>
                  <div className="text-right">Total</div>
                </div>
                <div className="space-y-1">
                  {leftItems.map((item, idx) => (
                    <EditableRow
                      key={item.id}
                      item={item}
                      isEven={idx % 2 === 0}
                      onUpdate={handleItemUpdate}
                    />
                  ))}
                </div>
              </div>

              {/* Right Column */}
              <div>
                <div className="grid grid-cols-5 gap-2 p-2 font-medium bg-gray-100 rounded-t">
                  <div>Item</div>
                  <div>Quantity</div>
                  <div>Unit</div>
                  <div>Price Per</div>
                  <div className="text-right">Total</div>
                </div>
                <div className="space-y-1">
                  {rightItems.map((item, idx) => (
                    <EditableRow
                      key={item.id}
                      item={item}
                      isEven={idx % 2 === 0}
                      onUpdate={handleItemUpdate}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 text-right text-xl font-semibold">
              Total Bill: ${calculateTotal().toFixed(2)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroceryBill;