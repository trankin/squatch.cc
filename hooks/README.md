# Vector Identity Hooks

These hooks integrate your development identity with the squatch.cc vector identity system.

## Installation

```bash
# Copy hook to Claude Code hooks directory
mkdir -p ~/.claude/hooks
cp identity-sync.sh ~/.claude/hooks/
chmod +x ~/.claude/hooks/identity-sync.sh

# Initialize identity
~/.claude/hooks/identity-sync.sh info
```

## Claude Code Settings

Add to your `~/.claude/settings.json`:

```json
{
  "hooks": {
    "on_session_start": ["~/.claude/hooks/identity-sync.sh session"],
    "post_tool_use": ["~/.claude/hooks/identity-sync.sh tool $TOOL_NAME"]
  }
}
```

## Git Integration

Add to your project's `.git/hooks/post-commit`:

```bash
#!/bin/bash
~/.claude/hooks/identity-sync.sh commit
```

## What It Does

1. **Generates Identity**: Creates an ECDSA keypair on first run
2. **Signs Events**: Cryptographically signs all sync events
3. **Links Git ↔ Web**: Your commit identity links to your browser passkey
4. **Works Offline**: Syncs when possible, logs locally when not

## Identity File

Stored at `~/.squatch/identity.json`:

```json
{
  "id": "a1b2c3d4e5f6g7h8",
  "publicKey": "...",
  "privateKey": "...",
  "created": "2025-12-22T00:00:00Z",
  "syncs": [
    {"type": "commit", "hash": "abc123", "time": "..."},
    {"type": "session_start", "time": "..."}
  ]
}
```

## Linking to Browser Passkey

1. Visit https://squatch.cc/identity.html
2. Create a passkey
3. Run: `~/.claude/hooks/identity-sync.sh id`
4. The identities will link automatically on next sync

## Privacy

- Private key never leaves your machine
- Only public key + signatures are synced
- You can delete `~/.squatch/` to reset identity
