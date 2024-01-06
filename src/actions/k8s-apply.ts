import https from 'https';
import { URL } from 'url';

function defaults<T extends Record<string, any>>(
	target: T,
	source: Partial<T>
): T {
	Object.keys(source).forEach((key) => {
		const sourceValue = source[key as keyof T];
		if (sourceValue !== undefined) {
			target[key as keyof T] = sourceValue;
		}
	});
	return target;
}

class K8sApi {
	private token: string;
	private clusterUrl: URL;

	constructor(clusterUrl: string, token: string) {
		this.token = token;
		this.clusterUrl = new URL(clusterUrl);
	}

	async request(
		path: string,
		options?: https.RequestOptions,
		body?: string
	): Promise<any> {
		const defaultOptions: https.RequestOptions = {
			hostname: this.clusterUrl.hostname,
			port: this.clusterUrl.port || '443',
			path: path,
			method: 'GET',
			headers: {},
		};

		const finalOptions = defaults(options || {}, defaultOptions);

		defaults(finalOptions.headers as Record<string, any>, {
			Authorization: `Bearer ${this.token}`,
		});

		return new Promise((fulfill, reject) => {
			const req = https.request(finalOptions, (res) => {
				let data = '';
				res.on('data', (chunk) => (data += chunk.toString()));
				res.on('end', () =>
					fulfill({ statusCode: res.statusCode, data: JSON.parse(data) })
				);
			});
			req.on('error', reject);
			if (body) {
				req.write(body);
			}
			req.end();
		});
	}

	async get(path: string, options?: https.RequestOptions): Promise<any> {
		return this.request(path, defaults(options || {}, { method: 'GET' }));
	}

	async post(
		path: string,
		object: any,
		options?: https.RequestOptions
	): Promise<any> {
		const body = JSON.stringify(object);
		const postOptions = defaults(options || {}, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(body),
			},
		});
		return this.request(path, postOptions, body);
	}

	async put(
		path: string,
		object: any,
		options?: https.RequestOptions
	): Promise<any> {
		const body = JSON.stringify(object);
		const putOptions = defaults(options || {}, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(body),
			},
		});
		return this.request(path, putOptions, body);
	}

	async del(path: string, options?: https.RequestOptions): Promise<any> {
		return this.request(path, { ...options, method: 'DELETE' });
	}

	getPluralPath(object: {
		apiVersion: string;
		metadata: { namespace: string; name: string };
		kind: string;
	}): string {
		return `/api${object.apiVersion.indexOf('/') > 0 ? 's' : ''}/${
			object.apiVersion
		}/namespaces/${object.metadata.namespace}/${object.kind.toLowerCase()}s`;
	}

	async applyObject(object: any): Promise<any> {
		let path = this.getPluralPath(object);
		return this.post(path, object).then((res) => {
			if (res.statusCode != 409) return res;

			path += `/${object.metadata.name}`;
			return this.get(path).then(({ statusCode, data: getObject }) => {
				if (statusCode != 200)
					throw new Error(
						`k8s-apply cannot get object: ${statusCode}\n${JSON.stringify(
							getObject,
							null,
							4
						)}`
					);
				object.metadata.resourceVersion = getObject.metadata.resourceVersion;
				return this.put(path, object);
			});
		});
	}

	async delObject(object: any): Promise<any> {
		const path = this.getPluralPath(object) + `/${object.metadata.name}`;
		return this.del(path);
	}
}

export default K8sApi;
