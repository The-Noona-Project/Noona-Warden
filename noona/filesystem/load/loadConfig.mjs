// noona/filesystem/load/loadConfig.mjs
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { printResult, printError, printNote } from '../../logger/logUtils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const settingsDir = path.resolve(__dirname, '../../../family/noona-warden/files/settings');
const configFilePath = path.join(settingsDir, 'config.yml');

/**
 * Flattens a nested config object using underscores.
 */
function flattenConfig(obj, prefix = '') {
    const result = {};
    for (const key in obj) {
        const value = obj[key];
        const flatKey = prefix ? `${prefix}_${key}` : key;
        if (typeof value === 'object' && value !== null) {
            Object.assign(result, flattenConfig(value, flatKey));
        } else {
            result[flatKey] = String(value);
        }
    }
    return result;
}

/**
 * Injects config values into process.env and logs them.
 */
function injectFlatConfig(flatConfig) {
    for (const [key, value] of Object.entries(flatConfig)) {
        if (!process.env[key]) {
            process.env[key] = value;
            printNote(`Set env: ${key} = ${value}`);
        }

        // Mirror short suffix keys (e.g., PORT, URL, TOKEN, KEY, PASSWORD, USER, DATABASE)
        const match = key.match(/(?:^|_)((PORT|URL|TOKEN|KEY|PASSWORD|USER|DATABASE))$/i);
        if (match) {
            const shortKey = match[1].toUpperCase();
            if (!process.env[shortKey]) {
                process.env[shortKey] = value;
                printNote(`Mirrored ${shortKey} ← ${key}`);
            }
        }
    }
}

/**
 * Mirrors specific expected keys from known flat paths.
 */
function mirrorExpectedKeys() {
    const map = {
        JWT_SECRET: 'TOKENS_JWT_SECRET',
        VAULT_JWT: 'TOKENS_JWT_SECRET',
        PORTAL_JWT_SECRET: 'TOKENS_JWT_SECRET',
        MONGO_URL: 'MONGO_MONGO_URL',
        // Mirror MongoDB init credentials
        MONGO_INITDB_ROOT_USERNAME: 'MONGO_MONGO_INITDB_ROOT_USERNAME',
        MONGO_INITDB_ROOT_PASSWORD: 'MONGO_MONGO_INITDB_ROOT_PASSWORD',
        MONGO_INITDB_DATABASE: 'MONGO_MONGO_INITDB_DATABASE',
        MONGO_USER: 'MONGO_MONGO_USER',
        MONGO_PASSWORD: 'MONGO_MONGO_PASSWORD',
        MONGO_DATABASE: 'MONGO_MONGO_DATABASE',
        REDIS_URL: 'REDIS_REDIS_URL',
        MARIADB_USER: 'MARIADB_MARIADB_USER',
        MARIADB_PASSWORD: 'MARIADB_MARIADB_PASSWORD',
        MARIADB_DATABASE: 'MARIADB_MARIADB_DATABASE',
        MARIADB_HOST: 'MARIADB_MARIADB_HOST',
        VAULT_PORT: 'NOONA_VAULT_API_VAULT_PORT',
        // NEW mapping for Vault URL:
        VAULT_URL: 'NOONA_VAULT_API_VAULT_URL',
        PORTAL_PORT: 'NOONA_PORTAL_API_PORTAL_PORT',
        DISCORD_TOKEN: 'NOONA_PORTAL_DISCORD_BOT_DISCORD_TOKEN',
        DISCORD_CLIENT_ID: 'NOONA_PORTAL_DISCORD_BOT_DISCORD_CLIENT_ID',
        REQUIRED_GUILD_ID: 'NOONA_PORTAL_DISCORD_BOT_REQUIRED_GUILD_ID',
        REQUIRED_ROLE_ADMIN: 'NOONA_PORTAL_DISCORD_ROLES_REQUIRED_ROLE_ADMIN',
        REQUIRED_ROLE_MOD: 'NOONA_PORTAL_DISCORD_ROLES_REQUIRED_ROLE_MOD',
        REQUIRED_ROLE_USER: 'NOONA_PORTAL_DISCORD_ROLES_REQUIRED_ROLE_USER',
        NOTIFICATION_CHANNEL_ID: 'NOONA_PORTAL_DISCORD_CHANNELS_NOTIFICATION_CHANNEL_ID',
        CHECK_INTERVAL_HOURS: 'NOONA_PORTAL_DISCORD_TIMERS_CHECK_INTERVAL_HOURS',
        KAVITA_LOOKBACK_HOURS: 'NOONA_PORTAL_DISCORD_TIMERS_KAVITA_LOOKBACK_HOURS',
        KAVITA_URL: 'NOONA_PORTAL_KAVITA_KAVITA_URL',
        KAVITA_API_KEY: 'NOONA_PORTAL_KAVITA_KAVITA_API_KEY',
        KAVITA_LIBRARY_IDS: 'NOONA_PORTAL_KAVITA_KAVITA_LIBRARY_IDS'
    };

    for (const [target, source] of Object.entries(map)) {
        if (!process.env[target] && process.env[source]) {
            process.env[target] = process.env[source];
            printNote(`Mirrored ${target} ← ${source}`);
        }
    }
}

/**
 * Mirrors JWT_SECRET into related keys.
 */
function patchJwtMirrors() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        printNote('Skipping JWT mirror patching – JWT_SECRET not defined.');
        return;
    }
    const mirrorKeys = ['VAULT_JWT', 'PORTAL_JWT_SECRET', 'JWT_PUBLIC_KEY'];
    for (const key of mirrorKeys) {
        if (!process.env[key]) {
            process.env[key] = secret;
            printNote(`Mirrored ${key} ← JWT_SECRET`);
        }
    }
}

export async function loadConfig() {
    try {
        if (!fs.existsSync(configFilePath)) {
            printError(`Configuration file not found at ${configFilePath}`);
            process.exit(1);
        }
        const fileContents = fs.readFileSync(configFilePath, 'utf8');
        const config = yaml.load(fileContents);

        const flatConfig = flattenConfig(config);
        injectFlatConfig(flatConfig);
        mirrorExpectedKeys();
        patchJwtMirrors();

        printResult(`Loaded configuration from ${configFilePath}`);
        return config;
    } catch (err) {
        printError(`Error loading configuration: ${err.message}`);
        process.exit(1);
    }
}
