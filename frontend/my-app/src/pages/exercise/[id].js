import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function ExerciseHistory() {
  const router = useRouter();
  const { id } = router.query;
  const [exercise, setExercise] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    const fetchExerciseAndHistory = async () => {
      try {
        setLoading(true);

        // Fetch exercise details
        const exerciseResponse = await fetch(`http://localhost:5000/api/exercises/${id}`);
        if (!exerciseResponse.ok) {
          throw new Error('Failed to fetch exercise details');
        }
        const exerciseData = await exerciseResponse.json();
        setExercise(exerciseData);

        // Fetch exercise history
        const historyResponse = await fetch(`http://localhost:5000/api/exercise/${id}/sets/history`);
        if (!historyResponse.ok) {
          throw new Error('Failed to fetch exercise history');
        }
        const historyData = await historyResponse.json();
        
        // Sort history by date in descending order
        const sortedHistory = historyData.history.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        
        setHistory(sortedHistory);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchExerciseAndHistory();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <p className="text-gray-600">Loading exercise history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-100 text-red-700 p-8 rounded-lg shadow-md">
          <p className="mb-4">{error}</p>
          <Link
            href="/meal-prep"
            className="text-blue-600 hover:text-blue-800 inline-flex items-center"
          >
            ← Back to Workout
          </Link>
        </div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <p className="text-gray-600 mb-4">Exercise not found</p>
          <Link
            href="/meal-prep"
            className="text-blue-600 hover:text-blue-800 inline-flex items-center"
          >
            ← Back to Workout
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link
            href="/meal-prep"
            className="text-blue-600 hover:text-blue-800 inline-flex items-center"
          >
            ← Back to Workout
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{exercise.name} History</h1>
            <div className="mt-2 text-sm text-gray-600">
              <p>Workout Type: {exercise.workout_type}</p>
              <p>Target Sets: {exercise.amount_sets} × {exercise.amount_reps} reps</p>
              <p>Base Weight: {exercise.weight} lbs</p>
              <p>Rest Period: {exercise.rest_time} seconds</p>
            </div>
          </div>

          {history.length === 0 ? (
            <p className="text-gray-600">No workout history yet</p>
          ) : (
            <div className="space-y-6">
              {history.map((session) => (
                <div key={session.id} className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">
                    {new Date(session.created_at).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left">
                          <th className="pb-2 pr-4">Set</th>
                          <th className="pb-2 pr-4">Weight (lbs)</th>
                          <th className="pb-2">Reps</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.sets.map((set, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                            <td className="py-2 pr-4">{set.set_number}</td>
                            <td className="py-2 pr-4">{set.weight}</td>
                            <td className="py-2">{set.reps}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}