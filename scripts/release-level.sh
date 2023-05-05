#!/bin/sh

RELEASE_LEVEL=$1
RELEASE_KIND=$2

OUT_RELEASE_LEVEL=''
OUT_RELEASE_PREID="$RELEASE_KIND"
OUT_RELEASE_TAG=''

case "$RELEASE_LEVEL" in
	patch|minor|major)
		if [ "$RELEASE_KIND" = 'stable' ]; then
			OUT_RELEASE_LEVEL="$RELEASE_LEVEL"
		else
			OUT_RELEASE_LEVEL="pre$RELEASE_LEVEL"
		fi
	;;

	prerelease)
		if [ "$RELEASE_KIND" = 'stable' ]; then
			echo 'Invalid combination stable+prerelease'
			exit 11
		fi

		OUT_RELEASE_LEVEL='prerelease'
	;;

	*)
		echo "Unknown release level \"${RELEASE_LEVEL}\""
		exit 1
	;;
esac

case "$RELEASE_KIND" in
	alpha|beta)
		OUT_RELEASE_TAG="$RELEASE_KIND"
	;;

	rc)
		OUT_RELEASE_TAG='next'
	;;

	stable)
		OUT_RELEASE_TAG='latest'
	;;
	
	*)
		echo "Unknown release kind \"${RELEASE_KIND}\""
		exit 2
	;;
esac

echo "RELEASE_LEVEL=${OUT_RELEASE_LEVEL}"
echo "RELEASE_PREID=${OUT_RELEASE_PREID}"
echo "RELEASE_TAG=${OUT_RELEASE_TAG}"
