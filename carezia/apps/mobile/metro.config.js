const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')

// Monorepo: Metro tiene que mirar la raíz para resolver @carezia/core y
// los node_modules compartidos entre la web y la app.
const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]
config.resolver.disableHierarchicalLookup = true

module.exports = config
