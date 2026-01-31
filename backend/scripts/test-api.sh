#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL=${BASE_URL:-http://localhost:8080}
echo -e "${YELLOW}Testing DishFlow API at $BASE_URL${NC}"
echo ""

# Helper function
check_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local data=$5
    local token=$6

    echo -n "  $description... "

    local args="-s -o /dev/null -w %{http_code}"

    if [ -n "$token" ]; then
        args="$args -H \"Authorization: Bearer $token\""
    fi

    if [ -n "$data" ]; then
        args="$args -H \"Content-Type: application/json\" -d '$data'"
    fi

    local status=$(eval "curl $args -X $method \"$BASE_URL$endpoint\"")

    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}OK${NC} ($status)"
        return 0
    else
        echo -e "${RED}FAILED${NC} (expected $expected_status, got $status)"
        return 1
    fi
}

# Track failures
FAILURES=0

echo -e "${YELLOW}=== Health Checks ===${NC}"
check_endpoint "GET" "/health" "200" "Liveness probe" || ((FAILURES++))
check_endpoint "GET" "/ready" "200" "Readiness probe" || ((FAILURES++))

echo ""
echo -e "${YELLOW}=== Public Endpoints ===${NC}"
check_endpoint "GET" "/api/v1/info" "200" "API info" || ((FAILURES++))

echo ""
echo -e "${YELLOW}=== Auth Endpoints (Not Implemented) ===${NC}"
check_endpoint "POST" "/api/v1/auth/anonymous" "501" "Anonymous auth" '{}' || ((FAILURES++))
check_endpoint "POST" "/api/v1/auth/login" "501" "Login" '{"email":"test@test.com","password":"test"}' || ((FAILURES++))

echo ""
echo -e "${YELLOW}=== Protected Endpoints (Not Implemented) ===${NC}"
check_endpoint "GET" "/api/v1/recipes" "501" "List recipes" || ((FAILURES++))
check_endpoint "POST" "/api/v1/video/extract" "501" "Video extract" '{"url":"https://youtube.com/watch?v=test"}' || ((FAILURES++))
check_endpoint "POST" "/api/v1/sync" "501" "Sync" '{}' || ((FAILURES++))

echo ""
echo "================================"
if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}$FAILURES test(s) failed${NC}"
    exit 1
fi
