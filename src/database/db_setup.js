import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'

const dbpath = './src/database/sentire_system.db'
let db

if (!fs.existsSync(dbpath)) {
  db = new Database(dbpath, { verbose: console.log })
db.exec(`
    CREATE TABLE Users (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT,
      Email TEXT NOT NULL UNIQUE,
      Age INTEGER,
      Occupation TEXT,
      Password_hash TEXT NOT NULL,
      Role TEXT CHECK(role IN ('user','admin', 'rootAdmin')) DEFAULT 'user',
      Created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      Is_deleted INTEGER NOT NULL CHECK(Is_deleted IN (0,1)) DEFAULT 0,
      Date_deleted DATETIME DEFAULT NULL,
      CHECK (LENGTH(Email) <= 320),
      CHECK (Email LIKE '%@%.%')
)
  `);

db.exec(`
  CREATE TABLE Videos (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    User_id INTEGER NOT NULL,
    Name TEXT,
    File_path TEXT,
    Processed_path TEXT,
    Location TEXT,
    Duration INTEGER,
    Status TEXT DEFAULT 'pending',
    Time_start TIMESTAMP,
    Time_end TIMESTAMP,
    FOREIGN KEY (User_id) REFERENCES Users(Id)
  )
`);

  db.exec(`
    CREATE TABLE Logs (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      User_id INTEGER,
      Action_type TEXT,
      Video_id INTEGER,
      Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (User_id) REFERENCES Users(Id),
      FOREIGN KEY (Video_id) REFERENCES Videos(Id)
    )
  `);

  db.exec(`
    CREATE TABLE Events (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      Video_id INTEGER,
      Sequence_number INTEGER,
      Severity TEXT,
      Description TEXT,
      Event_start TIMESTAMP,
      Event_end TIMESTAMP,
      Duration INTEGER,
      FOREIGN KEY (Video_id) REFERENCES Videos(Id)
    )
  `);

    db.exec(`
    CREATE TABLE Reports (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      Video_id INTEGER NOT NULL UNIQUE,
      Narrative TEXT NOT NULL,
      Stats_json TEXT NOT NULL,
      Generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (Video_id) REFERENCES Videos(Id)
    )
  `);


} else {
  db = new Database(dbpath, { verbose: console.log })
}

export default db

