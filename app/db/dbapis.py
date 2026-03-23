from app.models.models import schemas
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from typing import Any, Dict, Literal
from sqlalchemy import and_, text
from datetime import datetime
from sqlalchemy.inspection import inspect
import json
import os
from app.core.config import AppEnvironmentSetup as appset

import logging

logger = logging.getLogger(__name__)

class apis:
    postType = Literal['insert','update','delete']

    """
    A unified API class to handle asynchronous database operations (insert, update, delete, select)
    using SQLAlchemy's async engine and session with SQLite.
    """

    def __init__(self):

        """
        Initialize the asynchronous database engine and session.

        Parameters:
            (Optional) db_conn_string (str): The database connection string.
        """
        user = appset.DB_USER
        pasw = appset.DB_PASS
        host = os.getenv("DB_HOST", "localhost")
        port = os.getenv("DB_PORT", "5432")
        dbname = appset.DB_NAME
        dbpath = appset.DB_PATH
        connstr = dbpath / dbname
        db_conn_string = f"sqlite+aiosqlite:///{connstr}"
        self.async_engine = create_async_engine(db_conn_string)
        self.async_session = sessionmaker(
            bind=self.async_engine,
            class_=AsyncSession,
            expire_on_commit=False
        )

    async def create_mappings_update(self,fields:dict,dbmodel:schemas) -> dict|str :

        """
        Create a mapping of fields for updating a record. Only includes valid columns with non-None values.

        Parameters:
            fields (dict): Dictionary of provided field values.
            dbmodel (class): The ORM model whose columns are to be mapped.

        Returns:
            dict: A dictionary containing the mapped values for update.
        """
        if fields.get('data'):
            fields = fields.get('data')
        columns = dbmodel.__table__.columns.keys()
        mapped_values = {}
        pkey = None
        for col in columns:
            column_obj = dbmodel.__table__.columns[col]
            if column_obj.primary_key and not fields.get(col,None):
                if not column_obj.autoincrement:
                    raise Exception(f"Primary Key {col} cannot be blank")
            if column_obj.primary_key: 
                pkey = col
            mapped_values[col] = fields.get(col,None)
        return mapped_values,pkey
    
    async def create_mappings_insert(self,fields:dict,dbmodel:schemas) -> dict :
        """
        Create a mapping of fields for inserting a new record. 

        Parameters:
            fields (dict): Dictionary of provided field values.
            dbmodel (class): The ORM model whose columns are to be mapped.

        Returns:
            dict: A dictionary containing the mapped values for insertion.
        """
        columns = dbmodel.__table__.columns.keys()
        mapped_values = {}
        pkey = None
        if fields.get('data'):
            fields = fields.get('data')
        for col in columns:
            column_obj = dbmodel.__table__.columns[col]
            if column_obj.primary_key and not fields.get(col,None):
                if not column_obj.autoincrement:
                    raise Exception(f"Primary Key {col} cannot be blank")
            if column_obj.primary_key:
                pkey = col
            if fields.get(col) is None or isinstance(fields.get(col),int):
                mapped_values[col] = fields.get(col)
            elif isinstance(fields.get(col),datetime):
                mapped_values[col] = fields.get(col)
            elif isinstance(fields.get(col),dict):
                mapped_values[col] = fields.get(col)
            elif isinstance(fields.get(col),list):
                mapped_values[col] = fields.get(col)
            elif isinstance(fields.get(col),float):
                mapped_values[col] = fields.get(col)
            else:
                mapped_values[col] = str(fields.get(col)).replace('"','')
        logger.info(mapped_values)
        return mapped_values,pkey
        
        

    async def db_post(self,action:postType,model=schemas,**kwargs) -> bool|Any:
        """        
        ## Parameters:
          - action: 'insert' | 'update' | 'delete' | 'select'
          - model: The ORM model (e.g., schemas.TELEGRAM_CHANNELS)
          - kwargs: Fields for the operation. 
              - For insert: keys matching the model columns.
              - For update/delete: must include a primary key 'id'.
              - For select: optionally, you could include filters.
        """
        action = action.lower()
        try:
            async with self.async_session() as session:
                await session.execute(text("SELECT 1"))
        except Exception as err:
            logger.info(f" DB offline or not reachable Error: {err}")
            raise Exception("cannot connect to the DB server")


        if not action.lower() in ['update','delete','insert']:
            raise Exception("Invalid action; action of : update | delete | insert is supported")
                

                
        if action == 'update':
            mapped_values,pkey = await self.create_mappings_update(kwargs,model)
            pkey_val = mapped_values.get(pkey)
            logger.info(f"{pkey},{pkey_val}")                
            res = await self._async_update_record(schema_name=model,values=mapped_values,pkey={pkey:pkey_val})

        elif action == 'insert':
            mapped_values,pkey = await self.create_mappings_insert(kwargs,model)
            pkey_val = mapped_values.get(pkey)
            # res = asyncio.run(self. _async_insert_record(schema_name=model,values=mapped_values))
            res = await self._async_insert_record(schema_name=model,values=mapped_values,pkey={pkey:pkey_val})

        elif action == 'delete':
            # res = asyncio.run(self. _async_delete_record(schema_name=model,record_id=kwargs.get('id')))
            res = await self._async_delete_record(schema_name=model,**kwargs)

        if not res:
            return False
        # asyncio.run(self.close_engine())
        # await self.close_engine()

        return res


    async def db_get(self,no_of_records:int=None,model=schemas,start=None,end=None,asdict:bool=False, return_selected:set[str]=(), **kwargs) -> list[dict[str, Any]] | Dict[str, Dict[str, Any]]:
        """
        Unified endpoint to perform a database operation (select).

        Parameters:
            model (class): The ORM model (e.g., schemas.TELEGRAM_CHANNELS).
            kwargs: Field values for the operation.
                - filters : keyword arguments that will be applied as filters,
                            ex: `id=1` will select the record that matches the record
                            with `id=1` 

        Returns:
            The result of the operation or False if the operation failed.

        Raises:
            Exception: If the action is invalid or passed key doesnt match the db column name .
        """
        filters = []
        try:
            async with self.async_session() as session:
                await session.execute(text("SELECT 1"))
        except Exception as err:
            logger.info(f"DB offline Error: {err}")
            raise Exception("cannot connect to the DB server")
        
        if kwargs:
            for field, value in kwargs.items():
                # Get the column by name using getattr
                if field not in model.__table__.columns:
                    raise Exception(f"Field '{field}' does not exist in the schema {model}")
                filters.append(getattr(model, field) == value)
        res = await self._async_select_record(schema_name=model,records=no_of_records,filters=filters,asdict=asdict, return_selected=return_selected)
        
        # await self.close_engine()
        if no_of_records and isinstance(no_of_records,int) and res:
            res = res[:no_of_records]
        # if select_columns
        return res
    
    async def _generate_until_empty(self, model=schemas,no_of_records:int=10, asdict:bool=False, return_selected:set[str]=(), **kwargs):
            try:
                return await self.db_get(model=model, no_of_records=10, asdict=asdict, return_selected=return_selected, **kwargs) 
            except:
                raise StopIteration("No records found")

    async def db_get_paginated(self, model=schemas, page_size:int=10, asdict:bool=False, return_selected:set[str]=(), **kwargs):
        while True:
            yield await self._generate_until_empty( model=model, asdict=asdict, return_selected=return_selected, **kwargs)

    async def find_primary(self,dbmodel:schemas):
        columns = dbmodel.__table__.columns.keys()
        for col in columns:
            colObj = dbmodel.__table__.columns[col]
            if colObj.primary_key:
                primary_key = col
                return primary_key


    async def resolve_records(self, records, asdict:bool=False, primary_key:str=None, return_selected:bool=False):
        if asdict:
            resolved_records = {}
            if return_selected:
                for record in records:
                    pkey_val = record.get(primary_key)
                    resolved_records[pkey_val] = record
                resolved_records.update({"primary_key":primary_key})
                return resolved_records
            else:
                for record in records:
                    pkey_val = getattr(record,primary_key)
                    resolved_records[pkey_val] = {c.key: getattr(record,c.key) for c in inspect(record).mapper.column_attrs}
                resolved_records.update({"primary_key":primary_key})
                return resolved_records
        
        if not asdict and isinstance(records,list):
            if return_selected:
                return records
            else:
                resolved_records = []

                for record in records:
                    resolved_records.append({c.key: getattr(record,c.key) for c in inspect(record).mapper.column_attrs})
                return resolved_records
        
        return {c.key :getattr(record,c.key) for c in inspect(records).mapper.column_attrs}


    async def _async_insert_record(self,schema_name:schemas,values:dict,pkey:dict):
        """
        Unified endpoint to retrieve records from the database.

        Parameters:
            action (str): The action to perform, typically 'select'.
            no_of_records (int): The number of records to retrieve.
            model (class): The ORM model (e.g., schemas.TELEGRAM_CHANNELS).
            start: (Optional) Start index for records (pagination).
            end: (Optional) End index for records (pagination).

        Returns:
            list: A list of records retrieved from the database.
        """
        dbmodel = schema_name
        pkeyName,pkeyval = list(pkey.items())[0]
        async with self.async_session() as session:
            async with session.begin():
                # logger.info(f"{values}")
                existing = await session.execute(select(dbmodel).where(getattr(dbmodel, pkeyName) == pkeyval))
                result = existing.scalar_one_or_none()
                if result:
                    logger.info("Record with this pkey already exists.")
                    return False
                record = dbmodel(**values)
                session.add(record)
            logger.info(f"Inserted record:")
        return True

    async def _async_select_record(self,schema_name:schemas,records:int,filters:dict,asdict:bool, return_selected:set[str]):
        """
        Asynchronously select records from the database.

        Parameters:
            schema_name (class): The ORM model class.
            records (int): The number of records to retrieve.

        Returns:
            list: A list of records retrieved from the database.
        
        Raises:
            Exception: If an incorrect argument is passed.
        """

        dbmodel = schema_name
        primary_key = None
        if asdict:
            primary_key = await self.find_primary(dbmodel=dbmodel)
        if return_selected:
            cols = []
            for name in return_selected:
                if not hasattr(dbmodel, name):
                    raise ValueError(f"{dbmodel.__name__} has no column/attribute named '{name}'")
                cols.append(getattr(dbmodel, name))
            if asdict:
                cols.append(getattr(dbmodel,primary_key))
            query = select(*cols)

        # Start with the base query
        else:
            query = select(dbmodel)

        # Apply filters dynamically from kwargs
        
        # Apply the filters using `and_` to combine them (if multiple)
        query = query.filter(and_(*filters))
        async with self.async_session() as session:
            result = await session.execute(query)
            if return_selected:
                records = result.mappings().all()
                records = [dict(record) for record in records]
            else:
                records = result.scalars().all()
            logger.info(f"Fetched records: {len(records)}")

            if len(records) > 0:
                if asdict:
                    return await self.resolve_records(records,asdict=asdict,primary_key=primary_key, return_selected=bool(return_selected))
                else:
                    return await self.resolve_records(records,return_selected=bool(return_selected))
            return None

    async def _async_update_record(self,schema_name:schemas,values:dict,pkey:dict):
        """
        Asynchronously update an existing record in the database.

        Parameters:
            schema_name (class): The ORM model class.
            values (dict): Dictionary of field values to update; must include primary key 'id'.

        Returns:
            The updated record.
        
        Raises:
            Exception: If an incorrect argument is passed or the record is not found.
        """

        dbmodel = schema_name
        async with self.async_session() as session:
            async with session.begin():
                record = await session.get(dbmodel, list(pkey.values())[0])
                if not record:
                    raise Exception("no matching record was found for the update")
                fetch_record_values = await self.db_get(model=schema_name,**pkey)
                # print(fetch_record_values)
                for key in fetch_record_values[0]:
                    pkey_field = list(pkey.keys())[0]
                    if not key == pkey_field and values.get(key,None) is not None:
                        logger.info("skipping field is primary key")
                        logger.info(f"Key: {key}, value: {values[key]}")
                        setattr(record, key, values[key])
                    elif not key == pkey and not values.get(key,None):
                        logger.info(f"Key: ,{key}, value: {fetch_record_values[0][key]}")
                        setattr(record, key, fetch_record_values[0][key])

                logger.info(f"Updated {record}")
        return True


    async def _async_delete_record(self,schema_name:schemas,**record_id):
        """
        Asynchronously delete a record from the database.

        Parameters:
            schema_name (class): The ORM model class.
            record_id: Primary key value of the record to delete.

        Returns:
            True if deletion was successful.
        
        Raises:
            Exception: If an incorrect argument is passed or the record is not found.
        """
        
        dbmodel = schema_name
        if not len(record_id) == 1:
            raise Exception("Only one primary key is allowed for deletion")        
        record_id = list(record_id.values())[0]

        async with self.async_session() as session:
            async with session.begin():
                record = await session.get(dbmodel, record_id)
                if not record:
                    raise Exception(f"Record with id={record_id} was not found")
                await session.delete(record)
                logger.info(f"Deleted record")
                await session.commit()
            return True

    async def close_engine(self):
        """
        Asynchronously close the database engine.

        This method should be called when the API is no longer needed to clean up the connection.
        """
        await self.async_engine.dispose()

class redis_formatter:
    
    @staticmethod
    def format_hset(source:dict)-> Dict[str, str]:
        if not source:
            return
        
        converted = {k: json.dumps(v) for k, v in source.items()}
        return converted

    @staticmethod
    def format_hgetall(source:dict[str,str]) -> Dict[str,Dict[str,str]]:
        if not source:
            return
        
        for k,v in source.items():
            try:
                source[k] = json.loads(v)
            except:
                source[k] = v
        return source