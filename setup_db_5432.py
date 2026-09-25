import subprocess
import os

env = os.environ.copy()
env['PGPASSWORD'] = '123'
bin_dir = r'C:\Program Files\PostgreSQL\17\bin'

psql = os.path.join(bin_dir, 'psql.exe')
createdb = os.path.join(bin_dir, 'createdb.exe')

# Check if trac_nghiem exists
check_cmd = [psql, '-U', 'postgres', '-p', '5432', '-h', '127.0.0.1', '-d', 'postgres', '-tAc', "SELECT 1 FROM pg_database WHERE datname='trac_nghiem'"]
r = subprocess.run(check_cmd, env=env, capture_output=True, text=True)

if r.stdout.strip() != '1':
    print('Creating database trac_nghiem on port 5432...')
    r2 = subprocess.run([createdb, '-U', 'postgres', '-p', '5432', '-h', '127.0.0.1', 'trac_nghiem'], env=env, capture_output=True, text=True)
    print('Result:', r2.returncode, r2.stdout, r2.stderr)
else:
    print('Database trac_nghiem already exists on port 5432.')

print('Done!')
