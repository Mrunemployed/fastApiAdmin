from fastapi import Depends, HTTPException, Request, APIRouter
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_access_token
from fastapi import Security
import hmac
import hashlib
import json
from datetime import datetime, timezone
from app.core.config import AppEnvironmentSetup as appset

security = HTTPBearer()

async def Protected_get_user_details(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    
    """
    Dependency to extract and validate the JWT token.
    Returns:
        The decoded JWT payload if the token is valid.
    Raises:
        HTTPException: 401 error if the token is invalid or missing.
    """
    token = credentials.credentials
    payload = await decode_access_token(token)
    if payload.get("user_type") == "admin":
        return payload
    plan_expiry = payload.get('plan_expiry')
    if plan_expiry:
        plan_expiry_datetime = datetime.fromisoformat(plan_expiry)
        if plan_expiry_datetime > datetime.now(timezone.utc):
            payload['expired'] = False
        else:
            payload['expired'] = True

    if not payload:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    return payload


def verify_nowpayments_signature(signature: str, payload: dict) -> bool:
    """
    Verify HMAC-SHA512 signature using NOWPAYMENTS_IPN_SECRET.
    """
    payload_str = json.dumps(payload, separators=(',', ':'), ensure_ascii=False)
    computed_sig = hmac.new(
        key=appset.NOWPAYMENTS_IPN_SECRET.encode(),
        msg=payload_str.encode(),
        digestmod=hashlib.sha512
    ).hexdigest()
    return hmac.compare_digest(computed_sig, signature)