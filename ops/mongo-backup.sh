#!/bin/sh
# MongoDB logical backup sidecar (docker-compose `backup` service).
#
# Usage (inside the container, mounted at /usr/local/bin/mongo-backup.sh):
#   mongo-backup.sh --loop                     # daemon: dump every BACKUP_INTERVAL_MINUTES
#   mongo-backup.sh --once                     # one dump (used by `make backup`), exits
#   mongo-backup.sh --restore /backups/<dir>   # mongorestore --drop from a dump directory
#
# Environment:
#   MONGO_URI               connection string INCLUDING the database name and
#                           authSource (same one the api service uses)
#   BACKUP_INTERVAL_MINUTES dump cadence in the loop (default: 60)
#   BACKUP_RETENTION_DAYS   delete dumps older than this (default: 14)
#
# The named `backups` volume holds one directory per dump
# (<db>-<UTC-timestamp>); restore with:
#   docker compose stop api
#   docker compose run --rm --entrypoint sh backup -c '/usr/local/bin/mongo-backup.sh --restore /backups/<dir>'
#   docker compose start api
set -eu

BACKUP_DIR=${BACKUP_DIR:-/backups}
INTERVAL=${BACKUP_INTERVAL_MINUTES:-60}
RETENTION=${BACKUP_RETENTION_DAYS:-14}

# Derive the database name from the URI (it may include credentials):
# mongodb://user:pass@host:port/db?authSource=admin → db
path="${MONGO_URI#*://}"
path="${path%%\?*}"
path="${path##*@}"
case "$path" in
  /*)   db_name="${path#*/}" ;;        # mongodb:///db (no authority)
  */*)  db_name="${path#*/}" ;;        # host:port/db — strip the authority part
  *)    db_name="${MONGO_DB:-backup}" ;;  # no database in the URI
esac
[ -n "$db_name" ] || db_name="backup"

run_dump() {
  stamp="$(date -u +%Y-%m-%dT%H%M%SZ)"
  dest="$BACKUP_DIR/$db_name-$stamp"
  echo "[$(date -u +%FT%TZ)] mongodump $db_name -> $dest"
  mongodump --uri "$MONGO_URI" --out "$dest"
  echo "[$(date -u +%FT%TZ)] done: $dest"
}

apply_retention() {
  # Dumps older than RETENTION_DAYS (the directory's mtime is the dump time)
  find "$BACKUP_DIR" -maxdepth 1 -type d -name "${db_name}-*" -mtime +"$RETENTION" \
    -print -exec rm -rf {} + || true
}

mode="${1:---loop}"
case "$mode" in
  --restore)
    source_dir="$2"
    [ -n "$source_dir" ] || { echo "usage: mongo-backup.sh --restore <dump-dir>" >&2; exit 2; }
    # A --out dump is <dump-dir>/<db>/*.bson; restore that subdirectory with
    # --db (a bare <dump-dir> argument is not recognised by mongorestore).
    exec mongorestore --uri "$MONGO_URI" --db "$db_name" --drop "$source_dir/$db_name"
    ;;
  --once)
    run_dump
    apply_retention
    ;;
  --loop)  # daemon: dump every BACKUP_INTERVAL_MINUTES (docker compose `backup`)
    # The mongo docker-entrypoint runs non-mongod commands as root, so the
    # named volume ends up root-owned — fine: every consumer (the loop and
    # `docker compose run ... --once` / --restore) is also root.
    while :; do
      run_dump || echo "[$(date -u +%FT%TZ)] dump FAILED (will retry next interval)" >&2
      apply_retention
      sleep "$((INTERVAL * 60))"
    done
    ;;
  *)
    echo "usage: mongo-backup.sh [--loop | --once | --restore <dump-dir>]" >&2
    exit 2
    ;;
esac
