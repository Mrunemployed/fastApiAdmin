from sqlalchemy import Column,Integer,String,TIMESTAMP,BOOLEAN,DateTime, ForeignKey, Enum, func, JSON, BigInteger, Float, Text, BLOB
import sqlalchemy
from sqlalchemy.ext.declarative import declarative_base
import uuid
from datetime import datetime

print(sqlalchemy.__version__)

Base = declarative_base()

# user_types_enum = Enum('admin', 'trial', 'premium', name="user_types", create_type=True)
# platforms_enum = Enum('telegram', 'instagram', 'youtube', 'twitter', name="platforms", create_type=True)

class tables:
    USERS = "users"
    RBAC = 'rbac'
    CONFIGURED_BOTS = 'configured_bots'
    ORDER_HISTORY = 'order_history'
    GOOGLE_OAUTH_EMAIL_REFRESH_TOKENS = 'googleoauth_email_refresh_tokens'
    USER_QUERIES_TABLE = 'user_queries_contact_us'
    NOTIFIER_GROUPS = 'notifier_groups'
    JOBDATA = 'job_data'
    RESUMEDATA = 'resume_data'
    SETTINGS = "settings"
    RESUMECACHE = "resumecache"
    SOME = "someTable"

def CreateUUID():
    """
    Generate a unique UUID for user identification.

    Returns:
        str: A string representation of the generated UUID.
    """
    return str(uuid.uuid4().hex)

def get_timestamp():

    """
    Generate a timestamp for when the record was updated at

    Returns:
        timestamp (datetime): the timestamp in dd-mm-yyyy format
    
    """
    datetime.timetz()

class RBACUsers(Base):
    __tablename__ = tables.RBAC

    id = Column(String, primary_key=True, default=CreateUUID)
    user_type = Column(String, nullable=False)
    access = Column(String,nullable=False)
    active = Column(BOOLEAN, nullable=True, default=False)

class users(Base):
    __tablename__ = tables.USERS

    user_id = Column(String, nullable=False, primary_key=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    passw = Column(String(255), nullable=False)
    user_type = Column(String, nullable=False)
    role_id = Column(String,nullable=False)
    user_dir = Column(String, nullable=False)

class JobData(Base):
    __tablename__ = tables.JOBDATA
    id = Column(String, nullable=False, primary_key=True, default=CreateUUID)
    user_id = Column(String, ForeignKey(users.user_id), nullable=False)
    portal = Column(String, nullable=False)
    portal_job_uid = Column(String, nullable=True)
    job_url = Column(String, nullable=False)
    title = Column(String, nullable=True)
    description = Column(String, nullable=True)
    skills = Column(String, nullable=True)
    experience = Column(JSON, nullable=True)
    location = Column(String, nullable=True)
    availablity = Column(String, nullable=True)
    salary = Column(JSON, nullable=True)
    job_post_date = Column(String, nullable=True)
    company = Column(String, nullable=True)
    mode_of_work = Column(String, nullable=True)


# class profile(Base):

#     profile_id = Column(String, default=CreateUUID, primary_key=True)
#     user_id = Column(String, ForeignKey(users.user_id), nullable=False)
#     profile_summary = Column(String, nullable=True)
#     description = Column(String, nullable=False)
#     skills = Column(String, nullable=False)
#     total_experience = Column(Float, nullable=False)
#     languages = Column(String, nullable=False)
#     education = Column(JSON, nullable=True)
#     projects = Column(JSON, nullable=True)
#     email = Column(String, nullable=True)
#     phone = Column(String, nullable=True)



class ResumeData(Base):
    __tablename__ = tables.RESUMEDATA

    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String, nullable=False)
    user_id = Column(String, ForeignKey(users.user_id), nullable=False)
    profile = Column(String, nullable=False)
    total_experience = Column(String(20), nullable=False)
    # languages = Column(JSON, nullable=True)
    current_role = Column(String(100), nullable=False)
    skills = Column(JSON, nullable=False)
    professional_experience = Column(JSON, nullable=False)
    projects = Column(JSON, nullable=True)
    education = Column(JSON, nullable=False)
    certifications = Column(Text, nullable=True)
    email = Column(String(120), nullable=False)
    phone = Column(String(20), nullable=True)
    socials = Column(JSON, nullable=True)

class Settings(Base):
    __tablename__ = tables.SETTINGS
    settings_id = Column(Integer, nullable=False, default=1, primary_key=True)
    user_id = Column(String, ForeignKey(users.user_id), nullable=False)
    selected_profile_id = Column(String, ForeignKey(ResumeData.id), nullable=True)
    settings = Column(JSON,nullable=True)
    
class ChunkedCacheResume(Base):
    __tablename__ = tables.RESUMECACHE
    chunk_id = Column(String, nullable=False, primary_key=True, default=CreateUUID)
    resume_id = Column(String, ForeignKey(ResumeData.id), nullable=False)
    chunk_type = Column(String, nullable=False)
    chunked_data = Column(JSON,nullable=False)

class something(Base):
    __tablename__ = tables.SOME
    chunk_id = Column(String, nullable=False, primary_key=True, default=CreateUUID)
    resume_id = Column(String, ForeignKey(ResumeData.id), nullable=False)
    chunk_type = Column(String, nullable=False)
    chunked_data = Column(JSON,nullable=False)

class schemas:
    USERS = users
    RBAC = RBACUsers
    JOBDATA = JobData
    RESUMEDATA = ResumeData
    SETTINGS = Settings
    RESUMECACHE = ChunkedCacheResume
    SOME = something

    def __init__(self):
        self.attrs = [x for x in dir(self) if not x.startswith('__')]
        self.index = 0
    
    def __iter__(self):
        return self
    
    def __next__(self):
        if self.index == len(self.attrs):
            raise StopIteration
        _next = self.attrs[self.index]
        self.index+=1
        return _next