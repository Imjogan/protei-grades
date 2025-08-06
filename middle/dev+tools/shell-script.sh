#!/bin/bash

# Поиск всех TODO во всех JS/TS-файлах проекта
grep -rnw --include="*.ts" --include="*.js" "TODO" .

# Быстрая очистка кэшей и папок сборки
echo "Удаляем папки cache и build..."

rm -rf node_modules/.cache
rm -rf dist
rm -rf build

echo "Очистка завершена!"