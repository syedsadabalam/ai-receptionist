import sqlite3

def migrate():
    try:
        conn = sqlite3.connect('sql_app.db')
        cursor = conn.cursor()
        
        # Check if column exists
        cursor.execute("PRAGMA table_info(call_logs)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'recording_url' not in columns:
            cursor.execute("ALTER TABLE call_logs ADD COLUMN recording_url TEXT")
            print("Successfully added recording_url to call_logs table.")
        
        # Create users table if not exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cursor.fetchone():
            cursor.execute("""
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY,
                    username TEXT UNIQUE,
                    email TEXT UNIQUE,
                    hashed_password TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    is_admin BOOLEAN DEFAULT 1,
                    clinic_id INTEGER,
                    FOREIGN KEY(clinic_id) REFERENCES clinics(id)
                )
            """)
            print("Successfully created users table.")
        
        # Check clinics table
        cursor.execute("PRAGMA table_info(clinics)")
        clinic_cols = [column[1] for column in cursor.fetchall()]
        if 'timezone' not in clinic_cols:
            cursor.execute("ALTER TABLE clinics ADD COLUMN timezone TEXT DEFAULT 'UTC'")
            # Set default for existing clinic
            cursor.execute("UPDATE clinics SET timezone = 'Asia/Kolkata'")
            print("Successfully added timezone to clinics table.")
            
        if 'custom_prompt' not in clinic_cols:
            cursor.execute("ALTER TABLE clinics ADD COLUMN custom_prompt TEXT")
            print("Successfully added custom_prompt to clinics table.")

        if 'open_time' not in clinic_cols:
            cursor.execute("ALTER TABLE clinics ADD COLUMN open_time TEXT DEFAULT '09:00'")
            cursor.execute("ALTER TABLE clinics ADD COLUMN close_time TEXT DEFAULT '17:00'")
            cursor.execute("ALTER TABLE clinics ADD COLUMN emergency_phone TEXT")
            cursor.execute("ALTER TABLE clinics ADD COLUMN website_url TEXT")
            cursor.execute("ALTER TABLE clinics ADD COLUMN map_link TEXT")
            print("Successfully added production fields to clinics table.")

        # Check appointments table
        cursor.execute("PRAGMA table_info(appointments)")
        appt_cols = [column[1] for column in cursor.fetchall()]
        if 'created_at' not in appt_cols:
            cursor.execute("ALTER TABLE appointments ADD COLUMN created_at DATETIME")
            cursor.execute("UPDATE appointments SET created_at = '2026-01-01 00:00:00' WHERE created_at IS NULL")
            print("Successfully added created_at to appointments table.")

        # Check providers table
        cursor.execute("PRAGMA table_info(providers)")
        provider_cols = [column[1] for column in cursor.fetchall()]
        if 'open_time' not in provider_cols:
            cursor.execute("ALTER TABLE providers ADD COLUMN open_time TEXT")
            cursor.execute("ALTER TABLE providers ADD COLUMN close_time TEXT")
            print("Successfully added shift hours to providers table.")
            
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Migration error: {e}")

if __name__ == "__main__":
    migrate()
