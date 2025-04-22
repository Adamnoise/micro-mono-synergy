
// Simplified version of PerformanceMonitor without references to non-existent properties

/**
 * Simple performance monitoring utility
 */
export class PerformanceMonitor {
  private startTime: number = 0;
  private endTime: number = 0;
  private memoryUsage: any[] = [];
  private options: { debugMode: boolean };
  
  constructor(options: { debugMode: boolean }) {
    this.options = options;
  }
  
  /**
   * Start performance measurement
   */
  startMeasurement(): void {
    this.startTime = performance.now();
    console.log('Performance measurement started');
  }
  
  /**
   * End performance measurement
   */
  endMeasurement(): void {
    this.endTime = performance.now();
    console.log('Performance measurement ended');
  }
  
  /**
   * Capture current memory usage if available
   */
  captureMemoryUsage(): void {
    if (window.performance && (performance as any).memory) {
      this.memoryUsage.push({
        timestamp: Date.now(),
        // Cast to any to access non-standard memory API in Chrome
        memory: (performance as any).memory
      });
    }
  }
  
  /**
   * Get performance metrics
   */
  getMetrics(): {
    executionTime: number;
    memory: any[];
    resourceMetrics: any[];
  } {
    // Get resource timing data
    const resourceMetrics = this.getResourceMetrics();
    
    return {
      executionTime: this.endTime - this.startTime,
      memory: this.memoryUsage,
      resourceMetrics
    };
  }
  
  /**
   * Get resource timing metrics
   */
  private getResourceMetrics(): any[] {
    if (!window.performance || !performance.getEntriesByType) {
      return [];
    }
    
    // Get resource timing entries
    const resources = performance.getEntriesByType('resource');
    
    // Process each resource entry
    return resources.map(entry => {
      const resource = entry as PerformanceResourceTiming;
      
      return {
        name: entry.name,
        entryType: entry.entryType,
        startTime: entry.startTime,
        duration: entry.duration,
        initiatorType: resource.initiatorType,
        redirectTime: resource.redirectEnd - resource.redirectStart,
        dnsTime: resource.domainLookupEnd - resource.domainLookupStart,
        connectTime: resource.connectEnd - resource.connectStart,
        requestTime: resource.responseStart - resource.requestStart,
        responseTime: resource.responseEnd - resource.responseStart,
        // Remove references to responseHeaders which doesn't exist
        size: resource.transferSize || 0,
        encodedSize: resource.encodedBodySize || 0,
        decodedSize: resource.decodedBodySize || 0
      };
    });
  }
  
  /**
   * Process and format timing data for user-friendly display
   */
  processTimingData(): any[] {
    // Use simplified metrics for now
    return [];
  }
  
  /**
   * Track a specific event execution time
   */
  trackEvent(eventName: string, callback: () => void): void {
    const startTime = performance.now();
    callback();
    const endTime = performance.now();
    
    if (this.options.debugMode) {
      console.log(`Event ${eventName} took ${endTime - startTime}ms`);
    }
  }
  
  /**
   * Generate a performance report
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    
    return `
Performance Report:
- Total execution time: ${metrics.executionTime.toFixed(2)}ms
- Memory usage samples: ${metrics.memory.length}
- Resource requests: ${metrics.resourceMetrics.length}
`;
  }
}
