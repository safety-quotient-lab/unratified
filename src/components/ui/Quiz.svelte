<script lang="ts">
  interface Question {
    article: number;
    right: string;
    question: string;
  }

  const questions: Question[] = [
    { article: 6, right: 'Right to Work', question: 'Do you feel secure in your employment — confident that you could find equivalent work if your current position ended?' },
    { article: 7, right: 'Just Work Conditions', question: 'Do your working conditions include fair compensation, safe environment, and reasonable hours with adequate rest?' },
    { article: 9, right: 'Social Security', question: 'Do you have reliable access to unemployment support, disability coverage, and retirement security?' },
    { article: 11, right: 'Adequate Standard of Living', question: 'Can you afford adequate food, clothing, and housing for yourself and your family without financial distress?' },
    { article: 12, right: 'Right to Health', question: 'Do you have affordable access to quality healthcare — both physical and mental — when you need it?' },
    { article: 13, right: 'Right to Education', question: 'Did you have access to quality education that developed your ability to evaluate, decide, and think critically — not just memorize facts?' },
    { article: 15, right: 'Right to Benefit from Science', question: 'Do you benefit from advances in technology and science — including AI tools — in your daily life and work?' },
  ];

  type Answer = 'yes' | 'partial' | 'no' | null;

  let answers = $state<Answer[]>(new Array(questions.length).fill(null));
  let showResults = $state(false);

  function answer(index: number, value: Answer) {
    answers[index] = value;
  }

  function calculateResults() {
    showResults = true;
  }

  function reset() {
    answers = new Array(questions.length).fill(null);
    showResults = false;
  }

  let allAnswered = $derived(answers.every(a => a !== null));
  let yesCount = $derived(answers.filter(a => a === 'yes').length);
  let partialCount = $derived(answers.filter(a => a === 'partial').length);
  let noCount = $derived(answers.filter(a => a === 'no').length);
</script>

<div class="quiz">
  {#if !showResults}
    <div class="quiz-intro">
      <p>
        The ICESCR protects rights that affect daily life. This self-assessment helps you
        explore whether these protections show up in your own experience.
      </p>
      <p class="quiz-note">
        This assessment does not collect or store any data. Your answers remain in your browser only.
      </p>
    </div>

    <div class="questions">
      {#each questions as q, i}
        <fieldset class="question" class:answered={answers[i] !== null}>
          <legend>
            <span class="q-article">Article {q.article}</span>
            <span class="q-right">{q.right}</span>
          </legend>
          <p class="q-text">{q.question}</p>
          <div class="q-options">
            <button
              class:selected={answers[i] === 'yes'}
              onclick={() => answer(i, 'yes')}
            >Yes</button>
            <button
              class:selected={answers[i] === 'partial'}
              onclick={() => answer(i, 'partial')}
            >Partially</button>
            <button
              class:selected={answers[i] === 'no'}
              onclick={() => answer(i, 'no')}
            >No</button>
          </div>
        </fieldset>
      {/each}
    </div>

    <button
      class="submit-btn"
      onclick={calculateResults}
      disabled={!allAnswered}
    >
      See Results
    </button>
  {:else}
    <div class="results">
      <h3>Your Results</h3>

      <div class="result-summary">
        <div class="result-bar">
          <div class="bar-yes" style="width: {(yesCount / questions.length) * 100}%"></div>
          <div class="bar-partial" style="width: {(partialCount / questions.length) * 100}%"></div>
          <div class="bar-no" style="width: {(noCount / questions.length) * 100}%"></div>
        </div>
        <div class="result-legend">
          <span class="legend-yes">Yes: {yesCount}</span>
          <span class="legend-partial">Partial: {partialCount}</span>
          <span class="legend-no">No: {noCount}</span>
        </div>
      </div>

      <div class="result-detail">
        {#each questions as q, i}
          <div class="result-item" class:result-yes={answers[i] === 'yes'} class:result-partial={answers[i] === 'partial'} class:result-no={answers[i] === 'no'}>
            <span class="result-indicator">{answers[i] === 'yes' ? 'Yes' : answers[i] === 'partial' ? 'Partial' : 'No'}</span>
            <span class="result-right">
              <a href="/covenant/articles/article-{q.article}">Article {q.article}: {q.right}</a>
            </span>
          </div>
        {/each}
      </div>

      <div class="result-message">
        {#if noCount === 0 && partialCount === 0}
          <p>You experience all seven rights fully — a position of relative privilege. Many Americans do not share this experience, and without the ICESCR, no legal framework guarantees it.</p>
        {:else if noCount >= 3}
          <p>You lack full access to {noCount} of the 7 rights the ICESCR protects. These gaps represent exactly the conditions the treaty addresses — and exactly the conditions the United States has no binding obligation to remedy.</p>
        {:else}
          <p>Your experience shows a mixed picture — some rights realized, others partially or not at all. The ICESCR would create a legal framework for progressive improvement across all these dimensions.</p>
        {/if}
        <p>
          <a href="/action">Take action: contact your senators about ICESCR ratification &rarr;</a>
        </p>
      </div>

      <button class="reset-btn" onclick={reset}>Start Over</button>
    </div>
  {/if}
</div>

<style>
  .quiz {
    max-width: 42rem;
  }

  .quiz-note {
    font-size: 0.8rem;
    color: var(--color-text-muted, #5a5a5a);
    font-style: italic;
  }

  .questions {
    display: flex;
    flex-direction: column;
    gap: 1.618rem;
    margin: 1.618rem 0;
  }

  fieldset.question {
    border: 1px solid #d4d0c8;
    border-radius: 4px;
    padding: 1.618rem;
    transition: border-color 0.15s;
  }

  fieldset.answered {
    border-color: #8b4513;
  }

  legend {
    display: flex;
    gap: 0.618rem;
    align-items: baseline;
    padding: 0 0.382rem;
  }

  .q-article {
    font-family: 'Inter', sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #8b4513;
  }

  .q-right {
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    color: #2d3047;
  }

  .q-text {
    margin: 0.618rem 0 1rem;
    max-width: 36rem;
  }

  .q-options {
    display: flex;
    gap: 0.618rem;
  }

  .q-options button {
    font-family: 'Inter', sans-serif;
    font-size: 0.8rem;
    padding: 0.382rem 1rem;
    border: 1px solid #d4d0c8;
    border-radius: 4px;
    background: #ffffff;
    color: #5a5a5a;
    cursor: pointer;
    transition: all 0.15s;
  }

  .q-options button:hover {
    border-color: #8b4513;
    color: #2d3047;
  }

  .q-options button.selected {
    background: #2d3047;
    color: #faf9f7;
    border-color: #2d3047;
  }

  .submit-btn {
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    padding: 0.618rem 1.618rem;
    background: #8b4513;
    color: #faf9f7;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .submit-btn:hover:not(:disabled) {
    background: #2d3047;
  }

  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .results {
    margin-top: 1.618rem;
  }

  .result-summary {
    margin: 1.618rem 0;
  }

  .result-bar {
    display: flex;
    height: 1.618rem;
    border-radius: 4px;
    overflow: hidden;
    background: #f0eeeb;
  }

  .bar-yes { background: #2d6a4f; }
  .bar-partial { background: #d4a574; }
  .bar-no { background: #c1121f; }

  .result-legend {
    display: flex;
    gap: 1.618rem;
    margin-top: 0.618rem;
    font-family: 'Inter', sans-serif;
    font-size: 0.8rem;
  }

  .legend-yes { color: #2d6a4f; }
  .legend-partial { color: #8b4513; }
  .legend-no { color: #c1121f; }

  .result-detail {
    display: flex;
    flex-direction: column;
    gap: 0.382rem;
    margin: 1.618rem 0;
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.382rem 0.618rem;
    border-radius: 3px;
  }

  .result-indicator {
    font-family: 'Inter', sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
    min-width: 3.5rem;
  }

  .result-yes .result-indicator { color: #2d6a4f; }
  .result-partial .result-indicator { color: #8b4513; }
  .result-no .result-indicator { color: #c1121f; }

  .result-right a {
    color: #2d3047;
    text-decoration: none;
    font-size: 0.875rem;
  }

  .result-right a:hover {
    color: #8b4513;
  }

  .result-message {
    margin: 1.618rem 0;
    padding: 1rem 1.618rem;
    background: #f0eeeb;
    border-radius: 4px;
  }

  .result-message a {
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    color: #8b4513;
  }

  .reset-btn {
    font-family: 'Inter', sans-serif;
    font-size: 0.8rem;
    padding: 0.382rem 1rem;
    border: 1px solid #d4d0c8;
    border-radius: 4px;
    background: #ffffff;
    color: #5a5a5a;
    cursor: pointer;
  }

  .reset-btn:hover {
    border-color: #8b4513;
    color: #2d3047;
  }
</style>
