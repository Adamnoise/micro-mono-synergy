
import generate from '@babel/generator';
import { AstTransformOptions, TransformResult } from './ast/types';
import { parseCode } from './ast/traverse';
import { transformImports } from './ast/transformers/importTransformer';
import { safeArrayLength, safeArraySplice } from './astTransformerHelper';

export function transformWithAst(
  sourceCode: string,
  options: Partial<AstTransformOptions> = {}
): TransformResult {
  const defaultOptions: AstTransformOptions = {
    syntax: 'typescript',
    preserveComments: true,
    target: 'react-vite'
  };

  const opts = { ...defaultOptions, ...options };
  const warnings: string[] = [];
  const changes: string[] = [];
  const imports: string[] = [];

  try {
    // Parse code to AST
    const ast = parseCode(sourceCode, opts);

    // Transform imports
    const importResults = transformImports(ast);
    
    // Extract results safely
    if (importResults) {
      if (importResults.warnings) warnings.push(...importResults.warnings);
      if (importResults.changes) changes.push(...importResults.changes);
      if (importResults.imports) imports.push(...importResults.imports);
    }

    // Generate final code
    const output = generate(ast, {
      comments: opts.preserveComments,
      compact: false,
      jsescOption: {
        minimal: true
      }
    });

    return {
      code: output.code,
      warnings,
      changes,
      imports
    };

  } catch (error) {
    console.error('AST transformation error:', error);
    warnings.push(`AST transformation error: ${error instanceof Error ? error.message : 'Unknown error'}`);

    return {
      code: sourceCode,
      warnings,
      changes: [],
      imports: []
    };
  }
}

// Export a clean API
export const AstTransformer = {
  transform: transformWithAst
};
