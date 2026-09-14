
CONTAINER=oauth-proxy
VERSION=$(shell git describe --always)

container:
	podman build -f Containerfile -t ${CONTAINER}:${VERSION} --format docker

run:
	podman run -i -t --rm \
	    -p 8080:8080 \
	    -e HMRC_CLIENT_ID \
	    -e HMRC_CLIENT_SECRET \
	    -e HMRC_AUTH_URL \
	    -e HMRC_API_URL \
	    -e VERIFICATION_SECRET \
	    ${CONTAINER}:${VERSION}

.PHONY: container run
