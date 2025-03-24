// noona/jwt/generateKeys.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateKeyPairSync } from 'crypto';
import { printResult } from '../logger/logUtils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates a JWT RSA key pair and writes them to disk
 */
export async function generateKeys() {
    const keysDir = path.join(__dirname, 'keys');
    const privateKeyPath = path.join(keysDir, 'private.pem');
    const publicKeyPath = path.join(keysDir, 'public.pem');

    try {
        // Ensure keys directory exists
        if (!fs.existsSync(keysDir)) {
            fs.mkdirSync(keysDir, { recursive: true });
        }

        // Generate RSA key pair
        const { privateKey, publicKey } = generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem',
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
            },
        });

        // Save keys to disk
        fs.writeFileSync(privateKeyPath, privateKey);
        fs.writeFileSync(publicKeyPath, publicKey);

        printResult('✔ JWT Key Pair generated and stored');
    } catch (err) {
        console.error('❌ Failed to generate JWT keys:', err.message);
        throw err;
    }
}
