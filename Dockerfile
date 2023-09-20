FROM node:20-alpine

WORKDIR /opt/import-map-storage-helper

COPY ./ .
RUN npm ci \ 
    && npm run build \
    && npm install --global .

WORKDIR /

ENTRYPOINT ["im-storage-helper"]
