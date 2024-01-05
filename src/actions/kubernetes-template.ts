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

import {
	createTemplateAction,
	createFetchTemplateAction,
} from '@backstage/plugin-scaffolder-backend';
import fs from 'fs-extra';
import * as yaml from 'js-yaml';
import { z } from 'zod';
import { globby } from 'globby';

export const templateAndValidateKubernetesAction = (options: any) => {
	const fetchTemplate = createFetchTemplateAction(options);

	return createTemplateAction({
		id: 'template:validate:kubernetes',
		description:
			'Templates Kubernetes manifests, validates them, and outputs to a defined path.',
		schema: {
			input: z.object({
				url: z.string().describe('URL of the manifest files to template'),
				values: z
					.record(z.any())
					.describe('Values to pass to the templating engine'),
				outputPath: z.string().describe('Output path for the templated files'),
			}),
		},

		async handler(ctx) {
			// Use fetch:template action for templating with input url and values
			await fetchTemplate.handler({
				...ctx,
				input: {
					...ctx.input,
					// targetPath: './generated', // Optional: specify a target path within the workspace
				},
			});

			const { outputPath } = ctx.input;
			const templatedDir = ctx.workspacePath;
			const files = await globby('**/*.yaml', { cwd: templatedDir });

			for (const file of files) {
				const filePath = `${templatedDir}/${file}`;
				const content = await fs.readFile(filePath, 'utf8');

				try {
					// Validate YAML file
					yaml.load(content);
				} catch (error) {
					const yamlError =
						error instanceof Error
							? error
							: new Error(`Unknown error: ${error}`);
					ctx.logger.error(
						`YAML validation error in ${file}: ${yamlError.message}`
					);
					throw yamlError;
				}

				// Move the file to the outputPath
				const outputPathResolved = `${outputPath}/${file}`;
				await fs.move(filePath, outputPathResolved, { overwrite: true });
			}

			ctx.logger.info(
				`Kubernetes manifests templated, validated, and written to ${outputPath}`
			);
		},
	});
};

export default templateAndValidateKubernetesAction;
