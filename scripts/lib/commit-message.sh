#!/bin/sh
# SPDX-License-Identifier: MIT

message_subject() {
  printf '%s\n' "$1" | sed -n '1p'
}

message_trailer() {
  message=$1
  key=$2
  printf '%s\n' "$message" | git interpret-trailers --parse \
    | sed -n "s/^$key: //p" \
    | tail -1
}

message_is_breaking() {
  subject=$(message_subject "$1")
  printf '%s\n' "$subject" | grep -Eq '^.+!:' \
    || [ -n "$(message_trailer "$1" BREAKING-CHANGE)" ]
}
