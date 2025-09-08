import { useState, useEffect } from 'react'
import './App.css'

// Push/Pull/Legs Workout Programs
const WORKOUT_PROGRAMS = {
  push: {
    name: 'Push Day',
    description: 'Chest, Shoulders, Triceps',
    exercises: [
      { id: 'bench', name: 'Bench Press', sets: 3, targetReps: [6, 8], restTime: 150 },
      { id: 'ohp', name: 'Overhead Press', sets: 3, targetReps: [6, 8], restTime: 150 },
      { id: 'incline', name: 'Incline Dumbbell Press', sets: 3, targetReps: [8, 12], restTime: 90 },
      { id: 'lateral', name: 'Lateral Raises', sets: 3, targetReps: [12, 15], restTime: 90 },
      { id: 'dips', name: 'Dips', sets: 3, targetReps: [8, 12], restTime: 90 }
    ]
  },
  pull: {
    name: 'Pull Day',
    description: 'Back, Biceps, Rear Delts',
    exercises: [
      { id: 'deadlift', name: 'Deadlift', sets: 3, targetReps: [5, 6], restTime: 150 },
      { id: 'bbrow', name: 'Barbell Rows', sets: 3, targetReps: [6, 8], restTime: 150 },
      { id: 'pullups', name: 'Pull-ups/Lat Pulldowns', sets: 3, targetReps: [8, 12], restTime: 90 },
      { id: 'cablerow', name: 'Cable Rows', sets: 3, targetReps: [10, 12], restTime: 90 },
      { id: 'curls', name: 'Barbell Curls', sets: 3, targetReps: [8, 12], restTime: 90 }
    ]
  },
  legs: {
    name: 'Legs Day',
    description: 'Quads, Hamstrings, Glutes, Calves',
    exercises: [
      { id: 'squat', name: 'Squat', sets: 3, targetReps: [6, 8], restTime: 150 },
      { id: 'rdl', name: 'Romanian Deadlift', sets: 3, targetReps: [8, 10], restTime: 150 },
      { id: 'bss', name: 'Bulgarian Split Squats', sets: 3, targetReps: [10, 12], restTime: 90 },
      { id: 'legpress', name: 'Leg Press', sets: 3, targetReps: [12, 15], restTime: 90 },
      { id: 'calves', name: 'Calf Raises', sets: 3, targetReps: [15, 20], restTime: 90 }
    ]
  }
}

function App() {
  const [workoutActive, setWorkoutActive] = useState(false)
  const [selectedWorkout, setSelectedWorkout] = useState(null)
  const [currentExercise, setCurrentExercise] = useState(0)
  const [currentSet, setCurrentSet] = useState(0)
  const [workoutData, setWorkoutData] = useState({})
  const [wakeLock, setWakeLock] = useState(null)
  const [restTimer, setRestTimer] = useState(0)
  const [restActive, setRestActive] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

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

  // Rest timer functionality
  useEffect(() => {
    let interval = null
    if (restActive && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer(timer => {
          if (timer <= 1) {
            setRestActive(false)
            return 0
          }
          return timer - 1
        })
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [restActive, restTimer])

  const startRestTimer = (seconds) => {
    setRestTimer(seconds)
    setRestActive(true)
  }

  // Progressive overload logic
  const calculateProgressiveWeight = (exerciseId, workoutType, lastWorkoutData) => {
    if (!lastWorkoutData) {
      // First time - return default starting weights
      let startingWeight = 95
      if (exerciseId === 'deadlift') startingWeight = 135
      else if (exerciseId === 'squat') startingWeight = 115
      else if (exerciseId === 'lateral' || exerciseId === 'curls') startingWeight = 25
      else if (exerciseId === 'calves') startingWeight = 50
      return startingWeight
    }

    const lastExerciseData = lastWorkoutData.exercises[exerciseId]
    if (!lastExerciseData || !lastExerciseData.sets || lastExerciseData.sets.length === 0) {
      return lastWorkoutData.targetWeight || 95
    }

    const lastWeight = lastExerciseData.sets[0].weight
    const exercise = WORKOUT_PROGRAMS[workoutType].exercises.find(ex => ex.id === exerciseId)
    const targetMin = exercise.targetReps[0]
    const targetMax = exercise.targetReps[1]
    
    // Check if user exceeded target range on majority of sets
    const setsAboveTarget = lastExerciseData.sets.filter(set => set.reps > targetMax).length
    const setsInTarget = lastExerciseData.sets.filter(set => set.reps >= targetMin && set.reps <= targetMax).length
    const totalSets = lastExerciseData.sets.length
    
    // NSCA "2 for 2 rule" - if hitting top of range consistently, increase weight
    const allSetsAtTopRange = lastExerciseData.sets.every(set => set.reps >= targetMax)
    
    if (allSetsAtTopRange || setsAboveTarget >= Math.ceil(totalSets / 2)) {
      // Increase weight - compound vs isolation increment
      const isCompound = ['squat', 'deadlift', 'bench', 'ohp', 'bbrow'].includes(exerciseId)
      const increment = isCompound ? 5 : 2.5
      return lastWeight + increment
    }
    
    // If majority of sets were below target range, decrease weight
    const setsBelowTarget = lastExerciseData.sets.filter(set => set.reps < targetMin).length
    if (setsBelowTarget >= Math.ceil(totalSets / 2)) {
      const isCompound = ['squat', 'deadlift', 'bench', 'ohp', 'bbrow'].includes(exerciseId)
      const decrement = isCompound ? 5 : 2.5
      return Math.max(lastWeight - decrement, 25) // Don't go below 25 lbs
    }
    
    // Otherwise maintain same weight
    return lastWeight
  }

  const getLastWorkoutData = (workoutType) => {
    const workoutHistory = JSON.parse(localStorage.getItem('workoutHistory') || '[]')
    const lastWorkout = workoutHistory
      .filter(workout => workout.workoutType === workoutType)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    return lastWorkout
  }

  const startWorkout = (workoutType) => {
    setSelectedWorkout(workoutType)
    setWorkoutActive(true)
    setCurrentExercise(0)
    setCurrentSet(0)
    requestWakeLock()
    
    // Initialize workout data with progressive weights
    const program = WORKOUT_PROGRAMS[workoutType]
    const lastWorkout = getLastWorkoutData(workoutType)
    const initialData = {}
    
    program.exercises.forEach(exercise => {
      const progressiveWeight = calculateProgressiveWeight(exercise.id, workoutType, lastWorkout)
      initialData[exercise.id] = {
        targetWeight: progressiveWeight,
        sets: [],
        lastWeight: lastWorkout?.exercises?.[exercise.id]?.sets?.[0]?.weight || null,
        progression: lastWorkout ? 
          (progressiveWeight > (lastWorkout.exercises?.[exercise.id]?.sets?.[0]?.weight || 0) ? 'increased' :
           progressiveWeight < (lastWorkout.exercises?.[exercise.id]?.sets?.[0]?.weight || 0) ? 'decreased' : 'maintained') 
          : 'new'
      }
    })
    setWorkoutData(initialData)
  }

  const endWorkout = () => {
    setWorkoutActive(false)
    setSelectedWorkout(null)
    setRestActive(false)
    setRestTimer(0)
    releaseWakeLock()
    // Save workout to localStorage
    const savedWorkouts = JSON.parse(localStorage.getItem('workoutHistory') || '[]')
    savedWorkouts.push({
      date: new Date().toISOString(),
      workoutType: selectedWorkout,
      exercises: workoutData
    })
    localStorage.setItem('workoutHistory', JSON.stringify(savedWorkouts))
  }

  const completeSet = (repsCompleted) => {
    const program = WORKOUT_PROGRAMS[selectedWorkout]
    const exercise = program.exercises[currentExercise]
    const updatedData = { ...workoutData }
    const targetMin = exercise.targetReps[0]
    const targetMax = exercise.targetReps[1]
    
    // Record the set
    updatedData[exercise.id].sets.push({
      weight: updatedData[exercise.id].targetWeight,
      reps: repsCompleted,
      targetReps: exercise.targetReps
    })
    
    // Within-workout progressive overload: increase weight if reps exceeded target range
    if (repsCompleted > targetMax && currentSet + 1 < exercise.sets) {
      const isCompound = ['squat', 'deadlift', 'bench', 'ohp', 'bbrow'].includes(exercise.id)
      const increment = isCompound ? 5 : 2.5
      updatedData[exercise.id].targetWeight += increment
      
      // Track that weight was increased for this exercise
      updatedData[exercise.id].weightIncreased = true
      updatedData[exercise.id].lastIncrement = increment
    }
    // Decrease weight if reps were significantly below target (failed badly)
    else if (repsCompleted < targetMin - 1 && currentSet + 1 < exercise.sets) {
      const isCompound = ['squat', 'deadlift', 'bench', 'ohp', 'bbrow'].includes(exercise.id)
      const decrement = isCompound ? 5 : 2.5
      updatedData[exercise.id].targetWeight = Math.max(updatedData[exercise.id].targetWeight - decrement, 25)
      
      // Track that weight was decreased
      updatedData[exercise.id].weightDecreased = true
      updatedData[exercise.id].lastDecrement = decrement
    }
    
    setWorkoutData(updatedData)
    
    // Start rest timer
    startRestTimer(exercise.restTime)
    
    // Move to next set or exercise
    if (currentSet + 1 < exercise.sets) {
      setCurrentSet(currentSet + 1)
    } else if (currentExercise + 1 < program.exercises.length) {
      setCurrentExercise(currentExercise + 1)
      setCurrentSet(0)
    } else {
      // Workout complete
      endWorkout()
    }
  }

  // Program Guide Component
  const ProgramGuide = () => (
    <div className="program-guide-overlay" onClick={() => setShowGuide(false)}>
      <div className="program-guide" onClick={e => e.stopPropagation()}>
        <div className="guide-header">
          <h2>Hyacinthe Program Guide</h2>
          <button className="close-btn" onClick={() => setShowGuide(false)}>×</button>
        </div>
        
        <div className="guide-content">
          <section className="guide-section">
            <h3>Program Overview</h3>
            <p><strong>Schedule:</strong> 3 days per week (e.g., Mon/Wed/Fri)</p>
            <p><strong>Duration:</strong> 45 minutes maximum per session</p>
            <p><strong>Focus:</strong> Hypertrophy and body recomposition</p>
            <p><strong>Volume:</strong> 15 sets per muscle group per week</p>
          </section>

          <section className="guide-section">
            <h3>Progressive Overload Guidelines</h3>
            <div className="progression-rules">
              <div className="rule">
                <strong>6-8 reps:</strong> Strength focus - increase weight when you complete all sets at top range
              </div>
              <div className="rule">
                <strong>8-12 reps:</strong> Hypertrophy sweet spot - increase weight when completing 12 reps on all sets
              </div>
              <div className="rule">
                <strong>12-20 reps:</strong> Metabolic stress - focus on muscle fatigue and mind-muscle connection
              </div>
            </div>
          </section>

          <section className="guide-section">
            <h3>Weight Progression</h3>
            <p><strong>Compound movements:</strong> +5-10 lbs when target achieved</p>
            <p><strong>Isolation movements:</strong> +2.5-5 lbs when target achieved</p>
            <p><strong>"2 for 2 Rule":</strong> If you can do 2+ extra reps beyond target range for 2 consecutive workouts, increase weight</p>
          </section>

          <section className="guide-section">
            <h3>Rest Periods</h3>
            <p><strong>Compound exercises:</strong> 2-2.5 minutes (strength and recovery)</p>
            <p><strong>Isolation exercises:</strong> 90 seconds (hypertrophy and time efficiency)</p>
          </section>

          <section className="guide-section">
            <h3>Exercise Substitutions</h3>
            <div className="substitutions">
              <div><strong>Push Day:</strong> Dips ↔ Close-Grip Bench, Lateral Raises ↔ Cable Laterals</div>
              <div><strong>Pull Day:</strong> Pull-ups ↔ Lat Pulldowns, Barbell Rows ↔ T-Bar Rows</div>
              <div><strong>Leg Day:</strong> Bulgarian Split Squats ↔ Walking Lunges, Leg Press ↔ Goblet Squats</div>
            </div>
          </section>

          <section className="guide-section">
            <h3>Program Phases</h3>
            <p><strong>Weeks 1-4:</strong> Foundation - focus on form, build conditioning</p>
            <p><strong>Weeks 5-8:</strong> Hypertrophy - push intensity, progressive overload</p>
            <p><strong>Weeks 9-12:</strong> Intensification - peak weights, consider deload</p>
          </section>
        </div>
      </div>
    </div>
  )

  // Workout selection screen
  if (!workoutActive) {
    return (
      <div className="app">
        <header className="header">
          <div className="header-content">
            <h1>Hyacinthe</h1>
            <p>Progressive Overload Tracker</p>
          </div>
          <button className="guide-btn" onClick={() => setShowGuide(true)}>
            📚 Guide
          </button>
        </header>
        
        <main className="main">
          <div className="workout-selection">
            <h2>Choose Your Workout</h2>
            <div className="workout-options">
              {Object.entries(WORKOUT_PROGRAMS).map(([key, program]) => (
                <div key={key} className="workout-option">
                  <div className="workout-info">
                    <h3>{program.name}</h3>
                    <p>{program.description}</p>
                    <div className="exercise-preview">
                      {program.exercises.map((exercise, index) => (
                        <span key={exercise.id} className="exercise-mini">
                          {exercise.name} {exercise.sets}×{exercise.targetReps[0]}-{exercise.targetReps[1]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button 
                    className="start-workout-btn"
                    onClick={() => startWorkout(key)}
                  >
                    Start {program.name}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </main>
        {showGuide && <ProgramGuide />}
      </div>
    )
  }

  // Active workout screen
  const program = WORKOUT_PROGRAMS[selectedWorkout]
  const exercise = program.exercises[currentExercise]
  const currentWeight = workoutData[exercise.id]?.targetWeight || 0
  const targetMin = exercise.targetReps[0]
  const targetMax = exercise.targetReps[1]

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="app workout-active">
      <header className="workout-header">
        <div className="workout-title">{program.name}</div>
        <div className="progress-indicator">
          Exercise {currentExercise + 1} of {program.exercises.length}
        </div>
        <div className="header-buttons">
          <button className="guide-btn-small" onClick={() => setShowGuide(true)}>
            📚
          </button>
          <button className="end-workout-btn" onClick={endWorkout}>
            End
          </button>
        </div>
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
            Target: {targetMin}-{targetMax} reps
          </div>
          {workoutData[exercise.id]?.progression && workoutData[exercise.id]?.progression !== 'new' && (
            <div className={`progression-indicator ${workoutData[exercise.id].progression}`}>
              {workoutData[exercise.id].progression === 'increased' && '📈 Weight increased!'}
              {workoutData[exercise.id].progression === 'decreased' && '📉 Weight decreased'}
              {workoutData[exercise.id].progression === 'maintained' && '➡️ Weight maintained'}
              {workoutData[exercise.id].lastWeight && (
                <span className="last-weight">
                  (was {workoutData[exercise.id].lastWeight} lbs)
                </span>
              )}
            </div>
          )}
          
          {/* Within-workout weight changes */}
          {currentSet > 0 && workoutData[exercise.id]?.weightIncreased && (
            <div className="weight-change-notification increased">
              🚀 Weight increased +{workoutData[exercise.id].lastIncrement} lbs for next set!
            </div>
          )}
          {currentSet > 0 && workoutData[exercise.id]?.weightDecreased && (
            <div className="weight-change-notification decreased">
              ⚡ Weight decreased -{workoutData[exercise.id].lastDecrement} lbs for next set
            </div>
          )}
        </div>

        {restActive && (
          <div className="rest-timer">
            <div className="timer-display">
              <span className="timer-label">Rest Timer</span>
              <span className="timer-value">{formatTime(restTimer)}</span>
            </div>
          </div>
        )}
        
        <div className="set-completion">
          <h3>How did you do?</h3>
          <div className="completion-buttons">
            <div className="rep-range-buttons">
              <p>Select reps completed:</p>
              <div className="rep-buttons">
                {Array.from({ length: targetMax }, (_, i) => {
                  const repCount = i + 1
                  const isInRange = repCount >= targetMin && repCount <= targetMax
                  const isAboveRange = repCount > targetMax
                  
                  return (
                    <button
                      key={i}
                      className={`rep-btn ${isInRange ? 'in-range' : ''} ${isAboveRange ? 'above-range' : ''}`}
                      onClick={() => completeSet(repCount)}
                    >
                      {repCount}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
      {showGuide && <ProgramGuide />}
    </div>
  )
}

export default App
