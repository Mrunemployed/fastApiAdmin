from fastapi import FastAPI
from app.api.auth import router as auth_router
# from app.api.endpoints.info import router as info_router
# from app.api.endpoints.google_auth import router as goolge_oauth_router
# from app.api.endpoints.NowPayments import router as now_payments_router
# from app.api.user_accounts import router as order_history_router
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import AppEnvironmentSetup as cf
from starlette.middleware.sessions import SessionMiddleware
from contextlib import asynccontextmanager
# from app.core.redis_client import redis_client
from app.core.startup import Rbac, APIS, create_default_admin
import asyncio
from app.core.config import AppEnvironmentSetup as appset
from app.api.starter_admin import router as starter_admin_router
from fastapi.staticfiles import StaticFiles
from app.db.create_db import createDB

@asynccontextmanager
async def lifespan(app:FastAPI):
    """
    Startup function that gets called at application startup

        - This initiallizes The RabbitMQ exchange for refreshing the micro service memory
        - Starts up the *MasterValidatorAccount* the telegram account that is used for validations
        - (Rbac) used for initializing the role based account types.
        - (listen_for_rbac_changes) connected to a DB trigger - triggers a refresh event when the rbac table is updated in the DB

    """
    APIS
    dbCreator = createDB()
    await dbCreator.make_tables_from_schema()
    await Rbac.create_default_role()
    await Rbac.refresh()
    await Rbac.refresh_roles()
    await create_default_admin()
    yield


app = FastAPI(
    title="My FastAPI App",
    debug=True,
    description="API Documentation for my application",
    version="1.0.0",
    openapi_tags=[
        {"name": "Auth", "description": "Authentication related endpoints"},
        {"name": "admin", "description": "Administrative apis"},

    ],
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=cf.ALLOWED_ORIGINS,  # Allows specific frontend domains
    allow_credentials=True,  # Allow cookies and Authorization headers
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Add SESSION Middleware
app.add_middleware(
    SessionMiddleware,
    secret_key=appset.SESSION_SECRET_KEY,
    same_site="lax",
    https_only=False if appset.ENV == 'dev' else True,
)

app.debug = True
import os

# Make sure this path is correct relative to your main.py
static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")
app.include_router(auth_router, prefix="/auth")
app.include_router(starter_admin_router,prefix="/starter_admin")
