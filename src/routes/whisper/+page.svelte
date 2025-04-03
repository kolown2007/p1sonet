<script lang="ts">
  import * as Tone from 'tone';
  
  let isPlaying = false;
  type MoodPreset = {
    chords: string[][];
    bpm: number;
    attack: number;
    release: number;
    reverbDecay: number;
    delayTime: number;
  };

  type MoodPresets = {
    [key: string]: MoodPreset;
  };

  let currentMood: keyof typeof moodPresets = 'dreamy';
  
  // Control parameters
  let reverbDecay = 5;
  let reverbWet = 0.6;
  let delayTime = 0.5;
  let delayFeedback = 0.4;
  let attackTime = 2;
  let releaseTime = 4;
  let bpm = 60;
  
  // Mood presets with different chord progressions
  const moodPresets = {
    dreamy: {
      chords: [
        ["C3", "E3", "G3", "B3"],
        ["A2", "C3", "E3", "G3"],
        ["F2", "A2", "C3", "E3"],
        ["G2", "B2", "D3", "F3"]
      ],
      bpm: 60,
      attack: 2,
      release: 4,
      reverbDecay: 5,
      delayTime: 0.5
    },
    mystical: {
      chords: [
        ["D3", "F#3", "A3", "C4"],
        ["B2", "D3", "F#3", "A3"],
        ["G2", "B2", "D3", "F#3"],
        ["E2", "G2", "B2", "D3"]
      ],
      bpm: 48,
      attack: 3,
      release: 6,
      reverbDecay: 8,
      delayTime: 0.7
    },
    cosmic: {
      chords: [
        ["Eb3", "G3", "Bb3", "D4"],
        ["C3", "Eb3", "G3", "Bb3"],
        ["Ab2", "C3", "Eb3", "G3"],
        ["Bb2", "D3", "F3", "Ab3"]
      ],
      bpm: 54,
      attack: 4,
      release: 8,
      reverbDecay: 7,
      delayTime: 0.6
    }
  };

  // Setup effects
  const reverb = new Tone.Reverb({
    decay: reverbDecay,
    wet: reverbWet
  }).toDestination();
  
  const delay = new Tone.FeedbackDelay({
    delayTime: delayTime,
    feedback: delayFeedback
  }).connect(reverb);
  
  // Create synth
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
      type: "sine"
    },
    envelope: {
      attack: attackTime,
      decay: 1,
      sustain: 0.8,
      release: releaseTime
    }
  }).connect(delay);
  
  // Random chord variation function
  function addVariation(chord: string[]) {
    // Randomly decide to add a 9th or remove a note
    if (Math.random() > 0.7) {
      const root = chord[0];
      const note = Tone.Frequency(root).transpose(14); // Add 9th
      return [...chord, note.toNote()];
    }
    if (Math.random() < 0.3 && chord.length > 3) {
      return chord.slice(0, -1); // Remove last note
    }
    return chord;
  }

  function applyMoodPreset(mood: keyof typeof moodPresets) {
    const preset = moodPresets[mood];
    currentMood = mood;
    bpm = preset.bpm;
    attackTime = preset.attack;
    releaseTime = preset.release;
    reverbDecay = preset.reverbDecay;
    delayTime = preset.delayTime;
  }

  function togglePlay() {
    if (!isPlaying) {
      Tone.start();
      isPlaying = true;
      
      let index = 0;
      Tone.Transport.scheduleRepeat((time) => {
        const currentChord = moodPresets[currentMood].chords[index];
        const variedChord = addVariation(currentChord);
        synth.triggerAttackRelease(variedChord, "4n", time);
        index = (index + 1) % moodPresets[currentMood].chords.length;
      }, "4n");
      
      Tone.Transport.bpm.value = bpm;
      Tone.Transport.start();
    } else {
      isPlaying = false;
      Tone.Transport.stop();
    }
  }

  // Update parameters reactively
  $: {
    reverb.decay = reverbDecay;
    reverb.wet.value = reverbWet;
    delay.delayTime.value = delayTime;
    delay.feedback.value = delayFeedback;
    synth.set({
      envelope: {
        attack: attackTime,
        release: releaseTime
      }
    });
    Tone.Transport.bpm.value = bpm;
  }
</script>

<div class="container">
  <div class="controls">
    <div class="control-group">
      <h3>Mood</h3>
      <div class="mood-buttons">
        {#each Object.keys(moodPresets) as mood (mood)}
            <button 
              class="mood-button" 
              class:active={currentMood === mood}
              on:click={() => applyMoodPreset(mood as keyof typeof moodPresets)}
          >
            {mood}
          </button>
        {/each}
      </div>
    </div>

    <div class="control-group">
      <h3>Reverb</h3>
      <label>
        Decay: {reverbDecay}s
        <input type="range" min="1" max="10" step="0.1" bind:value={reverbDecay}>
      </label>
      <label>
        Wet: {reverbWet}
        <input type="range" min="0" max="1" step="0.01" bind:value={reverbWet}>
      </label>
    </div>

    <div class="control-group">
      <h3>Delay</h3>
      <label>
        Time: {delayTime}s
        <input type="range" min="0" max="1" step="0.01" bind:value={delayTime}>
      </label>
      <label>
        Feedback: {delayFeedback}
        <input type="range" min="0" max="0.9" step="0.01" bind:value={delayFeedback}>
      </label>
    </div>

    <div class="control-group">
      <h3>Synth</h3>
      <label>
        Attack: {attackTime}s
        <input type="range" min="0.1" max="5" step="0.1" bind:value={attackTime}>
      </label>
      <label>
        Release: {releaseTime}s
        <input type="range" min="0.1" max="10" step="0.1" bind:value={releaseTime}>
      </label>
      <label>
        BPM: {bpm}
        <input type="range" min="40" max="120" step="1" bind:value={bpm}>
      </label>
    </div>

    <button on:click={togglePlay}>
      {isPlaying ? 'Stop' : 'Play'} Ambient Music
    </button>
  </div>
</div>

<style>
  .container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 2rem;
  }
  
  .controls {
    background: #2a2a2a;
    padding: 2rem;
    border-radius: 1rem;
    color: white;
  }

  .control-group {
    margin-bottom: 2rem;
  }

  h3 {
    margin: 0 0 1rem 0;
    color: #a0aec0;
  }

  label {
    display: block;
    margin-bottom: 1rem;
  }

  input[type="range"] {
    width: 100%;
    margin-top: 0.5rem;
  }

  button {
    padding: 1rem 2rem;
    font-size: 1.2rem;
    background-color: #4a5568;
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  button:hover {
    background-color: #2d3748;
  }

  .mood-buttons {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .mood-button {
    padding: 0.5rem 1rem;
    background: #4a5568;
    opacity: 0.7;
  }

  .mood-button.active {
    opacity: 1;
    background: #667eea;
  }
</style>