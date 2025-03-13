from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

# Retrieve the DATABASE_URL from the environment variables
DATABASE_URL = os.getenv("DATABASE_URL")

# Check if DATABASE_URL is loaded correctly
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in .env file")

# Create the database engine
engine = create_engine(DATABASE_URL)

# Create a session local factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
