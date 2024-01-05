/*
 * Copyright 2024 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import path from 'path';
import fs from 'fs-extra';
import { createTemplateAction } from '@backstage/plugin-scaffolder-backend';
import { serializeDirectoryContents } from '@backstage/plugin-scaffolder-node';
import { resolveSafeChildPath } from '@backstage/backend-common';
import * as yaml from 'js-yaml';
import { z } from 'zod';
import { applyObject } from 'k8s-apply';

export const deployKubernetesAction = () => {
	return createTemplateAction({
		id: 'deploy:kubernetes',
		description: 'Deploys Kubernetes manifests.',
		schema: {
			input: z.object({
				sourcePath: z.string().optional(),
				targetPath: z.string().optional(),
				authToken: z
					.string()
					.describe('Authentication token to access the Kubernetes cluster'),
				clusterUrl: z.string().describe('URL of the Kubernetes cluster'),
			}),
		},

		async handler(ctx) {
			const { sourcePath, targetPath, authToken, clusterUrl } = ctx.input;
			try {
				const fileRoot = sourcePath
					? resolveSafeChildPath(ctx.workspacePath, sourcePath)
					: ctx.workspacePath;
				const directoryContents = await serializeDirectoryContents(fileRoot);

				const yamlFiles = directoryContents
					.filter(
						(file) => file.path.endsWith('.yaml') || file.path.endsWith('.yml')
					)
					.map((file) =>
						targetPath ? path.posix.join(targetPath, file.path) : file.path
					);

				for (const filePath of yamlFiles) {
					let manifestYaml = '';
					let manifestObject;

					try {
						manifestYaml = await fs.promises.readFile(filePath, {
							encoding: 'utf-8',
						});
						manifestObject = yaml.load(manifestYaml);
					} catch (error) {
						ctx.logger.error(`Error processing file: ${filePath}`, error);
						continue;
					}

					try {
						const response = await applyObject(manifestObject, {
							server: clusterUrl,
							token: authToken,
						});
						ctx.logger.info(
							`Deployment response for ${filePath}: ${JSON.stringify(response)}`
						);
					} catch (error) {
						ctx.logger.error(`Deployment failed for ${filePath}: ${error}`);
					}
				}
			} catch (error) {
				ctx.logger.error('An error occurred during deployment:', error);
				throw error;
			}
		},
	});
};
