# backend/create_admin.py

import os
import getpass  # A Python library to securely read passwords from the terminal
import psycopg
from dotenv import load_dotenv

# We must import the exact same hashing function from our app to ensure compatibility
from app.security import get_password_hash

# Load environment variables (like DATABASE_URL) from your .env file
load_dotenv()

def create_initial_admin():
    """
    An interactive script to create the first admin user in the database.
    This user will have the 'admin' role and can manage other staff.
    """
    print("--- Create Initial Admin User ---")
    
    # --- CONFIGURE YOUR ADMIN DETAILS HERE ---
    # You can change these default values if you want.
    ADMIN_EMAIL = "natitake422@gmail.com"
    ADMIN_ROLE = "admin"
    # -----------------------------------------

    try:
        # Use getpass to securely ask for the password without showing it on screen
        password = getpass.getpass(f"Enter a password for the admin ({ADMIN_EMAIL}): ")
        if not password or len(password) < 8:
            print("❌ Error: Password must be at least 8 characters long.")
            return

        # Hash the password using our application's function
        hashed_password = get_password_hash(password)
        print("🔑 Password successfully hashed.")

        # Get the database connection string from your environment variables
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            print("❌ CRITICAL ERROR: DATABASE_URL is not set in your .env file.")
            return

        # Connect to the database and insert the new user
        with psycopg.connect(db_url) as conn:
            with conn.cursor() as cur:
                # First, check if the user already exists to avoid errors
                cur.execute("SELECT id FROM admins WHERE username = %s", (ADMIN_EMAIL,))
                if cur.fetchone():
                    print(f"⚠️  Warning: An admin with the email '{ADMIN_EMAIL}' already exists. No action taken.")
                    return

                # If the user doesn't exist, insert them
                print(f"Inserting new admin user into the database...")
                cur.execute(
                    """
                    INSERT INTO admins (username, password_hash, role, name, status)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (ADMIN_EMAIL, hashed_password, ADMIN_ROLE.capitalize(), ADMIN_ROLE, 'active')
                )
                conn.commit()
                print(f"\n✅ Success! Admin user '{ADMIN_EMAIL}' was created.")
                print("You can now start the server and log in with these credentials.")

    except psycopg.Error as e:
        print(f"\n❌ A database error occurred: {e}")
    except Exception as e:
        print(f"\n❌ An unexpected error occurred: {e}")


if __name__ == "__main__":
    create_initial_admin()