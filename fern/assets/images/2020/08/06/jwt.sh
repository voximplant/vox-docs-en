#!/usr/bin/env bash

credentials="${PWD}/credentials.json"

account_id=$(cat $credentials | jq -r ".account_id")
key_id=$(cat $credentials | jq -r ".key_id")
rsa_secret=$(cat $credentials | jq -r ".private_key")

timestamp() {
    date +"%s"
}

test_payload=$( jq -n \
    --arg iat "$(timestamp)" \
    --arg iss "$account_id" \
    --arg exp "$(($(timestamp)+3600))" \
    '{
        iat: $iat | tonumber,
        iss: $iss | tonumber,
        exp: $exp | tonumber
    }'
)

set -o pipefail

header_template=$( jq -n \
    --arg typ "JWT" \
    --arg alg "RS256" \
    --arg kid "$key_id" \
    '{typ: $typ, alg: $alg, kid: $kid}'
)

b64enc() { openssl enc -base64 -A | tr '+/' '-_' | tr -d '='; }
json() { jq -c . | LC_CTYPE=C tr -d '\n'; }
rs_sign() { openssl dgst -binary -sha"${1}" -sign <(printf '%s\n' "$2"); }

sign() {
    local secret=$rsa_secret
    algo=RS256
    header=$header_template || return
    payload=$test_payload

    signed_content="$(json <<<"$header" | b64enc).$(json <<<"$payload" | b64enc)"

    sig=$(printf %s "$signed_content" | rs_sign "${algo#RS}" "$secret" | b64enc)

    printf 'Authorization: Bearer %s.%s\n' "${signed_content}" "${sig}"
}

sign
