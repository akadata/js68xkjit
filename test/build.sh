#!/bin/sh
# Build script for j68k tests
# Uses m68k-amigaos toolchain from /opt/amiga/bin/

AS=/opt/amiga/bin/m68k-amigaos-as
OBJCOPY=/opt/amiga/bin/m68k-amigaos-objcopy

mkdir -p r

for f in asm/*.s; do
	echo build $f;
	NAME=`basename $f`
	$AS $f -o r/${NAME%s}o
	$OBJCOPY -O binary r/${NAME%s}o r/${NAME%s}r
	rm r/${NAME%s}o
done

rm -f test.list
echo "{ \"tests\": [" > test.list

SEP=""
for f in r/*.r; do
	echo "$SEP\"$f\"" >> test.list
	SEP=","
done

echo "] }" >> test.list
