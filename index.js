#!/usr/bin/env node

const sourceMap = require('source-map');
const JSZip = require('jszip');
const fs = require('fs').promises;
const https = require('https');
const http = require('http');
const { URL } = require('url');
const readline = require('readline');
const path = require('path');

// Initialize source map consumer
sourceMap.SourceMapConsumer.initialize({
  'lib/mappings.wasm': require.resolve('source-map/lib/mappings.wasm')
});

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.get(url, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`HTTP error! status: ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

function printUsage() {
  console.log(`
Usage: sourcemap-extractor [options] <source-map-url>

Extract source files from JavaScript source maps

Options:
  -o, --output <path>    Output file path (default: extracted_sources.zip)
  -h, --help            Show this help message
  -v, --version         Show version

Examples:
  sourcemap-extractor https://example.com/app.js.map
  sourcemap-extractor -o sources.zip https://example.com/app.js.map
`);
}

function getVersion() {
  try {
    const packagePath = path.join(__dirname, 'package.json');
    const packageJson = require(packagePath);
    return packageJson.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    output: 'extracted_sources.zip',
    sourceMapUrl: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '-h' || arg === '--help') {
      printUsage();
      process.exit(0);
    } else if (arg === '-v' || arg === '--version') {
      console.log(getVersion());
      process.exit(0);
    } else if (arg === '-o' || arg === '--output') {
      if (i + 1 >= args.length) {
        console.error('Error: --output requires a value');
        process.exit(1);
      }
      options.output = args[++i];
    } else if (!options.sourceMapUrl && isValidUrl(arg)) {
      options.sourceMapUrl = arg;
    } else if (!options.sourceMapUrl) {
      console.error(`Error: Invalid URL: ${arg}`);
      process.exit(1);
    } else {
      console.error(`Error: Unknown argument: ${arg}`);
      printUsage();
      process.exit(1);
    }
  }

  return options;
}

async function promptForUrl() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    const askUrl = () => {
      rl.question('Enter source map URL: ', (url) => {
        if (isValidUrl(url)) {
          rl.close();
          resolve(url);
        } else {
          console.log('Please enter a valid URL');
          askUrl();
        }
      });
    };
    askUrl();
  });
}

async function extractSourceMap(sourceMapURL, outputPath) {
  try {
    console.log(`Fetching source map from: ${sourceMapURL}`);
    
    // Fetch the source map
    const rawData = await fetchUrl(sourceMapURL);
    const rawSourceMap = JSON.parse(rawData);
    console.log('Source map fetched successfully');

    // Process the source map
    await sourceMap.SourceMapConsumer.with(rawSourceMap, null, async (consumer) => {
      const zip = new JSZip();
      
      console.log(`Processing ${consumer.sources.length} sources...`);
      
      // Check for package.json files
      const packageJsonFiles = consumer.sources.filter(source => 
        source.includes('package.json')
      );
      
      if (packageJsonFiles.length > 0) {
        console.log(`Found ${packageJsonFiles.length} package.json file(s):`);
        packageJsonFiles.forEach(file => console.log(`  - ${file}`));
      } else {
        console.log('No package.json files found in source map');
      }
      
      for (const source of consumer.sources) {
        console.log(`Processing: ${source}`);
        
        let content = consumer.sourceContentFor(source);
        
        if (content === null) {
          try {
            // Try to fetch the source file
            const url = new URL(source, sourceMapURL);
            console.log(`Fetching source from: ${url.href}`);
            
            content = await fetchUrl(url.href);
          } catch (error) {
            console.warn(`Error fetching ${source}:`, error.message);
            content = `// Error fetching source: ${source}\n// ${error.message}`;
          }
        }
        
        // Clean up the source path for file system, preserving folder structure
        let cleanPath = source.replace(/[<>:"|?*]/g, '_');
        
        // Handle relative paths and webpack paths
        if (cleanPath.startsWith('webpack://./')) {
          cleanPath = cleanPath.substring('webpack://./'.length);
        } else if (cleanPath.startsWith('./')) {
          cleanPath = cleanPath.substring('./'.length);
        } else if (cleanPath.startsWith('../')) {
          cleanPath = cleanPath.replace(/\.\.\//g, 'parent/');
        }
        
        // Ensure we have a valid path
        if (cleanPath.startsWith('/')) {
          cleanPath = cleanPath.substring(1);
        }
        
        zip.file(cleanPath, content);
      }
      
      console.log('Generating ZIP file...');
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      
      // Save the ZIP file
      await fs.writeFile(outputPath, zipBuffer);
      
      console.log(`Sources extracted successfully to: ${outputPath}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

async function main() {
  const options = parseArgs();
  
  let sourceMapURL = options.sourceMapUrl;
  
  // If no URL provided via args, prompt for it
  if (!sourceMapURL) {
    sourceMapURL = await promptForUrl();
  }
  
  await extractSourceMap(sourceMapURL, options.output);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { extractSourceMap };
