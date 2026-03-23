from app.models import models
# import db_models

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import AppEnvironmentSetup as appset

class createDB:

    def __init__(self):
        self.dbname = appset.DB_NAME
        self.base_models = models.Base
        connstring = appset.DB_PATH / self.dbname
        self.async_engine = create_async_engine(f"sqlite+aiosqlite:///{connstring}", echo=True)

    async def make_tables_from_schema(self):
        async with self.async_engine.begin() as connection:
            await connection.run_sync(self.base_models.metadata.create_all)

    def create_tables(self):
        asyncio.run(self.make_tables_from_schema())
    
    def __repr__(self):
        return f"CreateDB(dbname={self.dbname}, base_models={self.base_models}, engine='async_engine')"