
# Docker configuration for node.js service

this Dockerfile should be used for all serviced running in node.js environment with npm 5+ package manager & node 8+

## Gitlab CI

The only what is needed to add to .gitlab-ci.yml i next snippet

```yaml
release-docker:
  stage: release-docker
  script:
    - docker login -u "gitlab-ci-token" -p "$CI_BUILD_TOKEN" $CI_REGISTRY
    - docker build --pull -t "$CI_REGISTRY_IMAGE:$DOCKER_TAG" --build-arg NPM_AUTH_TOKEN=${NPM_AUTH_TOKEN} --build-arg NPM_REGISTRY_URL=${NPM_REGISTRY_URL} --build-arg NODE_MODULE_NAME=${NODE_MODULE_NAME} --build-arg NODE_MODULE_VERSION=${NODE_MODULE_VERSION} node_modules/hugport-lib/docker-node
    - docker push "$CI_REGISTRY_IMAGE:$DOCKER_TAG"
```

Required Environment Variables:

- NPM_AUTH_TOKEN
- NPM_REGISTRY_URL
- NODE_MODULE_NAME
- NODE_MODULE_VERSION
- DOCKER_TAG
