// noona/filesystem/load/loadConfig.mjs
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { printResult, printError } from '../../logger/logUtils.mjs';

// Compute __dirname for ES modules.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the settings directory based on your tree structure.
const settingsDir = path.resolve(__dirname, '../../../family/noona-warden/files/settings');
const configFilePath = path.join(settingsDir, 'config.yml');

/**
 * Recursively traverses the configuration object and injects each leaf value
 * into process.env using the key name as defined in the YAML.
 *
 * @param {object} obj - The configuration object.
 */
function injectConfig(obj) {
    for (const [key, value] of Object.entries(obj)) {
        if (value !== null && typeof value === 'object') {
            injectConfig(value);
        } else {
            // Set the environment variable using the key as is.
            process.env[key] = String(value);
        }
    }
}

/**
 * Loads the YAML configuration file and injects all leaf values into process.env.
 *
 * @returns {object} The parsed configuration.
 */
export async function loadConfig() {
    try {
        if (!fs.existsSync(configFilePath)) {
            printError(`Configuration file not found at ${configFilePath}`);
            process.exit(1);
        }
        const fileContents = fs.readFileSync(configFilePath, 'utf8');
        const config = yaml.load(fileContents);

        // Inject configuration values without altering their names.
        injectConfig(config);

        printResult(`Loaded configuration from ${configFilePath}`);
        return config;
    } catch (err) {
        printError(`Error loading configuration: ${err.message}`);
        process.exit(1);
    }
}
