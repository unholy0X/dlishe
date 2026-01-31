#!/bin/bash

BASE_URL="http://localhost:8080/api/v1"
RECIPE_ID=$1

if [ -z "$RECIPE_ID" ]; then
    echo "Usage: ./debug_recipe.sh <recipe_id>"
    exit 1
fi

# 1. Login
echo "Authenticating..."
LOGIN_PAYLOAD='{"email":"test@example.com", "password":"password123"}'
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d "$LOGIN_PAYLOAD")
TOKEN=$(echo "$RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    # Try registering if login fails (in case dev DB was reset/different)
    echo "Login failed, trying to register..."
    REG_PAYLOAD='{"name":"Test User", "email":"test@example.com", "password":"password123"}'
    curl -s -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" -d "$REG_PAYLOAD" > /dev/null
    RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d "$LOGIN_PAYLOAD")
    TOKEN=$(echo "$RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
    echo "Failed to get token."
    exit 1
fi

# 2. Get Recipe
echo "Fetching Recipe $RECIPE_ID..."
curl -s -X GET "$BASE_URL/recipes/$RECIPE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
