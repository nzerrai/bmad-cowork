#!/usr/bin/env python3
"""Seed script to create test users for the login-profiles.html page."""

import os
import sys
import uuid

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.auth.models import User
from app.auth.security import hash_password

# Test users configuration
TEST_USERS = [
    {"email": "admin@example.com", "role": "admin", "id": "ab7d57bf-e5a1-4172-bf42-21eb693ea7cd"},
    {"email": "dev@example.com", "role": "developer", "id": "93481aea-1fde-4dbd-938c-8932384b1f0f"},
    {"email": "pm@example.com", "role": "product_manager", "id": "9e4f68e8-b6c3-49de-ba27-f0cb58f43030"},
    {"email": "architect@example.com", "role": "architect_tech_lead", "id": "fd708568-3802-40d6-929c-2b4663c88cd8"},
    {"email": "ux@example.com", "role": "ux_designer", "id": "dd88f082-e3b0-44bb-a3bc-82409988440a"},
]

PASSWORD = "correct-horse"


def seed_users():
    """Create or update test users in the database."""
    db = SessionLocal()
    try:
        hashed_password = hash_password(PASSWORD)

        for user_data in TEST_USERS:
            email = user_data["email"]
            role = user_data["role"]
            user_id = uuid.UUID(user_data["id"])

            # Check if user exists
            existing_user = db.query(User).filter(User.email == email).first()

            if existing_user:
                print(f"✓ User exists: {email} (role: {existing_user.role})")
                continue

            # Create new user
            user = User(
                id=user_id,
                email=email,
                hashed_password=hashed_password,
                role=role,
            )
            db.add(user)

        db.commit()
        print("\n✅ All test users created successfully!")
        print("\nTest users available for login-profiles.html:")
        for user_data in TEST_USERS:
            print(f"  - {user_data['email']} (role: {user_data['role']})")
        print(f"\nPassword for all users: '{PASSWORD}'")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error creating users: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_users()
