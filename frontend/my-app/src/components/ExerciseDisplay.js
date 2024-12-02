import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import SetsModal from './SetsModal';

const ExerciseCard = ({ exercise }) => {
    const [showSetsModal, setShowSetsModal] = useState(false);
    const [showWorkoutModal, setShowWorkoutModal] = useState(false);
    const [workouts, setWorkouts] = useState([]);
    const router = useRouter();
    const [showWorkoutSelect, setShowWorkoutSelect] = useState(false);
    useEffect(() => {
       if (showWorkoutModal) {
       fetch('http://localhost:5000/api/workouts')
        .then(res => res.json())
        .then(data => setWorkouts(data.workouts || []));
    }
}, [showWorkoutModal]);
  
    return (
      <>
        <div className="flex-none w-64 bg-white p-4 rounded-lg shadow-md">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold mb-2">{exercise.name}</h3>
          <button
           onClick={() => setShowWorkoutModal(true)}
           className="text-blue-600 hover:text-blue-800"
           title="Add to Workout"
         >
           <Plus size={20} className="rounded-full border-2 border-current" />
         </button>
         </div>
          <p className="text-sm text-gray-600 mb-1">
            Major: {Array.isArray(exercise.major_groups) 
              ? exercise.major_groups.join(', ') 
              : exercise.major_groups}
          </p>
          <p className="text-sm text-gray-600">
            Minor: {Array.isArray(exercise.minor_groups) 
              ? exercise.minor_groups.join(', ') 
              : exercise.minor_groups}
          </p>
          <div className="mt-2 text-sm text-gray-500">
            {exercise.amount_sets} sets • Rest: {exercise.rest_time}s
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setShowSetsModal(true)}
              className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm"
            >
              Sets
            </button>
            <button
              onClick={() => router.push(`/exercise/${exercise.id}`)}
              className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 text-sm"
            >
              History
            </button>
          </div>
        </div>
        
        <SetsModal
          exercise={exercise}
          isOpen={showSetsModal}
          onClose={() => setShowSetsModal(false)}
        />
        {showWorkoutModal && (
       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
         <div className="bg-white rounded-lg p-6 w-96">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-lg font-semibold">Add to Workout</h3>
             <button
               onClick={() => setShowWorkoutModal(false)}
               className="text-gray-500 hover:text-gray-700"
             >
               <X size={20} />
             </button>
           </div>
           <div className="space-y-2">
             {workouts.map((workout) => (
               <button
                 key={workout.id}
                 onClick={async () => {
                   try {
                     await fetch(`http://localhost:5000/api/workouts/${workout.id}/exercise`, {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({ exercise_id: exercise.id })
                     });
                     setShowWorkoutModal(false);
                   } catch (error) {
                     console.error('Error adding exercise to workout:', error);
                   }
                 }}
                 className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-md"
               >
                 {workout.name}
               </button>
             ))}
           </div>
         </div>
       </div>
     )}
      </>
    );
  };
  
  const ExerciseSection = ({ title, exercises, onScroll }) => {
    const scrollContainer = React.useRef(null);
  
    const scroll = (direction) => {
      if (scrollContainer.current) {
        const scrollAmount = direction === 'left' ? -300 : 300;
        scrollContainer.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    };
  
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <div className="relative">
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-2 rounded-full shadow-lg hover:bg-white"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          
          <div 
            ref={scrollContainer}
            className="flex overflow-x-auto gap-4 scrollbar-hide relative px-12"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {exercises.map((exercise) => (
              <ExerciseCard key={exercise.id} exercise={exercise} />
            ))}
          </div>
          
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-2 rounded-full shadow-lg hover:bg-white"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </div>
    );
  };



const ExerciseDisplay = () => {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/exercises');
        if (!response.ok) throw new Error('Failed to fetch exercises');
        const data = await response.json();
        setExercises(data.exercises || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, []);

  if (loading) return <div className="text-center py-8">Loading exercises...</div>;
  if (error) return <div className="text-center py-8 text-red-600">{error}</div>;

  // Group exercises by workout type
  const groupedExercises = exercises.reduce((acc, exercise) => {
    if (!acc[exercise.workout_type]) {
      acc[exercise.workout_type] = [];
    }
    acc[exercise.workout_type].push(exercise);
    return acc;
  }, {});

  const workoutTypes = ['Push', 'Pull', 'Legs', 'Cardio'];

  return (
    <div className="space-y-8">
      {workoutTypes.map((type) => (
        groupedExercises[type]?.length > 0 && (
          <ExerciseSection
            key={type}
            title={type}
            exercises={groupedExercises[type]}
          />
        )
      ))}
    </div>
  );
};

export default ExerciseDisplay;