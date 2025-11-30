import { browser } from '$app/environment';

export interface Curriculum {
  id: string;
  language: string; // 'es', 'jp', etc.
  title: string;    // e.g. "Diplomatic Spanish"
  createdAt: number;
  lastActive: number;
  manifesto: any;   // The full manifesto data
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

  create(manifesto: any) {
    const newCurriculum: Curriculum = {
      id: crypto.randomUUID(),
      language: manifesto.language || 'en',
      title: manifesto.intent || 'Untitled Protocol',
      createdAt: Date.now(),
      lastActive: Date.now(),
      manifesto,
      progress: {
        mastered: [],
        unlocked: ['start-node'] // Mock start
      }
    };

    this.curriculums.push(newCurriculum);
    this.activeCurriculumId = newCurriculum.id;
    this.save();
    return newCurriculum;
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
