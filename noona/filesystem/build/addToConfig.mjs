// noona/filesystem/build/addToConfig.mjs
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
 * Adds or updates a configuration value in the YAML configuration file.
 *
 * @param {string} group - A dot-separated string indicating the nested group path (e.g., "NOONA.VAULT.API").
 * @param {string} id - The key to add or update within that group (e.g., "VAULT_URL").
 * @param {any} value - The new value to set.
 */
export function addToConfig(group, id, value) {
    try {
        if (!fs.existsSync(configFilePath)) {
            printError(`Configuration file not found at ${configFilePath}`);
            process.exit(1);
        }
        // Load the existing configuration.
        const fileContents = fs.readFileSync(configFilePath, 'utf8');
        let config = yaml.load(fileContents) || {};

        // Convert the group into an array of keys and traverse (or create) the nested object.
        const groupKeys = group.split('.');
        let current = config;
        for (const key of groupKeys) {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        // Set or update the specified key.
        current[id] = value;

        // Write the updated configuration back to the YAML file.
        const newYaml = yaml.dump(config, { lineWidth: -1 });
        fs.writeFileSync(configFilePath, newYaml, 'utf8');
        printResult(`Updated configuration: ${group}.${id} set to ${value}`);
    } catch (err) {
        printError(`Error updating configuration: ${err.message}`);
        throw err;
    }
}
