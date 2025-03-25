// noona/jwt/sendToRedis.mjs
import fs from 'fs';
import path from 'path';
import { createClient } from 'redis';
import { printResult, printDebug } from '../logger/logUtils.mjs';

/**
 * Sends the public key to Redis under a fixed key.
 * If no public key is provided, it attempts to load it from disk.
 *
 * @param {string} [publicKey] - PEM format public key.
 */
export const sendPublicKeyToRedis = async (publicKey) => {
    if (!publicKey) {
        // Determine the public key path:
        // Use the env variable if it exists and the file is found;
        // otherwise, fall back to the absolute default path.
        let publicKeyPath;
        if (process.env.JWT_PUBLIC_KEY_PATH && fs.existsSync(process.env.JWT_PUBLIC_KEY_PATH)) {
            publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH;
            printDebug(`Using JWT_PUBLIC_KEY_PATH from env: ${publicKeyPath}`);
        } else {
            publicKeyPath = path.join('/noona/family/noona-warden/files/keys', 'public.pem');
            printDebug(`JWT_PUBLIC_KEY_PATH not set or file not found. Falling back to: ${publicKeyPath}`);
        }
        try {
            publicKey = fs.readFileSync(publicKeyPath, 'utf8');
        } catch (err) {
            console.error('❌ Error reading public key from disk:', err.message);
            throw err;
        }
    }

    // Use the REDIS_URL from the environment variables.
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        throw new Error('REDIS_URL environment variable is not defined');
    }
    const redisClient = createClient({ url: redisUrl });

    try {
        await redisClient.connect();
        await redisClient.set('NOONA:JWT:PUBLIC_KEY', publicKey);
        printResult('✔ Public key written to Redis');
    } catch (err) {
        console.error('❌ Redis error:', err.message);
        throw err;
    } finally {
        await redisClient.disconnect();
    }
};
