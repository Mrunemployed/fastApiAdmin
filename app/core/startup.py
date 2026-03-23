import asyncio
from typing import Union
from app.models.models import schemas
from app.models.pydtmodels import admins
from app.db.dbapis import apis
from enum import Enum
from app.core.config import AppEnvironmentSetup as appset
import uuid
import logging
import json

logger = logging.getLogger(__name__)

class rbac:
    Pydroles : list = []
    RbacPolicy : Union[list[tuple]] = [()]
    roles:list[dict] = [{}]

    async def create_default_role(self, *args, **kwargs):
        records = await APIS.db_get(model=schemas.RBAC)
        users_found = {}
        if records:
            for record in records:
                if record.get("user_type") == "user" and record.get("active"): users_found["user"] = True
            if not users_found["user"]:
                await APIS.db_post(action='insert',model=schemas.RBAC, user_type="user",access="", active=True)
        else:
            await APIS.db_post(action='insert',model=schemas.RBAC, user_type="user",access="", active=True)
            await APIS.db_post(action='insert',model=schemas.RBAC, user_type="admin",access="", active=True)


    async def refresh(self, *args, **kwargs):
        try:
            api = apis()
            roles = await api.db_get(model=schemas.RBAC)
            if isinstance(roles,dict):
                key,val = list(roles.items())[0]
                UserTypeDynamic = Enum('UserTypeDynamic', {key:val })
            self.Pydroles = [x['user_type'] for x in roles]
            self.RbacPolicy = [(x['user_type'], x['access']) for x in roles]
        except Exception as err:
            logger.info(f"No roles configured yet, {err}")

    async def refresh_roles(self):
        role_records = await APIS.db_get(model=schemas.RBAC)
        lim = min(len(self.roles),len(role_records))
        for idx in range(lim):
            if not self.roles[idx].get('id') == role_records[idx].get('id'):
                self.roles.append(role_records.pop(idx))
        if len(role_records) > 0:
            self.roles.extend(role_records)

APIS = apis()
Rbac = rbac()


# Create default admin

async def create_default_admin():
    from app.core.security import hash_password

    admin_user = admins(
        name="admin",
        email="admin@jseeker.com",
        secret_key=appset.SECRET_KEY,
        password="admin",
        user_type="admin"
    )
    existing_acc = await APIS.db_get(model=schemas.USERS, email="admin@jseeker.com")
    if existing_acc:
        return
    user_id = str(uuid.uuid4().hex)
    user_dir = ""
    role_configs = await APIS.db_get(model=schemas.RBAC,user_type=admin_user.user_type)
    if role_configs:
            
        role_id = role_configs[0].get('id')
        new_user = await APIS.db_post(
            action='insert',
            model=schemas.USERS,
            name=admin_user.name,
            email=admin_user.email,
            user_type=admin_user.user_type,
            passw=hash_password(admin_user.password),
            user_id=user_id,
            user_dir=user_dir,
            role_id=role_id
            )
        return new_user