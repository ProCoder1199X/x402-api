FROM node:20.19-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY tsconfig.base.json ./
COPY shared ./shared
COPY services ./services
RUN npm ci
RUN npm run build --workspace @x402/x402-middleware
RUN npm run build --workspace @x402/service-runtime
ARG SERVICE
RUN npm run build --workspace @x402/${SERVICE}

FROM node:20.19-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/shared ./shared
COPY --from=build /app/services ./services
ARG SERVICE
ENV SERVICE=${SERVICE}
CMD node services/${SERVICE}/dist/app.js
