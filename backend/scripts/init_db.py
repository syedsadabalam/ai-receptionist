from app.database.session import engine
from app.database.models import Base

def init_db():
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")

if __name__ == "__main__":
    init_db()
