from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from firebase_admin import auth as firebase_auth

from app.firebase import init_firebase


async def require_admin(
    authorization: Annotated[str | None, Header()] = None,
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Brak tokena autoryzacji.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    init_firebase()
    token = authorization.removeprefix("Bearer ").strip()

    try:
        decoded = firebase_auth.verify_id_token(token)
        return decoded
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy lub wygasły token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

AdminUser = Annotated[dict, Depends(require_admin)]
