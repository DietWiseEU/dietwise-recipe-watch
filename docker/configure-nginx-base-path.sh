#!/bin/sh
set -eu

BASE_PATH_INPUT="${1:-/}"
DIST_DIR="${2:-/tmp/dist}"

base_path="${BASE_PATH_INPUT%/}"
if [ -z "${base_path}" ] || [ "${base_path}" = "/" ]; then
	mkdir -p /usr/share/nginx/html
	cp -r "${DIST_DIR}/." /usr/share/nginx/html/
	printf '%s\n' '# Root deployment: no extra context path locations.' > /etc/nginx/base-path-locations.inc
	exit 0
fi

base_path="/${base_path#/}"
mkdir -p "/usr/share/nginx/html${base_path}"
cp -r "${DIST_DIR}/." "/usr/share/nginx/html${base_path}/"

cat > /etc/nginx/base-path-locations.inc <<EOF
location = ${base_path} {
	try_files ${base_path}/index.html =404;
}

location = ${base_path}/mobile-preview {
	try_files ${base_path}/mobile-preview.html =404;
}

location ${base_path}/assets/ {
	try_files \$uri =404;
	add_header Cache-Control "public, max-age=31536000, immutable";
}

location = ${base_path}/ui {
	return 301 ${base_path}/ui/;
}

location ${base_path}/ui/ {
	try_files \$uri \$uri/ ${base_path}/ui/index.html;
}

location ${base_path}/ {
	try_files \$uri \$uri/ ${base_path}/index.html;
}
EOF
