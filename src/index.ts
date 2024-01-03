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

/**
 * The kubernetes-deploy module for @backstage/plugin-scaffolder-backend.
 *
 * @packageDocumentation
 */

export * from './actions';
import { createTemplateAction } from '@backstage/plugin-scaffolder-backend';
import { applyObject } from 'k8s-apply';

export const deployKubernetesAction = createTemplateAction({
  id: 'deploy:kubernetes',
  schema: {
    input: {
      required: ['manifest', 'authToken', 'clusterUrl'],
      type: 'object',
      properties: {
        manifest: {
          type: 'object',
          description: 'The Kubernetes manifest object',
        },
        authToken: {
          type: 'string',
          description: 'Authentication token to access the Kubernetes cluster',
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
      // Apply the Kubernetes manifest using k8s-apply
      const response = await applyObject(manifest, {
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
