# @pfeifferj/plugin-scaffolder-backend-module-kubernetes-deploy

The kubernetes-deploy module for [@pfeifferj/plugin-scaffolder-backend-module-kubernetes-deploy](https://www.npmjs.com/package/@pfeifferj/plugin-scaffolder-backend-module-kubernetes-deploy).

## quickstart

Import plugin into `scaffolder.ts

```typescript
import { CatalogClient } from '@backstage/catalog-client';
import {
  createBuiltinActions,
  createRouter,
} from '@backstage/plugin-scaffolder-backend';
import { Router } from 'express';
import type { PluginEnvironment } from '../types';
import { deployKubernetesAction } from '@pfeifferj/plugin-scaffolder-backend-module-kubernetes-deploy'; // here
import { ScmIntegrations } from '@backstage/integration';
import { createConfluenceToMarkdownAction } from '@backstage/plugin-scaffolder-backend-module-confluence-to-markdown';

```

and add actions

```typescript
  const actions = [
    ...builtInActions,
    deployKubernetesAction(), // here
    templateAndValidateKubernetesAction(), // and here
    createConfluenceToMarkdownAction({
      integrations,
      config: env.config,
      reader: env.reader,
    }),
  ];


```

_This plugin was created through the Backstage CLI_
