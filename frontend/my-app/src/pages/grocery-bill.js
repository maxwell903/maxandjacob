import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Upload, X, FileText, Clipboard, ChevronDown } from 'lucide-react';

// Keep the existing EditableRow component exactly as is
const EditableRow = ({ item, onUpdate, isEven }) => {
  const [localData, setLocalData] = useState({
    quantity: item.quantity || 0,
    unit: item.unit || '',
    price_per: item.price_per || 0,
    total: item.total || 0
  });
  const [isUpdating, setIsUpdating] = useState(false);

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

      const response = await fetch(`http://localhost:5000/api/grocery-lists/${item.list_id}/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });

      if (!response.ok) throw new Error('Failed to update item');
      setLocalData(updatedData);
      onUpdate(item.id, updatedData);
    } catch (error) {
      console.error('Error updating item:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <tr className={`border-b ${isEven ? 'bg-gray-50' : ''}`}>
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
          disabled={isUpdating}
        />
      </td>
      <td className="py-2 px-4">
        <input
          type="text"
          value={localData.unit}
          onChange={(e) => setLocalData(prev => ({ ...prev, unit: e.target.value }))}
          onBlur={(e) => handleUpdate('unit', e.target.value)}
          className="w-20 p-1 border rounded"
          disabled={isUpdating}
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
          step="0.01"
          disabled={isUpdating}
        />
      </td>
      <td className="py-2 px-4 text-right">
        ${localData.total.toFixed(2)}
      </td>
    </tr>
  );
};

// Add Receipt Upload Modal Component
const ReceiptUploadModal = ({ isOpen, onClose, onUpload }) => {
  const [receiptText, setReceiptText] = useState('');
  const [isPasting, setIsPasting] = useState(true);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const text = await file.text();
      onUpload(text);
      onClose();
    }
  };

  const handlePastedText = () => {
    if (receiptText.trim()) {
      onUpload(receiptText);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Upload Receipt</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => setIsPasting(true)}
              className={`px-4 py-2 rounded-lg ${
                isPasting ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Clipboard size={20} />
                <span>Paste Text</span>
              </div>
            </button>
            <button
              onClick={() => setIsPasting(false)}
              className={`px-4 py-2 rounded-lg ${
                !isPasting ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText size={20} />
                <span>Upload File</span>
              </div>
            </button>
          </div>

          {isPasting ? (
            <div className="space-y-4">
              <textarea
                value={receiptText}
                onChange={(e) => setReceiptText(e.target.value)}
                className="w-full h-64 border rounded-lg p-2"
                placeholder="Paste your receipt text here..."
              />
              <button
                onClick={handlePastedText}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Process Text
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="file"
                accept=".txt,.csv"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Modify the main GroceryBill component
const GroceryBill = () => {
  const [groceryLists, setGroceryLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [matchedItems, setMatchedItems] = useState([]);
  const [unMatchedItems, setUnMatchedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [parsedResults, setParsedResults] = useState(null);
  const [showImportMenu, setShowImportMenu] = useState(false);

  useEffect(() => {
    fetchGroceryLists();
  }, []);

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

  const handleReceiptUpload = async (receiptText) => {
    try {
      const response = await fetch('http://localhost:5000/api/grocery-bill/parse-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receipt_text: receiptText }),
      });

      if (!response.ok) {
        throw new Error('Failed to parse receipt');
      }

      const data = await response.json();
      setParsedResults(data);
      console.log("Parsed results:", data); // For debugging

      // If a list is selected, update the matched items for that list
      if (selectedList) {
        const selectedListName = groceryLists.find(list => list.id === selectedList)?.name;
        if (selectedListName && data.grouped_items[selectedListName]) {
          setMatchedItems(data.grouped_items[selectedListName]);
        } else {
          setMatchedItems([]);
        }
      } else {
        setMatchedItems([]);
      }

      setUnMatchedItems(data.unmatched_items || []);
    } catch (error) {
      setError('Failed to process receipt');
      console.error('Error processing receipt:', error);
    }
};

  const handleListSelect = (listId) => {
    setSelectedList(listId);
    if (parsedResults && listId) {
      const selectedListName = groceryLists.find(list => list.id === listId)?.name;
      if (selectedListName && parsedResults.grouped_items[selectedListName]) {
        setMatchedItems(parsedResults.grouped_items[selectedListName]);
      } else {
        setMatchedItems([]);
      }
    } else {
      setMatchedItems([]);
    }
  };

  const handleItemUpdate = (itemId, updatedData) => {
    setMatchedItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, ...updatedData } : item
      )
    );
  };

  const updateItemLists = (listId, groupedItems, unMatchedItems) => {
    if (listId && groupedItems) {
      const listItems = groupedItems[listId] || [];
      setMatchedItems(listItems);
    } else {
      setMatchedItems([]);
    }

    setUnMatchedItems(unMatchedItems || []);
  };

  const calculateTotal = (items) => {
    return items.reduce((sum, item) => sum + (item.total || 0), 0);
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
            ← Back to Home
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Grocery Bill</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Upload size={20} />
              <span>Upload Receipt</span>
            </button>
            <select
              onChange={(e) => handleListSelect(e.target.value)}
              value={selectedList || ''}
              className="border rounded-lg px-4"
            >
              <option value="">Select a List</option>
              {groceryLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Item</th>
                  <th className="text-center py-2 px-4">Quantity</th>
                  <th className="text-center py-2 px-4">Unit</th>
                  <th className="text-center py-2 px-4">Price Per</th>
                  <th className="text-right py-2 px-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {matchedItems.map((item, index) => (
                  <EditableRow
                    key={`${item.item_name}-${index}`}
                    item={{
                      id: index,
                      name: item.item_name,
                      quantity: item.quantity,
                      unit: item.unit,
                      price_per: item.price,
                      total: item.quantity * item.price,
                      list_id: selectedList,
                    }}
                    onUpdate={handleItemUpdate}
                    isEven={index % 2 === 0}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan="4" className="py-2 px-4 text-right">
                    Total:
                  </td>
                  <td className="py-2 px-4 text-right">
                    ${calculateTotal(matchedItems).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {unMatchedItems.length > 0 && (
   <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
     <div className="flex justify-between items-center mb-4">
       <h2 className="text-xl font-semibold">Unmatched Items</h2>
       <div className="relative">
         <button
           onClick={() => setShowImportMenu(!showImportMenu)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
         >
           Import <ChevronDown className="h-4 w-4 ml-2" />
         </button>
         {showImportMenu && (
           <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
             <div className="py-1">
               <button
                 onClick={async () => {
                   try {
                     const response = await fetch('http://localhost:5000/api/import-to-fridge', {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({ items: unMatchedItems })
                     });
                     if (response.ok) {
                       alert('Items imported to fridge successfully');
                       setShowImportMenu(false);
                     }
                   } catch (error) {
                     console.error('Error importing to fridge:', error);
                     alert('Failed to import items to fridge');
                   }
                 }}
                 className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
               >
                 Import to My Fridge
               </button>
               <button
                 onClick={async () => {
                   const listName = prompt('Enter name for new grocery list:');
                   if (!listName) return;
                   
                   try {
                     const response = await fetch('http://localhost:5000/api/import-to-grocery-list', {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({
                         name: listName,
                         items: unMatchedItems
                       })
                     });
                     if (response.ok) {
                       alert('Grocery list created successfully');
                       setShowImportMenu(false);
                     }
                   } catch (error) {
                     console.error('Error creating grocery list:', error);
                     alert('Failed to create grocery list');
                   }
                 }}
                 className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
               >
                 Import to Grocery List
               </button>
             </div>
           </div>
         )}
       </div>
     </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Item</th>
                    <th className="text-center py-2 px-4">Quantity</th>
                    <th className="text-center py-2 px-4">Unit</th>
                    <th className="text-center py-2 px-4">Price Per</th>
                    <th className="text-right py-2 px-4">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {unMatchedItems.map((item, index) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? 'bg-gray-50' : ''}
                    >
                      <td className="py-2 px-4">{item.item_name}</td>
                      <td className="py-2 px-4 text-center">
                        {item.quantity}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {item.unit || '-'}
                      </td>
                      <td className="py-2 px-4 text-center">
                        ${item.price?.toFixed(2) || '0.00'}
                      </td>
                      <td className="py-2 px-4 text-right">
                        $
                        {((item.price || 0) * (item.quantity || 0)).toFixed(
                          2
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td colSpan="4" className="py-2 px-4 text-right">
                      Total:
                    </td>
                    <td className="py-2 px-4 text-right">
                      ${calculateTotal(unMatchedItems).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {parsedResults && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Summary</h2>
            <div className="space-y-2">
              {Object.entries(parsedResults.grouped_items).map(
                ([listName, items]) => (
                  <div key={listName} className="flex justify-between">
                    <span>{listName}:</span>
                    <span>
                      ${calculateTotal(items).toFixed(2)}
                    </span>
                  </div>
                )
              )}
              <div className="flex justify-between">
                <span>Unmatched Items:</span>
                <span>
                  ${calculateTotal(parsedResults.unmatched_items).toFixed(2)}
                </span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Grand Total:</span>
                  <span>
                    $
                    {(
                      calculateTotal(
                        Object.values(parsedResults.grouped_items).flat()
                      ) +
                      calculateTotal(parsedResults.unmatched_items)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <ReceiptUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUpload={handleReceiptUpload}
        />
      </div>
    </div>
  );
};

export default GroceryBill;