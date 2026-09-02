import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Mock environment variables before importing app
import os
os.environ["ENVIRONMENT"] = "testing"
os.environ["DATABASE_URL"] = "postgresql+pg8000://postgres:root@localhost:5432/test_db"
os.environ["SECRET_KEY"] = "test-secret"
os.environ["PUBLIC_URL"] = "http://testserver"

from app.database.session import Base, get_db
from app.main import app

# Setup test DB engine
engine = create_engine(os.environ["DATABASE_URL"])
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """
    Creates the database schema once per test session.
    """
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    """
    Yields a SQLAlchemy session. Wraps the test in a transaction and rolls back
    at the end so each test starts with a clean slate.
    """
    connection = engine.connect()
    transaction = connection.begin()
    
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session):
    """
    Returns a FastAPI TestClient that uses the test database session.
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
