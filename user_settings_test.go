package main

import "testing"

var settings UserSettings = UserSettings{Notifications: true, Overwrite: true, DownloadsDirectory: "test"}

func TestGetSettingsDirectory(t *testing.T) {
	dir, err := getSettingsDirectory()
	if err != nil {
		t.Error(err)
		t.Fail()
	}
	t.Log("Found Dir:", dir)
}

func TestSaveUserSettings(t *testing.T) {
	err := SaveUserSettings(settings)
	if err != nil {
		t.Error(err)
		t.Fail()
	}
}

func TestGetUserSettings(t *testing.T) {
	userSettings, err := GetUserSettings()
	if err != nil {
		t.Error(err)
		t.Fail()
	}
	if userSettings != settings {
		t.Error("Retrieved settings do not match")
		t.Fail()
	}
}
