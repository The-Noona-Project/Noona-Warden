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

            if (!info.State.Running) {
                printAction(`› Starting existing container: ${containerName}`);
                await container.start();
                printResult(`✔ Started container: ${containerName}`);
            } else {
                printNote(`✔ Already running: ${containerName}`);
            }
            return;
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
