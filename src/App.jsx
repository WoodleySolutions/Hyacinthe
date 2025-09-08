import { useState, useEffect } from 'react'
import './App.css'

// Workout data structure
const BIG_5_EXERCISES = [
  { id: 'squat', name: 'Squat', sets: 5, targetReps: 5 },
  { id: 'bench', name: 'Bench Press', sets: 5, targetReps: 5 },
  { id: 'row', name: 'Barbell Row', sets: 5, targetReps: 5 },
  { id: 'press', name: 'Overhead Press', sets: 5, targetReps: 5 },
  { id: 'deadlift', name: 'Deadlift', sets: 1, targetReps: 5 }
]

function App() {
  const [workoutActive, setWorkoutActive] = useState(false)
  const [currentExercise, setCurrentExercise] = useState(0)
  const [currentSet, setCurrentSet] = useState(0)
  const [workoutData, setWorkoutData] = useState({})
  const [wakeLock, setWakeLock] = useState(null)

  // Request screen wake lock when workout starts
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        const wakeLockObj = await navigator.wakeLock.request('screen')
        setWakeLock(wakeLockObj)
        console.log('Screen wake lock activated')
      } catch (err) {
        console.error('Failed to request wake lock:', err)
      }
    }
  }

  // Release wake lock when workout ends
  const releaseWakeLock = () => {
    if (wakeLock) {
      wakeLock.release()
      setWakeLock(null)
      console.log('Screen wake lock released')
    }
  }

  const startWorkout = () => {
    setWorkoutActive(true)
    setCurrentExercise(0)
    setCurrentSet(0)
    requestWakeLock()
    
    // Initialize workout data with default weights (for demo)
    const initialData = {}
    BIG_5_EXERCISES.forEach(exercise => {
      initialData[exercise.id] = {
        targetWeight: exercise.id === 'deadlift' ? 135 : 95, // Starting weights
        sets: []
      }
    })
    setWorkoutData(initialData)
  }

  const endWorkout = () => {
    setWorkoutActive(false)
    releaseWakeLock()
    // Save workout to localStorage
    const savedWorkouts = JSON.parse(localStorage.getItem('workoutHistory') || '[]')
    savedWorkouts.push({
      date: new Date().toISOString(),
      exercises: workoutData
    })
    localStorage.setItem('workoutHistory', JSON.stringify(savedWorkouts))
  }

  const completeSet = (repsCompleted) => {
    const exercise = BIG_5_EXERCISES[currentExercise]
    const updatedData = { ...workoutData }
    
    // Record the set
    updatedData[exercise.id].sets.push({
      weight: updatedData[exercise.id].targetWeight,
      reps: repsCompleted,
      targetReps: exercise.targetReps
    })
    
    setWorkoutData(updatedData)
    
    // Move to next set or exercise
    if (currentSet + 1 < exercise.sets) {
      setCurrentSet(currentSet + 1)
    } else if (currentExercise + 1 < BIG_5_EXERCISES.length) {
      setCurrentExercise(currentExercise + 1)
      setCurrentSet(0)
    } else {
      // Workout complete
      endWorkout()
    }
  }

  if (!workoutActive) {
    return (
      <div className="app">
        <header className="header">
          <h1>Hyacinthe</h1>
          <p>Progressive Overload Tracker</p>
        </header>
        
        <main className="main">
          <div className="workout-preview">
            <h2>Today's Workout</h2>
            <div className="exercise-list">
              {BIG_5_EXERCISES.map((exercise, index) => (
                <div key={exercise.id} className="exercise-preview">
                  <span className="exercise-name">{exercise.name}</span>
                  <span className="exercise-sets">{exercise.sets}×{exercise.targetReps}</span>
                </div>
              ))}
            </div>
          </div>
          
          <button className="start-workout-btn" onClick={startWorkout}>
            Start Workout
          </button>
        </main>
      </div>
    )
  }

  const exercise = BIG_5_EXERCISES[currentExercise]
  const currentWeight = workoutData[exercise.id]?.targetWeight || 0

  return (
    <div className="app workout-active">
      <header className="workout-header">
        <div className="progress-indicator">
          Exercise {currentExercise + 1} of {BIG_5_EXERCISES.length}
        </div>
        <button className="end-workout-btn" onClick={endWorkout}>
          End Workout
        </button>
      </header>
      
      <main className="workout-main">
        <div className="current-exercise">
          <h1 className="exercise-title">{exercise.name}</h1>
          <div className="set-info">
            <span className="set-counter">Set {currentSet + 1} of {exercise.sets}</span>
          </div>
        </div>
        
        <div className="weight-display">
          <div className="target-weight">
            <span className="weight-value">{currentWeight}</span>
            <span className="weight-unit">lbs</span>
          </div>
          <div className="target-reps">
            Target: {exercise.targetReps} reps
          </div>
        </div>
        
        <div className="set-completion">
          <h3>How did you do?</h3>
          <div className="completion-buttons">
            <button 
              className="success-btn"
              onClick={() => completeSet(exercise.targetReps)}
            >
              Hit All {exercise.targetReps} Reps! 💪
            </button>
            
            <div className="partial-reps">
              <p>Failed? Select reps completed:</p>
              <div className="rep-buttons">
                {Array.from({ length: exercise.targetReps }, (_, i) => (
                  <button
                    key={i}
                    className="rep-btn"
                    onClick={() => completeSet(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
