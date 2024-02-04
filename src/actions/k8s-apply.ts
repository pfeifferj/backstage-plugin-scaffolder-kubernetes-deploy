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
						type: 'object',
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
			console.log(ctx.input.manifest);

			const manifest = ctx.input.manifest as string;
			const clusterUrl = ctx.input.clusterUrl as string;
			const token = ctx.input.authToken as string;

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
			const resource = yaml.load(manifest) as KubernetesResource;

			if (!resource || typeof resource !== 'object') {
				throw new Error(
					'Invalid manifest: must be a valid YAML or JSON object'
				);
			}

			try {
				const result = await api.create(resource);
				ctx.logger.info(
					`Successfully applied manifest for ${resource.kind}/${resource.metadata?.name}: ${result}`
				);
			} catch (error) {
				ctx.logger.error(`Failed to apply Kubernetes manifest: ${error}`);
				throw error;
			}
		},
	});
};
