FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001 DATABASE_PATH=/app/data/nucleus.sqlite
COPY package*.json ./
RUN npm ci --omit=dev && mkdir -p /app/data && chown -R node:node /app/data
COPY --from=build /app/dist ./dist
COPY server ./server
COPY shared ./shared
USER node
VOLUME ["/app/data"]
EXPOSE 3001
CMD ["node", "server/index.mjs"]
