"""Centralized JWT configuration, read from env with dev-friendly defaults.

Per Story 0.2's Boundaries & Constraints, `JWT_SECRET_KEY` follows the same
explicit-env-var convention as `DATABASE_URL`: CI sets it explicitly, local
dev falls back to a documented (non-secret) default.
"""

import os

# `or`, not the `os.environ.get(..., default)` form: an explicitly-set empty
# string (e.g. a misconfigured CI/host) must still fall back to the dev
# default, not sign tokens with an empty key.
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY") or "dev-only-insecure-secret-do-not-use-in-prod"
JWT_ALGORITHM = "HS256"
# JWT_EXPIRE_MINUTES can be set via environment variable for non-expiring CLI tokens
# 5256000 minutes = 10 years (effectively non-expiring for CLI use)
_jwt_expire_str = os.environ.get("JWT_EXPIRE_MINUTES")
if _jwt_expire_str:
    JWT_EXPIRE_MINUTES = int(_jwt_expire_str)
else:
    JWT_EXPIRE_MINUTES = 5256000  # 10 years for CLI tokens

# The IHM's origin, allowed for cross-origin browser requests (Story 1.2
# Task 4). Same explicit-env-var convention as JWT_SECRET_KEY above.
IHM_ORIGIN = os.environ.get("IHM_ORIGIN") or "http://localhost:4000"
