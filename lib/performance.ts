// Performance monitoring and optimization utilities

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics: number = 1000;

  // Start timing an operation
  startTimer(name: string): (metadata?: Record<string, any>) => void {
    const startTime = Date.now();

    return (metadata?: Record<string, any>) => {
      const duration = Date.now() - startTime;
      this.recordMetric(name, duration, metadata);
    };
  }

  // Record a performance metric
  recordMetric(name: string, duration: number, metadata?: Record<string, any>): void {
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    });

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log slow operations (> 1 second)
    if (duration > 1000) {
      console.warn(`[Performance] Slow operation: ${name} took ${duration}ms`, metadata);
    }
  }

  // Get average duration for a specific operation
  getAverageDuration(name: string): number {
    const filtered = this.metrics.filter(m => m.name === name);
    if (filtered.length === 0) return 0;

    const total = filtered.reduce((sum, m) => sum + m.duration, 0);
    return total / filtered.length;
  }

  // Get all metrics for a specific operation
  getMetrics(name: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.name === name);
  }

  // Get slowest operations
  getSlowestOperations(limit: number = 10): PerformanceMetric[] {
    return [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  // Get performance summary
  getSummary(): Record<string, { count: number; avg: number; min: number; max: number }> {
    const summary: Record<string, { count: number; total: number; min: number; max: number }> = {};

    this.metrics.forEach(metric => {
      if (!summary[metric.name]) {
        summary[metric.name] = {
          count: 0,
          total: 0,
          min: Infinity,
          max: 0,
        };
      }

      const s = summary[metric.name];
      s.count++;
      s.total += metric.duration;
      s.min = Math.min(s.min, metric.duration);
      s.max = Math.max(s.max, metric.duration);
    });

    // Convert to final format with average
    const result: Record<string, { count: number; avg: number; min: number; max: number }> = {};
    Object.keys(summary).forEach(key => {
      const s = summary[key];
      result[key] = {
        count: s.count,
        avg: Math.round(s.total / s.count),
        min: s.min,
        max: s.max,
      };
    });

    return result;
  }

  // Clear all metrics
  clear(): void {
    this.metrics = [];
  }

  // Export metrics for analysis
  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;

// Helper function to measure async operations
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const endTimer = performanceMonitor.startTimer(name);

  try {
    const result = await operation();
    endTimer(metadata);
    return result;
  } catch (error) {
    endTimer({ ...metadata, error: true });
    throw error;
  }
}

// Helper function to measure sync operations
export function measureSync<T>(
  name: string,
  operation: () => T,
  metadata?: Record<string, any>
): T {
  const endTimer = performanceMonitor.startTimer(name);

  try {
    const result = operation();
    endTimer(metadata);
    return result;
  } catch (error) {
    endTimer({ ...metadata, error: true });
    throw error;
  }
}

// Performance thresholds (in milliseconds)
export const PERFORMANCE_THRESHOLDS = {
  API_RESPONSE: 500,
  DATABASE_QUERY: 200,
  IMAGE_LOAD: 1000,
  PAGE_RENDER: 2000,
  CACHE_HIT: 10,
} as const;

// Check if operation is within acceptable threshold
export function isWithinThreshold(duration: number, threshold: number): boolean {
  return duration <= threshold;
}

// Log performance warning if threshold exceeded
export function checkThreshold(
  name: string,
  duration: number,
  threshold: number,
  metadata?: Record<string, any>
): void {
  if (!isWithinThreshold(duration, threshold)) {
    console.warn(
      `[Performance] ${name} exceeded threshold: ${duration}ms > ${threshold}ms`,
      metadata
    );
  }
}

// Web Vitals tracking (for client-side)
export function trackWebVitals(): void {
  if (typeof window === 'undefined') return;

  // Track Largest Contentful Paint (LCP)
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        performanceMonitor.recordMetric('LCP', lastEntry.renderTime || lastEntry.loadTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Track First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          performanceMonitor.recordMetric('FID', entry.processingStart - entry.startTime);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Track Cumulative Layout Shift (CLS)
      let clsScore = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsScore += entry.value;
          }
        });
        performanceMonitor.recordMetric('CLS', clsScore * 1000); // Convert to ms for consistency
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.error('[Performance] Error setting up Web Vitals tracking:', error);
    }
  }
}
