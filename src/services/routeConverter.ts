
import { analyzeDependencies } from './dependencyManager';

export interface NextJsRoute {
  path: string;
  component: string;
  componentPath: string;
  filePath: string;
  isDynamic: boolean;
  params?: string[];
  layout?: string;
  hasParams?: boolean;
}

export function analyzeNextJsRoutes(files: File[]): NextJsRoute[] {
  // This is a mock implementation for now
  const routes: NextJsRoute[] = [];
  
  // Add actual implementation to analyze files and create NextJsRoute objects
  // Include filePath in each route
  
  return routes;
}

export function convertToReactRoutes(nextRoutes: NextJsRoute[]): any[] {
  // This is a mock implementation
  return nextRoutes.map(route => ({
    path: convertNextJsPathToReactRouter(route.path),
    component: route.component,
    componentPath: route.componentPath,
    originalPath: route.path,
    params: route.params
  }));
}

function convertNextJsPathToReactRouter(path: string): string {
  // Convert Next.js path style to React Router style
  // e.g., /blog/[slug] -> /blog/:slug
  // e.g., /blog/[...slug] -> /blog/*
  
  let reactPath = path;
  
  // Replace [...param] with *
  reactPath = reactPath.replace(/\[\.\.\.(.*?)\]/g, '*');
  
  // Replace [param] with :param
  reactPath = reactPath.replace(/\[(.*?)\]/g, ':$1');
  
  return reactPath;
}
