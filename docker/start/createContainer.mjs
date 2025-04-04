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

    // Remove existing container (if any) to ensure a fresh creation.
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

    // Ensure the image is pulled.
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

    // Update JWT private key in preset.Env for containers that require it.
    const privateKeyPath = path.join('/noona/family/noona-warden/files/keys', 'private.pem');
    let currentPrivateKey = '';
    try {
        if (fs.existsSync(privateKeyPath)) {
            currentPrivateKey = fs.readFileSync(privateKeyPath, 'utf-8');
            printDebug(`[createContainer] Read private key from: ${privateKeyPath}`);
        } else {
            printError(`[createContainer] Cannot find private key at ${privateKeyPath}`);
            throw new Error('Private key missing');
        }
        if (preset.Env && Array.isArray(preset.Env)) {
            const envIndex = preset.Env.findIndex(envVar => envVar.startsWith('JWT_PRIVATE_KEY='));
            if (envIndex !== -1) {
                preset.Env[envIndex] = `JWT_PRIVATE_KEY=${currentPrivateKey}`;
                printDebug(`[createContainer] Updated JWT_PRIVATE_KEY for ${containerName}`);
            } else {
                if (containerName === 'noona-portal' || containerName === 'noona-vault') {
                    preset.Env.push(`JWT_PRIVATE_KEY=${currentPrivateKey}`);
                    printDebug(`[createContainer] Added JWT_PRIVATE_KEY for ${containerName}`);
                }
            }
        }
    } catch (err) {
        printError(`[createContainer] Error updating private key: ${err.message}`);
        throw err;
    }

    // Validate environment variables in preset.Env.
    if (Array.isArray(preset.Env)) {
        printAction(`🔐 Validating ENV vars for: ${containerName}`);
        for (const line of preset.Env) {
            const [key, value] = line.split('=');
            if (!value || value.trim() === '') {
                printError(`❌ ENV var "${key}" is missing a value!`);
            } else {
                printDebug(`✔ ${key} = ${value}`);
            }
        }
    }

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
