
import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import { local } from "@pulumi/command";

const imageVersion = process.env.IMAGE_VERSION;

if (!imageVersion)
    throw Error("IMAGE_VERSION not defined");

if (!process.env.ARTIFACT_REPO)
    throw Error("ARTIFACT_REPO not defined");

if (!process.env.ARTIFACT_REPO_REGION)
    throw Error("ARTIFACT_REPO_REGION not defined");

if (!process.env.ARTIFACT_NAME)
    throw Error("ARTIFACT_NAME not defined");

if (!process.env.HOSTNAME)
    throw Error("HOSTNAME not defined");

if (!process.env.GCP_PROJECT)
    throw Error("GCP_PROJECT not defined");

if (!process.env.GCP_REGION)
    throw Error("GCP_REGION not defined");

if (!process.env.ENVIRONMENT)
    throw Error("ENVIRONMENT not defined");

if (!process.env.CLOUD_RUN_REGION)
    throw Error("CLOUD_RUN_REGION not defined");

if (!process.env.DNS_DOMAIN_DESCRIPTION)
    throw Error("DNS_DOMAIN_DESCRIPTION not defined");

if (!process.env.DOMAIN)
    throw Error("DOMAIN not defined");

if (!process.env.MIN_SCALE)
    throw Error("MIN_SCALE not defined");

if (!process.env.MAX_SCALE)
    throw Error("MAX_SCALE not defined");

if (!process.env.HMRC_CLIENT_ID)
    throw Error("HMRC_CLIENT_ID not defined");

if (!process.env.HMRC_CLIENT_SECRET)
    throw Error("HMRC_CLIENT_SECRET not defined");

if (!process.env.VERIFICATION_SECRET)
    throw Error("VERIFICATION_SECRET not defined");

if (!process.env.HMRC_AUTH_URL)
    throw Error("HMRC_AUTH_URL not defined");

if (!process.env.HMRC_API_URL)
    throw Error("HMRC_API_URL not defined");

const provider = new gcp.Provider(
    "gcp",
    {
	project: process.env.GCP_PROJECT,
	region: process.env.GCP_REGION,
    }
);


const repo = process.env.ARTIFACT_REPO;

const artifactRepo = gcp.artifactregistry.getRepositoryOutput(
    {
	location: process.env.ARTIFACT_REPO_REGION,
	repositoryId: process.env.ARTIFACT_NAME,
    },
    {
	provider: provider,
    }
);

const localImageName = "oauth-proxy:" + imageVersion;

const imageName = repo + "/oauth-proxy:" + imageVersion;

const taggedImage = new local.Command(
    "docker-tag-command",
    {
	create: "docker tag " + localImageName + " " + imageName,
    }
);

const image = new local.Command(
    "docker-push-command",
    {
	create: "docker push " + imageName,
    },
    {
	dependsOn: [taggedImage],
    }
);

const svcAccount = new gcp.serviceaccount.Account(
    "service-account",
    {
	accountId: "oauth-proxy",
	displayName: "OAuth Proxy",
	description: "OAuth Proxy Service",
    },
    {
	provider: provider,
    }
);

const hmrcClientIdSecret = new gcp.secretmanager.Secret(
    "hmrc-client-id-secret",
    {
	secretId: "oauth-proxy-hmrc-client-id",
	replication: {
	    automatic: true
	},
    },
    {
	provider: provider,
    }
);

const hmrcClientIdVersion = new gcp.secretmanager.SecretVersion(
    "hmrc-client-id-version",
    {
	secret: hmrcClientIdSecret.id,
	secretData: process.env.HMRC_CLIENT_ID,
    },
    {
	provider: provider,
    }
);

const hmrcClientSecretSecret = new gcp.secretmanager.Secret(
    "hmrc-client-secret-secret",
    {
	secretId: "oauth-proxy-hmrc-client-secret",
	replication: {
	    automatic: true
	},
    },
    {
	provider: provider,
    }
);

const hmrcClientSecretVersion = new gcp.secretmanager.SecretVersion(
    "hmrc-client-secret-version",
    {
	secret: hmrcClientSecretSecret.id,
	secretData: process.env.HMRC_CLIENT_SECRET,
    },
    {
	provider: provider,
    }
);

const verificationSecretSecret = new gcp.secretmanager.Secret(
    "verification-secret-secret",
    {
	secretId: "oauth-proxy-verification-secret",
	replication: {
	    automatic: true
	},
    },
    {
	provider: provider,
    }
);

const verificationSecretVersion = new gcp.secretmanager.SecretVersion(
    "verification-secret-version",
    {
	secret: verificationSecretSecret.id,
	secretData: process.env.VERIFICATION_SECRET,
    },
    {
	provider: provider,
    }
);

const hmrcClientIdIam = new gcp.secretmanager.SecretIamMember(
    "hmrc-client-id-iam",
    {
	project: process.env.GCP_PROJECT,
	secretId: hmrcClientIdSecret.id,
	role: "roles/secretmanager.secretAccessor",
	member: svcAccount.email.apply(x => "serviceAccount:" + x),
    },
    {
	provider: provider,
    }
);

const hmrcClientSecretIam = new gcp.secretmanager.SecretIamMember(
    "hmrc-client-secret-iam",
    {
	project: process.env.GCP_PROJECT,
	secretId: hmrcClientSecretSecret.id,
	role: "roles/secretmanager.secretAccessor",
	member: svcAccount.email.apply(x => "serviceAccount:" + x),
    },
    {
	provider: provider,
    }
);

const verificationSecretIam = new gcp.secretmanager.SecretIamMember(
    "verification-secret-iam",
    {
	project: process.env.GCP_PROJECT,
	secretId: verificationSecretSecret.id,
	role: "roles/secretmanager.secretAccessor",
	member: svcAccount.email.apply(x => "serviceAccount:" + x),
    },
    {
	provider: provider,
    }
);

const service = new gcp.cloudrun.Service(
    "service",
    {
	name: "oauth-proxy",
	location: process.env.CLOUD_RUN_REGION,
	template: {
	    metadata: {
		labels: {
		    version: "v" + imageVersion.replace(/\./g, "-"),
		},
		annotations: {
                    "autoscaling.knative.dev/minScale": process.env.MIN_SCALE,
                    "autoscaling.knative.dev/maxScale": process.env.MAX_SCALE,
		}
	    },
            spec: {
		containerConcurrency: 1000,
		timeoutSeconds: 300,
		serviceAccountName: svcAccount.email,
		containers: [
		    {
			image: imageName,
			ports: [
                            {
				"name": "http1",
				"containerPort": 8080,
                            }
			],
			envs: [
			    {
				name: "HMRC_AUTH_URL",
				value: process.env.HMRC_AUTH_URL,
			    },
			    {
				name: "HMRC_API_URL",
				value: process.env.HMRC_API_URL,
			    },
			    {
				name: "HMRC_CLIENT_ID",
				valueFrom: {
				    secretKeyRef: {
					name: hmrcClientIdSecret.secretId,
					key: "latest",
				    },
				},
			    },
			    {
				name: "HMRC_CLIENT_SECRET",
				valueFrom: {
				    secretKeyRef: {
					name: hmrcClientSecretSecret.secretId,
					key: "latest",
				    },
				},
			    },
			    {
				name: "VERIFICATION_SECRET",
				valueFrom: {
				    secretKeyRef: {
					name: verificationSecretSecret.secretId,
					key: "latest",
				    },
				},
			    },
			],
			resources: {
                            limits: {
				cpu: "1000m",
				memory: "256Mi",
                            }
			},
		    }
		],
            },
	},
    },
    {
	provider: provider,
	dependsOn: [
	    image,
	    hmrcClientIdVersion, hmrcClientSecretVersion,
	    verificationSecretVersion,
	],
    }
);

const allUsersPolicy = gcp.organizations.getIAMPolicy(
    {
	bindings: [{
            role: "roles/run.invoker",
            members: ["allUsers"],
	}],
    },
    {
	provider: provider,
    }
);

const noAuthPolicy = new gcp.cloudrun.IamPolicy(
    "no-auth-policy",
    {
	location: service.location,
	project: service.project,
	service: service.name,
	policyData: allUsersPolicy.then(pol => pol.policyData),
    },
    {
	provider: provider,
    }
);

const domainMapping = new gcp.cloudrun.DomainMapping(
    "domain-mapping",
    {
	"name": process.env.HOSTNAME,
	location: process.env.CLOUD_RUN_REGION,
	metadata: {
	    namespace: process.env.GCP_PROJECT,
	},
	spec: {
	    routeName: service.name,
	}
    },
    {
	provider: provider
    }
);

export const host = domainMapping.statuses.apply(
    x => x[0].resourceRecords
).apply(
    x => x ? x[0] : { rrdata: "" }
).apply(
    x => x.rrdata
);

const zone = gcp.dns.getManagedZoneOutput(
    {
	name: process.env.DNS_DOMAIN_DESCRIPTION,
    },
    {
	provider: provider,
    }
);

const recordSet = new gcp.dns.RecordSet(
    "resource-record",
    {
	name: process.env.HOSTNAME + ".",
	managedZone: zone.name,
	type: "CNAME",
	ttl: 300,
	rrdatas: [host],
    },
    {
	provider: provider,
    }
);

const serviceMon = new gcp.monitoring.GenericService(
    "service-monitoring",
    {
	basicService: {
            serviceLabels: {
		service_name: service.name,
		location: process.env.CLOUD_RUN_REGION,
            },
            serviceType: "CLOUD_RUN",
	},
	displayName: "OAuth proxy (" + process.env.ENVIRONMENT + ")",
	serviceId: "oauth-proxy-" + process.env.ENVIRONMENT + "-mon",
	userLabels: {
	    "service": service.name,
	    "application": "oauth-proxy",
	    "environment": process.env.ENVIRONMENT,
	},
    },
    {
	provider: provider,
    }
);

const latencySlo = new gcp.monitoring.Slo(
    "latency-slo",
    {
	service: serviceMon.serviceId,
	sloId: "oauth-proxy-" + process.env.ENVIRONMENT + "-latency-slo",
	displayName: "OAuth proxy latency (" + process.env.ENVIRONMENT + ")",
	goal: 0.95,
	rollingPeriodDays: 5,
	basicSli: {
	    latency: {
		threshold: "2s"
	    }
	},
    },
    {
	provider: provider,
    }
);

const availabilitySlo = new gcp.monitoring.Slo(
    "availability-slo",
    {
	service: serviceMon.serviceId,
	sloId: "oauth-proxy-" + process.env.ENVIRONMENT + "-availability-slo",
	displayName: "OAuth proxy availability (" + process.env.ENVIRONMENT + ")",
	goal: 0.95,
	rollingPeriodDays: 5,
	windowsBasedSli: {
	    windowPeriod: "3600s",
	    goodTotalRatioThreshold: {
		basicSliPerformance: {
		    availability: {
		    }
		},
		threshold: 0.9,
	    }
	}
    },
    {
	provider: provider,
    }
);
