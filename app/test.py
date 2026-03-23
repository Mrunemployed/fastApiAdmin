from app.db.dbapis import apis
from app.models.models import schemas
import asyncio

async def run():
    api = apis()
    res = await api.db_get(model=schemas.TEST, name="Rahul")
    if res:
        pkey = res[0].get("id")
        print(pkey)
        await api.db_post(action="delete", model=schemas.TEST, id=pkey)

    # print(res)

asyncio.run(run())
