import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SetsModal from './SetsModal';

const ExerciseCard = ({ exercise }) => {
    const [showSetsModal, setShowSetsModal] = useState(false);
  
    return (
      <>
        <div className="flex-none w-64 bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">{exercise.name}</h3>
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
          <button
            onClick={() => setShowSetsModal(true)}
            className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Sets
          </button>
        </div>
        
        <SetsModal
          exercise={exercise}
          isOpen={showSetsModal}
          onClose={() => setShowSetsModal(false)}
        />
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