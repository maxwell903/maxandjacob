import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const ExerciseHistory = () => {
  const router = useRouter();
  const { id } = router.query;
  const [exercise, setExercise] = useState(null);
  const [setHistory, setSetHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchExerciseAndHistory();
    }
  }, [id]);

  const fetchExerciseAndHistory = async () => {
    try {
      // Fetch exercise details
      const exerciseResponse = await fetch(`http://localhost:5000/api/exercises/${id}`);
      if (!exerciseResponse.ok) throw new Error('Failed to fetch exercise');
      const exerciseData = await exerciseResponse.ok.json();
      setExercise(exerciseData);

      // Fetch set history
      const historyResponse = await fetch(`http://localhost:5000/api/exercise/${id}/sets/history`);
      if (!historyResponse.ok) throw new Error('Failed to fetch history');
      const historyData = await historyResponse.json();
      setSetHistory(historyData.history);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div>Loading...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-red-600">{error}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/meal-prep" className="text-blue-600 hover:text-blue-800">
            ← Back to Workout
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {exercise && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{exercise.name}</h1>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h2 className="text-sm font-medium text-gray-500">Major Muscle Groups</h2>
                <p className="mt-1">{exercise.major_groups.join(', ')}</p>
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-500">Minor Muscle Groups</h2>
                <p className="mt-1">{exercise.minor_groups.join(', ')}</p>
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-500">Rest Time</h2>
                <p className="mt-1">{exercise.rest_time} seconds</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Set History</h2>
          {setHistory.map((entry, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-4">
                {formatDate(entry.created_at)}
              </div>
              <div className="grid grid-cols-3 gap-4 font-medium text-sm text-gray-600 mb-2">
                <div>Set</div>
                <div>Reps</div>
                <div>Weight (lbs)</div>
              </div>
              {entry.sets.map((set, setIndex) => (
                <div key={setIndex} className="grid grid-cols-3 gap-4 py-2 border-b last:border-0">
                  <div>{set.set_number}</div>
                  <div>{set.reps}</div>
                  <div>{set.weight}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExerciseHistory;