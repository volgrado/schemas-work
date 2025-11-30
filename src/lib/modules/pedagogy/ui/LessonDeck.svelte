<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade, fly, slide } from 'svelte/transition';
  import type { ActionOrientedTask, LessonContent, Exercise, DialogueLine } from '../domain/models';
  import { AiCurriculumGenerator } from '../curriculum/aiCurriculumGenerator';
  import { curriculumStore } from '../core/curriculumStore.svelte';
  import { WebSpeechTTSService } from '$lib/modules/tts/infra/webSpeechTTSService';
  import Button from '$lib/core/ui/Button.svelte';
  
  interface Props {
    activeTask: ActionOrientedTask;
    onComplete: (data?: any) => void;
  }

  let { activeTask, onComplete }: Props = $props();
  
  let lessonContent = $state<LessonContent | null>(activeTask?.lessonContent || null);
  let isLoading = $state(false);
  let activeTab = $state<'dialogue' | 'phonetics' | 'notes' | 'exercises'>('dialogue');
  let currentExerciseIndex = $state(0);
  let exerciseAnswers = $state<Record<string, string>>({});
  let showFeedback = $state<Record<string, boolean>>({});

  // TTS State
  const tts = new WebSpeechTTSService();
  let isPlaying = $state(false);
  let currentLineIndex = $state<number | null>(null);
  let voices = $state<any[]>([]);

  const generator = new AiCurriculumGenerator();

  onMount(async () => {
    await tts.initialize();
    voices = tts.getVoices();

    if (!lessonContent && activeTask) {
      isLoading = true;
      try {
        lessonContent = await generator.generateLessonContent(activeTask);
        activeTask.lessonContent = lessonContent;
        curriculumStore.save();
      } catch (e) {
        console.error("Failed to generate lesson:", e);
      } finally {
        isLoading = false;
      }
    }
  });

  onDestroy(() => {
    tts.cancel();
  });

  // --- TTS Logic ---

  function getVoiceForSpeaker(speaker: string, suggestedId?: string): string | undefined {
    // Try to match suggested ID first
    if (suggestedId) {
      const match = voices.find(v => v.name.toLowerCase().includes(suggestedId.toLowerCase()));
      if (match) return match.id;
    }

    // Heuristic fallback based on speaker name (e.g., "Maria" -> Female voice)
    // For now, we just pick a random voice or default
    // Ideally, we'd map this to available voices
    return undefined;
  }

  async function playLine(line: DialogueLine, index: number) {
    if (isPlaying) {
      tts.cancel();
      if (currentLineIndex === index) {
        isPlaying = false;
        currentLineIndex = null;
        return;
      }
    }

    isPlaying = true;
    currentLineIndex = index;
    
    const voiceId = getVoiceForSpeaker(line.speaker, line.voiceId);
    
    await tts.speak(line.target, {
      voiceId,
      rate: 0.9,
      onEnd: () => {
        isPlaying = false;
        currentLineIndex = null;
      }
    });
  }

  async function playFullDialogue() {
    if (!lessonContent) return;
    if (isPlaying) {
      tts.cancel();
      isPlaying = false;
      currentLineIndex = null;
      return;
    }

    isPlaying = true;

    for (let i = 0; i < lessonContent.dialogue.length; i++) {
      if (!isPlaying) break; // Check if cancelled
      
      currentLineIndex = i;
      const line = lessonContent.dialogue[i];
      const voiceId = getVoiceForSpeaker(line.speaker, line.voiceId);

      await tts.speak(line.target, {
        voiceId,
        rate: 0.9
      });

      // Small pause between speakers
      await new Promise(r => setTimeout(r, 300));
    }

    isPlaying = false;
    currentLineIndex = null;
  }

  async function playPhonetic(text: string) {
    tts.cancel();
    await tts.speak(text, { rate: 0.8 });
  }

  // --- Exercise Logic ---

  // --- Footnote Logic ---
  let activeFootnoteId = $state<number | null>(null);

  function renderTextWithFootnotes(text: string) {
    // Replace [1], [2] with clickable spans
    const parts = text.split(/(\[\d+\])/g);
    return parts.map(part => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const id = parseInt(match[1]);
        return { type: 'footnote', id, text: part };
      }
      return { type: 'text', text: part };
    });
  }

  function handleFootnoteClick(e: MouseEvent, id: number) {
    e.stopPropagation();
    activeFootnoteId = activeFootnoteId === id ? null : id;
  }

  function getFootnoteContent(id: number) {
    return lessonContent?.footnotes?.find(f => f.id === id);
  }

  // Close footnote when clicking elsewhere
  function handleGlobalClick() {
    activeFootnoteId = null;
  }
</script>

<svelte:window onclick={handleGlobalClick} />

<div class="lesson-deck">
  {#if isLoading}
    <div class="loading-state" in:fade>
      <div class="spinner"></div>
      <p>Constructing Lesson Matrix...</p>
      <span class="sub-text">Accessing Pedagogical Archives</span>
    </div>
  {:else if lessonContent}
    <div class="lesson-content" in:fade>
      <!-- Lesson Header -->
      <header class="lesson-header">
        <h1>{activeTask.description}</h1>
        <div class="context-badge">{activeTask.context}</div>
      </header>

      <!-- Navigation Tabs -->
      <div class="tabs-container">
        <div class="tabs">
          <button class="tab-btn" class:active={activeTab === 'dialogue'} onclick={() => activeTab = 'dialogue'}>Dialogue</button>
          <button class="tab-btn" class:active={activeTab === 'phonetics'} onclick={() => activeTab = 'phonetics'}>Phonetics</button>
          <button class="tab-btn" class:active={activeTab === 'notes'} onclick={() => activeTab = 'notes'}>Notes</button>
          <button class="tab-btn" class:active={activeTab === 'exercises'} onclick={() => activeTab = 'exercises'}>Exercises</button>
        </div>
      </div>

      <!-- Content Area -->
      <div class="content-viewport">
        
        <!-- DIALOGUE TAB -->
        {#if activeTab === 'dialogue'}
          <div class="dialogue-view" in:fly={{ x: 20, duration: 300 }}>
            <div class="dialogue-controls">
              <Button variant="secondary" size="sm" onclick={playFullDialogue}>
                {isPlaying && currentLineIndex !== null ? 'Stop' : 'Play All'}
              </Button>
            </div>

            {#each lessonContent.dialogue as line, i}
              <button 
                class="dialogue-row" 
                class:active={currentLineIndex === i}
                onclick={() => playLine(line, i)}
                in:fly={{ y: 10, delay: i * 50 }}
              >
                <div class="speaker-avatar">
                  {line.speaker.charAt(0)}
                </div>
                <div class="text-pair">
                  <p class="target-lang">
                    {#each renderTextWithFootnotes(line.target) as part}
                      {#if part.type === 'footnote'}
                        <button 
                          class="footnote-marker" 
                          class:active={activeFootnoteId === part.id}
                          onclick={(e) => handleFootnoteClick(e, part.id)}
                        >
                          {part.id}
                          {#if activeFootnoteId === part.id}
                            <div class="footnote-popover" in:fade={{ duration: 100 }} onclick={(e) => e.stopPropagation()}>
                              <span class="note-word">{getFootnoteContent(part.id)?.word}</span>
                              <span class="note-text">{getFootnoteContent(part.id)?.note}</span>
                            </div>
                          {/if}
                        </button>
                      {:else}
                        {part.text}
                      {/if}
                    {/each}
                  </p>
                  <p class="native-lang">{line.native}</p>
                </div>
                <div class="play-icon">
                  {currentLineIndex === i ? '🔊' : '▶'}
                </div>
              </button>
            {/each}
          </div>
        
        <!-- PHONETICS TAB -->
        {:else if activeTab === 'phonetics'}
          <div class="phonetics-view" in:fly={{ x: 20, duration: 300 }}>
            <div class="phonetics-grid">
              {#each lessonContent.phonetics || [] as item}
                <div class="phonetic-card">
                  <div class="ipa-badge">{item.ipa}</div>
                  <h3 class="sound-title">{item.sound}</h3>
                  <p class="description">{item.description}</p>
                  <Button variant="ghost" size="sm" onclick={() => playPhonetic(item.sound)}>
                    Listen
                  </Button>
                </div>
              {/each}
              {#if !lessonContent.phonetics?.length}
                 <p class="empty-msg">No phonetic data available for this lesson.</p>
              {/if}
            </div>
          </div>

        <!-- NOTES TAB -->
        {:else if activeTab === 'notes'}
          <div class="notes-view" in:fly={{ x: 20, duration: 300 }}>
            <section class="notes-section">
              <h3>Vocabulary</h3>
              <div class="vocab-grid">
                {#each lessonContent.vocabulary as item}
                  <div class="vocab-card">
                    <span class="term">{item.term}</span>
                    <span class="definition">{item.definition}</span>
                    <span class="context">"{item.context}"</span>
                  </div>
                {/each}
              </div>
            </section>

            <section class="notes-section">
              <h3>Grammar Focus</h3>
              {#each lessonContent.grammar as note}
                <div class="grammar-card">
                  <h4>{note.rule}</h4>
                  <p>{note.explanation}</p>
                  <div class="examples">
                    {#each note.examples as ex}
                      <div class="example-pill">{ex}</div>
                    {/each}
                  </div>
                </div>
              {/each}
            </section>
          </div>

        <!-- EXERCISES TAB -->
        {:else if activeTab === 'exercises'}
          <div class="exercises-view" in:fly={{ x: 20, duration: 300 }}>
            <div class="exercise-container">
              {#each lessonContent.exercises as exercise, i}
                <div class="exercise-card">
                  <div class="exercise-header">
                    <span class="exercise-number">#{i + 1}</span>
                    <span class="exercise-type">{exercise.type.replace('_', ' ')}</span>
                  </div>
                  <p class="prompt">{exercise.prompt}</p>
                  
                  <div class="interaction-area">
                    {#if exercise.type === 'choice' || (exercise.options && exercise.options.length > 0)}
                      <div class="options-grid">
                        {#each exercise.options || [] as option}
                          <button 
                            class="option-btn"
                            class:selected={exerciseAnswers[exercise.id] === option}
                            class:correct={showFeedback[exercise.id] && isCorrect(exercise, option)}
                            class:wrong={showFeedback[exercise.id] && exerciseAnswers[exercise.id] === option && !isCorrect(exercise, option)}
                            onclick={() => checkAnswer(exercise, option)}
                            disabled={showFeedback[exercise.id]}
                          >
                            {option}
                          </button>
                        {/each}
                      </div>
                    {:else if exercise.type === 'cloze' || exercise.type === 'fill_blank'}
                       <div class="cloze-area">
                          <!-- Simple text input for now, could be enhanced to inline inputs -->
                          <input 
                            type="text" 
                            placeholder="Type the missing word..."
                            disabled={showFeedback[exercise.id]}
                            onkeydown={(e) => e.key === 'Enter' && checkAnswer(exercise, e.currentTarget.value)}
                          />
                       </div>
                    {:else}
                      <div class="text-input-area">
                        <input 
                          type="text" 
                          placeholder="Type your answer..."
                          disabled={showFeedback[exercise.id]}
                          onkeydown={(e) => e.key === 'Enter' && checkAnswer(exercise, e.currentTarget.value)}
                        />
                      </div>
                    {/if}
                  </div>

                  {#if showFeedback[exercise.id]}
                    <div class="feedback" in:slide>
                      <p class="explanation">{exercise.explanation}</p>
                    </div>
                  {/if}
                </div>
              {/each}
              
              <div class="completion-area">
                <Button variant="primary" onclick={handleComplete}>Complete Lesson</Button>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .lesson-deck {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    color: var(--color-text);
    font-family: var(--font-main);
    overflow: hidden;
    /* Glassmorphism container */
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 24px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.3);
  }

  .loading-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255,255,255,0.1);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .sub-text {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
  }

  .lesson-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .lesson-header {
    padding: 1.5rem 2rem 0.5rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .lesson-header h1 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    color: var(--color-text);
  }

  .context-badge {
    font-size: 0.85rem;
    color: var(--color-accent);
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .tabs-container {
    padding: 0.5rem 2rem 0 2rem;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }

  .tabs {
    display: flex;
    gap: 2rem;
  }

  .tab-btn {
    background: none;
    border: none;
    padding: 0.5rem 0;
    color: var(--color-text-secondary);
    cursor: pointer;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    position: relative;
    transition: color 0.2s;
    font-size: 0.9rem;
  }

  .tab-btn:hover {
    color: var(--color-text);
  }

  .tab-btn.active {
    color: var(--color-accent);
  }

  .tab-btn.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 100%;
    height: 2px;
    background: var(--color-accent);
    box-shadow: 0 0 10px var(--color-accent);
  }

  .content-viewport {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
  }

  /* Dialogue View */
  .dialogue-view {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 800px;
    margin: 0 auto;
  }

  .dialogue-controls {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1rem;
  }

  .dialogue-row {
    display: flex;
    gap: 1.5rem;
    align-items: flex-start;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.05);
    padding: 1.5rem;
    border-radius: 16px;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
  }

  .dialogue-row:hover {
    background: rgba(255,255,255,0.05);
    transform: translateX(5px);
  }

  .dialogue-row.active {
    background: rgba(var(--color-accent-rgb), 0.1);
    border-color: var(--color-accent);
  }

  .speaker-avatar {
    width: 40px;
    height: 40px;
    background: rgba(255,255,255,0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: var(--color-text-secondary);
    font-size: 1.2rem;
  }

  .text-pair {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .target-lang {
    font-size: 1.2rem;
    margin: 0;
    font-weight: 500;
    line-height: 1.4;
  }

  .native-lang {
    font-size: 1rem;
    color: var(--color-text-secondary);
    margin: 0;
    font-style: italic;
  }

  .play-icon {
    opacity: 0.5;
    font-size: 1.2rem;
  }

  .dialogue-row:hover .play-icon {
    opacity: 1;
  }

  /* Footnotes */
  .footnote-marker {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.2em;
    height: 1.2em;
    background: var(--color-accent);
    color: #000;
    border-radius: 50%;
    font-size: 0.7em;
    font-weight: 700;
    margin: 0 0.2em;
    cursor: pointer;
    vertical-align: super;
    border: none;
    position: relative;
    transition: transform 0.2s;
  }

  .footnote-marker:hover {
    transform: scale(1.2);
  }

  .footnote-popover {
    position: absolute;
    bottom: 150%;
    left: 50%;
    transform: translateX(-50%);
    background: #1a1a1a;
    border: 1px solid var(--color-accent);
    padding: 0.75rem;
    border-radius: 8px;
    width: max-content;
    max-width: 250px;
    z-index: 100;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    text-align: left;
    pointer-events: auto;
  }

  .footnote-popover::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -6px;
    border-width: 6px;
    border-style: solid;
    border-color: var(--color-accent) transparent transparent transparent;
  }

  .note-word {
    display: block;
    font-size: 0.8rem;
    color: var(--color-accent);
    font-weight: 700;
    margin-bottom: 0.25rem;
  }

  .note-text {
    display: block;
    font-size: 0.9rem;
    color: #fff;
    line-height: 1.3;
  }

  /* Phonetics View */
  .phonetics-view {
    max-width: 900px;
    margin: 0 auto;
  }

  .phonetics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .phonetic-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.05);
    padding: 2rem;
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1rem;
  }

  .ipa-badge {
    background: rgba(var(--color-accent-rgb), 0.2);
    color: var(--color-accent);
    padding: 0.5rem 1rem;
    border-radius: 12px;
    font-family: var(--font-mono);
    font-size: 1.5rem;
    font-weight: 700;
  }

  .sound-title {
    margin: 0;
    font-size: 1.2rem;
  }

  .description {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    margin: 0;
  }

  /* Notes View */
  .notes-view {
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 4rem;
  }

  .notes-section h3 {
    color: var(--color-accent);
    font-family: var(--font-mono);
    text-transform: uppercase;
    font-size: 0.9rem;
    letter-spacing: 0.1em;
    margin-bottom: 2rem;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    padding-bottom: 1rem;
  }

  .vocab-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1.5rem;
  }

  .vocab-card {
    background: rgba(255,255,255,0.03);
    padding: 1.5rem;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.05);
    transition: transform 0.2s;
  }

  .vocab-card:hover {
    transform: translateY(-5px);
    background: rgba(255,255,255,0.05);
  }

  .vocab-card .term {
    display: block;
    font-size: 1.3rem;
    font-weight: 700;
    color: #fff;
    margin-bottom: 0.5rem;
  }

  .vocab-card .definition {
    display: block;
    font-size: 1rem;
    margin-bottom: 0.75rem;
    color: var(--color-text-secondary);
  }

  .vocab-card .context {
    display: block;
    font-size: 0.9rem;
    color: var(--color-accent);
    font-style: italic;
  }

  .grammar-card {
    background: rgba(255,255,255,0.03);
    padding: 2rem;
    border-radius: 20px;
    margin-bottom: 2rem;
    border-left: 4px solid var(--color-accent);
  }

  .grammar-card h4 {
    margin: 0 0 1rem 0;
    color: #fff;
    font-size: 1.2rem;
  }

  .example-pill {
    background: rgba(0,0,0,0.2);
    padding: 0.75rem 1.5rem;
    border-radius: 30px;
    font-family: var(--font-mono);
    font-size: 0.9rem;
    margin-top: 0.75rem;
    display: inline-block;
    margin-right: 0.75rem;
    border: 1px solid rgba(255,255,255,0.05);
  }

  /* Exercises View */
  .exercises-view {
    max-width: 800px;
    margin: 0 auto;
  }

  .exercise-container {
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }

  .exercise-card {
    background: rgba(20,20,20,0.4);
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 20px;
    padding: 2rem;
  }

  .exercise-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1.5rem;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .prompt {
    font-size: 1.3rem;
    margin-bottom: 2rem;
    line-height: 1.4;
  }

  .options-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .option-btn {
    padding: 1.5rem;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    font-size: 1.1rem;
  }

  .option-btn:hover:not(:disabled) {
    background: rgba(255,255,255,0.08);
    transform: scale(1.02);
  }

  .option-btn.correct {
    background: rgba(var(--color-success-rgb), 0.2);
    border-color: var(--color-success);
  }

  .option-btn.wrong {
    background: rgba(var(--color-error-rgb), 0.2);
    border-color: var(--color-error);
    opacity: 0.5;
  }

  .text-input-area input, .cloze-area input {
    width: 100%;
    padding: 1.5rem;
    background: rgba(0,0,0,0.2);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    color: #fff;
    font-size: 1.2rem;
    transition: border-color 0.2s;
  }

  .text-input-area input:focus, .cloze-area input:focus {
    border-color: var(--color-accent);
    outline: none;
  }

  .feedback {
    margin-top: 1.5rem;
    padding: 1.5rem;
    background: rgba(var(--color-info-rgb), 0.1);
    border-radius: 12px;
    border-left: 4px solid var(--color-info);
  }

  .completion-area {
    display: flex;
    justify-content: center;
    padding-top: 2rem;
  }
</style>
