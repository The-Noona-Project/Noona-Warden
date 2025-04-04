// docker/start/createContainer.mjs
import Docker from 'dockerode';
import { printAction, printResult, printStep, printError, printNote, printDivider, printDebug } from '../../noona/logger/logUtils.mjs';
import { containerPresets } from './containerPresets.mjs';
import path from 'path';
import fs from 'fs';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

export async function createContainer(containerName) {
    const preset = containerPresets[containerName];
    if (!preset) {
        printError(`❌ No preset found for container: ${containerName}`);
        return;
    }

    const imageName = preset.Image;

    // ───── Remove existing container if needed ─────
    const containers = await docker.listContainers({ all: true });
    const existing = containers.find(c => c.Names.includes(`/${containerName}`));
    if (existing) {
        const container = docker.getContainer(existing.Id);
        printAction(`🔌 Removing existing container ${containerName} for fresh creation...`);
        try {
            await container.remove({ force: true });
            printResult(`✔ Removed existing container: ${containerName}`);
        } catch (err) {
            printError(`❌ Failed to remove container ${containerName}: ${err.message}`);
            throw err;
        }
    }

    // ───── Pull image if not already pulled ─────
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

    // ───── Inject latest JWT private key ─────
    const privateKeyPath = path.join('/noona/family/noona-warden/files/keys', 'private.pem');
    let currentPrivateKey = '';
    try {
        if (fs.existsSync(privateKeyPath)) {
            currentPrivateKey = fs.readFileSync(privateKeyPath, 'utf-8');
            printDebug(`[createContainer] Read private key from: ${privateKeyPath}`);
        } else {
            throw new Error('Private key missing');
        }

        if (Array.isArray(preset.Env)) {
            const keyLine = `JWT_PRIVATE_KEY=${currentPrivateKey}`;
            const index = preset.Env.findIndex(e => e.startsWith('JWT_PRIVATE_KEY='));
            if (index !== -1) {
                preset.Env[index] = keyLine;
                printDebug(`[createContainer] Updated JWT_PRIVATE_KEY for ${containerName}`);
            } else {
                preset.Env.push(keyLine);
                printDebug(`[createContainer] Injected JWT_PRIVATE_KEY for ${containerName}`);
            }
        }
    } catch (err) {
        printError(`[createContainer] Error injecting private key: ${err.message}`);
        throw err;
    }

    // ───── Print final ENV for review ─────
    if (Array.isArray(preset.Env)) {
        printAction(`🔐 Validating ENV vars for: ${containerName}`);
        preset.Env.forEach(line => {
            const [key, value] = line.split('=');
            const status = value && value.trim() !== '' ? '✔' : '⚠️';
            printDebug(`${status} ${key} = ${value}`);
        });
    }

    // ───── Create and start container ─────
    printAction(`› Creating container: ${containerName}`);
    try {
        const container = await docker.createContainer(preset);
        await container.start();
        printResult(`✔ Created and started container: ${containerName}`);
        printDivider();
    } catch (err) {
        printError(`❌ Error creating container "${containerName}": ${err.message}`);
        throw err;
    }
}
