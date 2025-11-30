export type AnalyticsEvent = 
  | 'MISSION_STARTED'
  | 'MISSION_COMPLETED'
  | 'SCENARIO_COMPLETED'
  | 'AI_LATENCY'
  | 'ERROR'
  | 'EXPANSION_TRIGGERED'
  | 'APP_INIT';

export interface AnalyticsPayload {
  [key: string]: any;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private logs: Array<{ timestamp: number; event: AnalyticsEvent; payload: AnalyticsPayload }> = [];

  private constructor() {
    this.track('APP_INIT', { timestamp: Date.now() });
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  public track(event: AnalyticsEvent, payload: AnalyticsPayload = {}) {
    const logEntry = {
      timestamp: Date.now(),
      event,
      payload
    };
    
    this.logs.push(logEntry);
    
    // In production, this would send data to a server (PostHog, Mixpanel, etc.)
    // For now, we log to console in dev mode
    if (import.meta.env.DEV) {
      console.groupCollapsed(`[Analytics] ${event}`);
      console.log(payload);
      console.groupEnd();
    }
    
    // Optional: Persist critical logs to localStorage for debugging sessions
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-50); // Keep last 50
    }
  }

  public getLogs() {
    return this.logs;
  }
}

export const analytics = AnalyticsService.getInstance();
