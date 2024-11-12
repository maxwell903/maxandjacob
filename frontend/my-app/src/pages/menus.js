import React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Menus() {
  const [menus, setMenus] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMenuName, setNewMenuName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/menus');
      if (!response.ok) throw new Error('Failed to fetch menus');
      const data = await response.json();
      setMenus(data.menus);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMenu = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMenuName }),
      });

      if (!response.ok) throw new Error('Failed to create menu');
      
      setNewMenuName('');
      setShowCreateForm(false);
      fetchMenus();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <p className="text-gray-600">Loading menus...</p>
        </div>
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

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Menus</h1>
          <button
            onClick={() => setShowCreateForm(true)}
            className="rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700"
          >
            Create New Menu
          </button>
        </div>

        {showCreateForm && (
          <div className="mb-8 p-6 bg-white rounded-lg shadow-lg">
            <form onSubmit={handleCreateMenu} className="space-y-4">
              <div>
                <label htmlFor="menuName" className="block text-sm font-medium text-gray-700">
                  Menu Name
                </label>
                <input
                  type="text"
                  id="menuName"
                  value={newMenuName}
                  onChange={(e) => setNewMenuName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2"
                  required
                />
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                >
                  Create Menu
                </button>
              </div>
            </form>
          </div>
        )}

        {error && (
          <div className="mb-8 rounded-lg bg-red-100 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {menus.map((menu) => (
            <Link
              href={`/menu/${menu.id}`}
              key={menu.id}
              className="block no-underline"
            >
              <div className="rounded-lg bg-white p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl cursor-pointer">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {menu.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {menu.recipe_count} {menu.recipe_count === 1 ? 'recipe' : 'recipes'}
                </p>
                <div className="mt-4 text-blue-600 hover:text-blue-700">
                  View Menu →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}