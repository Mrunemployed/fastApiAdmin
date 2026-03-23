
from functools import wraps
import functools
import inspect
from typing import Callable, Union, Coroutine, TypeVar, Optional, Any, Awaitable, ParamSpec, overload
from asyncio import Future
import asyncio
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import logging

logger = logging.getLogger(__name__)


T = TypeVar("T")
P = ParamSpec("P")

_EXECUTOR = ThreadPoolExecutor(max_workers=10)

class AsyncWrapperException(Exception):
    def __init__(self, *, message:str):
        super().__init__()
        self.message = message

@overload
def make_async(func: Callable[P, T]) -> Callable[P, T]: ...

@overload
def make_async(func: Callable[P, Awaitable[T]]) -> Callable[P, Awaitable[T]]: ...

def make_async(func:Callable[..., T]) -> Callable[..., Any]:
    wraps(func)
    async def wrapper(*args, **kwargs):
        if not inspect.iscoroutinefunction(func):
            return func(*args, **kwargs)
        return await asyncio.to_thread(func, *args,**kwargs)
    return wrapper


@overload
def make_async_pool(func: Callable[P, T]) -> Callable[P, T]: ...

@overload
def make_async_pool(func: Callable[P, Awaitable[T]]) -> Callable[P, Awaitable[T]]: ...

def make_async_pool(func:Callable[...,T]) -> Callable[..., Any]:
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            loop = asyncio.get_running_loop()
        except:
            return func(*args, **kwargs)
        return await loop.run_in_executor(_EXECUTOR, functools.partial(func, *args, **kwargs))
    return wrapper
        
class AsyncPool:
    """
    A decorator object that allows for executing sync functions asynchronously from within an async context.
    This should be used decorate sync functions.
    Parameters:
    Args:
        max_workers(int): Max number of thread pool workers
        executor (Optional[ThreadPoolExecutor]): A ThreadPoolExecutor object - optional, if provided the decorator will use this or manage its own pool internally.
    """

    def __init__(
        self,
        max_workers: int,
        *,
        thread_pool:bool=False,
        executor: Optional[Union[ThreadPoolExecutor, ProcessPoolExecutor]] = None,
        create_event_loop:bool = False
    ):
        self.executor = self._init_executor(executor, thread_pool, max_workers)
        self._has_executor = executor is None
        self.create_event_loop = create_event_loop

    def _init_executor(self, executor:Optional[Union[ThreadPoolExecutor, ProcessPoolExecutor]], thread_pool:bool, max_workers:int):
        if executor:
            if isinstance(executor, ThreadPoolExecutor):
                self.pool_type = "Thread Pool"
                return executor
            elif isinstance(executor, ProcessPoolExecutor):
                self.pool_type = "Process Pool"
                return executor
            else:
                self.pool_type = "Unknown"
                raise RuntimeError("Invalid executor selected!")
        if thread_pool:
            return ThreadPoolExecutor(max_workers=max_workers)
        else:
            return ProcessPoolExecutor(max_workers=min(2,max_workers))
        

    @overload
    def __call__(self, func:Callable[P,T]) -> Callable[P, Awaitable[T]]: ...


    def __call__(self, func:Callable[P,T]) -> Callable[..., Any]:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if inspect.iscoroutinefunction(func):
                return await func(*args,**kwargs)
            try:
                loop = asyncio.get_running_loop()
            except:
                logger.warning(f"[{self.__class__.__name__}] No running event loop was found, the decorated functions will be executed from within a sync context.")
                return functools.partial(func, *args, **kwargs)
            
            return await loop.run_in_executor(self.executor, functools.partial(func, *args, **kwargs))

        return wrapper
    
    def shutdown(self):
        if self._has_executor:
            self.executor.shutdown(wait=True,cancel_futures=True)


asyncify = AsyncPool(max_workers=10, thread_pool=True)
pasyncify = AsyncPool(max_workers=10, thread_pool=True)

if __name__ =="__main__":

    import time
    @asyncify
    def do_task(secs:float):
        print(f"sleeping for {secs} seconds..")
        time.sleep(secs)

    async def do_another_task(secs:float):
        print(f"sleeping asynchronously for {secs} seconds..")
        await asyncio.sleep(secs)

        
    async def run_tasks():
        for i in range(10):
            # do_task(i)
            # await do_another_task(i)
            tasks = [do_task(i), do_another_task(i)]
            await asyncio.gather(*tasks)

    asyncio.run(run_tasks())
