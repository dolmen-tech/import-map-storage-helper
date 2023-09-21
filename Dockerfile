FROM node:20-alpine as build-stage

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY ./ .
RUN npm run build

FROM node:20-alpine

RUN mkdir /opt/import-map-storage-helper

COPY --from=build-stage /app/dist/Standard.flf /opt/import-map-storage-helper/Standard.flf
COPY --from=build-stage /app/dist/index.js /opt/import-map-storage-helper/index.js

RUN ln -s /opt/import-map-storage-helper/index.js /usr/local/bin/im-storage-helper \
    && chmod +x /opt/import-map-storage-helper/index.js

ENTRYPOINT ["im-storage-helper"]
