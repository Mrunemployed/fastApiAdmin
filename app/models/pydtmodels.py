from pydantic import BaseModel, EmailStr, Field, create_model, AnyUrl, model_validator
from typing import List, Optional, Any, Dict
from enum import Enum
from app.models.models import schemas
from app.db.dbapis import apis
from datetime import datetime, date
from typing import Union

async def get_user_types_enum():
    from app.core.startup import Rbac
    UserTypeDynamic = Enum('UserTypeDynamic', {role: role for role in Rbac.Pydroles})
    return UserTypeDynamic

async def dynamic_signup_model():
    userTypes = await get_user_types_enum()
    userSignup = create_model(
        'UserSignup',
        name = (str,...),
        email=(EmailStr,...),
        password=(str,...)   
    )
    return userSignup

class admins(BaseModel):
    name: str
    email: str
    secret_key: str
    password: str
    user_type: str="admin"

class userLogin(BaseModel):
    email:EmailStr
    password:str

class OpenAICredentials(BaseModel):
    api_key:str
    api_token:str

class ExperienceRange(BaseModel):
    min:int=-1
    max:int=-1

class salary(BaseModel):
    min:int=-1
    max:int=-1
    currency:str="INR"
    period:str="year"

class JobData(BaseModel):
    experience_years: ExperienceRange
    posted_at: datetime
    salary_annual: salary

class YearRange(BaseModel):
    from_year: int = -1
    to_year: int = -1

class DateRange(BaseModel):
    from_date: datetime = Field(default_factory=datetime.utcnow)
    to_date: datetime = Field(default_factory=datetime.utcnow)


class Settings(BaseModel):
    """User job search preferences and constraints used to tailor recommendations and matching logic."""
    selected_profile_id: Optional[str] = Field(
        default="",
        description="Profile identifier selected as the active resume/profile for applications."
    )
    preferred_locations: Optional[list[str]] = Field(
        default_factory=list,
        description="Target locations the user is willing to work in (city, region, or country names)."
    )
    preferred_salary_range: Optional[salary] = Field(
        default_factory=salary,
        description="Desired compensation range with currency and period (e.g., INR per year)."
    )
    preferreed_work_mode: Optional[str] = Field(
        default="ANY",
        description="Preferred work mode such as REMOTE, ONSITE, HYBRID, or ANY."
    )
    preferred_experience: Optional[ExperienceRange] = Field(
        default_factory=ExperienceRange,
        description="Target experience range in years for matching suitable roles."
    )
    notice_period_days: Optional[int] = Field(
        default=-1,
        description="Total notice period in days; use -1 if not applicable or unknown."
    )
    currently_serving_notice: Optional[bool] = Field(
        default=False,
        description="True if the user is currently serving their notice period."
    )
    notice_period_left: Optional[int] = Field(
        default=-1,
        description="Remaining notice period in days; use -1 if unknown."
    )
    notice_period_negotiable: Optional[bool] = Field(
        default=False,
        description="True if the user can reduce or negotiate the notice period."
    )
    apply_regardless_of_match: Optional[bool] = Field(
        default=False,
        description="If true, apply even when role preferences are not fully met."
    )
# import json

# print(json.dumps(UserProfile.model_json_schema(), indent=4))