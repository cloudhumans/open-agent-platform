FROM node:22-alpine AS base

FROM base AS builder
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
# Set working directory
WORKDIR /app
RUN npm install turbo --global
COPY . .
RUN turbo prune @open-agent-platform/web --docker

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
RUN apk add --no-cache libc6-compat
WORKDIR /app

# First install dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/yarn.lock ./yarn.lock
RUN corepack enable
RUN yarn install

# Build the project and its dependencies
COPY --from=builder /app/out/full/ .
COPY .gitignore .gitignore

# Declare build arguments
ARG NEXT_PUBLIC_DEPLOYMENTS
ARG NEXT_PUBLIC_COGNITO_CLIENT_ID
ARG NEXT_PUBLIC_COGNITO_USER_POOL_ID
ARG NEXT_PUBLIC_BASE_API_URL
ARG NEXT_PUBLIC_USE_LANGSMITH_AUTH
ARG NEXT_PUBLIC_GOOGLE_AUTH_DISABLED
ARG NEXT_PUBLIC_MCP_SERVER_URL
ARG NEXT_PUBLIC_MCP_AUTH_REQUIRED

RUN yarn turbo build --filter=@open-agent-platform/web...

FROM base AS runner
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

USER nextjs

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

CMD ["node", "apps/web/server.js"]
