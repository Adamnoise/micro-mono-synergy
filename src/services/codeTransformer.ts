interface TransformationRule {
  pattern: RegExp;
  replacement: string | ((match: string, ...args: any[]) => string);
  description: string;
  complexity: 'simple' | 'medium' | 'complex';
  category: 'component' | 'routing' | 'data-fetching' | 'api' | 'config' | 'general';
}

export const nextToViteTransformations: TransformationRule[] = [
  // RULES — kept unchanged for brevity. [Same rules here...]
];

type Complexity = 'simple' | 'medium' | 'complex';
type Category = TransformationRule['category'];

interface TransformationStats {
  totalRules: number;
  appliedRules: number;
  modificationRate: number;
  complexity: Record<Complexity, number>;
  categories: Record<Category, number>;
}

// Util: Apply a single transformation
function applyTransformation(code: string, rule: TransformationRule): { code: string; applied: boolean } {
  if (!rule.pattern.test(code)) return { code, applied: false };

  const newCode =
    typeof rule.replacement === 'string'
      ? code.replace(rule.pattern, rule.replacement)
      : code.replace(rule.pattern, rule.replacement as any);

  return { code: newCode, applied: true };
}

// Core transformation logic
export function transformCode(sourceCode: string): {
  transformedCode: string;
  appliedTransformations: string[];
} {
  const appliedTransformations: string[] = [];
  let code = sourceCode;

  for (const rule of nextToViteTransformations) {
    const { code: newCode, applied } = applyTransformation(code, rule);
    if (applied) {
      code = newCode;
      appliedTransformations.push(rule.description);
    }
  }

  return {
    transformedCode: code,
    appliedTransformations
  };
}

// Filter utilities
export function getTransformationsByComplexity(complexity: Complexity | 'all' = 'all') {
  return complexity === 'all'
    ? nextToViteTransformations
    : nextToViteTransformations.filter(rule => rule.complexity === complexity);
}

export function getTransformationsByCategory(category: Category) {
  return nextToViteTransformations.filter(rule => rule.category === category);
}

// Stats generator
export function getTransformationStats(sourceCode: string): TransformationStats {
  const stats: TransformationStats = {
    totalRules: nextToViteTransformations.length,
    appliedRules: 0,
    modificationRate: 0,
    complexity: { simple: 0, medium: 0, complex: 0 },
    categories: {
      component: 0,
      routing: 0,
      'data-fetching': 0,
      api: 0,
      config: 0,
      general: 0,
    }
  };

  for (const rule of nextToViteTransformations) {
    if (rule.pattern.test(sourceCode)) {
      stats.appliedRules++;
      stats.complexity[rule.complexity]++;
      stats.categories[rule.category]++;
    }
  }

  stats.modificationRate = stats.appliedRules / stats.totalRules;
  return stats;
}

// Dynamic import generator
export function generateReactImportStatements(componentTypes: string[]): string {
  const map: Record<string, string> = {
    image: `import { Image } from '@unpic/react';`,
    link: `import { Link } from 'react-router-dom';`,
    head: `import { Helmet } from 'react-helmet-async';`,
    dynamic: `import { lazy, Suspense } from 'react';`,
  };

  return [...new Set(componentTypes.map(type => map[type]).filter(Boolean))].join('\n');
}

// Component usage transform proxy
export function transformComponentUsage(code: string, componentType: string): string {
  return transformCode(code).transformedCode;
}
