// noona/jwt/sendToRedis.mjs
import { createClient } from 'redis';
import { printResult } from '../logger/logUtils.mjs';

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
});

/**
 * Send public key to Redis under a fixed key
 * @param {string} publicKey - PEM format public key
 */
export const sendPublicKeyToRedis = async (publicKey) => {
    try {
        await redisClient.connect();
        await redisClient.set('NOONA:JWT:PUBLIC_KEY', publicKey);
        printResult('Public key written to Redis');
    } catch (err) {
        console.error('❌ Redis error:', err.message);
        throw err;
    } finally {
        await redisClient.disconnect();
    }
};
