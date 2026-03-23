from app.db.dbapis import apis
from app.models.models import schemas
import asyncio

async def run():
    api = apis()
    res = await api.db_get(model=schemas.USERS, name="user", return_selected={"user_id", "email"}, asdict=True)
    print(res)

asyncio.run(run())
