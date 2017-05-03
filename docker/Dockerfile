FROM mhart/alpine-node:6.9

WORKDIR /src

RUN apk update

# global tools
RUN apk add bash
# yarn tools
RUN apk add --no-cache curl binutils tar make gcc g++ python gettext

ENV PATH /root/.yarn/bin:$PATH
RUN /bin/bash
RUN touch ~/.bashrc
RUN curl -o- -L https://yarnpkg.com/install.sh | bash

ARG NPM_AUTH_TOKEN
ARG NODE_MODULE_NAME
ARG NODE_MODULE_VERSION

ENV PORT 8080
ENV NODE_MODULE_NAME $NODE_MODULE_NAME

COPY . /src
RUN envsubst < package.json.template > package.json
RUN yarn --production --no-lockfile

# cleanup
#RUN apk del make gcc g++ python
RUN apk del curl tar binutils
RUN rm -rf /tmp/* /root/.yarn-cache /root/.node-gyp

ENV NPM_AUTH_TOKEN "-"

EXPOSE $PORT
CMD ["yarn", "start"]
