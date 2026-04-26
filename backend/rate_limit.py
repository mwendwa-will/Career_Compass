"""Shared slowapi limiter instance.

Lives in its own module so routers can import it without creating an
``import main`` cycle.
"""
from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=[])
