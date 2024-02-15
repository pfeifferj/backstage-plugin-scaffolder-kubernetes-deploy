import {
	createBackendModule,
	coreServices,
} from '@backstage/backend-plugin-api';
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node/alpha';
import { deployKubernetesAction } from './actions/k8s-apply';

/**
 * @public
 * The Read File Module for the Scaffolder Backend
 */
export const readFileModule = createBackendModule({
	moduleId: 'read-file',
	pluginId: 'scaffolder',
	register({ registerInit }) {
		registerInit({
			deps: {
				scaffolderActions: scaffolderActionsExtensionPoint,
				config: coreServices.rootConfig,
			},
			async init({ scaffolderActions }) {
				scaffolderActions.addActions(deployKubernetesAction());
			},
		});
	},
});
