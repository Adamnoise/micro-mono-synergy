
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { safeExpressionHandler } from '../astTransformerFix';
import { AnalyzedComponent, ComponentUsageAnalysis } from './component/ComponentTypes';
import { extractPropsFromParam, hasComponentSuperClass } from './component/ASTHelpers';

/**
 * Analyzes React components to determine their structure and dependencies
 */
export class ComponentAnalyzer {
  /**
   * Analyze a component file
   */
  analyzeComponent(code: string): AnalyzedComponent | null {
    try {
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript']
      });
      
      const result: AnalyzedComponent = {
        name: '',
        type: 'unknown',
        imports: [],
        nextJsImports: [],
        props: []
      };
      
      // Find imports first
      traverse(ast, {
        ImportDeclaration: (path) => {
          const source = path.node.source.value as string;
          result.imports.push(source);
          
          if (source.startsWith('next/')) {
            result.nextJsImports.push(source);
          }
        }
      });
      
      // Find component name and type
      traverse(ast, {
        // Find function declarations
        FunctionDeclaration: (path) => {
          if (path.node.id && path.node.id.name) {
            const name = path.node.id.name;
            
            // Check if it's likely a component (starts with capital letter)
            if (name[0] === name[0].toUpperCase()) {
              result.name = name;
              result.type = 'functional';
              
              // Extract props from parameters
              if (path.node.params.length > 0) {
                const firstParam = path.node.params[0];
                extractPropsFromParam(firstParam, result);
              }
            }
          }
        },
        
        // Find variable declarations that could be components
        VariableDeclarator: (path) => {
          if (t.isIdentifier(path.node.id)) {
            const name = path.node.id.name;
            
            // Check if it's likely a component (starts with capital letter)
            if (name[0] === name[0].toUpperCase()) {
              result.name = name;
              
              const init = safeExpressionHandler(path.node.init);
              // Check if it's an arrow function or function expression
              if (t.isArrowFunctionExpression(init) || t.isFunctionExpression(init)) {
                result.type = 'functional';
                
                // Extract props from parameters
                if (init.params && init.params.length > 0) {
                  const firstParam = init.params[0];
                  extractPropsFromParam(firstParam, result);
                }
              }
            }
          }
        },
        
        // Find class components
        ClassDeclaration: (path) => {
          if (path.node.id) {
            const name = path.node.id.name;
            
            // Check if it extends React.Component
            if (hasComponentSuperClass(path.node.superClass)) {
              result.name = name;
              result.type = 'class';
            }
          }
        }
      });
      
      return result.name ? result : null;
    } catch (error) {
      console.error('Error analyzing component:', error);
      return null;
    }
  }
}

/**
 * Analyze the usage of a specific Next.js component in a file
 * This is used by the FileTransformer
 */
export function analyzeComponentUsage(code: string, componentType: string): ComponentUsageAnalysis {
  const result = {
    used: false,
    count: 0,
    imports: [] as string[]
  };

  try {
    // Quick string check to avoid unnecessary parsing
    if (!code.includes(`next/${componentType}`)) {
      return result;
    }

    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });

    // Find imports
    traverse(ast, {
      ImportDeclaration(path) {
        const source = path.node.source.value as string;
        if (source === `next/${componentType}`) {
          result.used = true;
          result.imports.push(source);
        }
      }
    });

    // Count component usage
    if (result.used) {
      traverse(ast, {
        JSXElement(path) {
          const openingElement = path.node.openingElement;
          if (t.isJSXIdentifier(openingElement.name)) {
            const name = openingElement.name.name;
            // Check for common component names based on the type
            if (
              (componentType === 'image' && (name === 'Image' || name === 'NextImage')) ||
              (componentType === 'link' && (name === 'Link' || name === 'NextLink')) ||
              (componentType === 'head' && name === 'Head') ||
              (componentType === 'script' && name === 'Script') ||
              (componentType === 'dynamic' && name === 'dynamic')
            ) {
              result.count++;
            }
          }
        }
      });
    }

    return result;
  } catch (error) {
    console.error('Error analyzing component usage:', error);
    return result;
  }
}
