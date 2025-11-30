import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pedagogyController } from '../ui/PedagogyController.svelte';
import { curriculumStore } from '../core/curriculumStore.svelte';

describe('Pedagogy Controller Integration', () => {
  beforeEach(() => {
    // Reset stores
    curriculumStore.curriculums = [];
    curriculumStore.activeCurriculumId = null;
    pedagogyController.currentScenario = null;
    pedagogyController.activeTask = null;
  });

  it('should initialize a session with a default curriculum', () => {
    // 1. Create a curriculum
    const manifesto = { language: 'es', intent: 'Test Protocol' };
    const curriculum = curriculumStore.create(manifesto);
    
    // 2. Load it
    pedagogyController.loadCurriculum(curriculum.id);
    expect(pedagogyController.activeCurriculum?.id).toBe(curriculum.id);

    // 3. Start Session
    pedagogyController.startSession();
    
    // 4. Verify Scenario and Task
    expect(pedagogyController.currentScenario).toBeDefined();
    expect(pedagogyController.activeTask).toBeDefined();
    expect(pedagogyController.activeTask?.role).toBeDefined();
  });

  it('should advance tasks on completion', () => {
    pedagogyController.startSession();
    const firstTask = pedagogyController.activeTask;
    expect(firstTask).toBeDefined();

    // Complete task
    pedagogyController.completeTask(0.9);

    // Should move to next task or complete scenario
    // Since default scenario has multiple tasks, it should change or stay if only 1 task
    // Let's check if taskIndex increased
    expect(pedagogyController.taskIndex).toBeGreaterThan(0);
  });
});
