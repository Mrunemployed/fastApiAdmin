from app.core.startup import APIS
from app.models.models import schemas
from app.models.pydtmodels import admins
import uuid
from app.core.config import AppEnvironmentSetup as appset
from fastapi import HTTPException
from app.core.security import hash_password
from sqlalchemy import Integer, Sequence
from sqlalchemy.sql.base import ReadOnlyColumnCollection
from sqlalchemy.sql.schema import Column
from decimal import Decimal
from typing import Any, Union
from datetime import datetime
import json
from pathlib import Path
from dateutil import parser as dtparse
import logging

logger = logging.getLogger(__name__)

def CreateUUID():
    """
    Generate a unique UUID for user identification.

    Returns:
        str: A string representation of the generated UUID.
    """
    return str(uuid.uuid4().hex)

async def admin_signup(user:admins):
        
    existing_user = await APIS.db_get(1,model=schemas.USERS,email=user.email)
    if existing_user is not None:
        raise HTTPException(status_code=400, detail={'errors':"User already exists", 'message': "User is already signed up"})
    if not user.secret_key == appset.ADMIN_SECRET_KEY and user.user_type == 'admin':
        raise HTTPException(status_code=400, detail={'errors':"Invalid request", 'message': "Not Authorized"})
    user_id = CreateUUID()
    user_dir = ""
    role_configs = await APIS.db_get(model=schemas.RBAC,user_type=user.user_type)
    role_id = role_configs[0].get('id')
    new_user = await APIS.db_post(
        action='insert',
        model=schemas.USERS,
        name=user.name,
        email=user.email,
        user_type=user.user_type,
        passw=hash_password(user.password),
        user_id=user_id,
        user_dir=user_dir,
        role_id=role_id
        )
    return new_user

def pk_is_autoincrement(col):
    
    # Explicit flag always wins
    if col.autoincrement is True:
        return True
    if col.autoincrement is False:
        return False

    # autoincrement == "auto"  → decide by type / default
    if col.autoincrement == "auto":
        # Integer PK + no explicit default → yes
        if isinstance(col.type, Integer) and col.default is None and col.server_default is None:
            return True

        # Identity() or Sequence() on the server side → yes
        if getattr(col, "identity", None) is not None:
            return True
        if isinstance(col.server_default, Sequence):
            return True

    # otherwise not autoincrementing
    return False

def _identity(x): return x

CASTERS={
    "str":   lambda x: str(x) if x is not None else None,
    "int":   lambda x: int(x) if x not in ("", None) else None,
    "float": lambda x: float(x) if x not in ("", None) else None,
    "bool":  lambda x: None if x in ("", None) else str(x).lower() in ("1", "true", "yes", "on"),
    "dict":  lambda x: x if isinstance(x, dict) else json.loads(x or "{}"),
    "list":  lambda x: x if isinstance(x, list) else json.loads(x or "[]"),
    "Decimal":  lambda x: Decimal(str(x)) if x not in ("", None) else None,
    "date":     lambda x: dtparse.parse(str(x)).date() if x not in ("", None) else None,
    "datetime": lambda x: dtparse.parse(str(x)) if x not in ("", None) else None,
    "Path":     lambda x: Path(x) if x not in ("", None) else None,
}
def _py_name(col: Column) -> str:
    """Return the Python type name or '?' if SQLA does not expose it."""
    try:
        return col.type.python_type.__name__
    except (AttributeError, NotImplementedError):
        return "?"

def detect_metadata(columns:Union[ReadOnlyColumnCollection[Column,Any],Column]):
    metadata = {}
    logger.info(f"REceived type:{type(columns)}")
    if isinstance(columns,Column):
        col = columns
        metadata[col.name] = {
            "name": col.name,
            "type": _py_name(col),
            "size": getattr(col.type,"length",None),
            "is_primary_key": col.primary_key,
            "is_foreign_key": bool(col.foreign_keys)
        }
        return metadata
    for col in columns:
        # logger.info(type(col))
        if isinstance(col,Column):
            metadata[col.name] = {
                "name": col.name,
                "type": _py_name(col),
                "size": getattr(col.type,"length",None),
                "is_primary_key": col.primary_key,
                "is_foreign_key": bool(col.foreign_keys)
            }
    return metadata

async def user_queries():
    all_queries = await APIS.db_get(model=schemas.USER_QUERIES_TABLE)
    return all_queries

async def get_metadat(table_schema:str):
    _schemas = schemas()
    data = {}
    mapped_schema = getattr(_schemas,table_schema,None)
    if not mapped_schema:
        return {}
    _mapper = mapped_schema.__table__ 
    data["table_name"] = table_schema
    data["headers"] = detect_metadata(columns=_mapper.columns)
    del _schemas
    return data

async def all_tables():
    _schemas = schemas()
    tables = list(_schemas)
    del _schemas
    return {"all":list(tables)}

async def get_this_table(table_schema:str):
    _schemas = schemas()
    data = {}
    mapped_schema = getattr(_schemas,table_schema,None)
    if not mapped_schema:
        return {}
    _mapper = mapped_schema.__table__ #table name
    all_data = await APIS.db_get(model=mapped_schema, asdict=True)
    data["table_name"] = table_schema
    data["headers"] = detect_metadata(columns=_mapper.columns)
    data["data"] = all_data
    del _schemas
    return data



async def update_record(primary_id:str, primary_field:str, table_schema:str, **values):
    _schemas = schemas()
    if table_schema in list(_schemas):
        table_class = getattr(_schemas,table_schema,None)
        if not table_class:
            return
        table = table_class.__table__
        col_attr = getattr(table.columns,primary_field,None)
        metadata = detect_metadata(col_attr)
        pk_type = metadata[primary_field]['type']
        caster = CASTERS.get(pk_type,None)
        if not caster:
            logger.info("[WARNING] Could not perform operation, field is of unknown type.")
            return
        primary_id = caster(primary_id)
        values.update({f"{primary_field}":primary_id})
        data = await APIS.db_post(action="update",model=table_class, **values)
        return data 

async def delete_record(primary_id:str, primary_field:str, table_schema:str):
    _schemas = schemas()
    if table_schema in list(_schemas):
        table_class = getattr(_schemas,table_schema,None)
        if not table_class:
            logger.info(f"[INFO] The table class wasnt found:{table_class}")
            return
        table = table_class.__table__
        col_attr = getattr(table.columns,primary_field,None)
        metadata = detect_metadata(col_attr)
        pk_type = metadata[primary_field]['type']
        caster = CASTERS.get(pk_type,None)
        if not caster:
            logger.info("[WARNING] Could not perform operation, field is of unknown type.")
            return
        primary_id = caster(primary_id)
        primary_mapping = {f"{primary_field}":primary_id}
        data = await APIS.db_post(action="delete",model=table_class, **primary_mapping)
        return data

async def insert_record(primary_field:str, table_schema:str, **values):
    _schemas = schemas()
    if table_schema in list(_schemas):
        table_class = getattr(_schemas,table_schema,None)
        if not table_class:
            del _schemas
            return 
        table = table_class.__table__
        col_attr = getattr(table.columns,primary_field,None)
        if col_attr is None:
            logger.info(f"[WARNING] Insertion failed in table {table_schema}")
            del _schemas
            return 
        if pk_is_autoincrement(col_attr):
            data = await APIS.db_post(action="insert",model=table_class, **values)
            del _schemas
            return data
        else:
            values.update({f"{primary_field}":CreateUUID()})
            data = await APIS.db_post(action="insert",model=table_class, **values)
            del _schemas
            return data
