#!/bin/bash

grep -rnw --include="*.ts" --include="*.js" "TODO" .
# Этот скрипт ищет все TODO во всех JS/TS-файлах проекта

