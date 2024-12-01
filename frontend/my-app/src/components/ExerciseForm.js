import React, { useState } from 'react';
import Link from 'next/link';

const ExerciseForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    workout_type: 'Push',
    major_groups: '',
    minor_groups: '',
    amount_sets: '',
    amount_reps: '',
    weight: '',
    rest_time: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      console.log('Submitting exercise data:', formData); // Debug log
      
      const response = await fetch('http://localhost:5000/api/exercise', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          major_groups: formData.major_groups.split(',').map(g => g.trim()),
          minor_groups: formData.minor_groups.split(',').map(g => g.trim()),
          amount_sets: parseInt(formData.amount_sets),
          amount_reps: parseInt(formData.amount_reps),
          weight: parseFloat(formData.weight),
          rest_time: parseInt(formData.rest_time)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save exercise');
      }
      
      const data = await response.json();
      console.log('Server response:', data); // Debug log
      
      setFormData({
        name: '',
        workout_type: 'Push',
        major_groups: '',
        minor_groups: '',
        amount_sets: '',
        amount_reps: '',
        weight: '',
        rest_time: ''
      });
      
      alert('Exercise saved successfully!');
    } catch (error) {
      console.error('Error saving exercise:', error);
      alert(`Failed to save exercise: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/meal-prep" className="text-blue-600 hover:text-blue-800">
            ← Back to Meal Prep
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Enter Exercise</h1>
        
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exercise Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Workout Type
            </label>
            <select
              value={formData.workout_type}
              onChange={(e) => setFormData(prev => ({ ...prev, workout_type: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option>Push</option>
              <option>Pull</option>
              <option>Legs</option>
              <option>Cardio</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Major Muscle Groups (comma-separated)
            </label>
            <input
              type="text"
              required
              value={formData.major_groups}
              onChange={(e) => setFormData(prev => ({ ...prev, major_groups: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="e.g., Chest, Triceps"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minor Muscle Groups (comma-separated)
            </label>
            <input
              type="text"
              required
              value={formData.minor_groups}
              onChange={(e) => setFormData(prev => ({ ...prev, minor_groups: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="e.g., Front Deltoid, Core"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sets
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.amount_sets}
                onChange={(e) => setFormData(prev => ({ ...prev, amount_sets: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reps
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.amount_reps}
                onChange={(e) => setFormData(prev => ({ ...prev, amount_reps: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight (lbs)
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.5"
                value={formData.weight}
                onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rest Time (seconds)
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.rest_time}
                onChange={(e) => setFormData(prev => ({ ...prev, rest_time: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Save Exercise
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExerciseForm;