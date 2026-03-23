from pathlib import Path
import sys
import os
import re
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

def get_base_dir():
    if getattr(sys,'frozen', False):
        return Path(sys.executable).parent.parent
    load_dotenv()
    
    return Path(__file__).resolve().parent.parent

class AppEnvironmentSetup:
    BASE_DIR = get_base_dir()
    # PARTITION = os.getenv('PARTITION')
    # AIR_USERS = os.getenv('USERS_ROOT_PATH')
    # ADMIN = os.getenv('BACKEND_ADMIN_DIR')
    # USER_BASE_DIRS = Path(PARTITION) / Path (AIR_USERS)
    # ADMIN_USER_DIR = Path(PARTITION) /Path (ADMIN)
    DB_NAME = os.getenv("JOBSEEKER_DB_NAME")
    DB_PATH = BASE_DIR / DB_NAME
    APP_EMAIL_ID = os.getenv('APP_EMAIL_ID')
    DB_NAME = os.getenv("DB_NAME")
    DB_USER = os.getenv("DB_USER")
    DB_PASS = os.getenv("DB_PASS")
    MASTER_EMAIL = os.getenv("MASTER_EMAIL")
    APP_ID = int(os.getenv("APP_ID"))
    APP_HASH = os.getenv("APP_HASH")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_CONN_STR = f"postgresql+asyncpg://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    DB_EVENT_LISTENER_CONN_STRING = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    SECRET_KEY = os.getenv("SECRET_KEY")
    ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET")
    ALGORITHM = os.getenv("ALGORITHM")
    ACCESS_TOKEN_EXPIRY = os.getenv("ACCESS_TOKEN_EXPIRY")
    MESSAGE_BROKER_SERVER = os.getenv("MESSAGE_BROKER_SERVER")
    MQ_USER = os.getenv("MQ_USERNAME")
    MQ_PASS = os.getenv("MQ_PASSWORD")
    MESSAGE_BROKER_CONN_STRING = F"amqp://{MQ_USER}:{MQ_PASS}@{MESSAGE_BROKER_SERVER}"
    MESSAGE_BROKER_FORWARDER_CHANNEL = os.getenv("MESSAGE_BROKER_FORWARDER_CHANNEL")
    TELEGRAM_PUBLISH_Q = os.getenv("TELEGRAM_FWD_EVENT_PUBLISH")
    TELEGRAM_CONSUME_Q = os.getenv("TELEGRAM_FWD_EVENT_CONSUME")
    SPINNER_TELEGRAM_PUBLISH_Q = os.getenv("SPINNER_TELEGRAM_PUBLISH_Q")
    SPINNER_TELEGRAM_CONSUME_Q = os.getenv("SPINNER_TELEGRAM_CONSUME_Q")
    WORKERS_TELEGRAM_PUBLISH_Q = os.getenv("WORKERS_TELEGRAM_PUBLISH_Q")
    WORKERS_TELEGRAM_CONSUME_Q = os.getenv("WORKERS_TELEGRAM_CONSUME_Q")
    TELEGRAM_SESSION_DIRS = os.getenv("TELEGRAM_SESSION_DIRS")
    TELEGRAM_MEDIA_DIRS = os.getenv("TELEGRAM_MEDIA_DIRS")
    GOOGLE_OAUTH_CLIENT_SECRET = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")
    GOOGLE_OAUTH_CLIENT_ID = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
    GOOGLE_OAUTH_CALLBACK_URI = os.getenv("GOOGLE_OAUTH_CALLBACK_URI")
    SESSION_SECRET_KEY = os.getenv('SESSION_SECRET_KEY')
    GOOGLE_OAUTH_EMAIL_CLIENT_ID = os.getenv('GOOGLE_OAUTH_EMAIL_CLIENT_ID')
    GOOGLE_OAUTH_EMAIL_CLIENT_SECRET = os.getenv('GOOGLE_OAUTH_EMAIL_CLIENT_SECRET')
    GOOGLE_OAUTH_EMAIL_CALLBACK_URI = os.getenv("GOOGLE_OAUTH_EMAIL_CALLBACK_URI")
    FRONTEND_URI = os.getenv("FRONTEND_URI")
    NOWPAYMENTS_API_KEY = os.getenv("NOWPAYMENTS_API_KEY")
    NOWPAYMENTS_IPN_SECRET = os.getenv("NOWPAYMENTS_IPN_SECRET")
    BACKEND_DOMAIN_URI = os.getenv("BACKEND_DOMAIN_URI")
    TON_PAYOUT_ADDRESS = os.getenv("TON_PAYOUT_ADDRESS")
    NOWPAYMENTS_SUCCESS_REDIRECT = os.getenv("NOWPAYMENTS_SUCCESS_REDIRECT")
    NOWPAYMENTS_CANCELLED_REDIRECT = os.getenv("NOWPAYMENTS_CANCELLED_REDIRECT")
    PLAN_VALIDATOR_WATCHDOG = int(os.getenv('PLAN_VALIDATOR_WATCHDOG'))
    ORDER_EXPIRY_THRESHOLD_MINUTES = int(os.getenv('ORDER_EXPIRY_THRESHOLD_MINUTES'))
    ORDER_EXPIRY_WATCHDOG_INTERVAL_MINUTES = int(os.getenv('ORDER_EXPIRY_WATCHDOG_INTERVAL_MINUTES'))
    JOB_API_ENCRYPTION_SECRET = os.getenv("JOB_API_ENCRYPTION_SECRET")
    QWEN_API_URI = os.getenv("QWEN_2_5B_API")
    # BASE_CALLBACK_URL**
    ENV = os.getenv('ENV')
    BACKEND_MANIFEST = BASE_DIR / "backend_manifests"
    # TELEGRAM_MEDIA = BASE_DIR / "storage" / "Telegram"
    # TELEGRAM_SESSION_NAME = "user_session"
    # TELEGRAM_SESSIONS = BASE_DIR / "storage" / "sessions"
    # INSTAGRAM_MEDIA = BASE_DIR / "storage" / "Instagram"
    ALLOWED_ORIGINS = [
    "http://localhost:5173",  # React/Next.js dev server
    "http://127.0.0.1:5173",
    "http://localhost:5176",
    "http://127.0.0.1:5176",
    "http://127.0.0.1:8080",
    "*"  # Local HTML file testing
    # "https://yourfrontend.com",  # Deployed frontend domain
    ]
    # Openai
    # REDDIT_MEDIA = BASE_DIR / "storage" / "Reddit"

    AI_MESSAGESEPARATOR = "<ai>"

    def __init__(self):
        self.attrs = [getattr(self,x) for x in dir(self) if not x.startswith('__')]
        self.index = 0
    
    def __iter__(self):
        return self
    
    def __next__(self):
        if self.index == len(self.attrs):
            raise StopIteration
        _next = self.attrs[self.index]
        self.index+=1
        return _next
    
for env in AppEnvironmentSetup():
    logger.info(f"Verifying environment settings for {env}")
    if isinstance(env,Path):
        logger.info(f"Creating environment settings for {env}")
        os.makedirs(env,exist_ok=True)