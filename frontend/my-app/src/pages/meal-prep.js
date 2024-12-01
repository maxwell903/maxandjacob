import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, Plus, X } from 'lucide-react';

const RecipeSelector = ({ isOpen, onClose, onSelect, mealType }) => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/all-recipes');
        const data = await response.json();
        setRecipes(data.recipes || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching recipes:', error);
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchRecipes();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Select Recipe for {mealType}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-4">Loading recipes...</div>
        ) : (
          <div className="space-y-2">
            {recipes.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => {
                  onSelect(recipe);
                  onClose();
                }}
                className="w-full text-left p-4 hover:bg-gray-100 rounded-md"
              >
                <div className="font-medium">{recipe.name}</div>
                <div className="text-sm text-gray-600">{recipe.description}</div>
                <div className="text-sm text-gray-500 mt-1">
                  Prep time: {recipe.prep_time} mins • 
                  Protein: {recipe.total_nutrition?.protein_grams || 0}g • 
                  Fat: {recipe.total_nutrition?.fat_grams || 0}g • 
                  Carbs: {recipe.total_nutrition?.carbs_grams || 0}g
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const MealDisplay = ({ meal, onDelete }) => {
  if (!meal) return null;

  return (
    <div className="bg-white rounded-lg p-4 relative">
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 text-red-500 hover:text-red-700"
      >
        <X size={16} />
      </button>
      <h4 className="font-medium">{meal.recipe_name}</h4>
      <p className="text-sm text-gray-500">
        Prep time: {meal.prep_time} mins
      </p>
      <p className="text-xs text-gray-500">
        Protein: {meal.total_nutrition.protein_grams.toFixed(1)}g • 
        Fat: {meal.total_nutrition.fat_grams.toFixed(1)}g • 
        Carbs: {meal.total_nutrition.carbs_grams.toFixed(1)}g
      </p>
    </div>
  );
};

const DayDropdown = ({ day, weekId, meals, onMealAdd, onMealDelete }) => {
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState(null);

  const handleAddMeal = async (recipe, mealType) => {
    try {
      const response = await fetch(`http://localhost:5000/api/meal-prep/weeks/${weekId}/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day,
          meal_type: mealType.toLowerCase(),
          recipe_id: recipe.id
        })
      });

      if (!response.ok) throw new Error('Failed to add meal');
      onMealAdd();
    } catch (error) {
      console.error('Error adding meal:', error);
    }
  };

  return (
    <div className="flex-1 p-2">
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">{day}</h3>
        <div className="space-y-4">
          {/* Breakfast Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Breakfast</span>
              {!meals?.breakfast && (
                <button
                  onClick={() => {
                    setSelectedMealType('Breakfast');
                    setShowRecipeSelector(true);
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>
            {meals?.breakfast && (
              <MealDisplay
                meal={meals.breakfast}
                onDelete={() => onMealDelete(day, 'breakfast')}
              />
            )}
          </div>

          {/* Lunch Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Lunch</span>
              {!meals?.lunch && (
                <button
                  onClick={() => {
                    setSelectedMealType('Lunch');
                    setShowRecipeSelector(true);
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>
            {meals?.lunch && (
              <MealDisplay
                meal={meals.lunch}
                onDelete={() => onMealDelete(day, 'lunch')}
              />
            )}
          </div>

          {/* Dinner Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Dinner</span>
              {!meals?.dinner && (
                <button
                  onClick={() => {
                    setSelectedMealType('Dinner');
                    setShowRecipeSelector(true);
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>
            {meals?.dinner && (
              <MealDisplay
                meal={meals.dinner}
                onDelete={() => onMealDelete(day, 'dinner')}
              />
            )}
          </div>
        </div>
      </div>

      <RecipeSelector
        isOpen={showRecipeSelector}
        onClose={() => setShowRecipeSelector(false)}
        onSelect={(recipe) => handleAddMeal(recipe, selectedMealType)}
        mealType={selectedMealType}
      />
    </div>
  );
};

const DaySelector = ({ isOpen, onClose, onDaySelect }) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-semibold mb-4">Select Starting Day</h2>
        <div className="space-y-2">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => {
                onDaySelect(day);
                onClose();
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-md"
            >
              {day}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const MealPrepPage = () => {
  const [viewMode, setViewMode] = useState('menus');
  const [showDaySelector, setShowDaySelector] = useState(false);
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWeeks = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/meal-prep/weeks');
      const data = await response.json();
      setWeeks(data.weeks || []);
      setLoading(false);
    } catch (error) {
        console.error('Error fetching weeks:', error);
        setLoading(false);
      }
    };
    useEffect(() => {
        if (viewMode === 'mealprep') {
          fetchWeeks();
        }
      }, [viewMode]);
    
      const generateWeekDays = (startDay) => {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const startIndex = days.indexOf(startDay);
        const weekSchedule = [];
        
        for (let i = 0; i < 7; i++) {
          const index = (startIndex + i) % 7;
          weekSchedule.push(days[index]);
        }
        
        return weekSchedule;
      };
    
      const handleDaySelect = async (day) => {
        try {
          const response = await fetch('http://localhost:5000/api/meal-prep/weeks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start_day: day })
          });
    
          if (!response.ok) throw new Error('Failed to create week');
          
          await fetchWeeks();
          setShowDaySelector(false);
        } catch (error) {
          console.error('Error creating week:', error);
        }
      };
    
      const handleDeleteWeek = async (weekId) => {
        if (!confirm('Are you sure you want to delete this week?')) return;
    
        try {
          const response = await fetch(`http://localhost:5000/api/meal-prep/weeks/${weekId}`, {
            method: 'DELETE'
          });
    
          if (!response.ok) throw new Error('Failed to delete week');
          await fetchWeeks();
        } catch (error) {
          console.error('Error deleting week:', error);
        }
      };
    
      const handleDeleteMeal = async (weekId, day, mealType) => {
        try {
          const response = await fetch(`http://localhost:5000/api/meal-prep/weeks/${weekId}/meals`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ day, meal_type: mealType })
          });
    
          if (!response.ok) throw new Error('Failed to delete meal');
          await fetchWeeks();
        } catch (error) {
          console.error('Error deleting meal:', error);
        }
      };
    
      return (
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white shadow-sm">
            <div className="max-w-6xl mx-auto px-4 py-4">
              <Link href="/" className="text-blue-600 hover:text-blue-800">
                ← Back
              </Link>
            </div>
          </nav>
    
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="mb-8">
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setViewMode('menus')}
                  className={`px-4 py-2 rounded-lg ${
                    viewMode === 'menus' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  My Menus
                </button>
                <button
                  onClick={() => setViewMode('mealprep')}
                  className={`px-4 py-2 rounded-lg ${
                    viewMode === 'mealprep' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  My Meal Prep
                </button>
              </div>
    
              {viewMode === 'mealprep' ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">My Meal Prep</h1>
                    <button
                      onClick={() => setShowDaySelector(true)}
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      <Plus size={20} />
                      Add A Week
                    </button>
                  </div>
    
                  {loading ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : (
                    <div className="space-y-8">
                      {weeks.map((week) => (
                        <div key={week.id} className="bg-white rounded-lg shadow-lg p-6">
                          <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">
                              Week Starting {week.start_day} ({week.created_date})
                            </h2>
                            <button
                              onClick={() => handleDeleteWeek(week.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={20} />
                            </button>
                          </div>
                          
                          <div className="flex gap-2 overflow-x-auto pb-4">
                            {generateWeekDays(week.start_day).map((day) => (
                              <DayDropdown
                                key={day}
                                day={day}
                                weekId={week.id}
                                meals={week.meal_plans[day]}
                                onMealAdd={fetchWeeks}
                                onMealDelete={(day, mealType) => 
                                  handleDeleteMeal(week.id, day, mealType)
                                }
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <iframe 
                  src="/menus" 
                  className="w-full h-screen border-none"
                  style={{ height: 'calc(100vh - 200px)' }}
                />
              )}
            </div>
    
            <DaySelector
              isOpen={showDaySelector}
              onClose={() => setShowDaySelector(false)}
              onDaySelect={handleDaySelect}
            />
          </div>
        </div>
      );
    };
    
    export default MealPrepPage;
    