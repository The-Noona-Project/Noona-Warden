// docker/createOrStartContainer.mjs

import dotenv from 'dotenv';
dotenv.config({ path: '/noona/family/noona-warden/settings/config.env' });

import Docker from 'dockerode';
import {
    printAction,
    printResult,
    printStep,
    printError,
    printNote,
    printDivider,
    printDebug
} from '../noona/logger/logUtils.mjs';

import { containerPresets } from './containerPresets.mjs';
import path from 'path';
import fs from 'fs';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

/**
 * Creates or starts a Docker container from a preset definition.
 *
 * @param {string} containerName - The name of the container (must match a key in containerPresets)
 */
export async function createOrStartContainer(containerName) {
    const preset = containerPresets[containerName];
    if (!preset) {
        printError(`❌ No preset found for container: ${containerName}`);
        return;
    }

    const imageName = preset.Image;

    try {
        const containers = await docker.listContainers({ all: true });
        const existing = containers.find(c => c.Names.includes(`/${containerName}`));

        if (existing) {
            const container = docker.getContainer(existing.Id);
            const info = await container.inspect();
            const requiresJwtUpdate = (containerName === 'noona-portal' || containerName === 'noona-vault');

            if (!info.State.Running) {
                if (requiresJwtUpdate) {
                    printAction(`🔌 Removing stopped container ${containerName} to apply updated JWT key...`);
                    try {
                        await container.remove({ force: true });
                    } catch (removeErr) {
                        printError(`❌ Failed to remove stopped container ${containerName}: ${removeErr.message}`);
                        throw removeErr;
                    }
                    printResult(`✔ Removed stopped container: ${containerName}`);
                } else {
                    printAction(`› Starting existing container: ${containerName}`);
                    await container.start();
                    printResult(`✔ Started container: ${containerName}`);
                    return;
                }
            } else {
                printNote(`✔ Already running: ${containerName}`);
                return;
            }
        }

        const images = await docker.listImages();
        const isPulled = images.some(img =>
            img.RepoTags?.includes(imageName) || img.RepoTags?.includes(`${imageName}:latest`)
        );

        if (!isPulled) {
            printStep(`› Pulling image: ${imageName}`);
            await new Promise((resolve, reject) => {
                docker.pull(imageName, (err, stream) => {
                    if (err) return reject(err);
                    docker.modem.followProgress(stream, onFinished, onProgress);

                    function onFinished(err) {
                        if (err) return reject(err);
                        printResult(`✔ Pulled image: ${imageName}`);
                        resolve();
                    }

                    function onProgress() {}
                });
            });
        } else {
            printNote(`✔ Reusing local image: ${imageName}`);
        }

        const privateKeyPath = path.join('/noona/family/noona-warden/files/keys', 'private.pem');
        let currentPrivateKey = '';
        try {
            if (fs.existsSync(privateKeyPath)) {
                currentPrivateKey = fs.readFileSync(privateKeyPath, 'utf-8');
                printDebug(`[createContainer] Read current private key from: ${privateKeyPath}`);
            } else {
                printError(`[createContainer] Cannot find private key at ${privateKeyPath} before container creation!`);
                throw new Error('Private key missing before container creation');
            }

            if (preset.Env && Array.isArray(preset.Env)) {
                const envIndex = preset.Env.findIndex(envVar => envVar.startsWith('JWT_PRIVATE_KEY='));
                if (envIndex !== -1) {
                    preset.Env[envIndex] = `JWT_PRIVATE_KEY=${currentPrivateKey}`;
                    printDebug(`[createContainer] Updated preset.Env with current private key for ${containerName}.`);
                } else {
                    if (containerName === 'noona-portal' || containerName === 'noona-vault') {
                        printError(`[createContainer] JWT_PRIVATE_KEY not found in preset.Env array for ${containerName}!`);
                        preset.Env.push(`JWT_PRIVATE_KEY=${currentPrivateKey}`);
                    }
                }
            } else {
                if (containerName === 'noona-portal' || containerName === 'noona-vault') {
                     printError(`[createContainer] preset.Env array is missing for ${containerName}! Cannot inject private key.`);
                }
            }
        } catch (readErr) {
            printError(`[createContainer] Failed to read or update private key before creating ${containerName}: ${readErr.message}`);
            throw readErr;
        }

        // 🧪 Validate and debug ENV vars
        if (Array.isArray(preset.Env)) {
            printAction(`🔐 Injecting environment variables into: ${containerName}`);
            for (let i = 0; i < preset.Env.length; i++) {
                const line = preset.Env[i];
                const [key, value] = line.split('=');

                if (!value || value.trim() === '') {
                    printError(`❌ ENV var "${key}" has no value!`);
                } else {
                    printDebug(`✔ ${key} = ${value}`);
                }
            }
        }

        printAction(`› Creating container: ${containerName}`);
        const container = await docker.createContainer(preset);
        await container.start();
        printResult(`✔ Created and started container: ${containerName}`);
        printDivider();
    } catch (err) {
        printError(`❌ Error creating/starting "${containerName}": ${err.message}`);
        throw err;
    }
}
