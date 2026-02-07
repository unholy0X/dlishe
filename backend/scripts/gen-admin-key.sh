#!/bin/bash
# Generate a random ADMIN_API_KEY and add/update it in .env

ENV_FILE="${1:-.env}"
KEY=$(openssl rand -hex 32)

if grep -q '^ADMIN_API_KEY=' "$ENV_FILE" 2>/dev/null; then
  sed -i '' "s/^ADMIN_API_KEY=.*/ADMIN_API_KEY=$KEY/" "$ENV_FILE"
  echo "Updated ADMIN_API_KEY in $ENV_FILE"
else
  echo "" >> "$ENV_FILE"
  echo "ADMIN_API_KEY=$KEY" >> "$ENV_FILE"
  echo "Added ADMIN_API_KEY to $ENV_FILE"
fi

echo ""
echo "Your admin key: $KEY"
echo ""
echo "Test with:"
echo "  curl -s -H \"Authorization: Bearer $KEY\" http://localhost:8080/api/v1/admin/stats | jq"
