import { useState, useEffect } from 'react'
import './App.css'

// Push/Pull/Legs Workout Programs
const WORKOUT_PROGRAMS = {
  push: {
    name: 'Push Day',
    description: 'Chest, Shoulders, Triceps',
    exercises: [
      { id: 'bench', name: 'Bench Press', sets: 3, targetReps: [6, 8], restTime: 150, type: 'compound' },
      { id: 'ohp', name: 'Overhead Press', sets: 3, targetReps: [6, 8], restTime: 150, type: 'compound' },
      { id: 'incline', name: 'Incline Dumbbell Press', sets: 3, targetReps: [8, 12], restTime: 90, type: 'compound' },
      { id: 'lateral', name: 'Lateral Raises', sets: 3, targetReps: [12, 15], restTime: 90, type: 'isolation' },
      { id: 'dips', name: 'Dips', sets: 3, targetReps: [8, 12], restTime: 90, type: 'compound' }
    ]
  },
  pull: {
    name: 'Pull Day',
    description: 'Back, Biceps, Rear Delts',
    exercises: [
      { id: 'deadlift', name: 'Deadlift', sets: 3, targetReps: [5, 6], restTime: 150, type: 'compound' },
      { id: 'bbrow', name: 'Barbell Rows', sets: 3, targetReps: [6, 8], restTime: 150, type: 'compound' },
      { id: 'pullups', name: 'Pull-ups/Lat Pulldowns', sets: 3, targetReps: [8, 12], restTime: 90, type: 'compound' },
      { id: 'cablerow', name: 'Cable Rows', sets: 3, targetReps: [10, 12], restTime: 90, type: 'isolation' },
      { id: 'curls', name: 'Barbell Curls', sets: 3, targetReps: [8, 12], restTime: 90, type: 'isolation' }
    ]
  },
  legs: {
    name: 'Legs Day',
    description: 'Quads, Hamstrings, Glutes, Calves',
    exercises: [
      { id: 'squat', name: 'Squat', sets: 3, targetReps: [6, 8], restTime: 150, type: 'compound' },
      { id: 'rdl', name: 'Romanian Deadlift', sets: 3, targetReps: [8, 10], restTime: 150, type: 'compound' },
      { id: 'bss', name: 'Bulgarian Split Squats', sets: 3, targetReps: [10, 12], restTime: 90, type: 'compound' },
      { id: 'legpress', name: 'Leg Press', sets: 3, targetReps: [12, 15], restTime: 90, type: 'compound' },
      { id: 'calves', name: 'Calf Raises', sets: 3, targetReps: [15, 20], restTime: 90, type: 'isolation' }
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
  const [showResetModal, setShowResetModal] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [initialWeights, setInitialWeights] = useState({})

  // Check if user has completed onboarding
  useEffect(() => {
    const savedWeights = localStorage.getItem('initialWeights')
    if (!savedWeights) {
      setShowOnboarding(true)
    } else {
      setInitialWeights(JSON.parse(savedWeights))
    }
  }, [])

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

  // Fallback default weights function
  const getDefaultWeight = (exerciseId) => {
    const defaults = {
      'bench': 95,
      'ohp': 65,
      'incline': 50,
      'lateral': 15,
      'dips': 0, // bodyweight
      'deadlift': 135,
      'bbrow': 75,
      'pullups': 0, // bodyweight
      'cablerow': 60,
      'curls': 25,
      'squat': 115,
      'rdl': 95,
      'bss': 25,
      'legpress': 180,
      'calves': 50
    }
    return defaults[exerciseId] || 45
  }

  // Complete onboarding and save weights
  const completeOnboarding = (weights) => {
    localStorage.setItem('initialWeights', JSON.stringify(weights))
    setInitialWeights(weights)
    setShowOnboarding(false)
  }

  // Progressive overload logic
  const calculateProgressiveWeight = (exercise, workoutType, lastWorkoutData) => {
    if (!lastWorkoutData) {
      // First time - return user's initial weight or fallback defaults
      return initialWeights[exercise.id] || getDefaultWeight(exercise.id)
    }

    const lastExerciseData = lastWorkoutData.exercises[exercise.id]
    if (!lastExerciseData || !lastExerciseData.sets || lastExerciseData.sets.length === 0) {
      return lastWorkoutData.targetWeight || 95
    }

    const lastWeight = lastExerciseData.sets[0].weight
    const targetMin = exercise.targetReps[0]
    const targetMax = exercise.targetReps[1]
    
    // Check if user exceeded target range on majority of sets
    const setsAboveTarget = lastExerciseData.sets.filter(set => set.reps > targetMax).length
    const setsInTarget = lastExerciseData.sets.filter(set => set.reps >= targetMin && set.reps <= targetMax).length
    const totalSets = lastExerciseData.sets.length
    
    // NSCA "2 for 2 rule" - if hitting top of range consistently, increase weight
    const allSetsAtTopRange = lastExerciseData.sets.every(set => set.reps >= targetMax)
    
    if (allSetsAtTopRange || setsAboveTarget >= Math.ceil(totalSets / 2)) {
      // NSCA percentage-based increase: 2.5-5% compounds, 5-10% isolation
      const isCompound = exercise.type === 'compound'
      const percentage = isCompound ? 0.05 : 0.1  // Use higher end for session-to-session
      const rawIncrease = lastWeight * percentage
      const increment = Math.max(2.5, Math.round(rawIncrease / 2.5) * 2.5)  // Round to nearest 2.5, min 2.5
      
      return lastWeight + increment
    }
    
    // If majority of sets were below target range, decrease weight
    const setsBelowTarget = lastExerciseData.sets.filter(set => set.reps < targetMin).length
    if (setsBelowTarget >= Math.ceil(totalSets / 2)) {
      const isCompound = exercise.type === 'compound'
      const percentage = isCompound ? 0.025 : 0.05  // Conservative decrease
      const rawDecrease = lastWeight * percentage
      const decrement = Math.max(2.5, Math.round(rawDecrease / 2.5) * 2.5)  // Round to nearest 2.5, min 2.5
      
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

  // Week/Day tracking functions
  const getWorkoutStats = () => {
    const workoutHistory = JSON.parse(localStorage.getItem('workoutHistory') || '[]')
    const pushCount = workoutHistory.filter(w => w.workoutType === 'push').length
    const pullCount = workoutHistory.filter(w => w.workoutType === 'pull').length
    const legsCount = workoutHistory.filter(w => w.workoutType === 'legs').length
    
    const totalWorkouts = workoutHistory.length
    const currentWeek = Math.floor(totalWorkouts / 3) + 1
    const workoutsThisWeek = totalWorkouts % 3
    
    // Determine next recommended workout
    const counts = { push: pushCount, pull: pullCount, legs: legsCount }
    const minCount = Math.min(pushCount, pullCount, legsCount)
    let nextWorkout = null
    
    if (pushCount === minCount) nextWorkout = 'push'
    else if (pullCount === minCount) nextWorkout = 'pull'
    else if (legsCount === minCount) nextWorkout = 'legs'
    
    return {
      week: currentWeek,
      workoutsThisWeek,
      totalWorkouts,
      pushCount,
      pullCount,
      legsCount,
      nextWorkout,
      programDay: totalWorkouts > 0 ? `Day ${totalWorkouts}` : 'Start Program'
    }
  }

  const resetProgress = () => {
    localStorage.removeItem('workoutHistory')
    localStorage.removeItem('initialWeights')
    setShowResetModal(false)
    setShowOnboarding(true)
    setInitialWeights({})
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
      const progressiveWeight = calculateProgressiveWeight(exercise, workoutType, lastWorkout)
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
    
    // Within-workout progressive overload: increase weight if at or above target range
    if (repsCompleted >= targetMax && currentSet + 1 < exercise.sets) {
      const isCompound = exercise.type === 'compound'
      const currentWeight = updatedData[exercise.id].targetWeight
      
      // NSCA percentages: 2.5-5% compounds, 5-10% isolation
      const percentage = isCompound ? 0.025 : 0.05  // Use lower end for within-workout
      const rawIncrease = currentWeight * percentage
      const increment = Math.max(2.5, Math.round(rawIncrease / 2.5) * 2.5)  // Round to nearest 2.5, min 2.5
      
      updatedData[exercise.id].targetWeight += increment
      
      // Track that weight was increased for this exercise
      updatedData[exercise.id].weightIncreased = true
      updatedData[exercise.id].lastIncrement = increment
    }
    // Decrease weight if reps were significantly below target (failed badly)
    else if (repsCompleted < targetMin && currentSet + 1 < exercise.sets) {
      const isCompound = exercise.type === 'compound'
      const currentWeight = updatedData[exercise.id].targetWeight
      
      // NSCA percentages: 2.5-5% compounds, 5-10% isolation  
      const percentage = isCompound ? 0.025 : 0.05  // Conservative decrease
      const rawDecrease = currentWeight * percentage
      const decrement = Math.max(2.5, Math.round(rawDecrease / 2.5) * 2.5)  // Round to nearest 2.5, min 2.5
      
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
            <h3>Initial Weight Assessment</h3>
            <div className="nsca-warning">
              <p><strong>⚠️ NSCA Guidelines:</strong> NO 1RM testing for beginners! Risk of injury and excessive soreness.</p>
            </div>
            <p><strong>Safe Assessment:</strong> Start with weights allowing 8-12 reps with 2-3 reps in reserve</p>
            <div className="starting-weights">
              <div><strong>Bench:</strong> 0.5-0.75x bodyweight</div>
              <div><strong>Squat:</strong> 0.75-1.0x bodyweight</div>
              <div><strong>Deadlift:</strong> 1.0-1.25x bodyweight</div>
              <div><strong>Key:</strong> Better too light than too heavy!</div>
            </div>
          </section>
          <section className="guide-section">
            <h3>Progressive Overload (NSCA "2 for 2 Rule")</h3>
            <div className="progression-rules">
              <div className="rule">
                <strong>Primary Method:</strong> If you can do 2+ reps AT OR ABOVE target range for 2 consecutive workouts, increase weight
              </div>
              <div className="rule">
                <strong>Automatic:</strong> App calculates new weights using NSCA percentage-based increases
              </div>
              <div className="rule">
                <strong>Within-workout:</strong> Weight increases if you exceed target reps during the session
              </div>
            </div>
          </section>

          <section className="guide-section">
            <h3>Weight Progression (Percentage-Based)</h3>
            <p><strong>Compound movements:</strong> 2.5-5% increase (min 2.5 lbs)</p>
            <p><strong>Isolation movements:</strong> 5-10% increase (min 2.5 lbs)</p>
            <p><strong>Smart Rounding:</strong> All increases rounded to nearest 2.5 lb increment</p>
            <p><strong>Automatic Tracking:</strong> App handles all calculations for you</p>
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

  // Reset Progress Modal
  const ResetModal = () => (
    <div className="program-guide-overlay" onClick={() => setShowResetModal(false)}>
      <div className="reset-modal" onClick={e => e.stopPropagation()}>
        <div className="reset-header">
          <h2>⚠️ Reset All Progress</h2>
          <button className="close-btn" onClick={() => setShowResetModal(false)}>×</button>
        </div>
        <div className="reset-content">
          <p>This will permanently delete:</p>
          <ul>
            <li>All workout history</li>
            <li>Weight progression data</li>
            <li>Week/day tracking</li>
          </ul>
          <p><strong>This action cannot be undone!</strong></p>
          <div className="reset-buttons">
            <button className="cancel-btn" onClick={() => setShowResetModal(false)}>
              Cancel
            </button>
            <button className="confirm-reset-btn" onClick={resetProgress}>
              Yes, Reset Everything
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // Onboarding component
  const OnboardingScreen = () => {
    const [weights, setWeights] = useState({})
    const [currentStep, setCurrentStep] = useState(0)

    // Get all unique exercises from all workout programs
    const allExercises = []
    Object.values(WORKOUT_PROGRAMS).forEach(program => {
      program.exercises.forEach(exercise => {
        if (!allExercises.find(ex => ex.id === exercise.id)) {
          allExercises.push(exercise)
        }
      })
    })

    const handleWeightChange = (exerciseId, weight) => {
      setWeights(prev => ({
        ...prev,
        [exerciseId]: parseFloat(weight) || 0
      }))
    }

    const handleSubmit = () => {
      // Fill in any missing weights with defaults
      const completeWeights = {}
      allExercises.forEach(exercise => {
        completeWeights[exercise.id] = weights[exercise.id] || getDefaultWeight(exercise.id)
      })
      completeOnboarding(completeWeights)
    }

    const getSuggestedWeight = (exercise) => {
      // Bodyweight suggestions based on research
      if (exercise.id === 'bench') return '0.5-0.75x bodyweight'
      if (exercise.id === 'squat') return '0.75-1.0x bodyweight'
      if (exercise.id === 'deadlift') return '1.0-1.25x bodyweight'
      if (exercise.id === 'dips' || exercise.id === 'pullups') return 'Start with bodyweight'
      if (exercise.type === 'isolation') return 'Start light (15-25 lbs)'
      return 'Start conservative'
    }

    return (
      <div className="app">
        <div className="onboarding-screen">
          <header className="onboarding-header">
            <h1>Welcome to Hyacinthe!</h1>
            <p>Let's set your starting weights based on NSCA guidelines</p>
            <div className="onboarding-info">
              <h3>🎯 Key Principles:</h3>
              <ul>
                <li><strong>Start Conservative:</strong> Better to start light and progress up</li>
                <li><strong>Focus on Form:</strong> Perfect technique over heavy weight</li>
                <li><strong>Trust the Process:</strong> Progressive overload will increase your weights automatically</li>
              </ul>
            </div>
          </header>

          <main className="onboarding-main">
            <div className="weight-setup">
              <h2>Set Your Starting Weights</h2>
              <p className="setup-subtitle">Enter comfortable weights where you can complete 8-12 reps with 2-3 reps in reserve</p>
              
              <div className="exercise-weights">
                {allExercises.map(exercise => (
                  <div key={exercise.id} className="exercise-weight-input">
                    <div className="exercise-info">
                      <h3>{exercise.name}</h3>
                      <span className={`exercise-type ${exercise.type}`}>
                        {exercise.type === 'compound' ? '🏋️ Compound' : '💪 Isolation'}
                      </span>
                      <p className="suggested-weight">{getSuggestedWeight(exercise)}</p>
                    </div>
                    <div className="weight-input-group">
                      <input
                        type="number"
                        step="2.5"
                        min="0"
                        placeholder={getDefaultWeight(exercise.id)}
                        value={weights[exercise.id] || ''}
                        onChange={(e) => handleWeightChange(exercise.id, e.target.value)}
                        className="weight-input"
                      />
                      <span className="weight-unit">lbs</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="onboarding-actions">
                <button 
                  className="complete-setup-btn"
                  onClick={handleSubmit}
                >
                  Complete Setup & Start Training
                </button>
                <p className="setup-note">
                  💡 Don't worry about getting these perfect - you can always reset and start over
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Show onboarding if not completed
  if (showOnboarding) {
    return <OnboardingScreen />
  }

  // Workout selection screen
  if (!workoutActive) {
    const stats = getWorkoutStats()
    return (
      <div className="app">
        <header className="header">
          <div className="header-content">
            <h1>Hyacinthe</h1>
            <p>Progressive Overload Tracker</p>
            <div className="program-stats">
              <span className="week-indicator">Week {stats.week} • {stats.programDay}</span>
              <span className="workout-count">
                P: {stats.pushCount} | P: {stats.pullCount} | L: {stats.legsCount}
              </span>
            </div>
          </div>
          <div className="header-buttons">
            <button className="reset-btn" onClick={() => setShowResetModal(true)}>
              🗑️
            </button>
            <button className="guide-btn" onClick={() => setShowGuide(true)}>
              📚
            </button>
          </div>
        </header>
        
        <main className="main">
          <div className="workout-selection">
            <h2>Choose Your Workout</h2>
            <div className="workout-options">
              {Object.entries(WORKOUT_PROGRAMS).map(([key, program]) => {
                const isRecommended = key === stats.nextWorkout
                const workoutCount = stats[key + 'Count'] || 0
                return (
                  <div key={key} className={`workout-option ${isRecommended ? 'recommended' : ''}`}>
                    {isRecommended && <div className="recommended-badge">⭐ Recommended</div>}
                    <div className="workout-info">
                      <h3>{program.name} 
                        <span className="workout-count-badge">#{workoutCount + 1}</span>
                      </h3>
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
                )
              })}
            </div>
          </div>
        </main>
        {showGuide && <ProgramGuide />}
        {showResetModal && <ResetModal />}
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
