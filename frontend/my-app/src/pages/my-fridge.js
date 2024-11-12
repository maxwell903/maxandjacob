// pages/my-fridge.js
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function MyFridge() {
  const [fridgeItems, setFridgeItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', quantity: 1, unit: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [receiptText, setReceiptText] = useState('');
  const [parseResults, setParseResults] = useState(null);

  // Add this function to MyFridge component:
const handleReceiptParse = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/fridge/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipt_text: receiptText }),
      });
      if (!response.ok) throw new Error('Failed to parse receipt');
      const data = await response.json();
      setParseResults(data);
      fetchFridgeItems(); // Refresh fridge items
      setReceiptText(''); // Clear input
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchFridgeItems();
  }, []);

  const fetchFridgeItems = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/fridge');
      if (!response.ok) throw new Error('Failed to fetch fridge items');
      const data = await response.json();
      setFridgeItems(data.ingredients);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/fridge/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      if (!response.ok) throw new Error('Failed to add item');
      fetchFridgeItems();
      setNewItem({ name: '', quantity: 1, unit: '' });
    } catch (err) {
      setError(err.message);
    }
  };

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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Fridge</h1>

        {/* Receipt Parser */}
            <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4">Parse Receipt</h2>
                <form onSubmit={handleReceiptParse} className="space-y-4">
                    <textarea
                    value={receiptText}
                    onChange={(e) => setReceiptText(e.target.value)}
                    className="w-full rounded-lg border px-4 py-2 h-32"
                    placeholder="Paste your receipt text here..."
                    required
                />
                <button
                    type="submit"
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                >
                    Parse Receipt
                </button>
            </form>
  
            {parseResults && (
                <div className="mt-4">
                    <h3 className="font-semibold">Matched Items: {parseResults.total_matches}</h3>
                    <div className="mt-2 space-y-2">
                        {parseResults.matched_items.map((item, index) => (
                            <div key={index} className="text-sm text-gray-600">
                                Matched "{item.receipt_item}" to "{item.matched_ingredient}" 
                                (Quantity: {item.quantity})
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
        {/* Add Item Form */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Add New Item</h2>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Ingredient name"
                value={newItem.name}
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                className="rounded-lg border px-4 py-2"
                required
              />
              <input
                type="number"
                value={newItem.quantity}
                onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value)})}
                className="rounded-lg border px-4 py-2"
                min="1"
                required
              />
              <input
                type="text"
                placeholder="Unit (optional)"
                value={newItem.unit}
                onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                className="rounded-lg border px-4 py-2"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Add to Fridge
            </button>
          </form>
        </div>

        {/* Fridge Items List */}
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fridgeItems.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-gray-600">
                  {item.quantity} {item.unit}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}