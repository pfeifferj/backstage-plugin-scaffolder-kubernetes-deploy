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
import { applyObject } from 'k8s-apply';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

const path = require('path');

export const deployKubernetesAction = () => {
	return createTemplateAction({
		id: 'deploy:kubernetes',
		schema: {
			input: {
				required: ['manifest', 'authToken', 'clusterUrl'],
				type: 'object',
				properties: {
					manifest: {
						type: 'string',
						description: 'The Kubernetes manifest object',
					},
					authToken: {
						type: 'string',
						description:
							'Authentication token to access the Kubernetes cluster',
					},
					clusterUrl: {
						type: 'string',
						description: 'URL of the Kubernetes cluster',
					},
				},
			},
		},
		async handler(ctx) {
			const { manifest, authToken, clusterUrl } = ctx.input;
			try {
				// Read Kubernetes manifest from YAML file
				let manifestYaml = '';
				const manifestPath = path.resolve(manifest);
				try {
					manifestYaml = await fs.promises.readFile(manifestPath, {
						encoding: 'utf-8',
					});
				} catch (fileError) {
					ctx.logger.error(`Error reading file: ${manifest}`, fileError);
					throw fileError;
				}

				let manifestObject;
				try {
					manifestObject = yaml.load(manifestYaml);
				} catch (yamlError) {
					ctx.logger.error('Error parsing YAML content', yamlError);
					throw yamlError;
				}

				// Apply the Kubernetes manifest using k8s-apply
				const response = await applyObject(manifestObject, {
					server: clusterUrl,
					token: authToken,
				});

				ctx.logger.info(`Deployment response: ${JSON.stringify(response)}`);
			} catch (error) {
				ctx.logger.error(`Deployment failed: ${error}`);
				throw error;
			}
		},
	});
};
