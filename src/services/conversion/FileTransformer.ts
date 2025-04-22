
import { ConversionOptions } from "@/types/conversion";
import { transformCode, getTransformationStats } from "../codeTransformer";
import { transformComponent } from "../componentTransformer";
import { ErrorCollector } from "../errors/ErrorCollector";
import { analyzeComponentUsage } from "./ComponentAnalyzer";
import { shouldSkipFile, readFileContent, isComponentFile } from "./utils/FileUtils";

/**
 * Result of a file transformation operation
 */
interface TransformationResult {
  fileName: string;
  modified: boolean;
  transformations: string[];
}

/**
 * Result of component replacement operations
 */
interface ComponentReplacementResult {
  replacedComponents: {
    file: string; 
    component: string; 
    count: number
  }[];
}

/**
 * Handles the transformation of source files during conversion
 */
export class FileTransformer {
  private files: File[];
  private errorCollector: ErrorCollector;

  constructor(files: File[], errorCollector: ErrorCollector) {
    this.files = files;
    this.errorCollector = errorCollector;
  }

  /**
   * Transform all project files based on conversion options
   */
  async transformFiles(options: ConversionOptions): Promise<{
    transformedFiles: string[];
    modifiedFiles: number;
    transformationRate: number;
    details: string[];
  }> {
    const result = {
      transformedFiles: [] as string[],
      modifiedFiles: 0,
      transformationRate: 0,
      details: [] as string[],
    };

    try {
      const batchSize = 5;
      const totalFiles = this.files.length;
      const details: string[] = [];

      for (let i = 0; i < totalFiles; i += batchSize) {
        const batch = this.files.slice(i, Math.min(i + batchSize, totalFiles));
        const batchResults = await this.transformFileBatch(batch, options);
        
        this.processTransformationResults(batchResults, result, details);
      }

      result.transformationRate = totalFiles > 0 ? result.modifiedFiles / totalFiles : 0;
      result.details = details;

      return result;
    } catch (error) {
      this.handleTransformationError(error);
      return result;
    }
  }

  /**
   * Process a batch of files in parallel
   */
  private async transformFileBatch(
    batch: File[],
    options: ConversionOptions
  ): Promise<TransformationResult[]> {
    return Promise.all(
      batch.map(async (file) => {
        return this.transformFile(file, options);
      })
    );
  }

  /**
   * Process transformation results and update the result object
   */
  private processTransformationResults(
    batchResults: TransformationResult[],
    result: {
      transformedFiles: string[];
      modifiedFiles: number;
    },
    details: string[]
  ): void {
    batchResults.forEach((batchResult) => {
      if (batchResult.modified) {
        result.transformedFiles.push(batchResult.fileName);
        result.modifiedFiles++;
        details.push(
          `Transformations in file: ${batchResult.fileName}\n${batchResult.transformations.join(
            "\n"
          )}`
        );
      }
    });
  }

  /**
   * Transform a single file
   */
  private async transformFile(
    file: File,
    options: ConversionOptions
  ): Promise<TransformationResult> {
    const result = {
      fileName: file.name,
      modified: false,
      transformations: [] as string[],
    };

    try {
      if (shouldSkipFile(file.name)) {
        return result;
      }

      const content = await readFileContent(file);
      const { transformedCode, appliedTransformations } = transformCode(content);

      if (transformedCode !== content && appliedTransformations.length > 0) {
        result.modified = true;
        result.transformations = appliedTransformations;
      }

      return result;
    } catch (error) {
      this.logFileError(file.name, error);
      return result;
    }
  }

  /**
   * Replace Next.js specific components with Vite/React compatible alternatives
   */
  async replaceComponents(): Promise<ComponentReplacementResult> {
    const result: ComponentReplacementResult = {
      replacedComponents: []
    };

    try {
      const componentTypes = ["image", "link", "head", "script", "dynamic"];

      for (const file of this.files) {
        if (this.shouldSkipComponentFile(file.name)) {
          continue;
        }

        await this.processComponentFile(file, componentTypes, result);
      }

      return result;
    } catch (error) {
      this.handleComponentReplaceError(error);
      return result;
    }
  }

  /**
   * Check if a component file should be skipped
   */
  private shouldSkipComponentFile(fileName: string): boolean {
    return shouldSkipFile(fileName) || (!fileName.endsWith(".tsx") && !fileName.endsWith(".jsx"));
  }

  /**
   * Process a file for component replacements
   */
  private async processComponentFile(
    file: File, 
    componentTypes: string[], 
    result: ComponentReplacementResult
  ): Promise<void> {
    try {
      const content = await readFileContent(file);

      for (const componentType of componentTypes) {
        const usage = analyzeComponentUsage(content, componentType);

        if (usage.used) {
          const transformResult = transformComponent(content, componentType);

          if (transformResult.code !== content) {
            result.replacedComponents.push({
              file: file.name,
              component: componentType,
              count: usage.count,
            });

            this.logComponentWarnings(file.name, transformResult.warnings);
          }
        }
      }
    } catch (error) {
      this.logFileError(file.name, error);
    }
  }

  /**
   * Log component transformation warnings
   */
  private logComponentWarnings(fileName: string, warnings: string[]): void {
    warnings.forEach((warning) => {
      this.errorCollector.addError({
        code: `COMPONENT_TRANSFORM_WARNING`,
        severity: "warning",
        message: warning,
        file: fileName,
      });
    });
  }

  /**
   * Handle global transformation error
   */
  private handleTransformationError(error: unknown): void {
    this.errorCollector.addError({
      code: "FILE_TRANSFORM_FAILED",
      severity: "critical",
      message: `Error during file transformation: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }

  /**
   * Handle component replacement error
   */
  private handleComponentReplaceError(error: unknown): void {
    this.errorCollector.addError({
      code: "COMPONENT_REPLACE_FAILED",
      severity: "warning",
      message: `Component replacement process failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }

  /**
   * Log file-specific error
   */
  private logFileError(fileName: string, error: unknown): void {
    this.errorCollector.addError({
      code: "FILE_TRANSFORM_ERROR",
      severity: "warning",
      message: `Error transforming file ${fileName}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      file: fileName,
    });
  }
}
