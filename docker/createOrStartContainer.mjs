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
    printDivider
} from '../noona/logger/logUtils.mjs';

import { containerPresets } from './containerPresets.mjs';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

/**
 * Creates or starts a container using a preset definition.
 * Reuses the image if it's already available locally.
 *
 * @param {string} containerName - Name of the container to create or start
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

        if (isPulled) {
            printNote(`✔ Reusing local image: ${imageName}`);
        } else {
            printStep(`› Pulling image: ${imageName}`);
            await new Promise((resolve, reject) => {
                docker.pull(imageName, (err, stream) => {
                    if (err) return reject(err);
                    docker.modem.followProgress(
                        stream,
                        (err) => {
                            if (err) return reject(err);
                            printResult(`✔ Pulled image: ${imageName}`);
                            resolve();
                        },
                        () => {} // optional progress handler
                    );
                });
            });
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
