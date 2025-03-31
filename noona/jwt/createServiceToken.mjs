import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { createClient } from 'redis';
import { printResult, printDebug, printError } from '../logger/logUtils.mjs';

export const createAndStoreServiceToken = async (serviceName, expiresIn = '365d') => {
    printDebug(`[JWT] Generating service token for: ${serviceName}`);

    let privateKey;
    let privateKeyPath;

    if (process.env.JWT_PRIVATE_KEY_PATH && fs.existsSync(process.env.JWT_PRIVATE_KEY_PATH)) {
        privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH;
        printDebug(`[JWT] Using JWT_PRIVATE_KEY_PATH from env: ${privateKeyPath}`);
    } else {
        privateKeyPath = path.join('/noona/family/noona-warden/files/keys', 'private.pem');
        printDebug(`[JWT] JWT_PRIVATE_KEY_PATH not set or file not found. Falling back to: ${privateKeyPath}`);
    }

    try {
        privateKey = fs.readFileSync(privateKeyPath, 'utf8');
        printDebug(`[JWT] Private key loaded from: ${privateKeyPath}`);
    } catch (err) {
        printError(`[JWT] ❌ Error reading private key from disk: ${err.message}`);
        throw err;
    }

    const payload = {
        sub: serviceName,
        scope: 'service',
        iss: 'noona-warden'
    };
    const token = jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn });
    printDebug(`[JWT] Token generated for ${serviceName}, expires in ${expiresIn}`);

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        throw new Error('REDIS_URL environment variable is not defined');
    }
    const redisClient = createClient({ url: redisUrl });
    const redisKey = `NOONA:TOKEN:${serviceName}`;

    try {
        await redisClient.connect();
        await redisClient.set(redisKey, token);
        printResult(`[JWT] ✅ Service token for '${serviceName}' stored in Redis at key: ${redisKey}`);
    } catch (err) {
        printError(`[JWT] ❌ Redis error storing service token: ${err.message}`);
        throw err;
    } finally {
        await redisClient.disconnect();
    }
}; 