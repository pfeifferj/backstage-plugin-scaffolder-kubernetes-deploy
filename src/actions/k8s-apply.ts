import { createTemplateAction } from '@backstage/plugin-scaffolder-backend';
import { KubeConfig, KubernetesObjectApi } from '@kubernetes/client-node';
import * as yaml from 'js-yaml';

interface KubernetesResource {
	kind: string;
	metadata: {
		name: string;
	};
}

export const deployKubernetesAction = () => {
	return createTemplateAction({
		id: 'deploy:kubernetes',
		description: 'Applies a Kubernetes manifest',
		schema: {
			input: {
				type: 'object',
				properties: {
					manifest: {
						title: 'Kubernetes Manifest',
						description:
							'YAML or JSON manifest for the Kubernetes resource to be applied',
						type: 'any',
					},
					clusterUrl: {
						title: 'Cluster URL',
						description: 'URL of the Kubernetes API',
						type: 'string',
					},
					authToken: {
						title: 'Token',
						description: 'Bearer token to authenticate with the Kubernetes API',
						type: 'string',
					},
				},
				required: ['manifest', 'clusterUrl', 'authToken'],
			},
		},
		async handler(ctx) {
			const manifest = ctx.input.manifest as string;
			const clusterUrl = ctx.input.clusterUrl as string;
			const token = ctx.input.authToken as string;

			console.log(
				`Type of content: ${typeof manifest}, Content preview: ${manifest}`
			);

			const kubeConfig = new KubeConfig();
			kubeConfig.loadFromOptions({
				clusters: [
					{
						name: 'dynamic-cluster',
						server: clusterUrl,
						skipTLSVerify: true,
					},
				],
				users: [
					{
						name: 'dynamic-user',
						token: token,
					},
				],
				contexts: [
					{
						name: 'dynamic-context',
						user: 'dynamic-user',
						cluster: 'dynamic-cluster',
					},
				],
				currentContext: 'dynamic-context',
			});

			const api = kubeConfig.makeApiClient(KubernetesObjectApi);
			const resources = yaml.loadAll(manifest) as KubernetesResource[];

			if (!resources || !Array.isArray(resources) || resources.length === 0) {
				throw new Error(
					'Invalid manifest: must contain at least one valid YAML or JSON object'
				);
			}

			for (const resource of resources) {
				try {
					const result = await api.create(resource);
					ctx.logger.info(
						`Successfully applied manifest for ${resource.kind}/${resource.metadata?.name}: ${result}`
					);
				} catch (error) {
					ctx.logger.error(
						`Failed to apply Kubernetes manifest for ${resource.kind}/${resource.metadata?.name}: ${error}`
					);
				}
			}
		},
	});
};
