
import { ComponentTransformOptions, ComponentTransformResult } from './component-transformers/types';
import { transformImageComponent } from './component-transformers/ImageTransformer';
import { transformLinkComponent } from './component-transformers/LinkTransformer';
import { transformHeadComponent } from './component-transformers/HeadTransformer';
import { transformDynamicImport } from './component-transformers/DynamicTransformer';
import { transformScriptComponent } from './component-transformers/ScriptTransformer';

/**
 * Factory function to transform any Next.js component based on type
 */
export function transformComponent(code: string, componentType: string, options: ComponentTransformOptions = {}): ComponentTransformResult {
  switch(componentType.toLowerCase()) {
    case 'image':
      return transformImageComponent(code, options);
    case 'link':
      return transformLinkComponent(code);
    case 'head':
      return transformHeadComponent(code);
    case 'dynamic':
      return transformDynamicImport(code, options);
    case 'script':
      return transformScriptComponent(code);
    default:
      return {
        code,
        imports: [],
        warnings: [`Unknown component type: ${componentType}`]
      };
  }
}

// Re-export the types and individual transformers for direct use
export type { ComponentTransformOptions, ComponentTransformResult } from './component-transformers/types';
export { transformImageComponent } from './component-transformers/ImageTransformer';
export { transformLinkComponent } from './component-transformers/LinkTransformer';
export { transformHeadComponent } from './component-transformers/HeadTransformer';
export { transformDynamicImport } from './component-transformers/DynamicTransformer';
export { transformScriptComponent } from './component-transformers/ScriptTransformer';
