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

import { createTemplateAction } from '@backstage/plugin-scaffolder-backend';
import fs from 'fs-extra';
import * as yaml from 'js-yaml';
import { z } from 'zod';
import { applyObject } from 'k8s-apply';
import path from 'path';

export const deployKubernetesAction = () => {
	return createTemplateAction({
		id: 'deploy:kubernetes',
		description: 'Deploys Kubernetes manifests.',
		schema: {
			input: z.object({
				manifestDirectory: z
					.string()
					.describe('The directory containing Kubernetes manifests'),
				authToken: z
					.string()
					.describe('Authentication token to access the Kubernetes cluster'),
				clusterUrl: z.string().describe('URL of the Kubernetes cluster'),
			}),
		},

		async handler(ctx) {
			const { manifestDirectory, authToken, clusterUrl } = ctx.input;
			try {
				const yamlFiles = await findAllYamlFiles(manifestDirectory);

				for (const filePath of yamlFiles) {
					let manifestYaml = '';
					let manifestObject;

					try {
						// Read Kubernetes manifest from YAML file
						manifestYaml = await fs.promises.readFile(filePath, {
							encoding: 'utf-8',
						});
						manifestObject = yaml.load(manifestYaml);
					} catch (error) {
						ctx.logger.error(`Error processing file: ${filePath}`, error);
						continue; // Proceed to the next file
					}

					try {
						// Apply the Kubernetes manifest using k8s-apply
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

async function findAllYamlFiles(dir: string): Promise<string[]> {
	const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
	const files = await Promise.all(
		dirents.map((dirent) => {
			const res = path.resolve(dir, dirent.name);
			return dirent.isDirectory() ? findAllYamlFiles(res) : res;
		})
	);
	return Array.prototype
		.concat(...files)
		.filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'));
}
