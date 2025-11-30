import { browser } from '$app/environment';

export interface Curriculum {
  id: string;
  language: string; // 'es', 'jp', etc.
  title: string;    // e.g. "Diplomatic Spanish"
  createdAt: number;
  lastActive: number;
  manifesto: any;   // The full manifesto data
  scenario?: any;   // The generated scenario (tasks, etc.)
  progress: {
    mastered: string[]; // IDs of mastered nodes
    unlocked: string[]; // IDs of unlocked nodes
  };
}

class CurriculumStore {
  curriculums = $state<Curriculum[]>([]);
  activeCurriculumId = $state<string | null>(null);

  constructor() {
    if (browser) {
      this.load();
    }
  }

  load() {
    const stored = localStorage.getItem('sovereign_curriculums');
    const active = localStorage.getItem('sovereign_active_id');
    
    if (stored) {
      this.curriculums = JSON.parse(stored);
    }
    if (active) {
      this.activeCurriculumId = active;
    }
  }

  save() {
    if (browser) {
      localStorage.setItem('sovereign_curriculums', JSON.stringify(this.curriculums));
      if (this.activeCurriculumId) {
        localStorage.setItem('sovereign_active_id', this.activeCurriculumId);
      }
    }
  }

  create(manifesto: any, scenario?: any) {
    const newCurriculum: Curriculum = {
      id: crypto.randomUUID(),
      language: manifesto.language || 'en',
      title: manifesto.intent || 'Untitled Protocol',
      createdAt: Date.now(),
      lastActive: Date.now(),
      manifesto,
      scenario,
      progress: {
        mastered: [],
        unlocked: ['start-node'] // Mock start
      }
    };

    this.curriculums.push(newCurriculum);
    this.activeCurriculumId = newCurriculum.id;
    this.save();
    this.save();
    return newCurriculum;
  }

  expandNode(newTasks: any[]) {
    if (!this.activeCurriculum || !this.activeCurriculum.scenario) return;
    
    // Append new tasks to the scenario
    // We assume the caller has already set up IDs and parent relationships if needed
    // But for flat list, we just push them.
    // Ideally we should check for duplicates.
    
    if (!this.activeCurriculum.scenario.tasks) {
      this.activeCurriculum.scenario.tasks = [];
    }
    
    this.activeCurriculum.scenario.tasks.push(...newTasks);
    this.save();
    
    // Force reactivity update by re-assigning (Svelte 5 Runes might handle deep mutation if using $state correctly, 
    // but here curriculums is an array of objects, so deep mutation inside an object in the array might not trigger unless we use a class or update the array reference)
    // Actually, since 'curriculums' is $state, mutating deep properties *should* work if they are accessed via the proxy.
    // But let's trigger an update to be safe.
    this.curriculums = [...this.curriculums];
  }

  markTaskMastered(taskId: string) {
    if (!this.activeCurriculum) return;

    const progress = this.activeCurriculum.progress;
    if (!progress.mastered.includes(taskId)) {
      progress.mastered.push(taskId);
      
      // Logic to unlock next nodes could go here
      // For now, we assume everything is unlocked or unlocking is implicit
      
      this.save();
      this.curriculums = [...this.curriculums]; // Trigger reactivity
    }
  }

  switch(id: string) {
    const target = this.curriculums.find(c => c.id === id);
    if (target) {
      this.activeCurriculumId = id;
      target.lastActive = Date.now();
      this.save();
    }
  }

  delete(id: string) {
    this.curriculums = this.curriculums.filter(c => c.id !== id);
    if (this.activeCurriculumId === id) {
      this.activeCurriculumId = null;
      localStorage.removeItem('sovereign_active_id');
    }
    this.save();
  }

  get activeCurriculum() {
    return this.curriculums.find(c => c.id === this.activeCurriculumId);
  }

  get byLanguage() {
    const groups: Record<string, Curriculum[]> = {};
    for (const c of this.curriculums) {
      if (!groups[c.language]) {
        groups[c.language] = [];
      }
      groups[c.language].push(c);
    }
    return groups;
  }
}

export const curriculumStore = new CurriculumStore();
