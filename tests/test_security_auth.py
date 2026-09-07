import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_invalid_password_rejected():
    res = client.post("/api/v1/auth/login", json={
        "email": "admin@cyberintel.gov.in",
        "password": "WrongPassword123!"
    })
    assert res.status_code == 401

def test_tampered_token_rejected():
    res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer fake.tampered.token"})
    assert res.status_code == 401

def test_analyst_cannot_register_users():
    # Login as analyst
    res = client.post("/api/v1/auth/login", json={
        "email": "analyst@cyberintel.gov.in",
        "password": "Analyst@2026!"
    })
    token = res.json()["access_token"]

    # Attempt to provision a new user
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@cyberintel.gov.in",
            "password": "Password@123",
            "full_name": "Test User",
            "role": "investigator"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert reg_res.status_code == 403
