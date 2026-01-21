#!/bin/bash
set -e

# Configuration
ECR_REPOSITORY="585814034319.dkr.ecr.us-east-1.amazonaws.com/open-agent-platform"
AWS_REGION="us-east-1"
AWS_PROFILE="production"
IMAGE_TAG="latest"
KUBECONFIG_PATH="/home/fabio/.config/Lens/kubeconfigs/13cc2a88-4adf-4ec0-b237-d63fdf1aa379-pasted-kubeconfig.yaml"
KUBECTL_PATH="/opt/Lens/resources/x64/kubectl"

echo "🔨 Building Docker image..."
docker build -f apps/web/Dockerfile -t open-agent-platform:${IMAGE_TAG} \
  --build-arg NEXT_PUBLIC_DEPLOYMENTS='[{"name":"claudia-agentic","id":"88dc20c9-ff10-4f97-9299-592f0e0410d3","tenantId":"1ea4e982-ab14-4c2d-af31-45c71fcc6b9f","deploymentUrl":"https://claudia-agentic-002708c0e2f95fdd9e3bad91557fec4b.us.langgraph.app","isDefault":true,"defaultGraphId":"agent"}]' \
  --build-arg NEXT_PUBLIC_COGNITO_CLIENT_ID="8lmhq04h0q3pnu6p60r91bd2h" \
  --build-arg NEXT_PUBLIC_COGNITO_USER_POOL_ID="us-east-1_oze29iTu0" \
  --build-arg NEXT_PUBLIC_BASE_API_URL="https://oap.us-east-1.prd.cloudhumans.io/api" \
  --build-arg NEXT_PUBLIC_USE_LANGSMITH_AUTH="true" \
  --build-arg NEXT_PUBLIC_GOOGLE_AUTH_DISABLED="true" \
  --build-arg NEXT_PUBLIC_MCP_SERVER_URL="https://mcp.cloudhumans.com/cloudhumans" \
  --build-arg NEXT_PUBLIC_MCP_AUTH_REQUIRED="true" \
  .

echo "🏷️  Tagging image..."
docker tag open-agent-platform:${IMAGE_TAG} ${ECR_REPOSITORY}:${IMAGE_TAG}

echo "🔐 Logging into ECR..."
aws ecr get-login-password --region ${AWS_REGION} --profile ${AWS_PROFILE} | \
  docker login --username AWS --password-stdin ${ECR_REPOSITORY}

echo "⬆️  Pushing image to ECR..."
docker push ${ECR_REPOSITORY}:${IMAGE_TAG}

echo "🔄 Restarting Kubernetes deployment..."
KUBECONFIG=${KUBECONFIG_PATH} ${KUBECTL_PATH} rollout restart deployment/open-agent-platform -n open-agent-platform

echo "⏳ Waiting for rollout to complete..."
KUBECONFIG=${KUBECONFIG_PATH} ${KUBECTL_PATH} rollout status deployment/open-agent-platform -n open-agent-platform

echo "✅ Deployment complete!"
echo "🌐 Application: https://oap.us-east-1.prd.cloudhumans.io"
