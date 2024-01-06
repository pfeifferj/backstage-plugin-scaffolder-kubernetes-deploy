import path from 'path';
import fs from 'fs-extra';
import { createTemplateAction } from '@backstage/plugin-scaffolder-backend';
import { serializeDirectoryContents } from '@backstage/plugin-scaffolder-node';
import { resolveSafeChildPath } from '@backstage/backend-common';
import * as yaml from 'js-yaml';
import { z } from 'zod';
import K8sApi from './k8s-apply';

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
			const { sourcePath, authToken, clusterUrl } = ctx.input;
			try {
				const k8sApi = new K8sApi(clusterUrl, authToken);
				const fileRoot = sourcePath
					? resolveSafeChildPath(ctx.workspacePath, sourcePath)
					: ctx.workspacePath;
				const directoryContents = await serializeDirectoryContents(fileRoot);

				const yamlFiles = directoryContents
					.filter(
						(file) => file.path.endsWith('.yaml') || file.path.endsWith('.yml')
					)
					.map((file) => path.resolve(fileRoot, file.path));

				for (const filePath of yamlFiles) {
					try {
						const manifestYaml = await fs.promises.readFile(filePath, {
							encoding: 'utf-8',
						});
						yaml.loadAll(manifestYaml, (doc) => {
							try {
								const response = k8sApi.applyObject(doc);
								ctx.logger.info(
									`Deployment response for ${filePath}: ${JSON.stringify(
										response
									)}`
								);
							} catch (error) {
								ctx.logger.error(
									`Error applying Kubernetes object from ${filePath}`,
									error
								);
							}
						});
					} catch (error) {
						ctx.logger.error(`Error processing file: ${filePath}`, error);
					}
				}
			} catch (error) {
				ctx.logger.error('An error occurred during deployment:', error);
				throw error;
			}
		},
	});
};
