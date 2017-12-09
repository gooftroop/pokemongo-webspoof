#!/bin/sh

set -e
set -x

for package in $(npm outdated --parseable --depth=0 | cut -d: -f3)
do
    npm -g install "$package"
done
