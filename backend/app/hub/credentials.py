"""Fernet-based encryption for repo access credentials at rest.

`REPO_CREDENTIAL_ENCRYPTION_KEY` follows the same explicit-env-var
convention as `JWT_SECRET_KEY` in `app/config.py`: CI sets it explicitly,
local dev falls back to a documented (non-secret) default. The env var need
not itself be a valid Fernet key (32 url-safe base64-encoded bytes) -- it is
the *source secret*, deterministically stretched into one via SHA-256, so
any string works as the configured value.
"""

import base64
import hashlib
import os

from cryptography.fernet import Fernet, InvalidToken

# `or`, not the `os.environ.get(..., default)` form: an explicitly-set empty
# string must still fall back to the dev default, not derive a key from "".
REPO_CREDENTIAL_ENCRYPTION_KEY = (
    os.environ.get("REPO_CREDENTIAL_ENCRYPTION_KEY")
    or "dev-only-insecure-repo-credential-key-do-not-use-in-prod"
)


def _derive_fernet_key(secret: str) -> bytes:
    """Stretches an arbitrary secret string into a valid Fernet key."""
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


_fernet = Fernet(_derive_fernet_key(REPO_CREDENTIAL_ENCRYPTION_KEY))


def encrypt_credential(credential: str) -> str:
    """Encrypts a plaintext repo access credential for storage at rest."""
    return _fernet.encrypt(credential.encode("utf-8")).decode("utf-8")


def decrypt_credential(encrypted_credential: str) -> str:
    """Decrypts a stored credential back to plaintext.

    Raises `cryptography.fernet.InvalidToken` if the ciphertext is malformed
    or was encrypted under a different key (e.g. the key changed since the
    credential was stored) -- callers should treat that as "no usable
    credential" rather than letting it propagate as a 500.
    """
    return _fernet.decrypt(encrypted_credential.encode("utf-8")).decode("utf-8")


__all__ = ["InvalidToken", "decrypt_credential", "encrypt_credential"]
