from app.core.protection import Protected_get_user_details
from fastapi import Depends, HTTPException, Request, APIRouter
from app.core.commonExceptions import exceptionHandler
from app.services.elevated import (
    delete_record,
    update_record, 
    insert_record, 
    get_this_table,
    all_tables
)
from fastapi.responses import FileResponse


router = APIRouter()

# Add route to serve admin interface at the root of the prefix
@router.get("/xyz")
async def admin_interface():
    """Serve the admin interface HTML file"""
    return FileResponse("app/static/admin/index.html")

@router.get("/xyz/login")
async def admin_login():
    """Serve the admin login page"""
    return FileResponse("app/static/admin/index.html")

@router.get("/xyz/dashboard")
async def admin_dashboard():
    """Serve the admin dashboard HTML file"""
    return FileResponse("app/static/admin/dashboard.html")

@router.get("/xyz/js/{filename}")
async def serve_js(filename: str):
    """Serve JavaScript files"""
    return FileResponse(f"app/static/admin/js/{filename}")

@router.get("/xyz/css/{filename}")
async def serve_css(filename: str):
    """Serve CSS files"""
    return FileResponse(f"app/static/admin/css/{filename}")

@router.get("/xyz/assets/{filename}")
async def serve_css(filename: str):
    """Serve CSS files"""
    return FileResponse(f"app/static/admin/assets/{filename}")

@router.get("/xyz/templates/{filename}")
async def serve_templates(filename: str):
    """Serve template files"""
    try:
        return FileResponse(f"app/static/admin/templates/{filename}")
    except Exception as e:
        print(f"Error serving template {filename}: {e}")
        raise HTTPException(status_code=404, detail=f"Template {filename} not found")

@router.get("/all-tables",tags=['admin'])
@exceptionHandler
async def get_all_defined_tables(current_user: dict = Depends(Protected_get_user_details)):
    if not current_user.get('user_type') == 'admin':
        raise HTTPException(status_code=400,detail={"message":"Not Authorized", "errors": None})
    all_tables_present = await all_tables()
    if all_tables_present:
        return all_tables_present
    else:
        raise HTTPException(status_code=405,detail={'errors':"List Tables Failed!", "message":"Failed to list tables."})


@router.get("/get-data-from-table/{table_name}",tags=['admin'])
@exceptionHandler
async def get_data_from_table(table_name:str, current_user: dict = Depends(Protected_get_user_details)):
    if not current_user.get('user_type') == 'admin':
        raise HTTPException(status_code=400,detail={"message":"Not Authorized", "errors": None})
    all_data = await get_this_table(table_schema=table_name)
    if all_data:
        return all_data
    else:
        raise HTTPException(status_code=405,detail={'errors':"Fetching Failed!", "message":"Could not fetch data from this table."})


@router.post("/update-data-in-table",tags=['admin'])
@exceptionHandler
async def update_data_in_table(
    primary_id:str,
    primary_field:str,
    table_name:str, 
    values:dict,
    current_user: dict = Depends(Protected_get_user_details), 
):
    if not current_user.get('user_type') == 'admin':
        raise HTTPException(status_code=400,detail={"message":"Not Authorized", "errors": None})
    all_data = await update_record(primary_id, primary_field, table_name, **values)
    if all_data:
        return all_data
    else:
        raise HTTPException(status_code=405,detail={'errors':"Update Failed!", "message":"Could not update the record."})


@router.post("/insert-data-in-table",tags=['admin'])
@exceptionHandler
async def insert_data_to_table(
    primary_field:str,
    table_name:str, 
    values:dict,
    current_user: dict = Depends(Protected_get_user_details), 
):
    if not current_user.get('user_type') == 'admin':
        raise HTTPException(status_code=400,detail={"message":"Not Authorized", "errors": None})
    all_data = await insert_record(primary_field, table_name, **values)
    if all_data:
        return all_data
    else:
        raise HTTPException(status_code=405,detail={'errors':"Insertion Failed!", "message":"Could not insert the data into the table, please try again."})

@router.post("/delete-data-from-table",tags=['admin'])
@exceptionHandler
async def delete_data_from_table(
    primary_id:str,
    primary_field:str,
    table_name:str, 
    current_user: dict = Depends(Protected_get_user_details)
):
    if not current_user.get('user_type') == 'admin':
        raise HTTPException(status_code=400,detail={"message":"Not Authorized", "errors": None})
    all_data = await delete_record(primary_id, primary_field, table_schema=table_name)
    if all_data:
        return all_data
    else:
        raise HTTPException(status_code=405,detail={'errors':"Deletion Failed!", "message":"Could not delete the record."})