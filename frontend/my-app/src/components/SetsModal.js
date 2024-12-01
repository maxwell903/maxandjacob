// components/SetsModal.js
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const SetsModal = ({ exercise, isOpen, onClose }) => {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && exercise) {
      fetchSets();
    }
  }, [isOpen, exercise]);

  const fetchSets = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/exercise/${exercise.id}/sets`);
      const data = await response.json();
      
      if (data.sets.length === 0) {
        // Initialize with empty sets based on amount_sets
        const initialSets = Array.from({ length: exercise.amount_sets }, (_, i) => ({
          set_number: i + 1,
          reps: 0,
          weight: 0
        }));
        setSets(initialSets);
      } else {
        setSets(data.sets);
      }
    } catch (error) {
      setError('Failed to fetch sets');
      console.error('Error fetching sets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetChange = (index, field, value) => {
    const newSets = [...sets];
    newSets[index] = {
      ...newSets[index],
      [field]: Number(value)
    };
    setSets(newSets);
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/exercise/${exercise.id}/sets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sets })
      });

      if (!response.ok) throw new Error('Failed to save sets');
      onClose();
    } catch (error) {
      setError('Failed to save sets');
      console.error('Error saving sets:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Manage Sets - {exercise.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-4">Loading sets...</div>
        ) : error ? (
          <div className="text-red-600 py-4">{error}</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 font-medium text-sm text-gray-600 mb-2">
              <div>Set</div>
              <div>Reps</div>
              <div>Weight (lbs)</div>
            </div>
            {sets.map((set, index) => (
              <div key={index} className="grid grid-cols-3 gap-4">
                <div className="flex items-center">{set.set_number}</div>
                <input
                  type="number"
                  min="0"
                  value={set.reps}
                  onChange={(e) => handleSetChange(index, 'reps', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={set.weight}
                  onChange={(e) => handleSetChange(index, 'weight', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
            ))}

            <div className="flex justify-end mt-6">
              <button
                onClick={handleSubmit}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Save Sets
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SetsModal;