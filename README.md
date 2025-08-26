# Sourcemap Extractor

A Node.js command-line tool to extract source files from JavaScript source maps.

## Installation

### Global Installation
```bash
npm install -g sourcemap-extractor
```

### Local Installation
```bash
npm install sourcemap-extractor
```

## Usage

### Command Line (Global)
```bash
# Basic usage
sourcemap-extractor https://example.com/app.js.map

# Specify output file
sourcemap-extractor -o my-sources.zip https://example.com/app.js.map

# Interactive mode (prompts for URL)
sourcemap-extractor
```

### Command Line Options
- `-o, --output <path>` - Specify output ZIP file path (default: `extracted_sources.zip`)
- `-h, --help` - Show help message
- `-v, --version` - Show version

### Programmatic Usage
```javascript
const { extractSourceMap } = require('sourcemap-extractor');

async function main() {
  await extractSourceMap(
    'https://example.com/app.js.map',
    'output.zip'
  );
}
```

## Features

- 🗂️ **Preserves folder structure** - Creates proper directory hierarchy in the ZIP file
- 📦 **Handles multiple source types** - Works with webpack, rollup, vite, and other bundlers
- 🔍 **Detects package.json** - Automatically identifies and reports package.json files
- 🌐 **Fetches missing sources** - Attempts to download source files not embedded in the map
- 🛡️ **Error handling** - Gracefully handles missing or inaccessible files
- ⚡ **Fast extraction** - Efficiently processes large source maps

## Examples

### Extract from a webpack bundle
```bash
sourcemap-extractor https://app.example.com/static/js/main.abc123.js.map
```

### Extract to specific location
```bash
sourcemap-extractor -o ./extracted/sources.zip https://example.com/bundle.js.map
```

### Use in a script
```javascript
const { extractSourceMap } = require('sourcemap-extractor');

(async () => {
  try {
    await extractSourceMap(
      'https://example.com/app.js.map',
      'extracted-sources.zip'
    );
    console.log('Extraction completed!');
  } catch (error) {
    console.error('Extraction failed:', error);
  }
})();
```

## Output Structure

The tool preserves the original folder structure:

```
extracted_sources.zip/
├── src/
│   ├── components/
│   │   ├── Button.js
│   │   └── Modal.js
│   ├── utils/
│   │   └── helpers.js
│   └── index.js
├── node_modules/
│   └── some-package/
│       └── index.js
└── package.json
```

## Path Handling

The tool intelligently handles various path formats:
- `webpack://./src/file.js` → `src/file.js`
- `./utils/helper.js` → `utils/helper.js`
- `../shared/constants.js` → `parent/shared/constants.js`
- Illegal filesystem characters are replaced with underscores

## Requirements

- Node.js 12.0.0 or higher
- Internet connection (for fetching source maps and missing files)

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
