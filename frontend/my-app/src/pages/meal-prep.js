// src/pages/meal-prep.js
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, Plus, X, Search, Check } from 'lucide-react';

const SearchableRecipeSelector = ({ isOpen, onClose, onSelect, mealType }) => {
  const [recipes, setRecipes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [filteredRecipes, setFilteredRecipes] = useState([]);

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/all-recipes');
        const data = await response.json();
        setRecipes(data.recipes || []);
        setFilteredRecipes(data.recipes || []);
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

  useEffect(() => {
    const filtered = recipes.filter(recipe => 
      recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredRecipes(filtered);
  }, [searchTerm, recipes]);

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

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full border rounded-md p-2"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-4">Loading recipes...</div>
        ) : (
          <div className="space-y-2">
            {filteredRecipes.map((recipe) => (
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

const MenuSelector = ({ isOpen, onClose, weekId, onMealsAdded }) => {
  const [step, setStep] = useState('day'); // 'day', 'menu', 'recipes'
  const [selectedDay, setSelectedDay] = useState(null);
  const [menus, setMenus] = useState([]);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [selectedMeals, setSelectedMeals] = useState(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/menus');
        const data = await response.json();
        setMenus(data.menus || []);
      } catch (error) {
        console.error('Error fetching menus:', error);
      }
    };

    if (isOpen && step === 'menu') {
      fetchMenus();
    }
  }, [isOpen, step]);

  const handleMenuSelect = async (menu) => {
    setSelectedMenu(menu);
    try {
      const response = await fetch(`http://localhost:5000/api/menus/${menu.id}/recipes`);
      const data = await response.json();
      setRecipes(data.recipes || []);
      setStep('recipes');
    } catch (error) {
      console.error('Error fetching menu recipes:', error);
    }
  };

  const handleMealTypeToggle = (recipeId, mealType) => {
    setSelectedMeals(prev => {
      const current = new Map(prev);
      const recipeMeals = current.get(recipeId) || new Set();
      
      if (recipeMeals.has(mealType)) {
        recipeMeals.delete(mealType);
      } else {
        recipeMeals.add(mealType);
      }
      
      if (recipeMeals.size === 0) {
        current.delete(recipeId);
      } else {
        current.set(recipeId, recipeMeals);
      }
      
      return current;
    });
  };

  const handleAddSelected = async () => {
    setLoading(true);
    try {
      const meals = [];
      selectedMeals.forEach((mealTypes, recipeId) => {
        mealTypes.forEach(mealType => {
          meals.push({
            day: selectedDay,
            meal_type: mealType.toLowerCase(),
            recipe_id: recipeId
          });
        });
      });

      for (const meal of meals) {
        await fetch(`http://localhost:5000/api/meal-prep/weeks/${weekId}/meals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(meal)
        });
      }

      onMealsAdded();
      onClose();
      setStep('day');
     setSelectedDay(null);
     setSelectedMenu(null);
     setRecipes([]);
     setSelectedMeals(new Map());
    } catch (error) {
      console.error('Error adding meals:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[800px] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {step === 'day' ? 'Select Day' :
             step === 'menu' ? 'Select Menu' :
             'Select Meals'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {step === 'day' && (
          <div className="space-y-2">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
              <button
                key={day}
                onClick={() => {
                  setSelectedDay(day);
                  setStep('menu');
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-md"
              >
                {day}
              </button>
            ))}
          </div>
        )}

        {step === 'menu' && (
          <div className="space-y-2">
            {menus.map((menu) => (
              <button
                key={menu.id}
                onClick={() => handleMenuSelect(menu)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-md"
              >
                {menu.name} ({menu.recipe_count} recipes)
              </button>
            ))}
          </div>
        )}

        {step === 'recipes' && (
          <>
            <div className="mb-4">
              <h3 className="font-medium mb-2">Select meal types for each recipe:</h3>
              <div className="space-y-4">
                {recipes.map((recipe) => (
                  <div key={recipe.id} className="p-4 border rounded-lg">
                    <div className="font-medium mb-2">{recipe.name}</div>
                    <div className="flex gap-4">
                      {['Breakfast', 'Lunch', 'Dinner'].map((mealType) => (
                        <label key={mealType} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedMeals.get(recipe.id)?.has(mealType)}
                            onChange={() => handleMealTypeToggle(recipe.id, mealType)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{mealType}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleAddSelected}
                disabled={loading || selectedMeals.size === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
              >
                {loading ? 'Adding...' : 'Add Selected'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const MealDisplay = ({ meal, onDelete }) => {
    if (!meal) return null;
  
    return (
      <div className="bg-white rounded-lg p-4 relative mb-2">
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
  
    const renderMealSection = (mealType, meals) => (
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">{mealType}</span>
          <button
            onClick={() => {
              setSelectedMealType(mealType);
              setShowRecipeSelector(true);
            }}
            className="text-blue-600 hover:text-blue-800"
          >
            <Plus size={16} />
          </button>
        </div>
        {meals?.map((meal, index) => (
          <MealDisplay
            key={`${meal.recipe_id}-${index}`}
            meal={meal}
            onDelete={() => onMealDelete(day, mealType.toLowerCase(), meal.recipe_id)}
          />
        ))}
      </div>
    );
  
    return (
      <div className="flex-1 p-2">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">{day}</h3>
          <div className="space-y-4">
            {renderMealSection('Breakfast', meals?.breakfast || [])}
            {renderMealSection('Lunch', meals?.lunch || [])}
            {renderMealSection('Dinner', meals?.dinner || [])}
          </div>
        </div>
  
        <SearchableRecipeSelector
          isOpen={showRecipeSelector}
          onClose={() => setShowRecipeSelector(false)}
          onSelect={(recipe) => handleAddMeal(recipe, selectedMealType)}
          mealType={selectedMealType}
        />
      </div>
    );
  };
  
    const Week = ({ week, onDeleteWeek, onMealDelete, onMealsAdded }) => {
    const [showMenuSelector, setShowMenuSelector] = useState(false);
  
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
  

    

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Week Starting {week.start_day} ({week.created_date})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowMenuSelector(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Add from Menu
            </button>
            <button
              onClick={() => onDeleteWeek(week.id)}
              className="text-red-500 hover:text-red-700"
            >
              <X size={20} />
            </button>
          </div>
        </div>
  
        <div className="flex gap-2 overflow-x-auto pb-4">
          {generateWeekDays(week.start_day).map((day) => (
            <DayDropdown
              key={day}
              day={day}
              weekId={week.id}
              meals={week.meal_plans[day]}
              onMealAdd={onMealsAdded}
              onMealDelete={(day, mealType, recipeId) =>
                onMealDelete(week.id, day, mealType, recipeId)
              }
            />
          ))}
        </div>
  
        <MenuSelector
          isOpen={showMenuSelector}
          onClose={() => setShowMenuSelector(false)}
          weekId={week.id}
          onMealsAdded={onMealsAdded}
        />
      </div>
    );
  };

  const DaySelector = ({ isOpen, onClose, onDaySelect }) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-70">
          <h2 className="text-xl font-semibold mb-4">Select Starting Day</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
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
              className="px-6 py-3 text-gray-600 hover:text-gray-800"
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
  
    const handleDeleteMeal = async (weekId, day, mealType, recipeId) => {
      try {
        const response = await fetch(`http://localhost:5000/api/meal-prep/weeks/${weekId}/meals`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            day,
            meal_type: mealType,
            recipe_id: recipeId
          })
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
                      <Week
                        key={week.id}
                        week={week}
                        onDeleteWeek={handleDeleteWeek}
                        onMealDelete={handleDeleteMeal}
                        onMealsAdded={fetchWeeks}
                      />
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

        <DaySelector
            isOpen={showDaySelector}
            onClose={() => setShowDaySelector(false)}
            onDaySelect={handleDaySelect}
        />
      </div>
    );
  };
  
  export default MealPrepPage;
    