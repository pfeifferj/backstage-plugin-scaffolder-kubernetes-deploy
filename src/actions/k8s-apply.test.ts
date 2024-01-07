import K8sApi from './k8s-apply';
import nock from 'nock';

describe('K8sApi k8s-apply function', () => {
	const clusterUrl = process.env.CLUSTER_URL!;
	const token = process.env.TOKEN!;
	const k8sApi = new K8sApi(clusterUrl, token);

	const mockObject = {
		apiVersion: 'v1',
		kind: 'TestKind',
		metadata: {
			namespace: 'default',
			name: 'test-name',
		},
		spec: {
			/* ...object spec... */
		},
	};

	beforeEach(() => {
		nock.cleanAll();
		nock(clusterUrl, {
			reqheaders: {
				Authorization: `Bearer ${token}`,
			},
		})
			.persist() // Persist the mock to intercept all requests
			.get('/api/v1/namespaces/default/testkinds/test-name')
			.reply(404) // Mock a not found response
			.post('/api/v1/namespaces/default/testkinds', mockObject)
			.reply(201, {
				/* ...mock response for object creation... */
			})
			.put('/api/v1/namespaces/default/testkinds/test-name', mockObject)
			.reply(200, {
				/* ...mock response for object update... */
			});
	});

	it('should create a new object if it does not exist', async () => {
		const result = await k8sApi.applyObject(mockObject);
		expect(result).toBeDefined();
		// Additional assertions...
	});

	it('should update the object if it already exists', async () => {
		// Mock the existing object
		nock(clusterUrl)
			.get(`/api/v1/namespaces/default/testkinds/test-name`)
			.reply(200, {
				/* ...mock existing object response... */
			});

		const result = await k8sApi.applyObject(mockObject);
		expect(result).toBeDefined();
		// Additional assertions...
	});
});
