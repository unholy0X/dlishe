#!/bin/bash
set -e

# Configuration
API_URL="http://localhost:8080/api/v1"
# Use provided URL or default to sample
VIDEO_URL="${1:-https://youtube.com/shorts/NnKyrtI6IXk?si=o110oW-prts899w7}" 
EMAIL="testuser@example.com"
PASSWORD="password123"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Starting Video Extraction Verification..."

# 1. Register/Login to get Token
echo "1. Authenticating..."

# Function to extract token using python
extract_token() {
    echo $1 | python3 -c "import sys, json; print(json.load(sys.stdin).get('accessToken', ''))"
}

# Try Login
echo "Attempting login..."
LOGIN_RESP=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

TOKEN=$(extract_token "$LOGIN_RESP")

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}Login successful.${NC}"
else
    echo "Login failed. Response: $LOGIN_RESP"
    echo "Attempting registration..."
    REG_RESP=$(curl -s -X POST "$API_URL/auth/register" \
      -H "Content-Type: application/json" \
      -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\", \"name\": \"Test User\"}")
    
    TOKEN=$(extract_token "$REG_RESP")
    
    if [ -n "$TOKEN" ]; then
         echo -e "${GREEN}Registration successful.${NC}"
    else
         echo "Registration failed/conflict. Response: $REG_RESP"
         # If conflict (409), user exists. Login should have worked unless password changed.
         # Retry login just in case
         echo "Retrying login..."
         LOGIN_RESP=$(curl -s -X POST "$API_URL/auth/login" \
          -H "Content-Type: application/json" \
          -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")
         TOKEN=$(extract_token "$LOGIN_RESP")
    fi
fi

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Authentication failed.${NC}"
    exit 1
fi
echo "Token obtained."

# 2. Extract Video
echo "2. Submitting Video for Extraction..."
EXTRACT_RESP=$(curl -s -X POST "$API_URL/video/extract" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"videoUrl\": \"$VIDEO_URL\", \"language\": \"en\", \"detailLevel\": \"quick\"}")

JOB_ID=$(echo $EXTRACT_RESP | python3 -c "import sys, json; print(json.load(sys.stdin).get('jobId', ''))")

if [ -z "$JOB_ID" ]; then
    echo -e "${RED}Failed to start job.${NC}"
    echo $EXTRACT_RESP
    exit 1
fi
echo -e "${GREEN}Job started: $JOB_ID${NC}"

# 3. Poll Job Status
echo "3. Polling Job Status..."
STATUS="pending"
while [ "$STATUS" != "completed" ] && [ "$STATUS" != "failed" ]; do
    sleep 2
    JOB_RESP=$(curl -s -X GET "$API_URL/jobs/$JOB_ID" \
      -H "Authorization: Bearer $TOKEN")
    
    STATUS=$(echo $JOB_RESP | python3 -c "import sys, json; print(json.load(sys.stdin).get('status', ''))")
    PROGRESS=$(echo $JOB_RESP | python3 -c "import sys, json; print(json.load(sys.stdin).get('progress', 0))")
    
    echo "Status: $STATUS ($PROGRESS%)"
done

if [ "$STATUS" == "failed" ]; then
    echo -e "${RED}Job failed.${NC}"
    echo $JOB_RESP
    exit 1
fi

# 4. Get Resulting Recipe
RECIPE_ID=$(echo $JOB_RESP | python3 -c "import sys, json; print(json.load(sys.stdin).get('recipe', {}).get('id', ''))")
echo -e "${GREEN}Job completed! Recipe ID: $RECIPE_ID${NC}"

# 5. Fetch Recipe Details
echo "5. Fetching Recipe Details..."
RECIPE_RESP=$(curl -s -X GET "$API_URL/recipes/$RECIPE_ID" \
  -H "Authorization: Bearer $TOKEN")

TITLE=$(echo $RECIPE_RESP | python3 -c "import sys, json; print(json.load(sys.stdin).get('title', ''))")
echo -e "${GREEN}Verified Recipe: $TITLE${NC}"
echo "Verification Successful!"
