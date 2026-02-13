import logging
import sys
from ..config import settings

def setup_logging():
    """
    Standardizes logging across the SaaS platform.
    Uses structured-like formatting for easier parsing in production.
    """
    log_format = (
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    )
    
    # Configure root logger
    logging.basicConfig(
        level=logging.INFO,
        format=log_format,
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # Create specific loggers for components
    app_logger = logging.getLogger("app")
    app_logger.setLevel(logging.INFO)
    
    db_logger = logging.getLogger("db")
    db_logger.setLevel(logging.INFO)
    
    auth_logger = logging.getLogger("auth")
    auth_logger.setLevel(logging.INFO)

    return app_logger, db_logger, auth_logger

logger = logging.getLogger("app")
db_logger = logging.getLogger("db")
auth_logger = logging.getLogger("auth")
