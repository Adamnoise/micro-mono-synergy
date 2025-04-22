
import { CICDTemplate } from "@/types/conversion";
import { ErrorCollector } from "../errors/ErrorCollector";

/**
 * Generates CI/CD configuration files for the converted project
 */
export class CICDGenerator {
  private errorCollector: ErrorCollector;
  
  constructor(errorCollector: ErrorCollector) {
    this.errorCollector = errorCollector;
  }
  
  /**
   * Generate CI/CD configuration files
   */
  async generateCICDFiles(): Promise<{
    templates: CICDTemplate[];
  }> {
    try {
      const templates: CICDTemplate[] = [
        {
          platform: 'vercel',
          config: this.generateVercelConfig(),
          filename: 'vercel.json',
          description: 'Vercel deployment configuration'
        },
        {
          platform: 'netlify',
          config: this.generateNetlifyConfig(),
          filename: 'netlify.toml',
          description: 'Netlify deployment configuration'
        },
        {
          platform: 'github',
          config: this.generateGithubWorkflow(),
          filename: '.github/workflows/main.yml',
          description: 'GitHub Actions workflow'
        },
        {
          platform: 'docker',
          config: this.generateDockerfile(),
          filename: 'Dockerfile',
          description: 'Docker configuration for containerized deployment'
        }
      ];
      
      return { templates };
    } catch (error) {
      this.errorCollector.addError({
        code: 'CICD_GENERATION_ERROR',
        severity: 'warning',
        message: `Error generating CI/CD configurations: ${error instanceof Error ? error.message : String(error)}`
      });
      
      return { templates: [] };
    }
  }
  
  /**
   * Generate Vercel configuration
   */
  private generateVercelConfig(): string {
    return `{
  "framework": "vite",
  "buildCommand": "vite build",
  "devCommand": "vite",
  "outputDirectory": "dist"
}`;
  }
  
  /**
   * Generate Netlify configuration
   */
  private generateNetlifyConfig(): string {
    return `[build]
  command = "vite build"
  publish = "dist"

[dev]
  command = "vite"
  
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200`;
  }
  
  /**
   * Generate GitHub Actions workflow
   */
  private generateGithubWorkflow(): string {
    return `name: Build and Deploy

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build
      run: npm run build
      
    - name: Run tests
      run: npm test`;
  }
  
  /**
   * Generate Dockerfile
   */
  private generateDockerfile(): string {
    return `FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]`;
  }
 
  /**
   * Generate CloudFront configuration template (commented out to avoid TypeScript errors)
   */
  /* 
  private generateAwsCloudFrontConfig(): string {
    const s3BucketName = "app-vite-static";
    const domainName = "example.com";
    
    return `
    # AWS CloudFormation template for CloudFront distribution
    # Note: This is a template - you'll need to fill in your specific values
    Resources:
      StaticSiteBucket:
        Type: AWS::S3::Bucket
        Properties:
          BucketName: ${s3BucketName}
          WebsiteConfiguration:
            IndexDocument: index.html
            ErrorDocument: index.html
      
      SiteDomain:
        Type: AWS::Route53::RecordSet
        Properties:
          HostedZoneName: ${domainName}.
          Name: ${domainName}
          Type: A
          AliasTarget:
            DNSName: !GetAtt CloudFrontDistribution.DomainName
            HostedZoneId: Z2FDTNDATAQYW2
      
      CloudFrontDistribution:
        Type: AWS::CloudFront::Distribution
        Properties:
          DistributionConfig:
            Origins:
              - DomainName: !GetAtt StaticSiteBucket.DomainName
                Id: S3Origin
                S3OriginConfig:
                  OriginAccessIdentity: ""
            Enabled: true
            DefaultRootObject: index.html
            CustomErrorResponses:
              - ErrorCode: 404
                ResponseCode: 200
                ResponsePagePath: /index.html
            DefaultCacheBehavior:
              AllowedMethods:
                - GET
                - HEAD
                - OPTIONS
              TargetOriginId: S3Origin
              ForwardedValues:
                QueryString: false
                Cookies:
                  Forward: none
              ViewerProtocolPolicy: redirect-to-https
            ViewerCertificate:
              CloudFrontDefaultCertificate: true
    `;
  }
  */
}
