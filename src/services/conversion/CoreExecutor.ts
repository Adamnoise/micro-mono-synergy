
import { ConversionOptions } from "@/types/conversion";
import { DependencyAnalyzer } from "./DependencyAnalyzer";
import { RouteAnalyzer } from "./RouteAnalyzer";
import { FileTransformer } from "./FileTransformer";
import { ApiRouteConverter } from "./ApiRouteConverter";
import { MiddlewareHandler } from "./MiddlewareHandler";
import { CICDGenerator } from "./CICDGenerator";
import { ErrorCollector } from "../errors/ErrorCollector";

// Define a local interface for ConversionResult to avoid import issues
interface ConversionResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
  routes: any[];
  dependencies: any[];
  transformedFiles: string[];
  stats: {
    totalFiles: number;
    modifiedFiles: number;
    transformationRate: number;
    dependencyChanges: number;
    routeChanges: number;
  };
}

/**
 * Core executor that orchestrates the conversion process.
 * This class coordinates the individual specialized converters and analyzers.
 */
export class CoreExecutor {
  private files: File[];
  private projectJson: any;
  private options: ConversionOptions;
  private progress: number = 0;
  private progressCallback?: (progress: number, message: string) => void;
  private errorCollector: ErrorCollector;
  
  // Specialized modules
  private dependencyAnalyzer: DependencyAnalyzer;
  private routeAnalyzer: RouteAnalyzer;
  private fileTransformer: FileTransformer;
  private apiRouteConverter: ApiRouteConverter;
  private middlewareHandler: MiddlewareHandler;
  private cicdGenerator: CICDGenerator;
  
  constructor(files: File[], packageJson: any, options: ConversionOptions) {
    this.files = files;
    this.projectJson = packageJson || {}; // Ensure packageJson is never undefined
    this.options = options;
    this.errorCollector = new ErrorCollector();
    
    // Initialize specialized modules
    this.dependencyAnalyzer = new DependencyAnalyzer(this.projectJson, this.errorCollector);
    this.routeAnalyzer = new RouteAnalyzer(files, this.errorCollector);
    this.fileTransformer = new FileTransformer(files, this.errorCollector);
    this.apiRouteConverter = new ApiRouteConverter(files, this.errorCollector);
    this.middlewareHandler = new MiddlewareHandler(files, this.errorCollector);
    this.cicdGenerator = new CICDGenerator(this.errorCollector);
  }
  
  setProgressCallback(callback: (progress: number, message: string) => void): CoreExecutor {
    this.progressCallback = callback;
    return this;
  }
  
  private updateProgress(increment: number, message: string): void {
    this.progress += increment;
    if (this.progressCallback) {
      this.progressCallback(Math.min(this.progress, 100), message);
    }
  }
  
  /**
   * Execute the full conversion process
   */
  async execute(): Promise<ConversionResult> {
    const result: ConversionResult = {
      success: false,
      errors: [],
      warnings: [],
      info: [],
      routes: [],
      dependencies: [],
      transformedFiles: [],
      stats: {
        totalFiles: this.files.length,
        modifiedFiles: 0,
        transformationRate: 0,
        dependencyChanges: 0,
        routeChanges: 0
      }
    };

    try {
      this.updateProgress(5, "Starting: analyzing project...");
      
      // 1. Analyze dependencies
      if (this.options.updateDependencies) {
        this.updateProgress(10, "Analyzing dependencies...");
        try {
          const dependencyResults = await this.dependencyAnalyzer.analyzeDependencies();
          result.dependencies = dependencyResults.dependencies;
          result.stats.dependencyChanges = dependencyResults.dependencies.length;
          
          // Add dependency compatibility warnings
          if (!dependencyResults.compatibility.compatible) {
            dependencyResults.compatibility.issues.forEach(issue => {
              result.warnings.push(issue);
            });
          }
          
          // Add installation commands
          result.info.push("Installation commands:\n" + dependencyResults.installCommands);
        } catch (error) {
          result.warnings.push(`Error analyzing dependencies: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      // 2. Analyze routes
      if (this.options.useReactRouter) {
        this.updateProgress(20, "Analyzing routes...");
        try {
          const routeResults = await this.routeAnalyzer.analyzeRoutes();
          result.routes = routeResults.routes;
          result.stats.routeChanges = routeResults.routes.length;
        } catch (error) {
          result.warnings.push(`Error analyzing routes: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      // 3. Transform files
      this.updateProgress(30, "Transforming files...");
      try {
        const transformationResults = await this.fileTransformer.transformFiles(this.options);
        result.transformedFiles = transformationResults.transformedFiles;
        result.stats.modifiedFiles = transformationResults.modifiedFiles;
        result.stats.transformationRate = transformationResults.transformationRate;
        
        // Add transformation details to info
        transformationResults.details.forEach(detail => {
          result.info.push(detail);
        });
      } catch (error) {
        result.warnings.push(`Error transforming files: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // 4. Convert API routes
      if (this.options.convertApiRoutes) {
        this.updateProgress(75, "Converting API routes...");
        try {
          const apiResults = await this.apiRouteConverter.convertApiRoutes();
          result.info.push(`${apiResults.apiRoutesCount} API routes identified for conversion`);
        } catch (error) {
          result.warnings.push(`Error converting API routes: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      // 5. Replace Next.js components
      if (this.options.replaceComponents) {
        this.updateProgress(85, "Replacing Next.js components...");
        try {
          const componentResults = await this.fileTransformer.replaceComponents();
          result.info.push(`Component replacement completed: ${componentResults.replacedComponents.length} components replaced`);
        } catch (error) {
          result.warnings.push(`Error replacing components: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      // 6. Handle middleware
      if (this.options.handleMiddleware) {
        this.updateProgress(90, "Converting middleware...");
        try {
          const middlewareResults = await this.middlewareHandler.handleMiddlewares();
          middlewareResults.convertedFiles.forEach(file => {
            result.transformedFiles.push(file);
          });
        } catch (error) {
          result.warnings.push(`Error handling middleware: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      // 7. Generate CI/CD files
      this.updateProgress(95, "Generating CI/CD configurations...");
      try {
        const cicdResults = await this.cicdGenerator.generateCICDFiles();
        cicdResults.templates.forEach(template => {
          result.info.push(`${template.platform} configuration generated: ${template.filename}`);
        });
      } catch (error) {
        result.warnings.push(`Error generating CI/CD files: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // 8. Collect errors and warnings
      const allErrors = this.errorCollector.getAllErrors();
      result.errors = allErrors.filter(e => e.severity === 'critical').map(e => e.message);
      result.warnings.push(...allErrors.filter(e => e.severity === 'warning').map(e => e.message));
      result.info.push(...allErrors.filter(e => e.severity === 'info').map(e => e.message));
      
      this.updateProgress(100, "Conversion completed!");
      result.success = result.errors.length === 0;
      
    } catch (error) {
      result.success = false;
      result.errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return result;
  }
  
  /**
   * Generate an HTML report for the conversion process
   */
  generateReport(): string {
    // Generate HTML report (keeping this from the original implementation)
    return `
      <html>
        <head><title>Next.js to Vite Conversion Report</title></head>
        <body>
          <h1>Conversion Report</h1>
          <h2>Summary</h2>
          <p>Total Files: ${this.files.length}</p>
          
          <h2>Issues</h2>
          <h3>Errors (${this.errorCollector.getCritical().length})</h3>
          <ul>${this.errorCollector.getCritical().map(e => `<li>${e.message}</li>`).join('')}</ul>
          
          <h3>Warnings (${this.errorCollector.getWarnings().length})</h3>
          <ul>${this.errorCollector.getWarnings().map(w => `<li>${w.message}</li>`).join('')}</ul>
        </body>
      </html>
    `;
  }
}
