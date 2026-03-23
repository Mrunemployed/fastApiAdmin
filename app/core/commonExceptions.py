from fastapi import HTTPException
from typing import Callable
from functools import wraps
import logging

logger = logging.getLogger("app.exceptions")

def exceptionHandler(func:Callable):
    @wraps(func)
    async def routing(*args,**kwargs):
        try:
            res = await func(*args,**kwargs)
            return res
        except HTTPException as httpex:
            # print("error:", httpex.detail)
            logger.error(httpex.detail)
            raise HTTPException(status_code=httpex.status_code, detail=httpex.detail)
        except Exception as Err:
            # print(Err)
            logger.error(Err)
            raise HTTPException(status_code=400, detail={'errors':["Server Error: Invalid Request"], 'message': "A server exception occurred", "success":False})
    return routing