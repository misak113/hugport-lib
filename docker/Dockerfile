FROM registry.gitlab.com/signageos/docker-yarn:master

WORKDIR /src

ARG NPM_AUTH_TOKEN
ARG NPM_REGISTRY_URL
ARG NODE_MODULE_NAME
ARG NODE_MODULE_VERSION

ENV PORT 8080
ENV NODE_MODULE_NAME $NODE_MODULE_NAME

COPY . /src
RUN mv .npmrc.template .npmrc
RUN envsubst < package.json.template > package.json
RUN yarn --production --no-lockfile

# cleanup
RUN rm -rf /tmp/* /root/.yarn-cache /root/.node-gyp

ENV NPM_AUTH_TOKEN "-"
ENV NPM_REGISTRY_URL "-"

EXPOSE $PORT
CMD ["yarn", "start"]
