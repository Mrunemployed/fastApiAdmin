from fastapi import APIRouter, Depends, HTTPException, Body
from app.core.security import _create_jwt_token, verify_password, hash_password
from app.db.dbapis import apis
from app.models.models import schemas
from app.core.commonExceptions import exceptionHandler
from app.models.pydtmodels import userLogin, dynamic_signup_model, Settings
from datetime import timedelta, datetime, timezone
from app.core.startup import Rbac
from app.services.authService import login
import uuid

router = APIRouter()


api_session = apis()

def CreateUUID():
    """
    Generate a unique UUID for user identification.

    Returns:
        str: A string representation of the generated UUID.
    """
    return str(uuid.uuid4().hex)


@router.post("/login", tags=['Auth'])
@exceptionHandler
async def api_login(user:userLogin):

    """
    User Login Endpoint.

    Args:
        user (userLogin): Pydantic model containing user credentials.

    Returns:
        dict: JWT token and message indicating successful login.

    Raises:
        HTTPException: If authentication fails or user is not found.
    """
    return await login(user)



@router.post("/signup", tags=['Auth'])
@exceptionHandler
async def user_registration(body:dict = Body(...)):
    """
    User Registration Endpoint.

    Args:
        body (The requestData): validation using Pydantic model containing user details for registration.

    Returns:
        dict: Message indicating successful user registration.

    Raises:
        HTTPException: If the user already exists or if signup fails.

    Sample Body:
    ```
    {
        "name":"foo",
        "email":"foo@example.com",
        "password":"flalala"
    }
    ```
    """
    SignUpPydt = await dynamic_signup_model()

    try:
        user = SignUpPydt(**body)
    except ValueError as e:
        raise HTTPException(status_code=400, detail={'errors':str(e), 'message': "validation failed"})
    existing_user = await api_session.db_get(1,schemas.USERS,email=user.email)
    if existing_user is not None:
        raise HTTPException(status_code=400, detail={'errors':"User already exists", 'message': "User is already signed up"})
    role = [role for role in Rbac.roles if role.get('user_type') == 'user'][0]

    role_id = role.get('id')
    user_id = CreateUUID()
    user_dir = ""
    # user_dir.mkdir(parents=True,exist_ok=True)
    
    new_user = await api_session.db_post(
        action='insert',
        model=schemas.USERS,
        name=user.name,
        email=user.email,
        user_type='user',
        passw=hash_password(user.password),
        user_id=user_id,
        user_dir=user_dir,
        role_id=role_id,
    )
    if new_user:
        user = userLogin(
            email=user.email,
            password=user.password
        )
        details = await login(user=user)
        settings = Settings().model_dump()
        print(settings)
        await api_session.db_post(action="insert", model=schemas.SETTINGS,user_id=user_id, **settings)
        details.pop("message")
        return {"message": "User has signed up successfully", "errors": None, **details}
    else:
        raise HTTPException(status_code=405,detail={'errors':"Signup failed", "message":"Cannot complete signup at this time please try again later."})

