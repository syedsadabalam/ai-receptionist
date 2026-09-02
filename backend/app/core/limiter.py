from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared rate limiter instance — imported by main.py and endpoint routers
limiter = Limiter(key_func=get_remote_address)
