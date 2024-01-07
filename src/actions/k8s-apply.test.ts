import K8sApi from './k8s-apply';
import nock from 'nock';

nock.disableNetConnect();
nock.enableNetConnect('example-k8s-cluster.com');

describe('K8sApi k8s-apply function', () => {
	const clusterUrl = 'https://example-k8s-cluster.com';
	const token = 'test-token';
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
	});

	it('should create a new object if it does not exist', async () => {
		// Mock Kubernetes API for object creation
		nock(clusterUrl)
			.post(`/api/v1/namespaces/default/testkinds`, mockObject)
			.reply(201, {
				/* ...mock response... */
			});

		const result = await k8sApi.applyObject(mockObject);

		expect(result).toBeDefined();
		// Additional assertions...
	});

	it('should update the object if it already exists', async () => {
		// Mock conflict response and subsequent successful update
		nock(clusterUrl)
			.post(`/api/v1/namespaces/default/testkinds`, mockObject)
			.reply(409, {
				/* ...mock conflict response... */
			});

		nock(clusterUrl)
			.get(`/api/v1/namespaces/default/testkinds/test-name`)
			.reply(200, {
				/* ...mock existing object response... */
			});

		nock(clusterUrl)
			.put(`/api/v1/namespaces/default/testkinds/test-name`, mockObject)
			.reply(200, {
				/* ...mock updated object response... */
			});

		const result = await k8sApi.applyObject(mockObject);

		expect(result).toBeDefined();
		// Additional assertions...
	});

	it('should handle errors appropriately', async () => {
		nock(clusterUrl)
			.post(`/api/v1/namespaces/default/testkinds`, mockObject)
			.replyWithError('Something went wrong');

		await expect(k8sApi.applyObject(mockObject)).rejects.toThrow(
			'Something went wrong'
		);
	});
});
