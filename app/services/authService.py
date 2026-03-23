from app.core.startup import APIS
from app.models.models import schemas
from fastapi.exceptions import HTTPException
from app.core.security import _create_jwt_token, verify_password, hash_password
from app.core.startup import Rbac
from app.models.pydtmodels import userLogin


async def login(user:userLogin):
    finduser = await APIS.db_get(1,model=schemas.USERS,email=user.email)
    if finduser is None or not verify_password(user.password,finduser[0]['passw']):
        raise HTTPException(status_code=401,detail={"errors":"No matching user account exists", "message":"login failed"})

    token = await _create_jwt_token({
        "email":user.email,
        "name":finduser[0]['name'],
        "user_type":finduser[0]['user_type'],
        "user_id":finduser[0]['user_id'],
        },
        30
    )
    user_details = finduser[0]
    user_details.pop('passw')
    user_details.pop('user_dir')
    return {"access_token":token,"token_type":"bearer", "message":"login successful", "errors":None, "details": user_details}
