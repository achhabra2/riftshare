package settings

import (
	"errors"
	"log"
	"os"
	"path/filepath"
	"riftshare/internal/transport"
	"runtime"

	"gopkg.in/yaml.v2"
)

type UserSettings struct {
	Notifications      bool   `yaml:"notifications"`
	Overwrite          bool   `yaml:"overwrite"`
	DownloadsDirectory string `yaml:"downloads_directory"`
}

func SaveUserSettings(settings UserSettings) error {
	prefs, err := openPrefFile()
	if err != nil {
		log.Println(err)
		return errors.New("error opening settings file")
	}
	defer prefs.Close()
	encoder := yaml.NewEncoder(prefs)
	err = encoder.Encode(settings)
	if err != nil {
		log.Println(err)
		return errors.New("error encoding settings file")
	}
	return nil
}

func GetUserSettings() (UserSettings, error) {
	prefs, err := openPrefFile()
	if err != nil {
		log.Println(err)
	}
	defer prefs.Close()

	var settings UserSettings
	decoder := yaml.NewDecoder(prefs)
	err = decoder.Decode(&settings)
	if err != nil {
		log.Println(err)
	}

	// Check if file is empty
	if settings == (UserSettings{}) {
		// Initialize empty settings file
		settings = UserSettings{Notifications: false, Overwrite: true, DownloadsDirectory: transport.UserDownloadsFolder()}
	}
	return settings, nil
}

func GetSettingsDirectory() (string, error) {
	var err error
	homeDir, err := os.UserHomeDir()
	prefDir := ""
	switch runtime.GOOS {
	case "windows":
		prefDir = filepath.Join(homeDir, "/AppData/Local/RiftShare")
	case "darwin":
		prefDir = filepath.Join(homeDir, "/Library/Application Support/RiftShare")
	default:
		err = errors.New("unsupported platform")
	}
	return prefDir, err
}

func openPrefFile() (*os.File, error) {
	dir, err := GetSettingsDirectory()
	if err != nil {
		log.Println(err)
	}
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		log.Println("No Pref Directory Found, creating..")
		err = os.Mkdir(dir, 0777)
		if err != nil {
			log.Println(err)
		}
	}
	settingsPath := filepath.Join(dir, "riftshare_config.yaml")
	prefs, err := os.OpenFile(settingsPath, os.O_RDWR|os.O_CREATE, 0666)
	if err != nil {
		log.Println(err)
	}
	return prefs, nil
}