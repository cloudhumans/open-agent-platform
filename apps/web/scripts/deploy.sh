#!/bin/bash
set -e

# Configuration
ECR_REPOSITORY="585814034319.dkr.ecr.us-east-1.amazonaws.com/open-agent-platform"
AWS_REGION="us-east-1"
AWS_PROFILE="production"
IMAGE_TAG="latest"
KUBECONFIG_PATH="/home/$(whoami)/.config/Lens/kubeconfigs/13cc2a88-4adf-4ec0-b237-d63fdf1aa379-pasted-kubeconfig.yaml"
KUBECTL_PATH="/opt/Lens/resources/x64/kubectl"

echo "🔨 Building Docker image..."
docker build -f apps/web/Dockerfile -t open-agent-platform:${IMAGE_TAG} \
  --build-arg NEXT_PUBLIC_DEPLOYMENTS='[{"name":"claudia","id":"510549fc-e2bf-4593-be52-53c555ba28b8","tenantId":"8d78c364-6803-47b7-957c-a7e976e4d558","deploymentUrl":"https://claudia-e86fe2e91a435c59a69e1a70599e2914.us.langgraph.app","isDefault":true,"defaultGraphId":"agent"},{"name":"react-agent","id":"45c60f4d-4ae6-4668-8411-52829b1126f0","tenantId":"8d78c364-6803-47b7-957c-a7e976e4d558","deploymentUrl":"https://react-agent-5f25448a5b87539d8ff907a17bd089b0.us.langgraph.app","isDefault":false,"defaultGraphId":"agent"}]' \
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
