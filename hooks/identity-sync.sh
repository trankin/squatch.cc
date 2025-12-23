#!/bin/bash
# Claude Code Hook: Identity Sync
# Place in ~/.claude/hooks/ or project .claude/hooks/
#
# This hook syncs your development identity with the vector identity system.
# It creates a cryptographic link between your git commits and your passkey.

set -e

# Configuration
IDENTITY_API="${SQUATCH_API:-https://squatch.cc/api}"
IDENTITY_FILE="${HOME}/.squatch/identity.json"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Ensure identity directory exists
mkdir -p "$(dirname "$IDENTITY_FILE")"

# Generate or load identity
generate_identity() {
    if [ ! -f "$IDENTITY_FILE" ]; then
        # Generate new identity
        PRIVATE_KEY=$(openssl ecparam -name prime256v1 -genkey -noout 2>/dev/null | base64 -w0)
        PUBLIC_KEY=$(echo "$PRIVATE_KEY" | base64 -d | openssl ec -pubout 2>/dev/null | base64 -w0)
        IDENTITY_ID=$(echo "$PUBLIC_KEY" | sha256sum | cut -c1-16)

        cat > "$IDENTITY_FILE" << EOF
{
    "id": "$IDENTITY_ID",
    "publicKey": "$PUBLIC_KEY",
    "privateKey": "$PRIVATE_KEY",
    "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "syncs": []
}
EOF
        echo -e "${GREEN}Generated new identity: $IDENTITY_ID${NC}"
    fi
}

# Sign data with identity
sign_data() {
    local data="$1"
    local private_key=$(jq -r '.privateKey' "$IDENTITY_FILE")
    echo "$data" | openssl dgst -sha256 -sign <(echo "$private_key" | base64 -d) 2>/dev/null | base64 -w0
}

# Get identity info
get_identity() {
    if [ -f "$IDENTITY_FILE" ]; then
        jq -r '.id' "$IDENTITY_FILE"
    else
        echo "none"
    fi
}

# Sync with server (optional - can work offline)
sync_identity() {
    local event_type="$1"
    local event_data="$2"

    local identity_id=$(get_identity)
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local signature=$(sign_data "${identity_id}:${timestamp}:${event_type}")

    # Try to sync, but don't fail if offline
    curl -s -X POST "${IDENTITY_API}/sync" \
        -H "Content-Type: application/json" \
        -H "X-Identity-ID: ${identity_id}" \
        -H "X-Signature: ${signature}" \
        -d "{
            \"event\": \"${event_type}\",
            \"data\": ${event_data},
            \"timestamp\": \"${timestamp}\"
        }" 2>/dev/null || true
}

# Hook handlers
on_commit() {
    local commit_hash=$(git rev-parse HEAD 2>/dev/null || echo "none")
    local commit_msg=$(git log -1 --pretty=%B 2>/dev/null || echo "")
    local author=$(git config user.email 2>/dev/null || echo "unknown")

    echo -e "${YELLOW}[squatch]${NC} Syncing commit ${commit_hash:0:8}..."

    sync_identity "commit" "{
        \"hash\": \"${commit_hash}\",
        \"author\": \"${author}\",
        \"message\": \"$(echo "$commit_msg" | head -1 | sed 's/"/\\"/g')\"
    }"

    # Update local sync log
    jq --arg hash "$commit_hash" --arg time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        '.syncs += [{"type": "commit", "hash": $hash, "time": $time}]' \
        "$IDENTITY_FILE" > "${IDENTITY_FILE}.tmp" && mv "${IDENTITY_FILE}.tmp" "$IDENTITY_FILE"
}

on_session_start() {
    echo -e "${YELLOW}[squatch]${NC} Session started, identity: $(get_identity)"

    sync_identity "session_start" "{
        \"cwd\": \"$(pwd)\",
        \"user\": \"$(whoami)\"
    }"
}

on_tool_use() {
    local tool_name="$1"

    sync_identity "tool_use" "{
        \"tool\": \"${tool_name}\"
    }"
}

# Main
generate_identity

case "${1:-}" in
    "commit")
        on_commit
        ;;
    "session")
        on_session_start
        ;;
    "tool")
        on_tool_use "${2:-unknown}"
        ;;
    "id")
        echo $(get_identity)
        ;;
    "info")
        if [ -f "$IDENTITY_FILE" ]; then
            echo -e "${GREEN}Identity:${NC} $(jq -r '.id' "$IDENTITY_FILE")"
            echo -e "${GREEN}Created:${NC} $(jq -r '.created' "$IDENTITY_FILE")"
            echo -e "${GREEN}Syncs:${NC} $(jq -r '.syncs | length' "$IDENTITY_FILE")"
        else
            echo "No identity found"
        fi
        ;;
    *)
        echo "Usage: $0 {commit|session|tool|id|info}"
        ;;
esac
