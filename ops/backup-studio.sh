#!/bin/sh
set -eu
umask 077
root=/opt/fahi-studio-preview
mkdir -p "$root/backups"
docker exec ernix50nvuq9ur9jy8na8tgr pg_dump -U postgres -d aura_fahi_studio -Fc > "$root/backups/studio.next.dump"
tar --exclude='*.part' -C "$root/media" -czf "$root/backups/media.next.tar.gz" .
mv "$root/backups/studio.next.dump" "$root/backups/studio.current.dump"
mv "$root/backups/media.next.tar.gz" "$root/backups/media.current.tar.gz"
date -u +%FT%TZ > "$root/backups/checked-at.txt"
