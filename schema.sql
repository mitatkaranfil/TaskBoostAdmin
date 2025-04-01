CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id TEXT NOT NULL UNIQUE,
  username TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT,
  photo_url TEXT,
  level INTEGER DEFAULT 1,
  points INTEGER DEFAULT 0,
  mining_speed INTEGER DEFAULT 10,
  last_mining_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  referral_code TEXT NOT NULL UNIQUE,
  referred_by INTEGER REFERENCES users(id),
  join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_tasks_count INTEGER DEFAULT 0,
  boost_usage_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  points INTEGER NOT NULL,
  required_amount INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  telegram_action TEXT,
  telegram_target TEXT
);

CREATE TABLE IF NOT EXISTS user_tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, task_id)
);

CREATE TABLE IF NOT EXISTS boost_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  multiplier INTEGER NOT NULL,
  duration_hours INTEGER NOT NULL,
  price INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  icon_name TEXT DEFAULT 'rocket',
  color_class TEXT DEFAULT 'blue',
  is_popular BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS user_boosts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  boost_type_id INTEGER NOT NULL REFERENCES boost_types(id),
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER NOT NULL REFERENCES users(id),
  referred_id INTEGER NOT NULL REFERENCES users(id),
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
); 