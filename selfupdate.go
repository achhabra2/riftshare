package main

import (
	"log"

	"github.com/blang/semver"
	"github.com/rhysd/go-github-selfupdate/selfupdate"
)

const version = "0.0.6"

func doSelfUpdate() bool {
	v := semver.MustParse(version)
	latest, err := selfupdate.UpdateSelf(v, "achhabra2/riftshare")
	if err != nil {
		log.Println("Binary update failed:", err)
		return false
	}
	if latest.Version.Equals(v) {
		// latest version is the same as current version. It means current binary is up to date.
		log.Println("Current binary is the latest version", version)
		return true
	} else {
		log.Println("Successfully updated to version", latest.Version)
		log.Println("Release note:\n", latest.ReleaseNotes)
		return true
	}
}

func checkForUpdate() (bool, string) {
	latest, found, err := selfupdate.DetectLatest("achhabra2/riftshare")
	if err != nil {
		log.Println("Error occurred while detecting version:", err)
		return false, ""
	}

	v := semver.MustParse(version)
	if !found || latest.Version.LTE(v) {
		log.Println("Current version is the latest")
		return false, ""
	}

	return true, latest.Version.String()
}
