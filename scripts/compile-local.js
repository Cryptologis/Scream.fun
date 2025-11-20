const solc = require('solc');
const fs = require('fs');
const path = require('path');

console.log('🔨 Compiling contracts using local solc...\n');

// Read contract files
const contractsDir = path.join(__dirname, '..', 'contracts');
const contracts = {};

function readImports(sourcePath) {
  const resolvedPath = path.join(__dirname, '..', 'node_modules', sourcePath);
  try {
    return { contents: fs.readFileSync(resolvedPath, 'utf8') };
  } catch (e) {
    return { error: 'File not found: ' + sourcePath };
  }
}

// Get all .sol files
const files = fs.readdirSync(contractsDir).filter(f => f.endsWith('.sol'));

files.forEach(file => {
  const filePath = path.join(contractsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  contracts[`contracts/${file}`] = { content };
});

// Compile input
const input = {
  language: 'Solidity',
  sources: contracts,
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode']
      }
    },
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
};

console.log(`Found ${files.length} contracts:`, files.join(', '));
console.log('\nCompiling...');

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: readImports }));

// Check for errors
if (output.errors) {
  const errors = output.errors.filter(e => e.severity === 'error');
  const warnings = output.errors.filter(e => e.severity === 'warning');

  if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} warnings:`);
    warnings.forEach(w => console.log(`   - ${w.formattedMessage}`));
  }

  if (errors.length > 0) {
    console.error(`\n❌ ${errors.length} compilation errors:`);
    errors.forEach(e => console.error(e.formattedMessage));
    process.exit(1);
  }
}

// Create artifacts directory
const artifactsDir = path.join(__dirname, '..', 'artifacts', 'contracts');
fs.mkdirSync(artifactsDir, { recursive: true });

// Save artifacts
let compiledCount = 0;
for (const [sourceName, sourceData] of Object.entries(output.contracts)) {
  for (const [contractName, contractData] of Object.entries(sourceData)) {
    const artifact = {
      _format: 'hh-sol-artifact-1',
      contractName,
      sourceName,
      abi: contractData.abi,
      bytecode: contractData.evm.bytecode.object,
      deployedBytecode: contractData.evm.deployedBytecode.object,
      linkReferences: contractData.evm.bytecode.linkReferences,
      deployedLinkReferences: contractData.evm.deployedBytecode.linkReferences,
    };

    const artifactPath = path.join(artifactsDir, `${contractName}.json`);
    fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
    console.log(`✅ ${contractName}`);
    compiledCount++;
  }
}

console.log(`\n🎉 Successfully compiled ${compiledCount} contracts!`);
console.log(`📦 Artifacts saved to: ${artifactsDir}\n`);
